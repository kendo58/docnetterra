/**
 * Main Test Runner
 * Run with: `npm run test:scripts`
 */

import { testGeocodingUtils } from "./test-geocoding"
import { testMatchingLogic } from "./test-matching-logic"
import { testServiceMatching } from "./test-service-matching"
import { testFormValidation } from "./test-form-validation"
import { testListingCreation } from "./test-listing-creation"
import { testAddressValidation } from "./test-address-validation"
import { testPetValidation } from "./test-pet-validation"
import { testBookingValidation } from "./test-booking-validation"
import { testTaskValidation } from "./test-task-validation"
import { testDatabaseIntegration } from "./test-database-integration"
import { testAdminDecoupling } from "./test-admin-decoupling"

interface TestResult {
  name: string
  passed: number
  failed: number
  errors: string[]
}

async function runAllTests() {
  console.log("=".repeat(60))
  console.log("🧪 SitSwap - Test Suite")
  console.log("=".repeat(60))
  console.log("")

  const results: TestResult[] = []

  // Run all test modules
  console.log("Running Geocoding Utils Tests...")
  results.push(await testGeocodingUtils())

  console.log("\nRunning Matching Logic Tests...")
  results.push(await testMatchingLogic())

  console.log("\nRunning Service Matching Tests...")
  results.push(await testServiceMatching())

  console.log("\nRunning Form Validation Tests...")
  results.push(await testFormValidation())

  console.log("\nRunning Listing Creation Tests...")
  results.push(await testListingCreation())

  console.log("\nRunning Address Validation Tests...")
  results.push(await testAddressValidation())

  console.log("\nRunning Pet Validation Tests...")
  results.push(await testPetValidation())

  console.log("\nRunning Booking Validation Tests...")
  results.push(await testBookingValidation())

  console.log("\nRunning Task Validation Tests...")
  results.push(await testTaskValidation())

  console.log("\nRunning Admin Decoupling Tests...")
  results.push(await testAdminDecoupling())

  console.log("\nRunning Database Integration Tests (optional)...")
  results.push(await testDatabaseIntegration())

  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("📊 TEST SUMMARY")
  console.log("=".repeat(60))

  let totalPassed = 0
  let totalFailed = 0

  for (const result of results) {
    const status = result.failed === 0 ? "✅" : "❌"
    console.log(`[${status}] ${result.name}: ${result.passed}/${result.passed + result.failed} passed`)
    totalPassed += result.passed
    totalFailed += result.failed

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`   └─ ${error}`)
      }
    }
  }

  console.log("")
  console.log("-".repeat(60))
  console.log(`Total: ${totalPassed}/${totalPassed + totalFailed} tests passed`)

  if (totalFailed === 0) {
    console.log("\n🎉 All tests passed!")
  } else {
    console.log(`\n⚠️  ${totalFailed} test(s) failed`)
  }

  return { totalPassed, totalFailed }
}

runAllTests()
  .then(({ totalFailed }) => {
    if (totalFailed > 0) process.exit(1)
  })
  .catch((error) => {
    console.error("Test runner failed:", error)
    process.exit(1)
  })
