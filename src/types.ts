import { z } from 'zod'

const ProfileSchema = z.object({
    order: z.number(),
    source_profile: z.string().nullable(),
    role_arn: z.string().nullable(),
    mfa_serial: z.string().nullable(),
    // additional_properties: z.object({}).passthrough().nullable()
    additional_properties: z.record(z.string(), z.string()).nullable(),
})

export const ConfigSchema = z.record(z.string(), ProfileSchema)

export type Config = z.infer<typeof ConfigSchema>
