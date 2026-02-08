import { describe, expect, it } from "vitest"
import { detectUploadMimeType, getUploadExtension, sanitizeUploadFolder } from "@/lib/utils/upload"

describe("upload helpers", () => {
  it("normalizes folder inputs to safe path segments", () => {
    expect(sanitizeUploadFolder(null)).toBe("uploads")
    expect(sanitizeUploadFolder(" /listing-images//../pets/ ")).toBe("listing-images/pets")
    expect(sanitizeUploadFolder("$$$")).toBe("uploads")
  })

  it("maps allowed mime types to canonical file extensions", () => {
    expect(getUploadExtension("image/jpeg")).toBe("jpg")
    expect(getUploadExtension("image/jpg")).toBe("jpg")
    expect(getUploadExtension("image/png")).toBe("png")
    expect(getUploadExtension("image/webp")).toBe("webp")
    expect(getUploadExtension("image/gif")).toBeNull()
  })

  it("detects png, jpeg, and webp from file signatures", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00])
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
    const unknown = new Uint8Array([0x00, 0x11, 0x22, 0x33])

    expect(detectUploadMimeType(png)).toBe("image/png")
    expect(detectUploadMimeType(jpeg)).toBe("image/jpeg")
    expect(detectUploadMimeType(webp)).toBe("image/webp")
    expect(detectUploadMimeType(unknown)).toBeNull()
  })
})
