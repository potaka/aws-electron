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
} from "models"
import * as ini from "ini"
import debounce from "debounce"
import settings from "electron-settings"
import { SSOOIDCClient, RegisterClientCommand } from "@aws-sdk/client-sso-oidc"
import { OidcClientSchema } from "models"

const readFile = util.promisify(fs.readFile)

interface GetConfigArgs {
  configPath?: string
}
interface GetSsoConfigArgs extends GetConfigArgs {
  profileName: string
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

export async function getSsoConfig({
  profileName,
  configPath = path.join(os.homedir(), ".aws"),
}: GetSsoConfigArgs): Promise<Config | undefined> {
  console.log(`Getting SSO config for ${profileName}`)
  const client = new SSOOIDCClient()

  const configFile = await getConfig({ configPath })
  const ssoSession = configFile.ssoSessions?.[profileName]
  if (ssoSession === undefined) {
    return undefined
  }
  let oidcClient: OidcClient
  const cachedClient = await settings.get(["oidcClients", profileName])
  if (cachedClient !== undefined) {
    oidcClient = OidcClientSchema.parse(cachedClient)
  } else {
    const response = await client.send(
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
  }

  return configFile // TODO nope, not this
}
