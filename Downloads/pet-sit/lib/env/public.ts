import { z } from "zod"

function preprocessTrimmedString(value: unknown) {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const requiredString = z.preprocess(preprocessTrimmedString, z.string().min(1))
const requiredUrl = z.preprocess(preprocessTrimmedString, z.string().url())
const optionalString = z.preprocess(preprocessTrimmedString, z.string().min(1).optional())
const optionalUrl = z.preprocess(preprocessTrimmedString, z.string().url().optional())

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_ADMIN_APP_URL: optionalUrl,

  NEXT_PUBLIC_SUPABASE_URL: requiredUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString,

  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,

  NEXT_PUBLIC_POSTHOG_KEY: optionalString,
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,

  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,

  NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL: optionalUrl,
})

export type PublicEnv = z.infer<typeof publicEnvSchema>

let cachedPublicEnv: PublicEnv | null = null

function formatZodIssues(issues: z.ZodIssue[]) {
  return issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n")
}

export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv

  // Important: In Next.js client bundles, `process.env` is not a real env object.
  // Only direct property access (e.g. `process.env.NEXT_PUBLIC_*`) is inlined at build time.
  // So we build a raw object explicitly to ensure values are available on the client.
  const raw = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ADMIN_APP_URL: process.env.NEXT_PUBLIC_ADMIN_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL,
  }

  const parsed = publicEnvSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(
      [
        "[sitswap] Invalid environment variables.",
        formatZodIssues(parsed.error.issues),
        "",
        "Copy `.env.example` to `.env.local` and set the required values.",
      ].join("\n"),
    )
  }

  cachedPublicEnv = {
    ...parsed.data,
    NEXT_PUBLIC_POSTHOG_HOST: parsed.data.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
  }

  return cachedPublicEnv
}
