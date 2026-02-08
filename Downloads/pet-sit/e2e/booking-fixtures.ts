import fs from "node:fs"
import path from "node:path"

export type BookingFixtures = {
  paymentBookingId?: string
  cancellationBookingId?: string
  generatedAt?: string
}

const FIXTURE_PATH = path.join(process.cwd(), "e2e", ".fixtures.json")

export function readBookingFixtures(): BookingFixtures | null {
  try {
    const raw = fs.readFileSync(FIXTURE_PATH, "utf8")
    const parsed = JSON.parse(raw) as BookingFixtures
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

