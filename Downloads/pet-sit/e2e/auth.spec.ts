import { expect, test } from "@playwright/test"
import { getE2EAuthEnv } from "./e2e-env"

const env = getE2EAuthEnv()

test.describe("authenticated flows", () => {
  test.skip(!env.enabled, !env.enabled ? `Missing env vars: ${env.missing.join(", ")}` : undefined)

  test("user can sign in and browse search", async ({ page }) => {
    if (!env.enabled) return

    await page.goto("/auth/login")

    await page.getByLabel("Email").fill(env.email)
    await page.getByLabel("Password").fill(env.password)
    await page.getByRole("button", { name: /sign in/i }).click()

    await page.waitForURL("**/dashboard**", { timeout: 30_000 })

    await page.goto("/search")
    await expect(page.getByRole("heading", { level: 1, name: /listing/i })).toBeVisible()

    await page.getByRole("link", { name: "Map" }).click()
    await expect(page).toHaveURL(/view=map/)

    await page.getByRole("link", { name: "List" }).click()
    await expect(page).not.toHaveURL(/view=map/)
  })
})
