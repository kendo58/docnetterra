/**
 * Address Validation Tests
 * Tests for validating address inputs including state abbreviations
 */

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

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

interface AddressData {
  city: string
  state: string
  postal_code?: string
  street_address?: string
}

function validateCity(city: string): { valid: boolean; error?: string } {
  if (!city || city.trim().length === 0) {
    return { valid: false, error: "City is required" }
  }
  if (city.length > 100) {
    return { valid: false, error: "City name too long" }
  }
  // Basic sanitization check - no special characters except spaces, hyphens, periods
  if (!/^[a-zA-Z\s\-.]+$/.test(city)) {
    return { valid: false, error: "City contains invalid characters" }
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

function validatePostalCode(postalCode: string): { valid: boolean; error?: string } {
  if (!postalCode) {
    return { valid: true } // Optional
  }
  // US ZIP code format: 5 digits or 5+4 format
  if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
    return { valid: false, error: "Invalid postal code format" }
  }
  return { valid: true }
}

function validateAddress(data: AddressData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const cityResult = validateCity(data.city)
  if (!cityResult.valid) errors.push(cityResult.error!)

  const stateResult = validateState(data.state)
  if (!stateResult.valid) errors.push(stateResult.error!)

  if (data.postal_code) {
    const postalResult = validatePostalCode(data.postal_code)
    if (!postalResult.valid) errors.push(postalResult.error!)
  }

  return { valid: errors.length === 0, errors }
}

// Export function for test runner
export async function testAddressValidation(): Promise<{
  name: string
  passed: number
  failed: number
  errors: string[]
}> {
  const errors: string[] = []
  let passed = 0
  let failed = 0

  // Test valid address
  if (validateAddress({ city: "Lewiston", state: "ID", postal_code: "83501" }).valid) passed++
  else {
    failed++
    errors.push("Valid address should pass")
  }

  // Test all state abbreviations
  let statesPass = true
  for (const state of US_STATES) {
    if (!validateState(state).valid) {
      statesPass = false
      break
    }
  }
  if (statesPass) passed++
  else {
    failed++
    errors.push("All state abbreviations should be valid")
  }

  // Test full state name fails
  if (!validateState("Idaho").valid) passed++
  else {
    failed++
    errors.push("Full state name should fail")
  }

  // Test invalid state abbreviation
  if (!validateState("XX").valid) passed++
  else {
    failed++
    errors.push("Invalid state XX should fail")
  }

  // Test empty city fails
  if (!validateCity("").valid) passed++
  else {
    failed++
    errors.push("Empty city should fail")
  }

  // Test city with special chars fails
  if (!validateCity("New York <script>").valid) passed++
  else {
    failed++
    errors.push("City with special chars should fail")
  }

  // Test city with hyphen passes
  if (validateCity("Winston-Salem").valid) passed++
  else {
    failed++
    errors.push("City with hyphen should pass")
  }

  // Test valid postal codes
  const validCodes = ["83501", "90210", "83501-1234"]
  let postalPass = true
  for (const code of validCodes) {
    if (!validatePostalCode(code).valid) {
      postalPass = false
      break
    }
  }
  if (postalPass) passed++
  else {
    failed++
    errors.push("Valid postal codes should pass")
  }

  // Test invalid postal codes fail
  const invalidCodes = ["1234", "ABCDE"]
  let invalidFail = true
  for (const code of invalidCodes) {
    if (validatePostalCode(code).valid) {
      invalidFail = false
      break
    }
  }
  if (invalidFail) passed++
  else {
    failed++
    errors.push("Invalid postal codes should fail")
  }

  // Test lowercase state works
  if (validateState("ca").valid) passed++
  else {
    failed++
    errors.push("Lowercase state should pass")
  }

  return { name: "Address Validation", passed, failed, errors }
}
