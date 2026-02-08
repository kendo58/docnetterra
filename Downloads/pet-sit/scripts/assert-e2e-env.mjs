#!/usr/bin/env node

import process from "node:process"

const required = [
  "E2E_TEST_EMAIL",
  "E2E_TEST_PASSWORD",
  ["E2E_SUPABASE_URL", "SUPABASE_TEST_URL", "NEXT_PUBLIC_SUPABASE_URL"],
  ["E2E_SUPABASE_ANON_KEY", "SUPABASE_TEST_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  ["E2E_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_TEST_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
]

function isSet(name) {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0
}

const missing = []

for (const requirement of required) {
  if (Array.isArray(requirement)) {
    const [preferred, ...aliases] = requirement
    const satisfied = requirement.some((name) => isSet(name))
    if (!satisfied) {
      missing.push(`${preferred} (or ${aliases.join(" / ")})`)
    }
    continue
  }

  if (!isSet(requirement)) {
    missing.push(requirement)
  }
}

if (missing.length > 0) {
  console.error("[sitswap] Missing required E2E environment variables:")
  for (const name of missing) {
    console.error(`- ${name}`)
  }
  process.exit(1)
}

console.log("[sitswap] E2E env assertion passed.")
