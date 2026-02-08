import { updateSession } from "@/lib/supabase/proxy"
import { getAdminPortalBaseUrl, resolveAdminPortalRedirect } from "@/lib/routing/admin-portal"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const adminPortalBaseUrl = getAdminPortalBaseUrl()
  const adminPortalRedirect = resolveAdminPortalRedirect(request.nextUrl, adminPortalBaseUrl)
  if (adminPortalRedirect) {
    return NextResponse.redirect(adminPortalRedirect, 307)
  }

  if (
    process.env.NODE_ENV === "production" &&
    (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) &&
    !adminPortalBaseUrl
  ) {
    return new NextResponse("Admin portal is served from a dedicated deployment.", { status: 503 })
  }

  return updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
