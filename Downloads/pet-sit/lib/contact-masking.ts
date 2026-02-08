/**
 * Contact Information Masking Utility
 * Detects and masks phone numbers, emails, social media handles, and URLs
 * to prevent users from circumventing the platform
 */

// Phone pattern: matches formats like (123) 456-7890, 123-456-7890, +1 123 456 7890, etc.
const phonePattern = /([+]?1?[-.\s]?[(]?\d{3}[)]?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,})/g

// Obfuscated email pattern: matches "user [at] domain [dot] com" style
const obfuscatedEmailPattern =
  /[a-zA-Z0-9._%+-]+\s*(\[at\]|$$at$$|at|@)\s*[a-zA-Z0-9.-]+\s*(\[dot\]|$$dot$$|dot|\.)\s*[a-zA-Z]{2,}/gi

// Patterns for detecting contact information
const CONTACT_PATTERNS = {
  // Phone numbers (various formats)
  phone: phonePattern,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // Social media handles (@username)
  socialHandle: /@[a-zA-Z0-9_]{3,}/g,

  // URLs (http, https, www)
  url: /(https?:\/\/[^\s]+|www\.[^\s]+)/gi,

  // Common social media domain mentions
  socialDomains:
    /\b(instagram|facebook|twitter|tiktok|snapchat|whatsapp|telegram|signal|discord|linkedin)\b\.?(com|me|org)?\b/gi,

  // Phone number words (trying to spell out numbers)
  phoneWords:
    /\b(one|two|three|four|five|six|seven|eight|nine|zero|oh)\s+(one|two|three|four|five|six|seven|eight|nine|zero|oh)\s+(one|two|three|four|five|six|seven|eight|nine|zero|oh)/gi,

  // Obfuscated emails (at symbol alternatives)
  obfuscatedEmail: obfuscatedEmailPattern,
}

// Warning message to display when contact info is detected
const MASKED_TEXT = "[Contact info hidden until swap confirmed]"
const WARNING_MESSAGE = "For your safety, contact information is hidden until a swap is confirmed through SitSwap."

export interface MaskingResult {
  maskedContent: string
  containsContactInfo: boolean
  detectedTypes: string[]
}

/**
 * Resets regex lastIndex to avoid issues with global flag
 */
function resetPatterns() {
  Object.values(CONTACT_PATTERNS).forEach((pattern) => {
    pattern.lastIndex = 0
  })
}

/**
 * Masks contact information in a message
 */
export function maskContactInfo(content: string): MaskingResult {
  let maskedContent = content
  const detectedTypes: string[] = []

  // Reset patterns before testing
  resetPatterns()

  // Check and mask each pattern
  if (CONTACT_PATTERNS.phone.test(content)) {
    CONTACT_PATTERNS.phone.lastIndex = 0
    maskedContent = maskedContent.replace(CONTACT_PATTERNS.phone, MASKED_TEXT)
    detectedTypes.push("phone")
  }

  if (CONTACT_PATTERNS.email.test(content)) {
    CONTACT_PATTERNS.email.lastIndex = 0
    maskedContent = maskedContent.replace(CONTACT_PATTERNS.email, MASKED_TEXT)
    detectedTypes.push("email")
  }

  if (CONTACT_PATTERNS.socialHandle.test(content)) {
    CONTACT_PATTERNS.socialHandle.lastIndex = 0
    maskedContent = maskedContent.replace(CONTACT_PATTERNS.socialHandle, MASKED_TEXT)
    detectedTypes.push("social_handle")
  }

  if (CONTACT_PATTERNS.url.test(content)) {
    CONTACT_PATTERNS.url.lastIndex = 0
    maskedContent = maskedContent.replace(CONTACT_PATTERNS.url, MASKED_TEXT)
    detectedTypes.push("url")
  }

  if (CONTACT_PATTERNS.socialDomains.test(content)) {
    CONTACT_PATTERNS.socialDomains.lastIndex = 0
    maskedContent = maskedContent.replace(CONTACT_PATTERNS.socialDomains, MASKED_TEXT)
    detectedTypes.push("social_domain")
  }

  if (CONTACT_PATTERNS.phoneWords.test(content)) {
    CONTACT_PATTERNS.phoneWords.lastIndex = 0
    maskedContent = maskedContent.replace(CONTACT_PATTERNS.phoneWords, MASKED_TEXT)
    detectedTypes.push("phone_words")
  }

  if (CONTACT_PATTERNS.obfuscatedEmail.test(content)) {
    CONTACT_PATTERNS.obfuscatedEmail.lastIndex = 0
    maskedContent = maskedContent.replace(CONTACT_PATTERNS.obfuscatedEmail, MASKED_TEXT)
    detectedTypes.push("obfuscated_email")
  }

  return {
    maskedContent,
    containsContactInfo: detectedTypes.length > 0,
    detectedTypes,
  }
}

/**
 * Checks if content contains contact information without masking
 */
export function containsContactInfo(content: string): boolean {
  resetPatterns()
  return (
    CONTACT_PATTERNS.phone.test(content) ||
    CONTACT_PATTERNS.email.test(content) ||
    CONTACT_PATTERNS.socialHandle.test(content) ||
    CONTACT_PATTERNS.url.test(content) ||
    CONTACT_PATTERNS.socialDomains.test(content) ||
    CONTACT_PATTERNS.phoneWords.test(content) ||
    CONTACT_PATTERNS.obfuscatedEmail.test(content)
  )
}

/**
 * Returns the warning message for contact info detection
 */
export function getContactWarningMessage(): string {
  return WARNING_MESSAGE
}

/**
 * Masks profile contact information for public view
 */
export function maskProfileContact(value: string | null | undefined): string {
  if (!value) return "Hidden"

  // For emails, show partial
  if (value.includes("@")) {
    const [local, domain] = value.split("@")
    if (local.length <= 2) return "**@" + domain.charAt(0) + "***"
    return local.charAt(0) + "***@" + domain.charAt(0) + "***"
  }

  // For phone numbers, show last 4 digits
  const digits = value.replace(/\D/g, "")
  if (digits.length >= 4) {
    return "***-***-" + digits.slice(-4)
  }

  return "Hidden"
}
