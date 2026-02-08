import "server-only"

function parseOrigin(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function normalizeForwardedValue(value: string | null): string | null {
  if (!value) return null
  const first = value
    .split(",")[0]
    ?.trim()
    .toLowerCase()
  return first || null
}

export function hasTrustedOrigin(request: Request): boolean {
  const originHeader = request.headers.get("origin")
  if (!originHeader) {
    // Non-browser clients may omit Origin entirely.
    return true
  }

  const requestOrigin = parseOrigin(request.url)
  const incomingOrigin = parseOrigin(originHeader)
  if (!incomingOrigin) return false

  const trustedOrigins = new Set<string>()

  if (requestOrigin) trustedOrigins.add(requestOrigin)

  const forwardedHost = normalizeForwardedValue(request.headers.get("x-forwarded-host"))
  const host = forwardedHost ?? request.headers.get("host")?.trim().toLowerCase() ?? null
  if (host) {
    const forwardedProto = normalizeForwardedValue(request.headers.get("x-forwarded-proto"))
    const fallbackProto = requestOrigin ? new URL(requestOrigin).protocol.replace(":", "") : "https"
    const protocol = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : fallbackProto
    trustedOrigins.add(`${protocol}://${host}`)
  }

  const configuredAppOrigin = parseOrigin(process.env.NEXT_PUBLIC_APP_URL)
  if (configuredAppOrigin) trustedOrigins.add(configuredAppOrigin)

  return trustedOrigins.has(incomingOrigin)
}
