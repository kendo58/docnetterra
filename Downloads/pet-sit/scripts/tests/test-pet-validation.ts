/**
 * Pet Validation Tests
 * Tests for validating pet data inputs
 */

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

interface PetData {
  name: string
  species: string
  breed?: string
  age?: number
  weight?: number
  temperament?: string
  medical_conditions?: string
  dietary_requirements?: string
  care_instructions?: string
}

const VALID_SPECIES = ["dog", "cat", "bird", "fish", "rabbit", "hamster", "guinea_pig", "reptile", "horse", "other"]

function validatePetName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Pet name is required" }
  }
  if (name.length > 50) {
    return { valid: false, error: "Pet name too long (max 50 characters)" }
  }
  return { valid: true }
}

function validatePetSpecies(species: string): { valid: boolean; error?: string } {
  if (!species) {
    return { valid: false, error: "Species is required" }
  }
  if (!VALID_SPECIES.includes(species.toLowerCase())) {
    return { valid: false, error: `Invalid species. Must be one of: ${VALID_SPECIES.join(", ")}` }
  }
  return { valid: true }
}

function validatePetAge(age: number | undefined): { valid: boolean; error?: string } {
  if (age === undefined) return { valid: true }
  if (age < 0) {
    return { valid: false, error: "Age cannot be negative" }
  }
  if (age > 100) {
    return { valid: false, error: "Age seems unrealistic (max 100)" }
  }
  if (!Number.isInteger(age)) {
    return { valid: false, error: "Age must be a whole number" }
  }
  return { valid: true }
}

function validatePetWeight(weight: number | undefined): { valid: boolean; error?: string } {
  if (weight === undefined) return { valid: true }
  if (weight <= 0) {
    return { valid: false, error: "Weight must be positive" }
  }
  if (weight > 5000) {
    return { valid: false, error: "Weight seems unrealistic (max 5000 lbs)" }
  }
  return { valid: true }
}

function validatePet(data: PetData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const nameResult = validatePetName(data.name)
  if (!nameResult.valid) errors.push(nameResult.error!)

  const speciesResult = validatePetSpecies(data.species)
  if (!speciesResult.valid) errors.push(speciesResult.error!)

  const ageResult = validatePetAge(data.age)
  if (!ageResult.valid) errors.push(ageResult.error!)

  const weightResult = validatePetWeight(data.weight)
  if (!weightResult.valid) errors.push(weightResult.error!)

  return { valid: errors.length === 0, errors }
}

export async function testPetValidation(): Promise<{
  name: string
  passed: number
  failed: number
  errors: string[]
}> {
  const errors: string[] = []
  let passed = 0
  let failed = 0

  // Test valid pet
  if (validatePet({ name: "Max", species: "dog", breed: "Golden Retriever", age: 5, weight: 70 }).valid) passed++
  else {
    failed++
    errors.push("Valid pet should pass")
  }

  // Test empty pet name fails
  if (!validatePet({ name: "", species: "cat" }).valid) passed++
  else {
    failed++
    errors.push("Empty pet name should fail")
  }

  // Test all valid species
  let speciesPass = true
  for (const species of VALID_SPECIES) {
    if (!validatePetSpecies(species).valid) {
      speciesPass = false
      break
    }
  }
  if (speciesPass) passed++
  else {
    failed++
    errors.push("All valid species should pass")
  }

  // Test invalid species fails
  if (!validatePetSpecies("dragon").valid) passed++
  else {
    failed++
    errors.push("Invalid species should fail")
  }

  // Test negative age fails
  if (!validatePetAge(-5).valid) passed++
  else {
    failed++
    errors.push("Negative age should fail")
  }

  // Test unrealistic age fails
  if (!validatePetAge(150).valid) passed++
  else {
    failed++
    errors.push("Unrealistic age should fail")
  }

  // Test zero weight fails
  if (!validatePetWeight(0).valid) passed++
  else {
    failed++
    errors.push("Zero weight should fail")
  }

  // Test minimal pet passes
  if (validatePet({ name: "Whiskers", species: "cat" }).valid) passed++
  else {
    failed++
    errors.push("Minimal pet should pass")
  }

  // Test long pet name fails
  if (!validatePet({ name: "A".repeat(60), species: "dog" }).valid) passed++
  else {
    failed++
    errors.push("Long pet name should fail")
  }

  // Test decimal age fails
  if (!validatePetAge(5.5).valid) passed++
  else {
    failed++
    errors.push("Decimal age should fail")
  }

  return { name: "Pet Validation", passed, failed, errors }
}
