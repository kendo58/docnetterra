/**
 * Database Integration Tests
 * These tests verify the database schema and queries work correctly
 * Run this after making database changes
 */

import { createClient } from "@supabase/supabase-js"

interface TestResult {
  name: string
  passed: number
  failed: number
  errors: string[]
}

const supabaseUrl = process.env.SUPABASE_TEST_URL
const supabaseKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const requireDbTests = ["1", "true", "yes"].includes((process.env.SITSWAP_REQUIRE_DB_TESTS ?? "").toLowerCase())

export async function testDatabaseIntegration(): Promise<TestResult> {
  const result: TestResult = {
    name: "Database Integration",
    passed: 0,
    failed: 0,
    errors: [],
  }

  if (!supabaseUrl || !supabaseKey) {
    const message = "Set SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_ROLE_KEY to run database integration tests."
    if (requireDbTests) {
      console.log(`  ✗ ${message}`)
      result.failed++
      result.errors.push(message)
    } else {
      console.log(`  ⚠ Skipping database tests - ${message}`)
    }
    return result
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Test 1: Listings table has required columns
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, listing_type, search_radius, services_offered")
      .limit(1)

    if (error) throw error
    console.log("  ✓ Listings table has all required columns")
    result.passed++
  } catch (e: unknown) {
    console.log("  ✗ Listings table schema test failed")
    result.failed++
    result.errors.push(e instanceof Error ? e.message : String(e))
  }

  // Test 2: Addresses table has coordinates
  try {
    const { data, error } = await supabase.from("addresses").select("id, city, state, latitude, longitude").limit(1)

    if (error) throw error
    console.log("  ✓ Addresses table has coordinate columns")
    result.passed++
  } catch (e: unknown) {
    console.log("  ✗ Addresses table schema test failed")
    result.failed++
    result.errors.push(e instanceof Error ? e.message : String(e))
  }

  // Test 3: Tasks table exists
  try {
    const { data, error } = await supabase.from("tasks").select("id, listing_id, task_type").limit(1)

    if (error) throw error
    console.log("  ✓ Tasks table exists and has required columns")
    result.passed++
  } catch (e: unknown) {
    console.log("  ✗ Tasks table test failed")
    result.failed++
    result.errors.push(e instanceof Error ? e.message : String(e))
  }

  // Test 4: Profiles table has profile_photo_url
  try {
    const { data, error } = await supabase.from("profiles").select("id, profile_photo_url").limit(1)

    if (error) throw error
    console.log("  ✓ Profiles table has profile_photo_url column")
    result.passed++
  } catch (e: unknown) {
    console.log("  ✗ Profiles table test failed")
    result.failed++
    result.errors.push(e instanceof Error ? e.message : String(e))
  }

  // Test 5: Listings can join with addresses
  try {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id,
        title,
        addresses!listings_address_id_fkey (
          city,
          state
        )
      `)
      .limit(1)

    if (error) throw error
    console.log("  ✓ Listings-Addresses join works")
    result.passed++
  } catch (e: unknown) {
    console.log("  ✗ Listings-Addresses join test failed")
    result.failed++
    result.errors.push(e instanceof Error ? e.message : String(e))
  }

  return result
}

// Run standalone
const invokedDirectly = process.argv[1]?.includes("test-database-integration")
if (invokedDirectly) {
  testDatabaseIntegration()
    .then((result) => {
      console.log(`\nDatabase Tests: ${result.passed}/${result.passed + result.failed} passed`)
      if (result.failed > 0) process.exit(1)
    })
    .catch((error) => {
      console.error("Database integration tests failed to execute:", error)
      process.exit(1)
    })
}
