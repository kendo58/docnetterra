type PostgrestErrorLike = {
  message?: unknown
  details?: unknown
  hint?: unknown
  code?: unknown
  constraint?: unknown
}

export function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as PostgrestErrorLike
  if (e.code !== "42703") return false
  if (typeof e.message !== "string") return false
  return e.message.includes(columnName)
}

export function formatSupabaseError(error: unknown): string {
  if (!error) return "Unknown error"
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error

  if (typeof error === "object") {
    const e = error as PostgrestErrorLike
    const message = typeof e.message === "string" ? e.message : undefined
    const details = typeof e.details === "string" ? e.details : undefined
    const hint = typeof e.hint === "string" ? e.hint : undefined
    const code = typeof e.code === "string" ? e.code : undefined

    return [message, details, hint, code ? `(${code})` : undefined].filter(Boolean).join(" ")
  }

  try {
    return JSON.stringify(error)
  } catch {
    return "Unknown error"
  }
}

export function hasPostgresCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as PostgrestErrorLike
  return e.code === code
}

export function hasConstraintName(error: unknown, constraintName: string): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as PostgrestErrorLike

  if (typeof e.constraint === "string" && e.constraint === constraintName) {
    return true
  }

  const message = typeof e.message === "string" ? e.message : ""
  const details = typeof e.details === "string" ? e.details : ""
  return message.includes(constraintName) || details.includes(constraintName)
}
