const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_PREFIX = [0xff, 0xd8, 0xff]
const RIFF_PREFIX = [0x52, 0x49, 0x46, 0x46]
const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50]

function hasBytesAt(bytes: Uint8Array, offset: number, expected: number[]) {
  if (bytes.length < offset + expected.length) return false
  for (let i = 0; i < expected.length; i += 1) {
    if (bytes[offset + i] !== expected[i]) return false
  }
  return true
}

export function sanitizeUploadFolder(folder: string | null): string {
  if (!folder) return "uploads"

  const cleaned = folder
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "")

  if (!cleaned) return "uploads"

  const safeSegments = cleaned
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
    .slice(0, 4)

  return safeSegments.length > 0 ? safeSegments.join("/") : "uploads"
}

export function getUploadExtension(fileType: string): string | null {
  return ALLOWED_MIME_TYPES.get(fileType) ?? null
}

export function detectUploadMimeType(bytes: Uint8Array): string | null {
  if (hasBytesAt(bytes, 0, PNG_SIGNATURE)) return "image/png"
  if (hasBytesAt(bytes, 0, JPEG_PREFIX)) return "image/jpeg"
  if (hasBytesAt(bytes, 0, RIFF_PREFIX) && hasBytesAt(bytes, 8, WEBP_MARKER)) return "image/webp"
  return null
}
