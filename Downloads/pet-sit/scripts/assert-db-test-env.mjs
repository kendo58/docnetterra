#!/usr/bin/env node

import process from "node:process"

const required = [
  ["SUPABASE_TEST_URL", "E2E_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"],
  ["SUPABASE_TEST_SERVICE_ROLE_KEY", "E2E_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
]

function isSet(name) {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0
}

const missing = []

for (const requirement of required) {
  const [preferred, ...aliases] = requirement
  const satisfied = requirement.some((name) => isSet(name))
  if (!satisfied) {
    missing.push(`${preferred} (or ${aliases.join(" / ")})`)
  }
}

if (missing.length > 0) {
  console.error("[sitswap] Missing required database integration environment variables:")
  for (const name of missing) {
    console.error(`- ${name}`)
  }
  process.exit(1)
}

console.log("[sitswap] Database integration env assertion passed.")
