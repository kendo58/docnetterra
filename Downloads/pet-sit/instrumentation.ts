export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { initSentryServer } = await import("./lib/observability/sentry-server")
  initSentryServer()
}

