import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getPublicEnv } from "@/lib/env/public"
import { getOrCreateRequestId } from "@/lib/observability/request-id"
import { attachRequestId } from "@/lib/observability/response"

export async function updateSession(request: NextRequest) {
  const requestId = getOrCreateRequestId(request.headers)

  const nextResponse = () => {
    const headers = new Headers(request.headers)
    headers.set("x-request-id", requestId)
    return attachRequestId(NextResponse.next({ request: { headers } }), requestId)
  }

  let supabaseResponse = nextResponse()

  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/" ||
    pathname === "/search" ||
    pathname === "/help" ||
    pathname === "/legal"
  ) {
    return supabaseResponse
  }

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv()
  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = nextResponse()
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const protectedRoutes = ["/dashboard", "/bookings", "/sits", "/profile", "/swipe", "/availability", "/matches", "/messages"]
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (!isProtectedRoute) {
    return supabaseResponse
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    clearTimeout(timeoutId)

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return attachRequestId(NextResponse.redirect(url), requestId)
    }
  } catch (error) {
    console.error("[sitswap] Middleware auth error (allowing request to continue):", error)
    // Don't redirect - let the page components handle their own auth
    return supabaseResponse
  }

  return supabaseResponse
}
