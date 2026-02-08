type LogLevel = "debug" | "info" | "warn" | "error"

type LogFields = Record<string, unknown>
type ErrorWithCause = Error & { cause?: unknown }

const consoleByLevel: Record<LogLevel, (message?: unknown, ...optionalParams: unknown[]) => void> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

function serializeError(error: unknown) {
  if (!error) return undefined
  if (error instanceof Error) {
    const errorWithCause = error as ErrorWithCause
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: errorWithCause.cause,
    }
  }
  return { message: String(error) }
}

export function log(level: LogLevel, message: string, fields: LogFields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  }

  const out = JSON.stringify(payload)
  const fn = consoleByLevel[level] ?? console.log
  fn(out)
}

export function logError(message: string, error: unknown, fields: LogFields = {}) {
  log("error", message, { ...fields, error: serializeError(error) })
}
