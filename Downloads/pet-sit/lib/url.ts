import { headers } from "next/headers"

/**
 * Get the site URL automatically from request headers
 * Works in both development and production without environment variables
 */
export async function getSiteUrl(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get("host")
  const protocol = headersList.get("x-forwarded-proto") || "http"

  if (host) {
    return `${protocol}://${host}`
  }

  // Fallback for local development
  return "http://localhost:3000"
}
