// @vitest-environment happy-dom

import React from "react"
import { describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuickSearch } from "@/components/features/quick-search"

function ensureRequestSubmit() {
  // JSDOM doesn't always implement requestSubmit
  if (!("requestSubmit" in HTMLFormElement.prototype)) {
    // @ts-expect-error - polyfill for tests
    HTMLFormElement.prototype.requestSubmit = function requestSubmit() {}
  }
}

describe("<QuickSearch />", () => {
  it("renders chips from defaults and clears keyword chip", async () => {
    ensureRequestSubmit()

    vi.stubGlobal("requestAnimationFrame", ((cb: FrameRequestCallback) => {
      cb(0)
      return 0
    }) as unknown as typeof requestAnimationFrame)

    const submitSpy = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {})

    render(
      <QuickSearch
        showChips
        defaults={{
          q: "gardening",
          city: "Seattle",
          state: "WA",
          listing_type: "stay",
        }}
      />,
    )

    expect(screen.getAllByText("Seattle, WA").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Looking for Stay").length).toBeGreaterThan(0)
    expect(screen.getAllByText("“gardening”").length).toBeGreaterThan(0)

    const user = userEvent.setup()
    await user.click(screen.getAllByText("“gardening”")[0])

    expect((screen.getByPlaceholderText("Pets, chores, keywords") as HTMLInputElement).value).toBe("")
    expect(submitSpy).toHaveBeenCalled()
  })

  it("collapses on scroll and expands when clicked", async () => {
    ensureRequestSubmit()

    vi.stubGlobal("requestAnimationFrame", ((cb: FrameRequestCallback) => {
      cb(0)
      return 0
    }) as unknown as typeof requestAnimationFrame)

    Object.defineProperty(window, "scrollY", { value: 999, writable: true })

    render(<QuickSearch collapsible collapseAfter={10} sticky />)

    // useEffect runs after render; give it a tick by dispatching a scroll event
    await act(async () => {
      window.dispatchEvent(new Event("scroll"))
    })

    const openButton = await screen.findByRole("button", { name: /open search/i })
    expect(openButton).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(openButton)

    expect(await screen.findByText("Find a Sitter")).toBeInTheDocument()
  })
})
