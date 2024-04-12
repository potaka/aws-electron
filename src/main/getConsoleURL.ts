import * as urllib from "urllib"
import {
  AssumeRoleCommand,
  STSClient,
  Credentials as AwsCredentials,
  AssumeRoleCommandInput,
} from "@aws-sdk/client-sts"
import { fromIni } from "@aws-sdk/credential-providers"
import { getProfileList } from "./awsConfig"

import { Config, SigninResultSchema } from "models"

interface GetFederationUrlArguments {
  Action: string
  SigninToken?: string
  Destination?: string
  SessionDuration?: number
  DurationSeconds?: number
  SessionType?: string
  Session?: string
}

const defaultConsoleUrl = "https://console.aws.amazon.com"

function getConsoleUrlForRegion(region: string): string {
  return `https://${region}.console.aws.amazon.com`
}

interface STSAndCredentials {
  sts: STSClient
  credentials: AwsCredentials
}

async function getRoleCredentials(
  config: Config,
  tokenCode: string,
  profileName: string,
): Promise<AwsCredentials> {
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

      const credentials = {
        accessKeyId: assumedRole.Credentials!.AccessKeyId!,
        secretAccessKey: assumedRole.Credentials!.SecretAccessKey!,
        sessionToken: assumedRole.Credentials!.SessionToken,
        expiration: assumedRole.Credentials!.Expiration,
      }

      return {
        sts: new STSClient({ credentials }),
        credentials: assumedRole.Credentials!,
      }
    },
    Promise.resolve(undefined),
  ))!

  return credentials
}

function getFederationUrl(params: GetFederationUrlArguments): string {
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

export async function getConsoleUrl(
  config: Config,
  tokenCode: string,
  profileName: string,
): Promise<string> {
  const roleCredentials = await getRoleCredentials(
    config,
    tokenCode,
    profileName,
  )
  const signinToken = await getSigninToken(roleCredentials)

  let consoleUrl: string = defaultConsoleUrl
  const { region } = config.profiles[profileName]
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
