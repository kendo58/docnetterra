import "server-only"

export function getClientIp(headers: Headers): string | null {
  const cfConnectingIp = headers.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp.trim()

  const xRealIp = headers.get("x-real-ip")
  if (xRealIp) return xRealIp.trim()

  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list: client, proxy1, proxy2...
    const first = forwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  return null
}

