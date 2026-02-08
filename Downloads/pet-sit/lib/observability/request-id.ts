export function getOrCreateRequestId(headers: Headers): string {
  const existing = headers.get("x-request-id")
  if (existing && existing.trim().length > 0) return existing

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
