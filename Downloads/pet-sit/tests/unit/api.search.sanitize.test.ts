import { describe, expect, it } from "vitest"
import { sanitizeSearchFallbackTerm } from "@/lib/utils/search-filters"

describe("search fallback query sanitization", () => {
  it("removes postgrest control characters and wildcard symbols", () => {
    const raw = "cats%),description.ilike.%dogs(_\n"
    expect(sanitizeSearchFallbackTerm(raw)).toBe("cats description.ilike. dogs")
  })

  it("trims and enforces a max length", () => {
    const raw = "a".repeat(400)
    expect(sanitizeSearchFallbackTerm(raw)).toHaveLength(120)
  })
})
