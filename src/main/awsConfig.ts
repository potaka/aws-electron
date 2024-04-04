import * as os from "os"
import * as path from "path"
import * as fs from "fs"
import * as util from "util"
import { Config, CredentialsSchema, Profile, ProfileSchema } from "models"
import * as ini from "ini"

const readFile = util.promisify(fs.readFile)

interface GetConfigArgs {
  configPath?: string
}

interface IsMultiStageRoleAssumingProfileArguments {
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
  return key.replace("profile ", "")
}

async function getProfiles({
  configPath,
}: GetConfigArgs): Promise<Record<string, Profile>> {
  const configFilePath = path.join(configPath!, "config")
  const configFileContent = await readFile(configFilePath, readFileOptions)
  const awsConfig = ini.parse(configFileContent)
  const profiles = Object.entries(awsConfig)
    .map(([profileName, profile], index) => ({
      [cleanProfileKey(profileName)]: ProfileSchema.parse({
        ...profile,
        order: index,
      }),
    }))
    .reduce((prev, cur) => ({ ...cur, ...prev }), {})
  return profiles
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

function getProfileList(
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
}: IsMultiStageRoleAssumingProfileArguments): boolean {
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
  console.log(`getting config from ${configPath}`)

  const profiles = await getProfiles({ configPath })
  const { credentialProfiles, longTermCredentialProfiles } =
    await getCredentials({ configPath })
  const usableProfiles = Object.entries(profiles)
    .filter(
      ([profileName, profile]) =>
        (profile.role_arn !== undefined &&
          credentialProfiles.includes(profile.source_profile || profileName)) ||
        isMultiStageRoleAssumingProfile({ profiles, profileName }),
    )
    .map(([profileName]) => profileName)
  return {
    profiles,
    credentialProfiles,
    longTermCredentialProfiles,
    usableProfiles,
  }
}
