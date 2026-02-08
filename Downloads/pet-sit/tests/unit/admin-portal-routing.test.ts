import { describe, expect, it } from "vitest"
import { buildAdminPortalUrl, getAdminPortalBaseUrl, resolveAdminPortalRedirect } from "@/lib/routing/admin-portal"

describe("admin portal routing", () => {
  it("returns null when admin portal env is not set", () => {
    const url = getAdminPortalBaseUrl({})
    expect(url).toBeNull()
  })

  it("prefers ADMIN_APP_URL over NEXT_PUBLIC_ADMIN_APP_URL", () => {
    const url = getAdminPortalBaseUrl({
      NEXT_PUBLIC_ADMIN_APP_URL: "https://admin-public.example.com",
      ADMIN_APP_URL: "https://admin-private.example.com",
    })

    expect(url?.toString()).toBe("https://admin-private.example.com/")
  })

  it("preserves admin path + query when redirecting to dedicated origin", () => {
    const requestUrl = new URL("https://app.example.com/admin/users?page=2&status=active")
    const adminBase = new URL("https://admin.example.com")

    const redirect = resolveAdminPortalRedirect(requestUrl, adminBase)
    expect(redirect?.toString()).toBe("https://admin.example.com/admin/users?page=2&status=active")
  })

  it("supports admin portal base path prefixes", () => {
    const target = buildAdminPortalUrl(new URL("https://example.com/portal"), "/admin/audit", "?page=3")
    expect(target.toString()).toBe("https://example.com/portal/admin/audit?page=3")
  })

  it("does not redirect non-admin routes", () => {
    const requestUrl = new URL("https://app.example.com/dashboard")
    const adminBase = new URL("https://admin.example.com")

    const redirect = resolveAdminPortalRedirect(requestUrl, adminBase)
    expect(redirect).toBeNull()
  })

  it("does not redirect when target matches source", () => {
    const requestUrl = new URL("https://admin.example.com/admin")
    const adminBase = new URL("https://admin.example.com")

    const redirect = resolveAdminPortalRedirect(requestUrl, adminBase)
    expect(redirect).toBeNull()
  })
})
