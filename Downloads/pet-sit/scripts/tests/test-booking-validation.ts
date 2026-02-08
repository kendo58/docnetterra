/**
 * Booking Validation Tests
 * Tests for booking creation and date validation
 */

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

interface BookingData {
  listing_id: string
  start_date: string
  end_date: string
  insurance_selected?: boolean
  insurance_plan_type?: string
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function validateBookingDates(startDate: string, endDate: string): { valid: boolean; error?: string } {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isNaN(start.getTime())) {
    return { valid: false, error: "Invalid start date format" }
  }

  if (isNaN(end.getTime())) {
    return { valid: false, error: "Invalid end date format" }
  }

  if (start < today) {
    return { valid: false, error: "Start date cannot be in the past" }
  }

  if (end <= start) {
    return { valid: false, error: "End date must be after start date" }
  }

  // Maximum booking duration: 365 days
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff > 365) {
    return { valid: false, error: "Booking cannot exceed 365 days" }
  }

  return { valid: true }
}

function validateInsurance(selected: boolean, planType?: string): { valid: boolean; error?: string } {
  if (selected && !planType) {
    return { valid: false, error: "Insurance plan type required when insurance is selected" }
  }

  const validPlans = ["basic", "standard", "premium"]
  if (planType && !validPlans.includes(planType)) {
    return { valid: false, error: `Invalid insurance plan. Must be one of: ${validPlans.join(", ")}` }
  }

  return { valid: true }
}

function validateBooking(data: BookingData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!isValidUUID(data.listing_id)) {
    errors.push("Invalid listing ID")
  }

  const datesResult = validateBookingDates(data.start_date, data.end_date)
  if (!datesResult.valid) errors.push(datesResult.error!)

  const insuranceResult = validateInsurance(data.insurance_selected || false, data.insurance_plan_type)
  if (!insuranceResult.valid) errors.push(insuranceResult.error!)

  return { valid: errors.length === 0, errors }
}

const results: TestResult[] = []

// Test 1: Valid booking
function testValidBooking() {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 7)
  const endDate = new Date(futureDate)
  endDate.setDate(endDate.getDate() + 14)

  const booking: BookingData = {
    listing_id: "123e4567-e89b-12d3-a456-426614174000",
    start_date: futureDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
  }

  const result = validateBooking(booking)

  if (result.valid) {
    results.push({ name: "Valid booking should pass validation", passed: true })
  } else {
    results.push({
      name: "Valid booking should pass validation",
      passed: false,
      error: `Validation failed: ${result.errors.join(", ")}`,
    })
  }
}

// Test 2: Start date in past should fail
function testPastStartDate() {
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 7)
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)

  const result = validateBookingDates(pastDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0])

  if (!result.valid && result.error?.includes("past")) {
    results.push({ name: "Start date in past should fail", passed: true })
  } else {
    results.push({
      name: "Start date in past should fail",
      passed: false,
      error: "Expected validation to fail with past date error",
    })
  }
}

// Test 3: End date before start date should fail
function testEndBeforeStart() {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 14)
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)

  const result = validateBookingDates(futureDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0])

  if (!result.valid && result.error?.includes("after start")) {
    results.push({ name: "End date before start should fail", passed: true })
  } else {
    results.push({
      name: "End date before start should fail",
      passed: false,
      error: "Expected validation to fail",
    })
  }
}

// Test 4: Same start and end date should fail
function testSameStartEndDate() {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 7)

  const result = validateBookingDates(futureDate.toISOString().split("T")[0], futureDate.toISOString().split("T")[0])

  if (!result.valid) {
    results.push({ name: "Same start and end date should fail", passed: true })
  } else {
    results.push({
      name: "Same start and end date should fail",
      passed: false,
      error: "Expected validation to fail",
    })
  }
}

// Test 5: Booking over 365 days should fail
function testTooLongBooking() {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 7)
  const endDate = new Date(futureDate)
  endDate.setDate(endDate.getDate() + 400)

  const result = validateBookingDates(futureDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0])

  if (!result.valid && result.error?.includes("365")) {
    results.push({ name: "Booking over 365 days should fail", passed: true })
  } else {
    results.push({
      name: "Booking over 365 days should fail",
      passed: false,
      error: "Expected validation to fail with duration error",
    })
  }
}

// Test 6: Invalid UUID should fail
function testInvalidUUID() {
  const result = isValidUUID("not-a-valid-uuid")

  if (!result) {
    results.push({ name: "Invalid UUID format should fail", passed: true })
  } else {
    results.push({
      name: "Invalid UUID format should fail",
      passed: false,
      error: "Expected UUID validation to fail",
    })
  }
}

// Test 7: Valid UUID should pass
function testValidUUID() {
  const result = isValidUUID("123e4567-e89b-12d3-a456-426614174000")

  if (result) {
    results.push({ name: "Valid UUID format should pass", passed: true })
  } else {
    results.push({
      name: "Valid UUID format should pass",
      passed: false,
      error: "Expected UUID validation to pass",
    })
  }
}

// Test 8: Insurance selected without plan should fail
function testInsuranceWithoutPlan() {
  const result = validateInsurance(true, undefined)

  if (!result.valid && result.error?.includes("plan type required")) {
    results.push({ name: "Insurance without plan type should fail", passed: true })
  } else {
    results.push({
      name: "Insurance without plan type should fail",
      passed: false,
      error: "Expected validation to fail",
    })
  }
}

// Test 9: Valid insurance selection
function testValidInsurance() {
  const result = validateInsurance(true, "premium")

  if (result.valid) {
    results.push({ name: "Valid insurance selection should pass", passed: true })
  } else {
    results.push({
      name: "Valid insurance selection should pass",
      passed: false,
      error: result.error,
    })
  }
}

// Test 10: Invalid insurance plan should fail
function testInvalidInsurancePlan() {
  const result = validateInsurance(true, "super_premium")

  if (!result.valid) {
    results.push({ name: "Invalid insurance plan should fail", passed: true })
  } else {
    results.push({
      name: "Invalid insurance plan should fail",
      passed: false,
      error: "Expected validation to fail",
    })
  }
}

// Test 11: Invalid date format should fail
function testInvalidDateFormat() {
  const result = validateBookingDates("not-a-date", "2025-12-31")

  if (!result.valid && result.error?.includes("Invalid")) {
    results.push({ name: "Invalid date format should fail", passed: true })
  } else {
    results.push({
      name: "Invalid date format should fail",
      passed: false,
      error: "Expected validation to fail with format error",
    })
  }
}

// Run all tests
testValidBooking()
testPastStartDate()
testEndBeforeStart()
testSameStartEndDate()
testTooLongBooking()
testInvalidUUID()
testValidUUID()
testInsuranceWithoutPlan()
testValidInsurance()
testInvalidInsurancePlan()
testInvalidDateFormat()

// Output results
console.log("\n========================================")
console.log("BOOKING VALIDATION TESTS")
console.log("========================================\n")

let passed = 0
let failed = 0

for (const result of results) {
  if (result.passed) {
    console.log(`✓ ${result.name}`)
    passed++
  } else {
    console.log(`✗ ${result.name}`)
    console.log(`  Error: ${result.error}`)
    failed++
  }
}

console.log("\n----------------------------------------")
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log("----------------------------------------\n")

export async function testBookingValidation(): Promise<{
  name: string
  passed: number
  failed: number
  errors: string[]
}> {
  const errors: string[] = []
  let passed = 0
  let failed = 0

  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 7)
  const endDate = new Date(futureDate)
  endDate.setDate(endDate.getDate() + 14)

  // Test valid booking
  if (
    validateBooking({
      listing_id: "123e4567-e89b-12d3-a456-426614174000",
      start_date: futureDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    }).valid
  )
    passed++
  else {
    failed++
    errors.push("Valid booking should pass")
  }

  // Test past start date fails
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 7)
  if (!validateBookingDates(pastDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0]).valid) passed++
  else {
    failed++
    errors.push("Past start date should fail")
  }

  // Test end before start fails
  if (!validateBookingDates(endDate.toISOString().split("T")[0], futureDate.toISOString().split("T")[0]).valid) passed++
  else {
    failed++
    errors.push("End before start should fail")
  }

  // Test same start and end fails
  if (!validateBookingDates(futureDate.toISOString().split("T")[0], futureDate.toISOString().split("T")[0]).valid)
    passed++
  else {
    failed++
    errors.push("Same start and end should fail")
  }

  // Test booking over 365 days fails
  const farEndDate = new Date(futureDate)
  farEndDate.setDate(farEndDate.getDate() + 400)
  if (!validateBookingDates(futureDate.toISOString().split("T")[0], farEndDate.toISOString().split("T")[0]).valid)
    passed++
  else {
    failed++
    errors.push("Booking over 365 days should fail")
  }

  // Test invalid UUID fails
  if (!isValidUUID("not-a-valid-uuid")) passed++
  else {
    failed++
    errors.push("Invalid UUID should fail")
  }

  // Test valid UUID passes
  if (isValidUUID("123e4567-e89b-12d3-a456-426614174000")) passed++
  else {
    failed++
    errors.push("Valid UUID should pass")
  }

  // Test insurance without plan fails
  if (!validateInsurance(true, undefined).valid) passed++
  else {
    failed++
    errors.push("Insurance without plan should fail")
  }

  // Test valid insurance passes
  if (validateInsurance(true, "premium").valid) passed++
  else {
    failed++
    errors.push("Valid insurance should pass")
  }

  // Test invalid insurance plan fails
  if (!validateInsurance(true, "super_premium").valid) passed++
  else {
    failed++
    errors.push("Invalid insurance plan should fail")
  }

  // Test invalid date format fails
  if (!validateBookingDates("not-a-date", "2025-12-31").valid) passed++
  else {
    failed++
    errors.push("Invalid date format should fail")
  }

  return { name: "Booking Validation", passed, failed, errors }
}
