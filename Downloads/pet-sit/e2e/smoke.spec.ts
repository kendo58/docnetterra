import { expect, test } from "@playwright/test"

test("homepage renders core UI", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("banner").getByRole("link", { name: /sitswap/i })).toBeVisible()
  await expect(page.getByRole("heading", { name: /free stays/i })).toBeVisible()

  // Airbnb-inspired quick search tabs
  await expect(page.getByRole("button", { name: "All" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Find a Sitter" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Looking for Stay" })).toBeVisible()
})

test("quick search location popover opens", async ({ page }) => {
  await page.goto("/")

  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: /choose location/i }).click()
  await expect(page.getByText("Search destinations")).toBeVisible()
})

test("/api/health responds", async ({ request }) => {
  const res = await request.get("/api/health")
  expect(res.status()).toBe(200)
  await expect(res).toBeOK()

  const body = (await res.json()) as { status?: string }
  expect(["ok", "degraded"]).toContain(body.status)
})
