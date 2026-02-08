"use client"

import type React from "react"
import { useEffect } from "react"
import { initSentryClient } from "@/lib/observability/sentry-client"

export function ObservabilityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentryClient()
  }, [])

  return children
}

