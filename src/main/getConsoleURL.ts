import * as urllib from "urllib"
import {
  AssumeRoleCommand,
  STSClient,
  Credentials as AwsCredentials,
  AssumeRoleCommandInput,
} from "@aws-sdk/client-sts"
import { fromIni } from "@aws-sdk/credential-providers"
import { getProfileList, getAccessToken } from "./awsConfig"
import { Config, SigninResultSchema } from "models"
import * as sso from "@aws-sdk/client-sso"

interface GetFederationUrlArgs {
  Action: string
  SigninToken?: string
  Destination?: string
  SessionDuration?: number
  DurationSeconds?: number
  SessionType?: string
  Session?: string
}

interface GetConsoleUrlArgsBase {
  profileName: string
  config: Config
}

interface GetConsoleUrlStandardArgs extends GetConsoleUrlArgsBase {
  type: "standard"
  tokenCode?: string
}

interface GetConsoleUrlSsoArgs extends GetConsoleUrlArgsBase {
  type: "sso"
  accountId?: string
  roleName?: string
}

type GetConsoleUrlArgs = GetConsoleUrlStandardArgs | GetConsoleUrlSsoArgs

const defaultConsoleUrl = "https://console.aws.amazon.com"

function getConsoleUrlForRegion(region: string): string {
  return `https://${region}.console.aws.amazon.com`
}

interface STSAndCredentials {
  sts: STSClient
  credentials: AwsCredentials
}
async function getSsoCredentials({
  config,
  profileName,
  accountId,
  roleName,
}: GetConsoleUrlSsoArgs): Promise<AwsCredentials> {
  const accessToken = await getAccessToken(
    { profileName, ssoSession: {} },
    true,
  )

  const ssoClient = new sso.SSOClient({
    region: config.ssoSessions![profileName].sso_region,
    maxAttempts: 10,
  })
  const credentials = await ssoClient.send(
    new sso.GetRoleCredentialsCommand({
      accessToken: accessToken.accessToken,
      accountId,
      roleName,
    }),
  )
  return {
    AccessKeyId: credentials.roleCredentials?.accessKeyId,
    SecretAccessKey: credentials.roleCredentials?.secretAccessKey,
    SessionToken: credentials.roleCredentials?.sessionToken,
    Expiration: undefined,
  }
}

async function getRoleCredentials({
  config,
  tokenCode,
  profileName,
}: GetConsoleUrlStandardArgs): Promise<AwsCredentials> {
  const profileList: string[] = getProfileList(config.profiles, profileName)

  const { credentials } = (await profileList.reduce(
    async (
      stsAndCredentials: Promise<STSAndCredentials | undefined>,
      profile: string,
    ): Promise<STSAndCredentials> => {
      const profileConfig = config[profile]
      if (
        profileList.length === 1 ||
        profileConfig === undefined ||
        !profileConfig.role_arn
      ) {
        const credentials = await fromIni({
          profile: profileName,
          ignoreCache: true,
        })()

        return {
          sts: new STSClient({ credentials }),
          credentials: {
            AccessKeyId: credentials.accessKeyId,
            SecretAccessKey: credentials.secretAccessKey,
            SessionToken: credentials.sessionToken,
            Expiration: credentials.expiration,
          },
        }
      }

      const assumeRoleParams: AssumeRoleCommandInput = {
        RoleArn: profileConfig.role_arn,
        RoleSessionName: `${profileName}${new Date().getTime()}`,
      }
      if (profileConfig.mfa_serial) {
        // this better only be on the first assume role profile in the chain!
        assumeRoleParams.SerialNumber = profileConfig.mfa_serial
        assumeRoleParams.TokenCode = tokenCode
      }
      if (profileConfig.duration_seconds) {
        assumeRoleParams.DurationSeconds = profileConfig.duration_seconds
      }

      const { sts } = (await stsAndCredentials)!
      const assumedRole = await sts.send(
        new AssumeRoleCommand(assumeRoleParams),
      )

      return {
        sts: new STSClient({
          credentials: {
            accessKeyId: assumedRole.Credentials!.AccessKeyId!,
            secretAccessKey: assumedRole.Credentials!.SecretAccessKey!,
            sessionToken: assumedRole.Credentials!.SessionToken,
            expiration: assumedRole.Credentials!.Expiration,
          },
        }),
        credentials: assumedRole.Credentials!,
      }
    },
    Promise.resolve(undefined),
  ))!

  return credentials
}

function getFederationUrl(params: GetFederationUrlArgs): string {
  const searchParams = new URLSearchParams(
    Object.entries(params).reduce(
      (
        prev: Record<string, string>,
        [key, value]: [string, string | number | undefined],
      ) => (value !== undefined ? { ...prev, [key]: value.toString() } : prev),
      {},
    ),
  ).toString()
  return `https://signin.aws.amazon.com/federation?${searchParams}`
}

async function getSigninToken({
  AccessKeyId: sessionId,
  SecretAccessKey: sessionKey,
  SessionToken: sessionToken,
}: AwsCredentials): Promise<string> {
  const getSigninTokenUrl = getFederationUrl({
    Action: "getSigninToken",
    DurationSeconds: 900,
    SessionType: "json",
    Session: JSON.stringify({ sessionId, sessionKey, sessionToken }),
  })

  const { data } = await urllib.request<string>(getSigninTokenUrl)
  const { SigninToken: signinToken } = SigninResultSchema.parse(
    JSON.parse(data),
  )
  return signinToken
}

export async function getConsoleUrl(args: GetConsoleUrlArgs): Promise<string> {
  const { type, profileName } = args

  let credentials: AwsCredentials | undefined = undefined

  switch (type) {
    case "standard":
      credentials = await getRoleCredentials(args)
      break
    case "sso":
      credentials = await getSsoCredentials(args)
      break
  }
  const signinToken = await getSigninToken(credentials!)

  let consoleUrl: string = defaultConsoleUrl

  const { region } =
    type === "standard"
      ? args.config.profiles[profileName]
      : { region: args.config.ssoSessions![profileName].sso_region }
  if (region && region !== "us-east-1") {
    consoleUrl = getConsoleUrlForRegion(region)
  }

  return getFederationUrl({
    Action: "login",
    SigninToken: signinToken,
    Destination: consoleUrl,
    SessionDuration: 43200,
  })
}
