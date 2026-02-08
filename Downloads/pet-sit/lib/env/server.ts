import "server-only"

import { z } from "zod"

function preprocessTrimmedString(value: unknown) {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function preprocessBoolean(value: unknown) {
  if (value === true || value === false) return value
  if (typeof value !== "string") return value
  const normalized = value.trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true
  if (normalized === "false" || normalized === "0" || normalized === "no") return false
  return undefined
}

const optionalString = z.preprocess(preprocessTrimmedString, z.string().min(1).optional())
const optionalBoolean = z.preprocess(preprocessBoolean, z.boolean().optional())

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_STORAGE_BUCKET: z.preprocess(preprocessTrimmedString, z.string().min(1).default("uploads")),

  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  RESEND_API_KEY: optionalString,

  SENTRY_DSN: z.preprocess(preprocessTrimmedString, z.string().url().optional()),
  SENTRY_ENVIRONMENT: optionalString,
  SENTRY_RELEASE: optionalString,

  ALLOW_MANUAL_BOOKING_PAYMENTS: optionalBoolean,
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedServerEnv: ServerEnv | null = null

function formatZodIssues(issues: z.ZodIssue[]) {
  return issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n")
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv

  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(["[sitswap] Invalid server environment variables.", formatZodIssues(parsed.error.issues)].join("\n"))
  }

  cachedServerEnv = parsed.data
  return cachedServerEnv
}
