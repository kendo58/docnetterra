"use client"

import * as Sentry from "@sentry/browser"

let initialized = false

export function initSentryClient() {
  if (initialized) return

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  })

  initialized = true
}

export function captureClientException(error: unknown) {
  initSentryClient()
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  Sentry.captureException(error)
}

