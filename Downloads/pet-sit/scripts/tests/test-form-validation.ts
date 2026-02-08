/**
 * Tests for form validation logic
 */

interface TestResult {
  name: string
  passed: number
  failed: number
  errors: string[]
}

// US State abbreviations (same as in listing-form.tsx)
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

function validateState(state: string): boolean {
  return US_STATES.includes(state.toUpperCase())
}

function validateSearchRadius(radius: number): boolean {
  return radius >= 5 && radius <= 100
}

function validateListingType(type: string): boolean {
  return type === "find_sitter" || type === "looking_for_stay"
}

function validateTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: "Title is required" }
  }
  if (title.length > 100) {
    return { valid: false, error: "Title must be 100 characters or less" }
  }
  return { valid: true }
}

function validateCity(city: string): { valid: boolean; error?: string } {
  if (!city || city.trim().length === 0) {
    return { valid: false, error: "City is required" }
  }
  if (city.length > 100) {
    return { valid: false, error: "City must be 100 characters or less" }
  }
  return { valid: true }
}

export async function testFormValidation(): Promise<TestResult> {
  const result: TestResult = {
    name: "Form Validation",
    passed: 0,
    failed: 0,
    errors: [],
  }

  // Test 1: Valid state abbreviations
  try {
    const validStates = ["ID", "CA", "NY", "TX", "WA"]
    const allValid = validStates.every((state) => validateState(state))
    if (allValid) {
      console.log("  ✓ Valid state abbreviations accepted")
      result.passed++
    } else {
      throw new Error("Some valid states were rejected")
    }
  } catch (e: any) {
    console.log("  ✗ Valid state test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 2: Invalid state abbreviations
  try {
    const invalidStates = ["Idaho", "California", "XX", "12", ""]
    const allInvalid = invalidStates.every((state) => !validateState(state))
    if (allInvalid) {
      console.log("  ✓ Invalid state names/codes rejected")
      result.passed++
    } else {
      throw new Error("Some invalid states were accepted")
    }
  } catch (e: any) {
    console.log("  ✗ Invalid state test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 3: Search radius validation
  try {
    const validRadii = [5, 25, 50, 100]
    const invalidRadii = [0, 4, 101, -10, 1000]

    const allValidPass = validRadii.every((r) => validateSearchRadius(r))
    const allInvalidFail = invalidRadii.every((r) => !validateSearchRadius(r))

    if (allValidPass && allInvalidFail) {
      console.log("  ✓ Search radius validation works (5-100 miles)")
      result.passed++
    } else {
      throw new Error("Search radius validation failed")
    }
  } catch (e: any) {
    console.log("  ✗ Search radius validation test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 4: Listing type validation
  try {
    const valid1 = validateListingType("find_sitter")
    const valid2 = validateListingType("looking_for_stay")
    const invalid1 = validateListingType("invalid")
    const invalid2 = validateListingType("")

    if (valid1 && valid2 && !invalid1 && !invalid2) {
      console.log("  ✓ Listing type validation works")
      result.passed++
    } else {
      throw new Error("Listing type validation failed")
    }
  } catch (e: any) {
    console.log("  ✗ Listing type validation test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 5: Title validation
  try {
    const validTitle = validateTitle("My Pet Sitting Listing")
    const emptyTitle = validateTitle("")
    const longTitle = validateTitle("A".repeat(101))

    if (validTitle.valid && !emptyTitle.valid && !longTitle.valid) {
      console.log("  ✓ Title validation works")
      result.passed++
    } else {
      throw new Error("Title validation failed")
    }
  } catch (e: any) {
    console.log("  ✗ Title validation test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 6: City validation
  try {
    const validCity = validateCity("Lewiston")
    const emptyCity = validateCity("")
    const whitespaceCity = validateCity("   ")

    if (validCity.valid && !emptyCity.valid && !whitespaceCity.valid) {
      console.log("  ✓ City validation works")
      result.passed++
    } else {
      throw new Error("City validation failed")
    }
  } catch (e: any) {
    console.log("  ✗ City validation test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 7: All 51 US states/territories are valid
  try {
    const allStatesValid = US_STATES.every((state) => validateState(state))
    if (allStatesValid && US_STATES.length === 51) {
      console.log(`  ✓ All ${US_STATES.length} US states/territories valid`)
      result.passed++
    } else {
      throw new Error(`Expected 51 states, got ${US_STATES.length}`)
    }
  } catch (e: any) {
    console.log("  ✗ All states test failed")
    result.failed++
    result.errors.push(e.message)
  }

  return result
}
