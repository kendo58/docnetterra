/**
 * Tests for geocoding and distance calculation utilities
 */

interface TestResult {
  name: string
  passed: number
  failed: number
  errors: string[]
}

// Haversine formula implementation (same as in lib/utils/geocoding.ts)
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

function assertEqual(actual: any, expected: any, message: string): boolean {
  if (actual === expected) {
    return true
  }
  throw new Error(`${message}: expected ${expected}, got ${actual}`)
}

function assertApproxEqual(actual: number, expected: number, tolerance: number, message: string): boolean {
  if (Math.abs(actual - expected) <= tolerance) {
    return true
  }
  throw new Error(`${message}: expected ~${expected} (±${tolerance}), got ${actual}`)
}

export async function testGeocodingUtils(): Promise<TestResult> {
  const result: TestResult = {
    name: "Geocoding Utils",
    passed: 0,
    failed: 0,
    errors: [],
  }

  // Test 1: Distance between same point should be 0
  try {
    const distance = calculateDistance(46.4165, -117.0177, 46.4165, -117.0177)
    assertApproxEqual(distance, 0, 0.01, "Same point distance")
    console.log("  ✓ Same point distance is 0")
    result.passed++
  } catch (e: any) {
    console.log("  ✗ Same point distance test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 2: Lewiston, ID to Genesee, ID (approximately 11 miles)
  try {
    const distance = calculateDistance(
      46.4165,
      -117.0177, // Lewiston, ID
      46.5549,
      -116.9236, // Genesee, ID
    )
    assertApproxEqual(distance, 11, 3, "Lewiston to Genesee distance")
    console.log(`  ✓ Lewiston to Genesee: ${distance.toFixed(1)} miles`)
    result.passed++
  } catch (e: any) {
    console.log("  ✗ Lewiston to Genesee distance test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 3: New York to Los Angeles (approximately 2,451 miles)
  try {
    const distance = calculateDistance(
      40.7128,
      -74.006, // New York
      34.0522,
      -118.2437, // Los Angeles
    )
    assertApproxEqual(distance, 2451, 50, "NYC to LA distance")
    console.log(`  ✓ NYC to LA: ${distance.toFixed(0)} miles`)
    result.passed++
  } catch (e: any) {
    console.log("  ✗ NYC to LA distance test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 4: Seattle to Portland (approximately 145 miles)
  try {
    const distance = calculateDistance(
      47.6062,
      -122.3321, // Seattle
      45.5152,
      -122.6784, // Portland
    )
    assertApproxEqual(distance, 145, 15, "Seattle to Portland distance")
    console.log(`  ✓ Seattle to Portland: ${distance.toFixed(0)} miles`)
    result.passed++
  } catch (e: any) {
    console.log("  ✗ Seattle to Portland distance test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 5: Distance is symmetric (A to B = B to A)
  try {
    const distanceAB = calculateDistance(46.4165, -117.0177, 46.5549, -116.9236)
    const distanceBA = calculateDistance(46.5549, -116.9236, 46.4165, -117.0177)
    assertApproxEqual(distanceAB, distanceBA, 0.001, "Distance symmetry")
    console.log("  ✓ Distance is symmetric")
    result.passed++
  } catch (e: any) {
    console.log("  ✗ Distance symmetry test failed")
    result.failed++
    result.errors.push(e.message)
  }

  return result
}
