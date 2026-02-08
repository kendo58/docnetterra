#!/usr/bin/env node

import { performance } from "node:perf_hooks"

function readArg(name, fallback) {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (direct) return direct.slice(name.length + 3)
  const idx = process.argv.indexOf(`--${name}`)
  if (idx !== -1) return process.argv[idx + 1]
  return fallback
}

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[rank]
}

async function runScenario(scenario) {
  const latenciesMs = []
  const statusCounts = new Map()
  let failures = 0
  let started = 0

  async function worker() {
    while (true) {
      const index = started
      started += 1
      if (index >= scenario.requests) return

      const startedAt = performance.now()
      try {
        const res = await fetch(scenario.url, {
          method: scenario.method,
          headers: scenario.headers,
          body: scenario.body,
        })
        const elapsed = performance.now() - startedAt
        latenciesMs.push(elapsed)
        statusCounts.set(res.status, (statusCounts.get(res.status) ?? 0) + 1)
        if (!scenario.acceptedStatuses.includes(res.status)) {
          failures += 1
        }
      } catch {
        failures += 1
      }
    }
  }

  const workers = Array.from({ length: scenario.concurrency }, () => worker())
  await Promise.all(workers)

  const total = latenciesMs.length
  const p50 = percentile(latenciesMs, 50)
  const p95 = percentile(latenciesMs, 95)
  const p99 = percentile(latenciesMs, 99)

  return {
    total,
    failures,
    failureRate: total === 0 ? 1 : failures / total,
    p50,
    p95,
    p99,
    statusCounts,
  }
}

async function main() {
  const baseUrl = (readArg("base-url", process.env.LOAD_TEST_BASE_URL ?? "http://127.0.0.1:3000") ?? "").replace(/\/$/, "")
  const scenarioName = readArg("scenario", "smoke")
  const searchCookie = process.env.LOAD_TEST_AUTH_COOKIE?.trim()

  const scenarios = [
    {
      name: "health",
      method: "GET",
      url: `${baseUrl}/api/health`,
      headers: {},
      requests: 100,
      concurrency: 20,
      acceptedStatuses: [200],
    },
    {
      name: "geocode",
      method: "GET",
      url: `${baseUrl}/api/geocode?city=Austin&state=TX&country=US`,
      headers: {},
      requests: 80,
      concurrency: 10,
      acceptedStatuses: [200, 429],
    },
  ]

  if (scenarioName !== "smoke" && searchCookie) {
    scenarios.push({
      name: "search-authenticated",
      method: "GET",
      url: `${baseUrl}/api/search?q=dog&limit=20`,
      headers: {
        cookie: searchCookie,
      },
      requests: 80,
      concurrency: 8,
      acceptedStatuses: [200, 429],
    })
  }

  if (scenarioName !== "smoke") {
    scenarios.push({
      name: "webhook-ingestion-invalid-signature",
      method: "POST",
      url: `${baseUrl}/api/stripe/webhook`,
      headers: {
        "content-type": "application/json",
        "stripe-signature": "invalid-signature",
      },
      body: "{}",
      requests: 100,
      concurrency: 20,
      acceptedStatuses: [400, 503],
    })
  }

  console.log(`[loadtest] Base URL: ${baseUrl}`)
  console.log(`[loadtest] Scenario: ${scenarioName}`)
  if (scenarioName !== "smoke" && !searchCookie) {
    console.log("[loadtest] Skipping authenticated search scenario (LOAD_TEST_AUTH_COOKIE missing)")
  }

  let overallFailures = 0
  let overallTotal = 0

  for (const scenario of scenarios) {
    console.log(`\n[loadtest] Running ${scenario.name} (${scenario.requests} requests @ ${scenario.concurrency} concurrency)`)
    const result = await runScenario(scenario)
    overallFailures += result.failures
    overallTotal += result.total

    const statuses = [...result.statusCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([status, count]) => `${status}:${count}`)
      .join(", ")

    console.log(
      `[loadtest] ${scenario.name} -> total=${result.total} failures=${result.failures} failureRate=${(
        result.failureRate * 100
      ).toFixed(2)}% p50=${result.p50.toFixed(1)}ms p95=${result.p95.toFixed(1)}ms p99=${result.p99.toFixed(1)}ms statuses=[${statuses}]`,
    )
  }

  const overallFailureRate = overallTotal === 0 ? 1 : overallFailures / overallTotal
  if (overallFailureRate > 0.02) {
    console.error(
      `[loadtest] Failure rate ${(
        overallFailureRate * 100
      ).toFixed(2)}% exceeded threshold 2.00%. Investigate before release.`,
    )
    process.exit(1)
  }

  console.log(
    `\n[loadtest] Completed. Overall total=${overallTotal}, failures=${overallFailures}, failureRate=${(
      overallFailureRate * 100
    ).toFixed(2)}%`,
  )
}

main().catch((error) => {
  console.error("[loadtest] Unhandled error:", error)
  process.exit(1)
})
