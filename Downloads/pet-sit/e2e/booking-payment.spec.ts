import { expect, test, type Page } from "@playwright/test"
import { getE2EAuthEnv } from "./e2e-env"
import { readBookingFixtures } from "./booking-fixtures"

const authEnv = getE2EAuthEnv()

function getBookingFixtureIds() {
  const seededFixtures = readBookingFixtures()
  return {
    paymentBookingId: process.env.E2E_BOOKING_PAYMENT_ID?.trim() || seededFixtures?.paymentBookingId,
    cancellationBookingId: process.env.E2E_BOOKING_CANCELLATION_ID?.trim() || seededFixtures?.cancellationBookingId,
  }
}

async function login(page: Page) {
  await page.goto("/auth/login")
  await page.getByLabel("Email").fill(authEnv.enabled ? authEnv.email : "")
  await page.getByLabel("Password").fill(authEnv.enabled ? authEnv.password : "")
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL("**/dashboard**", { timeout: 30_000 })
}

test.describe("booking payment and cancellation flows", () => {
  test.skip(!authEnv.enabled, !authEnv.enabled ? `Missing auth env vars: ${authEnv.missing.join(", ")}` : undefined)

  test("sitter can open booking payment page from sit details", async ({ page }) => {
    const { paymentBookingId } = getBookingFixtureIds()
    test.skip(!paymentBookingId, "Set E2E_BOOKING_PAYMENT_ID to run booking payment flow E2E")
    if (!authEnv.enabled || !paymentBookingId) return

    await login(page)

    await page.goto(`/sits/${paymentBookingId}`)
    await expect(page.getByRole("heading", { level: 1, name: /sit details/i })).toBeVisible()

    const payButton = page.getByRole("button", { name: /complete payment/i })
    await expect(payButton).toBeVisible()
    await payButton.click()

    await page.waitForURL(new RegExp(`/sits/${paymentBookingId}/payment`), { timeout: 30_000 })
    await expect(page.getByRole("heading", { name: /complete payment/i })).toBeVisible()
  })

  test("cancellation flow can be initiated and submitted", async ({ page }) => {
    const { cancellationBookingId } = getBookingFixtureIds()
    test.skip(!cancellationBookingId, "Set E2E_BOOKING_CANCELLATION_ID to run cancellation/refund E2E")
    if (!authEnv.enabled || !cancellationBookingId) return

    await login(page)

    await page.goto(`/sits/${cancellationBookingId}`)
    await expect(page.getByRole("heading", { level: 1, name: /sit details/i })).toBeVisible()

    const cancelButton = page.getByRole("button", { name: /^cancel$/i })
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()

    await expect(page.getByRole("heading", { name: /cancel this sit/i })).toBeVisible()
    await page.getByLabel("Change of plans").click()
    await page.getByRole("button", { name: /confirm cancellation/i }).click()

    await expect(page.getByRole("heading", { name: /cancel this sit/i })).not.toBeVisible({ timeout: 10_000 })
  })
})
