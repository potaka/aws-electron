import * as os from "os"
import * as path from "path"
import * as fs from "fs"
import * as util from "util"
import {
  Config,
  ConfigEntry,
  ConfigEntrySchema,
  CredentialsSchema,
  EntryType,
  EntryTypeSchema,
  OidcClient,
  Profile,
  SsoSession,
  OidcClientSchema,
  SsoToken,
  SsoTokenSchema,
} from "models"
import * as ini from "ini"
import debounce from "debounce"
import settings from "electron-settings"
import {
  SSOOIDCClient,
  RegisterClientCommand,
  StartDeviceAuthorizationCommand,
  CreateTokenCommand,
  AuthorizationPendingException,
  CreateTokenCommandOutput,
} from "@aws-sdk/client-sso-oidc"
import {
  SSOClient,
  paginateListAccountRoles,
  paginateListAccounts,
  RoleInfo,
} from "@aws-sdk/client-sso"

const readFile = util.promisify(fs.readFile)

const pendingRequests = new Set()
const recentlyCancelledRequests = new Set()

interface GetOidcClientArgs {
  profileName: string
  ssoSession: SsoSession
}

interface GetConfigArgs {
  configPath?: string
}
interface GetSsoConfigArgs extends GetConfigArgs {
  profileName: string
  requestId: string
}

interface GetAccessTokenArgs extends GetOidcClientArgs {
  requestId: string
}

interface GetProfilesArgs {
  entries: [string, ConfigEntry][]
}

interface UsableProfileFilterArguments {
  profiles: Record<string, Profile>
  profileName: string
}

interface CredentialsProfiles {
  credentialProfiles: string[]
  longTermCredentialProfiles: string[]
}

const readFileOptions = {
  encoding: "utf-8" as const,
  flag: "r" as const,
}

function cleanProfileKey(key: string): string {
  return key.replace("profile ", "").replace("sso-session ", "")
}

function entryType(name: string): EntryType {
  const components = name.split(" ")
  if (components.length === 1) {
    return "profile"
  }
  return EntryTypeSchema.parse(components[0])
}

async function getConfigEntries({
  configPath,
}: GetConfigArgs): Promise<[string, ConfigEntry][]> {
  const configFilePath = path.join(configPath!, "config")
  const configFileContent = await readFile(configFilePath, readFileOptions)
  const awsConfig = ini.parse(configFileContent)
  const entries = Object.entries(awsConfig).map(
    ([entryName, entry], index): [string, ConfigEntry] => [
      cleanProfileKey(entryName),
      ConfigEntrySchema.parse({
        ...entry,
        order: index,
        entryType: entryType(entryName),
      }),
    ],
  )
  return entries
}

function getProfiles({ entries }: GetProfilesArgs): Record<string, Profile> {
  const profiles = entries
    .filter(([, entry]): boolean => entry.entryType === "profile")
    .map(([profileName, profile]) => ({
      [profileName]: profile,
    }))
    .reduce((prev, cur) => ({ ...cur, ...prev }), {})
  return profiles
}

function getSsoSessions({
  entries,
}: GetProfilesArgs): Record<string, SsoSession> {
  const ssoSessions = entries
    .filter(([, entry]): boolean => entry.entryType === "sso-session")
    .map(([sessionName, session]) => ({
      [sessionName]: session,
    }))
    .reduce((prev, cur) => ({ ...cur, ...prev }), {})
  return ssoSessions
}

async function getCredentials({
  configPath,
}: GetConfigArgs): Promise<CredentialsProfiles> {
  const credentialsFilePath = path.join(configPath!, "credentials")
  const credentialsFileContent = await readFile(
    credentialsFilePath,
    readFileOptions,
  )
  const awsCredentials = ini.parse(credentialsFileContent)
  const credentials = Object.entries(awsCredentials)
    .map(([profileName, profile]) => ({
      [profileName]: CredentialsSchema.parse(profile),
    }))
    .reduce((prev, cur) => ({ ...prev, ...cur }))

  return {
    credentialProfiles: Object.keys(credentials),
    longTermCredentialProfiles: Object.entries(credentials)
      .filter(([_, profile]) => profile.aws_access_key_id.startsWith("AKIA"))
      .map(([profileName]) => profileName),
  }
}

export function getProfileList(
  config: Record<string, Profile>,
  profileName: string,
): Array<string> {
  const profiles = [profileName]
  let profileConfig = config[profileName]
  while (profileConfig !== undefined && profileConfig.source_profile) {
    const sourceProfile = profileConfig.source_profile
    if (profiles.includes(sourceProfile)) {
      throw new Error(
        `Loop in profiles: ${profiles.join(", ")} + ${sourceProfile}`,
      )
    }
    profiles.push(sourceProfile)
    const nextProfile = config[sourceProfile]

    if (nextProfile && nextProfile.role_arn === undefined) {
      // if we've found a config profile with no role_arn, then the chain
      // is supposed to stop with a credentials profile with the same name.
      return profiles.reverse()
    }
    profileConfig = nextProfile
  }
  return profiles.reverse()
}

function isMultiStageRoleAssumingProfile({
  profiles,
  profileName,
}: UsableProfileFilterArguments): boolean {
  const profileList = getProfileList(profiles, profileName).slice(1)

  return (
    profileList.length > 0 &&
    profileList
      .map((profileName) => profiles[profileName])
      .every((profile) => profile.role_arn !== undefined)
  )
}

export async function getConfig({
  configPath = path.join(os.homedir(), ".aws"),
}: GetConfigArgs = {}): Promise<Config> {
  const configEntries = await getConfigEntries({ configPath })
  const profiles = getProfiles({ entries: configEntries })
  const ssoSessions = getSsoSessions({ entries: configEntries })

  const { credentialProfiles, longTermCredentialProfiles } =
    await getCredentials({ configPath })
  const usableProfiles = Object.entries(profiles)
    .filter(
      ([profileName, profile]) =>
        (profile.role_arn !== undefined &&
          credentialProfiles.includes(profile.source_profile || profileName)) ||
        isMultiStageRoleAssumingProfile({ profiles, profileName }) ||
        profile.sso_session !== undefined,
    )
    .map(([profileName]) => profileName)

  const cachableProfiles = Object.entries(profiles)
    .filter(([profileName, profile]) => {
      if (profile.mfa_serial === undefined) {
        return false
      }
      if (profile.role_arn !== undefined) {
        return false
      }
      const shortTermCredentialsProfile = profile.source_profile || profileName
      const longTermCredentialProfile = `${shortTermCredentialsProfile}::source-profile`
      return (
        longTermCredentialProfiles.includes(longTermCredentialProfile) ||
        longTermCredentialProfiles.includes(shortTermCredentialsProfile)
      )
    })
    .map(([profileName]) => profileName)

  return {
    profiles,
    credentialProfiles,
    longTermCredentialProfiles,
    usableProfiles,
    cachableProfiles,
    ssoSessions,
  }
}

export function watchConfigFile(callback: { (newConfig: Config): void }): void {
  const configChanged = debounce(async () => {
    callback(await getConfig())
  }, 10)

  fs.watch(
    path.join(os.homedir(), ".aws"),
    { persistent: false },
    (eventType: string, filename: string | Buffer | null) => {
      if (filename !== "config") {
        return
      }
      if (eventType === "change") {
        configChanged()
      }
    },
  )
}

async function getOidcClient({
  profileName,
  ssoSession,
}: GetOidcClientArgs): Promise<OidcClient> {
  let oidcClient: OidcClient
  const cachedClient = await settings.get(["oidcClients", profileName])
  if (cachedClient !== undefined) {
    oidcClient = OidcClientSchema.parse(cachedClient)
    if (oidcClient.clientSecretExpiresAt * 1000 > new Date().getTime()) {
      return oidcClient
    }
  }
  const ssoClient = new SSOOIDCClient()
  const response = await ssoClient.send(
    new RegisterClientCommand({
      clientName: "nz.jnawk.awsconsole",
      clientType: "public",
      grantTypes: ["urn:ietf:params:oauth:grant-type:device_code"],
      issuerUrl: ssoSession.sso_start_url,
      scopes: ["sso:account:access"],
    }),
  )
  oidcClient = {
    clientId: response.clientId!,
    clientSecret: response.clientSecret!,
    clientSecretExpiresAt: response.clientSecretExpiresAt!,
  }
  settings.set(["oidcClients", profileName], oidcClient)
  return oidcClient
}

async function getAccessToken({
  profileName,
  requestId,
  ssoSession,
}: GetAccessTokenArgs): Promise<SsoToken> {
  let ssoToken: SsoToken
  const cachedToken = await settings.get(["ssoTokens", profileName])
  if (cachedToken !== undefined) {
    ssoToken = SsoTokenSchema.parse(cachedToken)
    if (ssoToken.expiresAt > new Date().getTime()) {
      return ssoToken
    }
  }
  const oidcClient = await getOidcClient({ profileName, ssoSession })
  const ssoOidcClient = new SSOOIDCClient({ region: ssoSession.sso_region })
  const response = await ssoOidcClient.send(
    new StartDeviceAuthorizationCommand({
      clientId: oidcClient.clientId,
      clientSecret: oidcClient.clientSecret,
      startUrl: ssoSession.sso_start_url!,
    }),
  )

  console.log(`${requestId}: ${response.verificationUriComplete}`)
  setTimeout(
    () => pendingRequests.delete(requestId),
    response.expiresIn! * 1000,
  )

  const deadline = new Date().getTime() + 1000 * response.expiresIn!

  const tokenGetter = (
    resolve: {
      (
        response: CreateTokenCommandOutput | Promise<CreateTokenCommandOutput>,
      ): void
    },
    reject: { (value: unknown): void },
  ): void => {
    if (
      !pendingRequests.has(requestId) ||
      recentlyCancelledRequests.has(requestId)
    ) {
      return reject("Cancelled!")
    }

    ssoOidcClient
      .send(
        new CreateTokenCommand({
          clientId: oidcClient.clientId,
          clientSecret: oidcClient.clientSecret,
          grantType: "urn:ietf:params:oauth:grant-type:device_code",
          deviceCode: response.deviceCode!,
        }),
      )
      .then(resolve)
      .catch((e) => {
        if (new Date().getTime() > deadline) {
          console.log("too late")
          reject(e)
        } else if (e instanceof AuthorizationPendingException) {
          setTimeout(
            () => tokenGetter(resolve, reject),
            response.interval! * 1000,
          )
        } else {
          console.log("/shrug")
          reject(e)
        }
      })
  }

  pendingRequests.add(requestId)
  const tokenResponse: CreateTokenCommandOutput = await new Promise(tokenGetter)
  ssoToken = {
    accessToken: tokenResponse.accessToken!,
    expiresAt: new Date().getTime() + tokenResponse.expiresIn! * 1000,
  }
  settings.set(["ssoTokens", profileName], ssoToken)
  return ssoToken
}

export async function getSsoConfig({
  profileName,
  requestId,
  configPath = path.join(os.homedir(), ".aws"),
}: GetSsoConfigArgs): Promise<Config | undefined> {
  const configFile = await getConfig({ configPath })
  const ssoSession = configFile.ssoSessions?.[profileName]
  if (ssoSession === undefined) {
    return undefined
  }

  const accessToken = await getAccessToken({
    profileName,
    requestId,
    ssoSession,
  })

  const ssoClient = new SSOClient({
    region: ssoSession.sso_region,
    maxAttempts: 10,
  })

  const listAccountsPaginator = paginateListAccounts(
    { client: ssoClient, pageSize: 100 },
    { accessToken: accessToken.accessToken },
  )
  const roleList: Array<RoleInfo> = []
  for await (const page of listAccountsPaginator) {
    for (const account of page.accountList!) {
      console.log(`${account.accountName}`)
      const listAccountRolesPaginator = paginateListAccountRoles(
        { client: ssoClient, pageSize: 100 },
        {
          accessToken: accessToken.accessToken,
          accountId: account.accountId,
        },
      )
      for await (const page of listAccountRolesPaginator) {
        page.roleList?.forEach((role) => roleList.push(role))
      }
    }
  }

  console.log(roleList)

  return configFile // TODO nope, not this
}

export function cancelGetSsoConfig(requestId: string): void {
  console.log(`cancelling ${requestId}`)
  recentlyCancelledRequests.add(requestId)
  setTimeout((): void => {
    recentlyCancelledRequests.delete(requestId)
  }, 600 * 1000)
  pendingRequests.delete(requestId)
  console.log(pendingRequests)
}
