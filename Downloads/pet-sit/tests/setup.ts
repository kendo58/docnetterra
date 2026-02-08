import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

vi.mock("server-only", () => ({}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// Radix / floating UI often needs these in JSDOM.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const globalWithObservers = globalThis as typeof globalThis & {
  ResizeObserver?: typeof NoopObserver
  IntersectionObserver?: typeof NoopObserver
}

globalWithObservers.ResizeObserver = globalWithObservers.ResizeObserver ?? NoopObserver
globalWithObservers.IntersectionObserver = globalWithObservers.IntersectionObserver ?? NoopObserver
