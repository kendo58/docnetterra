/**
 * Main Test Runner
 *
 * Run this file to execute all tests for the pet sitting app.
 * Run with: `npm run test:scripts:legacy`
 */

// ============================================
// TEST UTILITIES
// ============================================

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`)
  }
}

function assertInRange(value: number, min: number, max: number, message: string): void {
  if (value < min || value > max) {
    throw new Error(`${message}: ${value} not in range [${min}, ${max}]`)
  }
}

// ============================================
// GEOCODING TESTS
// ============================================

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function runGeocodingTests(): TestResult[] {
  const results: TestResult[] = []

  // Test 1: Same point should have 0 distance
  try {
    const distance = calculateDistance(46.4165, -117.0177, 46.4165, -117.0177)
    assertEqual(distance, 0, "Same point distance")
    results.push({ name: "Geocoding: Same point = 0 distance", passed: true })
  } catch (e) {
    results.push({ name: "Geocoding: Same point = 0 distance", passed: false, error: (e as Error).message })
  }

  // Test 2: Lewiston to Genesee (~15 miles)
  try {
    const distance = calculateDistance(46.4165, -117.0177, 46.5551, -116.9236)
    assertInRange(distance, 10, 20, "Lewiston-Genesee distance")
    results.push({ name: "Geocoding: Lewiston-Genesee ~15 miles", passed: true })
  } catch (e) {
    results.push({ name: "Geocoding: Lewiston-Genesee ~15 miles", passed: false, error: (e as Error).message })
  }

  // Test 3: NYC to LA (~2450 miles)
  try {
    const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437)
    assertInRange(distance, 2400, 2500, "NYC-LA distance")
    results.push({ name: "Geocoding: NYC-LA ~2450 miles", passed: true })
  } catch (e) {
    results.push({ name: "Geocoding: NYC-LA ~2450 miles", passed: false, error: (e as Error).message })
  }

  // Test 4: Distance should be symmetric
  try {
    const d1 = calculateDistance(46.4165, -117.0177, 46.5551, -116.9236)
    const d2 = calculateDistance(46.5551, -116.9236, 46.4165, -117.0177)
    assert(Math.abs(d1 - d2) < 0.001, "Distance should be symmetric")
    results.push({ name: "Geocoding: Distance is symmetric", passed: true })
  } catch (e) {
    results.push({ name: "Geocoding: Distance is symmetric", passed: false, error: (e as Error).message })
  }

  return results
}

// ============================================
// MATCHING LOGIC TESTS
// ============================================

interface MockListing {
  id: string
  listing_type: "find_sitter" | "looking_for_stay"
  search_radius?: number | null
  services_offered?: string[] | null
}

function isSitterListing(listing: MockListing): boolean {
  return listing.listing_type === "find_sitter"
}

function isStayListing(listing: MockListing): boolean {
  return listing.listing_type === "looking_for_stay"
}

function shouldMatch(listing1: MockListing, listing2: MockListing): boolean {
  const l1IsSitter = isSitterListing(listing1)
  const l1IsStay = isStayListing(listing1)
  const l2IsSitter = isSitterListing(listing2)
  const l2IsStay = isStayListing(listing2)

  // Same type should NOT match
  if (l1IsSitter && l2IsSitter) return false
  if (l1IsStay && l2IsStay) return false

  // Opposite types should match
  return (l1IsSitter && l2IsStay) || (l1IsStay && l2IsSitter)
}

function runMatchingTests(): TestResult[] {
  const results: TestResult[] = []

  const sitterListing: MockListing = { id: "1", listing_type: "find_sitter" }
  const stayListing: MockListing = { id: "2", listing_type: "looking_for_stay" }
  const sitterListing2: MockListing = { id: "3", listing_type: "find_sitter" }
  const stayListing2: MockListing = { id: "4", listing_type: "looking_for_stay" }

  // Test 1: Sitter should NOT match with Sitter
  try {
    const matches = shouldMatch(sitterListing, sitterListing2)
    assertEqual(matches, false, "Sitter-Sitter should not match")
    results.push({ name: "Matching: Sitter + Sitter = NO match", passed: true })
  } catch (e) {
    results.push({ name: "Matching: Sitter + Sitter = NO match", passed: false, error: (e as Error).message })
  }

  // Test 2: Stay should NOT match with Stay
  try {
    const matches = shouldMatch(stayListing, stayListing2)
    assertEqual(matches, false, "Stay-Stay should not match")
    results.push({ name: "Matching: Stay + Stay = NO match", passed: true })
  } catch (e) {
    results.push({ name: "Matching: Stay + Stay = NO match", passed: false, error: (e as Error).message })
  }

  // Test 3: Sitter SHOULD match with Stay
  try {
    const matches = shouldMatch(sitterListing, stayListing)
    assertEqual(matches, true, "Sitter-Stay should match")
    results.push({ name: "Matching: Sitter + Stay = MATCH", passed: true })
  } catch (e) {
    results.push({ name: "Matching: Sitter + Stay = MATCH", passed: false, error: (e as Error).message })
  }

  // Test 4: Stay SHOULD match with Sitter (bidirectional)
  try {
    const matches = shouldMatch(stayListing, sitterListing)
    assertEqual(matches, true, "Stay-Sitter should match")
    results.push({ name: "Matching: Stay + Sitter = MATCH (bidirectional)", passed: true })
  } catch (e) {
    results.push({
      name: "Matching: Stay + Sitter = MATCH (bidirectional)",
      passed: false,
      error: (e as Error).message,
    })
  }

  return results
}

// ============================================
// SERVICE MATCHING TESTS
// ============================================

const RELATED_SERVICES: Record<string, string[]> = {
  gardening: ["lawn_care"],
  lawn_care: ["gardening"],
  pet_sitting: ["dog_walking"],
  dog_walking: ["pet_sitting"],
  cleaning: ["house_sitting"],
  house_sitting: ["cleaning"],
  handyman: ["pool_maintenance"],
  cooking: ["errands"],
  childcare: ["eldercare"],
  eldercare: ["childcare"],
}

function countServiceMatches(tasksNeeded: string[], servicesOffered: string[]): number {
  let matches = 0

  for (const task of tasksNeeded) {
    // Direct match
    if (servicesOffered.includes(task)) {
      matches++
      continue
    }
    // Related service match
    const related = RELATED_SERVICES[task] || []
    if (related.some((r) => servicesOffered.includes(r))) {
      matches++
    }
  }

  return matches
}

function runServiceMatchingTests(): TestResult[] {
  const results: TestResult[] = []

  // Test 1: Direct service match
  try {
    const matches = countServiceMatches(["gardening"], ["gardening", "cleaning"])
    assertEqual(matches, 1, "Direct match count")
    results.push({ name: "Services: Direct match works", passed: true })
  } catch (e) {
    results.push({ name: "Services: Direct match works", passed: false, error: (e as Error).message })
  }

  // Test 2: Related service match (gardening -> lawn_care)
  try {
    const matches = countServiceMatches(["gardening"], ["lawn_care"])
    assertEqual(matches, 1, "Related match count")
    results.push({ name: "Services: Related match (gardening->lawn_care)", passed: true })
  } catch (e) {
    results.push({ name: "Services: Related match (gardening->lawn_care)", passed: false, error: (e as Error).message })
  }

  // Test 3: No match
  try {
    const matches = countServiceMatches(["gardening"], ["cooking"])
    assertEqual(matches, 0, "No match count")
    results.push({ name: "Services: No match returns 0", passed: true })
  } catch (e) {
    results.push({ name: "Services: No match returns 0", passed: false, error: (e as Error).message })
  }

  // Test 4: Multiple matches
  try {
    const matches = countServiceMatches(
      ["gardening", "pet_sitting", "cleaning"],
      ["gardening", "dog_walking", "cleaning"],
    )
    assertEqual(matches, 3, "Multiple matches count")
    results.push({ name: "Services: Multiple matches counted correctly", passed: true })
  } catch (e) {
    results.push({ name: "Services: Multiple matches counted correctly", passed: false, error: (e as Error).message })
  }

  // Test 5: Empty arrays
  try {
    const matches = countServiceMatches([], [])
    assertEqual(matches, 0, "Empty arrays count")
    results.push({ name: "Services: Empty arrays = 0 matches", passed: true })
  } catch (e) {
    results.push({ name: "Services: Empty arrays = 0 matches", passed: false, error: (e as Error).message })
  }

  return results
}

// ============================================
// LISTING VALIDATION TESTS
// ============================================

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]

function validateTitle(title: string): { valid: boolean; error?: string } {
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

function validateState(state: string): { valid: boolean; error?: string } {
  if (!state || state.trim().length === 0) {
    return { valid: false, error: "State is required" }
  }
  if (!US_STATES.includes(state.toUpperCase())) {
    return { valid: false, error: "Invalid state abbreviation" }
  }
  return { valid: true }
}

function validateSearchRadius(radius: number): { valid: boolean; error?: string } {
  if (radius < 5) {
    return { valid: false, error: "Search radius must be at least 5 miles" }
  }
  if (radius > 100) {
    return { valid: false, error: "Search radius cannot exceed 100 miles" }
  }
  return { valid: true }
}

function runListingValidationTests(): TestResult[] {
  const results: TestResult[] = []

  // Title tests
  try {
    assertEqual(validateTitle("").valid, false, "Empty title")
    assertEqual(validateTitle("AB").valid, false, "Too short title")
    assertEqual(validateTitle("Valid Title").valid, true, "Valid title")
    assertEqual(validateTitle("A".repeat(101)).valid, false, "Too long title")
    results.push({ name: "Validation: Title validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: Title validation works", passed: false, error: (e as Error).message })
  }

  // State tests
  try {
    assertEqual(validateState("ID").valid, true, "Valid state ID")
    assertEqual(validateState("CA").valid, true, "Valid state CA")
    assertEqual(validateState("XX").valid, false, "Invalid state XX")
    assertEqual(validateState("Idaho").valid, false, "Full state name")
    assertEqual(validateState("").valid, false, "Empty state")
    results.push({ name: "Validation: State validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: State validation works", passed: false, error: (e as Error).message })
  }

  // Search radius tests
  try {
    assertEqual(validateSearchRadius(25).valid, true, "Valid radius 25")
    assertEqual(validateSearchRadius(5).valid, true, "Min radius 5")
    assertEqual(validateSearchRadius(100).valid, true, "Max radius 100")
    assertEqual(validateSearchRadius(4).valid, false, "Too small radius")
    assertEqual(validateSearchRadius(101).valid, false, "Too large radius")
    results.push({ name: "Validation: Search radius validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: Search radius validation works", passed: false, error: (e as Error).message })
  }

  return results
}

// ============================================
// BOOKING VALIDATION TESTS
// ============================================

function validateDateRange(startDate: string, endDate: string): { valid: boolean; error?: string } {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime())) {
    return { valid: false, error: "Invalid start date" }
  }
  if (isNaN(end.getTime())) {
    return { valid: false, error: "Invalid end date" }
  }
  if (end <= start) {
    return { valid: false, error: "End date must be after start date" }
  }

  return { valid: true }
}

function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function runBookingValidationTests(): TestResult[] {
  const results: TestResult[] = []

  // Date range tests
  try {
    assertEqual(validateDateRange("2025-01-01", "2025-01-05").valid, true, "Valid date range")
    assertEqual(validateDateRange("2025-01-05", "2025-01-01").valid, false, "End before start")
    assertEqual(validateDateRange("2025-01-01", "2025-01-01").valid, false, "Same dates")
    assertEqual(validateDateRange("invalid", "2025-01-05").valid, false, "Invalid start date")
    results.push({ name: "Validation: Date range validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: Date range validation works", passed: false, error: (e as Error).message })
  }

  // UUID tests
  try {
    assertEqual(validateUUID("123e4567-e89b-12d3-a456-426614174000"), true, "Valid UUID")
    assertEqual(validateUUID("not-a-uuid"), false, "Invalid UUID")
    assertEqual(validateUUID(""), false, "Empty UUID")
    results.push({ name: "Validation: UUID validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: UUID validation works", passed: false, error: (e as Error).message })
  }

  return results
}

// ============================================
// PET VALIDATION TESTS
// ============================================

const VALID_SPECIES = ["dog", "cat", "bird", "fish", "reptile", "small_animal", "other"]

function validatePetName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Pet name is required" }
  }
  if (name.length > 50) {
    return { valid: false, error: "Pet name must be less than 50 characters" }
  }
  return { valid: true }
}

function validatePetSpecies(species: string): { valid: boolean; error?: string } {
  if (!VALID_SPECIES.includes(species)) {
    return { valid: false, error: "Invalid species" }
  }
  return { valid: true }
}

function validatePetAge(age: number): { valid: boolean; error?: string } {
  if (age < 0) {
    return { valid: false, error: "Age cannot be negative" }
  }
  if (age > 50) {
    return { valid: false, error: "Age seems unrealistic" }
  }
  return { valid: true }
}

function runPetValidationTests(): TestResult[] {
  const results: TestResult[] = []

  // Pet name tests
  try {
    assertEqual(validatePetName("Buddy").valid, true, "Valid pet name")
    assertEqual(validatePetName("").valid, false, "Empty pet name")
    assertEqual(validatePetName("A".repeat(51)).valid, false, "Too long pet name")
    results.push({ name: "Validation: Pet name validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: Pet name validation works", passed: false, error: (e as Error).message })
  }

  // Species tests
  try {
    assertEqual(validatePetSpecies("dog").valid, true, "Valid species dog")
    assertEqual(validatePetSpecies("cat").valid, true, "Valid species cat")
    assertEqual(validatePetSpecies("dinosaur").valid, false, "Invalid species")
    results.push({ name: "Validation: Pet species validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: Pet species validation works", passed: false, error: (e as Error).message })
  }

  // Age tests
  try {
    assertEqual(validatePetAge(5).valid, true, "Valid age")
    assertEqual(validatePetAge(0).valid, true, "Age 0 valid")
    assertEqual(validatePetAge(-1).valid, false, "Negative age")
    assertEqual(validatePetAge(51).valid, false, "Unrealistic age")
    results.push({ name: "Validation: Pet age validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: Pet age validation works", passed: false, error: (e as Error).message })
  }

  return results
}

// ============================================
// TASK VALIDATION TESTS
// ============================================

const VALID_TASK_TYPES = [
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

const VALID_FREQUENCIES = ["daily", "weekly", "monthly", "as_needed", "one_time"]

function validateTaskType(type: string): { valid: boolean; error?: string } {
  if (!VALID_TASK_TYPES.includes(type)) {
    return { valid: false, error: "Invalid task type" }
  }
  return { valid: true }
}

function validateFrequency(freq: string): { valid: boolean; error?: string } {
  if (!VALID_FREQUENCIES.includes(freq)) {
    return { valid: false, error: "Invalid frequency" }
  }
  return { valid: true }
}

function runTaskValidationTests(): TestResult[] {
  const results: TestResult[] = []

  // Task type tests
  try {
    assertEqual(validateTaskType("gardening").valid, true, "Valid task type")
    assertEqual(validateTaskType("pet_sitting").valid, true, "Valid task type")
    assertEqual(validateTaskType("invalid_task").valid, false, "Invalid task type")
    results.push({ name: "Validation: Task type validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: Task type validation works", passed: false, error: (e as Error).message })
  }

  // Frequency tests
  try {
    assertEqual(validateFrequency("daily").valid, true, "Valid frequency")
    assertEqual(validateFrequency("weekly").valid, true, "Valid frequency")
    assertEqual(validateFrequency("hourly").valid, false, "Invalid frequency")
    results.push({ name: "Validation: Frequency validation works", passed: true })
  } catch (e) {
    results.push({ name: "Validation: Frequency validation works", passed: false, error: (e as Error).message })
  }

  return results
}

// ============================================
// MAIN TEST RUNNER
// ============================================

console.log("========================================")
console.log("  PET SITTING APP - TEST SUITE")
console.log("========================================")
console.log("")

const allResults: TestResult[] = []

// Run all test suites
console.log("Running Geocoding Tests...")
allResults.push(...runGeocodingTests())

console.log("Running Matching Logic Tests...")
allResults.push(...runMatchingTests())

console.log("Running Service Matching Tests...")
allResults.push(...runServiceMatchingTests())

console.log("Running Listing Validation Tests...")
allResults.push(...runListingValidationTests())

console.log("Running Booking Validation Tests...")
allResults.push(...runBookingValidationTests())

console.log("Running Pet Validation Tests...")
allResults.push(...runPetValidationTests())

console.log("Running Task Validation Tests...")
allResults.push(...runTaskValidationTests())

// Print results
console.log("")
console.log("========================================")
console.log("  TEST RESULTS")
console.log("========================================")

const passed = allResults.filter((r) => r.passed)
const failed = allResults.filter((r) => !r.passed)

console.log("")
console.log(`Total: ${allResults.length} tests`)
console.log(`Passed: ${passed.length}`)
console.log(`Failed: ${failed.length}`)
console.log("")

if (failed.length > 0) {
  console.log("FAILED TESTS:")
  console.log("-------------")
  for (const result of failed) {
    console.log(`  X ${result.name}`)
    console.log(`    Error: ${result.error}`)
  }
  console.log("")
}

console.log("PASSED TESTS:")
console.log("-------------")
for (const result of passed) {
  console.log(`  ✓ ${result.name}`)
}

console.log("")
console.log("========================================")
if (failed.length === 0) {
  console.log("  ALL TESTS PASSED!")
} else {
  console.log(`  ${failed.length} TEST(S) FAILED`)
}
console.log("========================================")
