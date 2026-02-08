import "server-only"

import * as Sentry from "@sentry/node"

let initialized = false

export function initSentryServer() {
  if (initialized) return

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.SENTRY_ENVIRONMENT,
    release: process.env.SENTRY_RELEASE,
  })

  initialized = true
}

export function captureServerException(error: unknown) {
  initSentryServer()
  if (!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN)) return
  Sentry.captureException(error)
}

