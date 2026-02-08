const ADMIN_PATH_PREFIX = "/admin"

function normalizeBasePath(pathname: string): string {
  if (!pathname || pathname === "/") return ""
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
}

function parseAdminPortalUrl(value: string | undefined): URL | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    return new URL(trimmed)
  } catch {
    return null
  }
}

export function getAdminPortalBaseUrl(env: Record<string, string | undefined> = process.env): URL | null {
  return parseAdminPortalUrl(env.ADMIN_APP_URL) ?? parseAdminPortalUrl(env.NEXT_PUBLIC_ADMIN_APP_URL)
}

export function buildAdminPortalUrl(baseUrl: URL, adminPath: string, search: string): URL {
  const target = new URL(baseUrl.toString())
  const normalizedBasePath = normalizeBasePath(target.pathname)
  target.pathname = `${normalizedBasePath}${adminPath}`.replace(/\/{2,}/g, "/")
  target.search = search
  return target
}

export function resolveAdminPortalRedirect(requestUrl: URL, adminBaseUrl: URL | null): URL | null {
  if (!adminBaseUrl) return null

  if (!(requestUrl.pathname === ADMIN_PATH_PREFIX || requestUrl.pathname.startsWith(`${ADMIN_PATH_PREFIX}/`))) {
    return null
  }

  const target = buildAdminPortalUrl(adminBaseUrl, requestUrl.pathname, requestUrl.search)
  if (target.toString() === requestUrl.toString()) return null
  return target
}
