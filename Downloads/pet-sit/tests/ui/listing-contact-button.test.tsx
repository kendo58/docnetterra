// @vitest-environment happy-dom

import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ListingContactButton } from "@/components/features/listing-contact-button"

const pushMock = vi.fn()

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation")
  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
  }
})

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

type MockSupabase = ReturnType<typeof makeSupabaseMock>

function makeSupabaseMock(options: { existingConversationId?: string | null } = {}) {
  const existingConversationId = options.existingConversationId ?? null
  const createdConversationId = "conv_created"

  const channel = {
    subscribe: vi.fn(async () => ({ status: "SUBSCRIBED" })),
    send: vi.fn(async () => ({ status: "ok" })),
  }

  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user_1" } } })),
    },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "conversations") {
        let op: "select" | "insert" | "update" = "select"

        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => {
            if (op === "update") return Promise.resolve({ data: null, error: null })
            return builder
          }),
          or: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => ({
            data: existingConversationId ? { id: existingConversationId } : null,
            error: null,
          })),
          insert: vi.fn(() => {
            op = "insert"
            return builder
          }),
          update: vi.fn(() => {
            op = "update"
            return builder
          }),
          single: vi.fn(async () => ({
            data: { id: createdConversationId },
            error: null,
          })),
        }

        // Ensure `.select()` doesn't accidentally flip the op after `.insert()`.
        builder.select.mockImplementation(() => builder)

        return builder
      }

      if (table === "messages") {
        let inserted: { content?: string; sender_id?: string } | null = null
        const builder = {
          insert: vi.fn((payload: { content?: string; sender_id?: string }) => {
            inserted = payload
            return builder
          }),
          select: vi.fn(() => builder),
          single: vi.fn(async () => ({
            data: {
              id: "msg_1",
              content: inserted?.content ?? "",
              sender_id: inserted?.sender_id ?? "",
              created_at: "2025-01-01T00:00:00.000Z",
            },
            error: null,
          })),
        }
        return builder
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return supabase
}

vi.mock("@/lib/supabase/client", () => {
  const supabase: MockSupabase = makeSupabaseMock()
  return {
    createBrowserClient: () => supabase,
  }
})

describe("<ListingContactButton />", () => {
  it("creates a conversation + message and routes to it", async () => {
    const user = userEvent.setup()

    render(
      <ListingContactButton
        mode="invite"
        listingId="listing_1"
        listingTitle="Test Listing"
        recipientId="user_2"
        recipientName="Alex"
      />,
    )

    await user.click(screen.getByRole("button", { name: /invite to stay/i }))

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toContain("Test Listing")

    await user.click(screen.getByRole("button", { name: /^send$/i }))

    expect(pushMock).toHaveBeenCalledWith("/messages/conv_created")
  })
})
