import { z } from "zod"

export const ProfileSchema = z
  .object({
    role_arn: z.string().optional(),
    mfa_serial: z.string().optional(),
    source_profile: z.string().optional(),
    region: z.string().optional(),
    order: z.number().optional(),
  })
  .passthrough()

export type Profile = z.infer<typeof ProfileSchema>

export const CredentialsSchema = z
  .object({
    aws_access_key_id: z.string(),
    aws_secret_access_key: z.string(),
    aws_session_token: z.string().optional(),
  })
  .passthrough()

export type Credentials = z.infer<typeof CredentialsSchema>

export const ConfigSchema = z.object({
  profiles: z.record(z.string(), ProfileSchema),
  credentialProfiles: z.array(z.string()),
  longTermCredentialProfiles: z.array(z.string()),
  usableProfiles: z.array(z.string()),
  cachableProfiles: z.array(z.string()),
})

export type Config = z.infer<typeof ConfigSchema>

export const SigninResultSchema = z.object({ SigninToken: z.string() })

export type SigninResult = z.infer<typeof SigninResultSchema>
