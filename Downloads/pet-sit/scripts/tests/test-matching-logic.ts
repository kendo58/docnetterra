/**
 * Tests for listing matching logic
 */

interface TestResult {
  name: string
  passed: number
  failed: number
  errors: string[]
}

interface MockListing {
  id: string
  listing_type: "pet_sitting" | "stay"
  city: string
  state: string
  latitude?: number
  longitude?: number
  search_radius?: number
  tasks?: string[]
  services_offered?: string[]
}

// Matching logic extracted from listing-matches.tsx
function calculateMatchScore(
  userListing: MockListing,
  potentialMatch: MockListing,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  const isSitterListing = userListing.listing_type === "pet_sitting"
  const isStayListing = userListing.listing_type === "stay"
  const matchIsSitterListing = potentialMatch.listing_type === "pet_sitting"
  const matchIsStayListing = potentialMatch.listing_type === "stay"

  // Rule 1: Same type listings should NOT match
  if (isSitterListing && matchIsSitterListing) {
    return { score: -1, reasons: ["Same type - both sitter"] }
  }
  if (isStayListing && matchIsStayListing) {
    return { score: -1, reasons: ["Same type - both stay"] }
  }

  // Rule 2: Opposite types should match
  if (isSitterListing && matchIsStayListing) {
    score += 30
    reasons.push("Type match: Pet-sitting listing ↔ Stay seeker")
  }
  if (isStayListing && matchIsSitterListing) {
    score += 30
    reasons.push("Type match: Stay seeker ↔ Pet-sitting listing")
  }

  // Rule 3: Location matching
  if (userListing.city === potentialMatch.city) {
    score += 20
    reasons.push("Same city")
  } else if (userListing.state === potentialMatch.state) {
    score += 10
    reasons.push("Same state")
  }

  // Rule 4: Service matching
  const tasksNeeded = userListing.tasks || []
  const servicesOffered = potentialMatch.services_offered || []

  const serviceMatches = tasksNeeded.filter((task) =>
    servicesOffered.some(
      (service) =>
        service === task ||
        (task === "gardening" && service === "lawn_care") ||
        (task === "pet_sitting" && service === "dog_walking"),
    ),
  )

  if (serviceMatches.length > 0) {
    score += serviceMatches.length * 25
    reasons.push(`${serviceMatches.length} service match(es)`)
  }

  return { score, reasons }
}

export async function testMatchingLogic(): Promise<TestResult> {
  const result: TestResult = {
    name: "Matching Logic",
    passed: 0,
    failed: 0,
    errors: [],
  }

  // Test 1: Sitter listing should NOT match with another Sitter listing
  try {
    const sitter1: MockListing = {
      id: "1",
      listing_type: "pet_sitting",
      city: "Lewiston",
      state: "ID",
    }
    const sitter2: MockListing = {
      id: "2",
      listing_type: "pet_sitting",
      city: "Lewiston",
      state: "ID",
    }
    const { score } = calculateMatchScore(sitter1, sitter2)
    if (score === -1) {
      console.log("  ✓ Sitter-to-Sitter correctly rejected")
      result.passed++
    } else {
      throw new Error(`Expected -1, got ${score}`)
    }
  } catch (e: any) {
    console.log("  ✗ Sitter-to-Sitter rejection test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 2: Stay listing should NOT match with another Stay listing
  try {
    const stay1: MockListing = {
      id: "1",
      listing_type: "stay",
      city: "Genesee",
      state: "ID",
    }
    const stay2: MockListing = {
      id: "2",
      listing_type: "stay",
      city: "Genesee",
      state: "ID",
    }
    const { score } = calculateMatchScore(stay1, stay2)
    if (score === -1) {
      console.log("  ✓ Stay-to-Stay correctly rejected")
      result.passed++
    } else {
      throw new Error(`Expected -1, got ${score}`)
    }
  } catch (e: any) {
    console.log("  ✗ Stay-to-Stay rejection test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 3: Sitter listing SHOULD match with Stay listing
  try {
    const sitter: MockListing = {
      id: "1",
      listing_type: "pet_sitting",
      city: "Lewiston",
      state: "ID",
    }
    const stay: MockListing = {
      id: "2",
      listing_type: "stay",
      city: "Lewiston",
      state: "ID",
    }
    const { score, reasons } = calculateMatchScore(sitter, stay)
    if (score > 0) {
      console.log(`  ✓ Sitter-to-Stay match: score ${score} (${reasons.join(", ")})`)
      result.passed++
    } else {
      throw new Error(`Expected positive score, got ${score}`)
    }
  } catch (e: any) {
    console.log("  ✗ Sitter-to-Stay match test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 4: Stay listing SHOULD match with Sitter listing (bidirectional)
  try {
    const stay: MockListing = {
      id: "1",
      listing_type: "stay",
      city: "Genesee",
      state: "ID",
    }
    const sitter: MockListing = {
      id: "2",
      listing_type: "pet_sitting",
      city: "Genesee",
      state: "ID",
    }
    const { score, reasons } = calculateMatchScore(stay, sitter)
    if (score > 0) {
      console.log(`  ✓ Stay-to-Sitter match: score ${score} (${reasons.join(", ")})`)
      result.passed++
    } else {
      throw new Error(`Expected positive score, got ${score}`)
    }
  } catch (e: any) {
    console.log("  ✗ Stay-to-Sitter match test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 5: Same city should score higher than different city
  try {
    const sitter: MockListing = {
      id: "1",
      listing_type: "pet_sitting",
      city: "Lewiston",
      state: "ID",
    }
    const staySameCity: MockListing = {
      id: "2",
      listing_type: "stay",
      city: "Lewiston",
      state: "ID",
    }
    const stayDiffCity: MockListing = {
      id: "3",
      listing_type: "stay",
      city: "Boise",
      state: "ID",
    }
    const scoreSameCity = calculateMatchScore(sitter, staySameCity).score
    const scoreDiffCity = calculateMatchScore(sitter, stayDiffCity).score

    if (scoreSameCity > scoreDiffCity) {
      console.log(`  ✓ Same city scores higher: ${scoreSameCity} > ${scoreDiffCity}`)
      result.passed++
    } else {
      throw new Error(`Same city (${scoreSameCity}) should score higher than different city (${scoreDiffCity})`)
    }
  } catch (e: any) {
    console.log("  ✗ City scoring test failed")
    result.failed++
    result.errors.push(e.message)
  }

  // Test 6: Service matches should increase score
  try {
    const sitter: MockListing = {
      id: "1",
      listing_type: "pet_sitting",
      city: "Lewiston",
      state: "ID",
      tasks: ["gardening", "pet_sitting", "cleaning"],
    }
    const stayWithServices: MockListing = {
      id: "2",
      listing_type: "stay",
      city: "Lewiston",
      state: "ID",
      services_offered: ["gardening", "cleaning"],
    }
    const stayWithoutServices: MockListing = {
      id: "3",
      listing_type: "stay",
      city: "Lewiston",
      state: "ID",
      services_offered: [],
    }

    const scoreWithServices = calculateMatchScore(sitter, stayWithServices).score
    const scoreWithoutServices = calculateMatchScore(sitter, stayWithoutServices).score

    if (scoreWithServices > scoreWithoutServices) {
      console.log(`  ✓ Service matches increase score: ${scoreWithServices} > ${scoreWithoutServices}`)
      result.passed++
    } else {
      throw new Error(`With services (${scoreWithServices}) should be higher than without (${scoreWithoutServices})`)
    }
  } catch (e: any) {
    console.log("  ✗ Service matching test failed")
    result.failed++
    result.errors.push(e.message)
  }

  return result
}
