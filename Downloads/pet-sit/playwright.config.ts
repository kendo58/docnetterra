import { defineConfig } from "@playwright/test"
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

const PORT = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3100", 10)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  globalSetup: "./e2e/global-setup.ts",
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `SITSWAP_SKIP_PROD_CONFIG_CHECK=true npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
