import { z } from 'zod'

const ProfileSchema = z.object({
    order: z.number(),
    source_profile: z.string().nullable(),
    role_arn: z.string().nullable(),
    mfa_serial: z.string().nullable(),
    additional_properties: z.record(z.string(), z.string()).nullable(),
})

export type Profile = z.infer<typeof ProfileSchema>

export const ConfigSchema = z.object({
    config: z.record(z.string(), ProfileSchema),
    credentials_profiles: z.array(z.string()),
    long_term_credentials_profiles: z.array(z.string()),
    usable_profiles: z.array(z.string()),
})

export type Config = z.infer<typeof ConfigSchema>
