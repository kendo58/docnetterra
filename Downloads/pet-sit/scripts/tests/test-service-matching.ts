/**
 * Tests for service matching between tasks needed and services offered
 */

interface TestResult {
  name: string
  passed: number
  failed: number
  errors: string[]
}

// Related services map (same as in listing-matches.tsx)
const RELATED_SERVICES: Record<string, string[]> = {
  gardening: ["lawn_care", "landscaping"],
  lawn_care: ["gardening", "landscaping"],
  pet_sitting: ["dog_walking", "pet_care"],
  dog_walking: ["pet_sitting", "pet_care"],
  cleaning: ["housekeeping", "house_sitting"],
  house_sitting: ["cleaning", "housekeeping"],
  cooking: ["meal_prep"],
  handyman: ["maintenance", "repairs"],
  childcare: ["babysitting"],
  eldercare: ["senior_care"],
}

function findServiceMatches(tasksNeeded: string[], servicesOffered: string[]): string[] {
  const matches: string[] = []

  for (const task of tasksNeeded) {
    // Direct match
    if (servicesOffered.includes(task)) {
      matches.push(task)
      continue
    }

    // Related service match
    const relatedServices = RELATED_SERVICES[task] || []
    for (const related of relatedServices) {
      if (servicesOffered.includes(related)) {
        matches.push(`${task} (via ${related})`)
        break
      }
    }
  }

  return matches
}

export async function testServiceMatching(): Promise<TestResult> {
  const result: TestResult = {
    name: "Service Matching",
    passed: 0,
    failed: 0,
    errors: [],
  }

  // Test 1: Direct service match
  try {
    const matches = findServiceMatches(["gardening", "cleaning"], ["gardening", "cleaning", "cooking"])
    if (matches.length === 2 && matches.includes("gardening") && matches.includes("cleaning")) {
      console.log("  ✓ Direct service matches work")
      result.passed++
    } else {
      throw new Error(`Expected 2 matches, got ${matches.length}: ${matches.join(", ")}`)
    }
  } catch (e: any) {
    console.log("  ✗ Direct service match test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 2: Related service match (gardening -> lawn_care)
  try {
    const matches = findServiceMatches(["gardening"], ["lawn_care"])
    if (matches.length === 1 && matches[0].includes("gardening")) {
      console.log("  ✓ Related service match: gardening -> lawn_care")
      result.passed++
    } else {
      throw new Error(`Expected 1 related match, got ${matches.length}: ${matches.join(", ")}`)
    }
  } catch (e: any) {
    console.log("  ✗ Related service match test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 3: Related service match (pet_sitting -> dog_walking)
  try {
    const matches = findServiceMatches(["pet_sitting"], ["dog_walking"])
    if (matches.length === 1 && matches[0].includes("pet_sitting")) {
      console.log("  ✓ Related service match: pet_sitting -> dog_walking")
      result.passed++
    } else {
      throw new Error(`Expected 1 related match, got ${matches.length}: ${matches.join(", ")}`)
    }
  } catch (e: any) {
    console.log("  ✗ Pet sitting related match test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 4: No matches when services don't overlap
  try {
    const matches = findServiceMatches(["cooking", "childcare"], ["gardening", "cleaning"])
    if (matches.length === 0) {
      console.log("  ✓ No false matches for unrelated services")
      result.passed++
    } else {
      throw new Error(`Expected 0 matches, got ${matches.length}: ${matches.join(", ")}`)
    }
  } catch (e: any) {
    console.log("  ✗ No false matches test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 5: Empty arrays should return no matches
  try {
    const matches1 = findServiceMatches([], ["gardening"])
    const matches2 = findServiceMatches(["gardening"], [])
    const matches3 = findServiceMatches([], [])

    if (matches1.length === 0 && matches2.length === 0 && matches3.length === 0) {
      console.log("  ✓ Empty arrays handled correctly")
      result.passed++
    } else {
      throw new Error("Empty arrays should return no matches")
    }
  } catch (e: any) {
    console.log("  ✗ Empty arrays test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 6: Mixed direct and related matches
  try {
    const matches = findServiceMatches(["gardening", "pet_sitting", "cooking"], ["lawn_care", "pet_sitting", "cooking"])
    // Should match: gardening (via lawn_care), pet_sitting (direct), cooking (direct)
    if (matches.length === 3) {
      console.log(`  ✓ Mixed matches work: ${matches.join(", ")}`)
      result.passed++
    } else {
      throw new Error(`Expected 3 matches, got ${matches.length}: ${matches.join(", ")}`)
    }
  } catch (e: any) {
    console.log("  ✗ Mixed matches test failed")
    result.failed++
    result.errors.push(e.message)
  }

  return result
}
