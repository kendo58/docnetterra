"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import posthog from "posthog-js"

type PosthogClient = typeof posthog & { __loaded?: boolean }

export function ProductAnalytics() {
  const pathname = usePathname()

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com"

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!posthogKey) return
    if ((posthog as PosthogClient).__loaded) return

    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false,
    })
  }, [posthogKey, posthogHost])

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!posthogKey) return

    const url = window.location.href
    posthog.capture("$pageview", { $current_url: url })
  }, [pathname, posthogKey])

  return null
}
