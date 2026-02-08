import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import nextEnv from "@next/env"

const { loadEnvConfig } = nextEnv

function parseBoolean(raw, fallback = false) {
  if (typeof raw !== "string") return fallback
  const normalized = raw.trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true
  if (normalized === "false" || normalized === "0" || normalized === "no") return false
  return fallback
}

function hasNonEmptyEnv(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0
}

function validateProductionConfig() {
  if (parseBoolean(process.env.SITSWAP_SKIP_PROD_CONFIG_CHECK, false)) {
    console.warn("[sitswap] Skipping production config check (SITSWAP_SKIP_PROD_CONFIG_CHECK=true)")
    return
  }

  const issues = []

  const requiredEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]
  for (const name of requiredEnv) {
    if (!hasNonEmptyEnv(name)) issues.push(`${name} is required`)
  }

  if (!hasNonEmptyEnv("STRIPE_SECRET_KEY")) {
    issues.push("STRIPE_SECRET_KEY is required")
  }
  if (!hasNonEmptyEnv("STRIPE_WEBHOOK_SECRET")) {
    issues.push("STRIPE_WEBHOOK_SECRET is required")
  }
  if (!hasNonEmptyEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")) {
    issues.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required")
  }

  if (parseBoolean(process.env.ALLOW_MANUAL_BOOKING_PAYMENTS, false)) {
    issues.push("ALLOW_MANUAL_BOOKING_PAYMENTS must be false in production")
  }

  if (!parseBoolean(process.env.SITSWAP_WORKER_ENABLED, false)) {
    issues.push("SITSWAP_WORKER_ENABLED must be true in production")
  }

  if (!hasNonEmptyEnv("ADMIN_APP_URL") && !hasNonEmptyEnv("NEXT_PUBLIC_ADMIN_APP_URL")) {
    issues.push("ADMIN_APP_URL or NEXT_PUBLIC_ADMIN_APP_URL is required in production for admin split-deploy")
  }

  if (issues.length > 0) {
    console.error("[sitswap] Production config check failed:")
    for (const issue of issues) {
      console.error(`- ${issue}`)
    }
    process.exit(1)
  }
}

function parsePortArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if ((arg === "-p" || arg === "--port") && argv[i + 1]) {
      const port = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(port) && port > 0) return port
    }
  }
  return null
}

function readBuildId(distDir) {
  try {
    return fs.readFileSync(path.join(distDir, "BUILD_ID"), "utf8").trim()
  } catch {
    return null
  }
}

function ensureRuntime({ projectRoot, runtimeDir }) {
  const nextDir = path.join(projectRoot, ".next")
  const standaloneDir = path.join(nextDir, "standalone")
  const staticDir = path.join(nextDir, "static")
  const publicDir = path.join(projectRoot, "public")

  const standaloneServer = path.join(standaloneDir, "server.js")
  if (!fs.existsSync(standaloneServer)) {
    console.error("[sitswap] Missing standalone build output.")
    console.error("Run `npm run build` first.")
    process.exit(1)
  }

  const buildId = readBuildId(nextDir)
  const runtimeBuildId = readBuildId(path.join(runtimeDir, ".next"))

  const runtimeIsFresh =
    buildId &&
    runtimeBuildId &&
    buildId === runtimeBuildId &&
    fs.existsSync(path.join(runtimeDir, "server.js")) &&
    fs.existsSync(path.join(runtimeDir, ".next", "static")) &&
    fs.existsSync(path.join(runtimeDir, "public"))

  if (runtimeIsFresh) return

  fs.rmSync(runtimeDir, { recursive: true, force: true })
  fs.mkdirSync(runtimeDir, { recursive: true })

  fs.cpSync(standaloneDir, runtimeDir, { recursive: true })

  // The standalone output expects `public/` and `.next/static/` to exist at runtime root.
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, path.join(runtimeDir, "public"), { recursive: true })
  }
  if (fs.existsSync(staticDir)) {
    fs.cpSync(staticDir, path.join(runtimeDir, ".next", "static"), { recursive: true })
  }
}

function main() {
  process.env.NODE_ENV = "production"
  const projectRoot = process.cwd()
  const runtimeDir = path.join(projectRoot, ".next", "prod-run")

  loadEnvConfig(projectRoot)
  validateProductionConfig()

  const port = parsePortArg(process.argv.slice(2))
  if (port) process.env.PORT = String(port)

  ensureRuntime({ projectRoot, runtimeDir })

  const child = spawn(process.execPath, ["server.js"], {
    cwd: runtimeDir,
    env: process.env,
    stdio: "inherit",
  })

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 0)
  })

  process.on("SIGINT", () => child.kill("SIGINT"))
  process.on("SIGTERM", () => child.kill("SIGTERM"))
}

main()
