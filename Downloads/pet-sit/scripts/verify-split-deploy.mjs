function getRequiredEnv(name) {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function normalizeOrigin(value) {
  const url = new URL(value)
  const path = url.pathname.replace(/\/$/, "")
  return `${url.origin}${path}`
}

function buildUrl(base, path) {
  return new URL(path, `${base}/`).toString()
}

function fail(message) {
  console.error(`[sitswap] split-deploy verification failed: ${message}`)
  process.exit(1)
}

async function fetchNoRedirect(url) {
  return fetch(url, { method: "GET", redirect: "manual" })
}

async function verify() {
  const webOrigin = normalizeOrigin(getRequiredEnv("SITSWAP_WEB_APP_URL"))
  const adminOrigin = normalizeOrigin(getRequiredEnv("SITSWAP_ADMIN_APP_URL"))

  console.log(`[sitswap] verifying web origin: ${webOrigin}`)
  console.log(`[sitswap] verifying admin origin: ${adminOrigin}`)

  const webHealth = await fetchNoRedirect(buildUrl(webOrigin, "/api/health"))
  if (!webHealth.ok) fail(`web /api/health returned status ${webHealth.status}`)

  let webHealthJson = null
  try {
    webHealthJson = await webHealth.json()
  } catch {
    fail("web /api/health did not return valid JSON")
  }

  if (webHealthJson?.status !== "healthy" && webHealthJson?.status !== "degraded" && webHealthJson?.status !== "ok") {
    fail(`web /api/health unexpected status payload: ${JSON.stringify(webHealthJson)}`)
  }

  const webAdmin = await fetchNoRedirect(buildUrl(webOrigin, "/admin"))
  if (webAdmin.status !== 307 && webAdmin.status !== 308) {
    fail(`web /admin expected 307/308 redirect, got ${webAdmin.status}`)
  }

  const webAdminLocation = webAdmin.headers.get("location")
  if (!webAdminLocation) fail("web /admin redirect missing location header")

  const expectedPrefix = `${adminOrigin}/admin`
  if (!webAdminLocation.startsWith(expectedPrefix)) {
    fail(`web /admin redirect mismatch: expected prefix ${expectedPrefix}, got ${webAdminLocation}`)
  }

  const adminLogin = await fetchNoRedirect(buildUrl(adminOrigin, "/admin/login"))
  if (!adminLogin.ok) {
    fail(`admin /admin/login returned status ${adminLogin.status}`)
  }

  console.log("[sitswap] split-deploy verification passed.")
}

verify().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  fail(message)
})
