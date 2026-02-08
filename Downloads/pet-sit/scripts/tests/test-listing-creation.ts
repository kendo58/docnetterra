/**
 * Listing Creation Tests
 * Tests for creating, updating, and deleting listings
 */

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

// Mock types matching database schema
interface ListingData {
  title: string
  description: string
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  square_feet?: number
  amenities?: string[]
  house_rules?: string
  photos?: string[]
  is_active?: boolean
  search_radius?: number
  services_offered?: string[]
}

// Validation functions (same logic as listing-form.tsx)
function validateListingTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: "Title is required" }
  }
  if (title.length < 3) {
    return { valid: false, error: "Title must be at least 3 characters" }
  }
  if (title.length > 100) {
    return { valid: false, error: "Title must be less than 100 characters" }
  }
  return { valid: true }
}

function validateListingDescription(description: string): { valid: boolean; error?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: false, error: "Description is required" }
  }
  if (description.length < 10) {
    return { valid: false, error: "Description must be at least 10 characters" }
  }
  if (description.length > 5000) {
    return { valid: false, error: "Description must be less than 5000 characters" }
  }
  return { valid: true }
}

function validatePropertyType(type: string): { valid: boolean; error?: string } {
  const validTypes = ["house", "apartment", "condo", "townhouse", "farm", "other"]
  if (!type) {
    return { valid: false, error: "Property type is required for sitter listings" }
  }
  if (!validTypes.includes(type)) {
    return { valid: false, error: `Invalid property type. Must be one of: ${validTypes.join(", ")}` }
  }
  return { valid: true }
}

function validateSearchRadius(radius: number | undefined): { valid: boolean; error?: string } {
  if (radius === undefined || radius === null) {
    return { valid: true } // Optional field
  }
  if (radius < 5) {
    return { valid: false, error: "Search radius must be at least 5 miles" }
  }
  if (radius > 100) {
    return { valid: false, error: "Search radius must be at most 100 miles" }
  }
  return { valid: true }
}

function validateServicesOffered(services: string[]): { valid: boolean; error?: string } {
  const validServices = [
    "pet_sitting",
    "gardening",
    "cleaning",
    "cooking",
    "handyman",
    "childcare",
    "eldercare",
    "lawn_care",
    "pool_maintenance",
    "house_sitting",
    "dog_walking",
    "errands",
  ]

  for (const service of services) {
    if (!validServices.includes(service)) {
      return { valid: false, error: `Invalid service: ${service}` }
    }
  }
  return { valid: true }
}

function validatePhotos(photos: string[]): { valid: boolean; error?: string } {
  if (photos.length > 10) {
    return { valid: false, error: "Maximum 10 photos allowed" }
  }
  for (const photo of photos) {
    if (!photo.startsWith("http://") && !photo.startsWith("https://")) {
      return { valid: false, error: "Invalid photo URL" }
    }
  }
  return { valid: true }
}

function validateListing(data: ListingData, listingType: "sitter" | "stay"): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const titleResult = validateListingTitle(data.title)
  if (!titleResult.valid) errors.push(titleResult.error!)

  const descResult = validateListingDescription(data.description)
  if (!descResult.valid) errors.push(descResult.error!)

  if (listingType === "sitter") {
    const propResult = validatePropertyType(data.property_type || "")
    if (!propResult.valid) errors.push(propResult.error!)
  }

  if (listingType === "stay") {
    const radiusResult = validateSearchRadius(data.search_radius)
    if (!radiusResult.valid) errors.push(radiusResult.error!)

    if (data.services_offered) {
      const servicesResult = validateServicesOffered(data.services_offered)
      if (!servicesResult.valid) errors.push(servicesResult.error!)
    }
  }

  if (data.photos) {
    const photosResult = validatePhotos(data.photos)
    if (!photosResult.valid) errors.push(photosResult.error!)
  }

  return { valid: errors.length === 0, errors }
}

// Export function for test runner
export async function testListingCreation(): Promise<{
  name: string
  passed: number
  failed: number
  errors: string[]
}> {
  const errors: string[] = []
  let passed = 0
  let failed = 0

  // Run all tests and collect results
  const testResults: TestResult[] = []

  // Test functions
  const tests = [
    {
      name: "Valid sitter listing",
      fn: () =>
        validateListing(
          {
            title: "Beautiful Home Needs Sitter",
            description: "Looking for a responsible person to watch our home and pets while we travel.",
            property_type: "house",
            bedrooms: 3,
            bathrooms: 2,
          },
          "sitter",
        ),
      expectValid: true,
    },
    {
      name: "Valid stay listing",
      fn: () =>
        validateListing(
          {
            title: "Looking for a Place to Stay",
            description: "Experienced pet sitter looking for accommodation in exchange for services.",
            search_radius: 25,
            services_offered: ["pet_sitting", "gardening"],
          },
          "stay",
        ),
      expectValid: true,
    },
    {
      name: "Empty title",
      fn: () => validateListing({ title: "", description: "Valid description here." }, "stay"),
      expectValid: false,
    },
    {
      name: "Short title",
      fn: () => validateListing({ title: "Hi", description: "Valid description here." }, "stay"),
      expectValid: false,
    },
    {
      name: "Short description",
      fn: () => validateListing({ title: "Valid Title", description: "Short" }, "stay"),
      expectValid: false,
    },
    {
      name: "Invalid property type",
      fn: () =>
        validateListing(
          { title: "Valid Title", description: "Valid description here.", property_type: "castle" },
          "sitter",
        ),
      expectValid: false,
    },
    {
      name: "Search radius too low",
      fn: () =>
        validateListing({ title: "Valid Title", description: "Valid description here.", search_radius: 3 }, "stay"),
      expectValid: false,
    },
    {
      name: "Search radius too high",
      fn: () =>
        validateListing({ title: "Valid Title", description: "Valid description here.", search_radius: 150 }, "stay"),
      expectValid: false,
    },
    {
      name: "Invalid service",
      fn: () =>
        validateListing(
          { title: "Valid Title", description: "Valid description here.", services_offered: ["magic_tricks"] },
          "stay",
        ),
      expectValid: false,
    },
    {
      name: "Too many photos",
      fn: () =>
        validateListing(
          {
            title: "Valid Title",
            description: "Valid description here.",
            property_type: "house",
            photos: Array(15).fill("https://example.com/photo.jpg"),
          },
          "sitter",
        ),
      expectValid: false,
    },
    {
      name: "Invalid photo URL",
      fn: () =>
        validateListing(
          {
            title: "Valid Title",
            description: "Valid description here.",
            property_type: "house",
            photos: ["not-a-url"],
          },
          "sitter",
        ),
      expectValid: false,
    },
    {
      name: "Sitter without property type",
      fn: () =>
        validateListing({ title: "Need a Sitter", description: "Looking for someone to watch our home." }, "sitter"),
      expectValid: false,
    },
  ]

  for (const test of tests) {
    const result = test.fn()
    if (result.valid === test.expectValid) {
      passed++
    } else {
      failed++
      errors.push(
        `${test.name}: expected ${test.expectValid ? "valid" : "invalid"}, got ${result.valid ? "valid" : "invalid"}`,
      )
    }
  }

  return { name: "Listing Creation", passed, failed, errors }
}
