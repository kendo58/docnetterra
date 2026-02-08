/**
 * Task Validation Tests
 * Tests for validating task/chore inputs for listings
 */

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

interface TaskData {
  task_type: string
  description?: string
  frequency?: string
  is_required?: boolean
  estimated_hours_per_week?: number
}

const VALID_TASK_TYPES = [
  "pet_feeding",
  "pet_walking",
  "pet_grooming",
  "pet_medication",
  "house_cleaning",
  "laundry",
  "dishes",
  "trash",
  "lawn_mowing",
  "gardening",
  "pool_maintenance",
  "snow_removal",
  "mail_collection",
  "plant_watering",
  "general_maintenance",
  "other",
]

const VALID_FREQUENCIES = ["daily", "weekly", "biweekly", "monthly", "as_needed"]

function validateTaskType(type: string): { valid: boolean; error?: string } {
  if (!type) {
    return { valid: false, error: "Task type is required" }
  }
  if (!VALID_TASK_TYPES.includes(type)) {
    return { valid: false, error: `Invalid task type. Must be one of: ${VALID_TASK_TYPES.join(", ")}` }
  }
  return { valid: true }
}

function validateFrequency(frequency: string | undefined): { valid: boolean; error?: string } {
  if (!frequency) return { valid: true }
  if (!VALID_FREQUENCIES.includes(frequency)) {
    return { valid: false, error: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(", ")}` }
  }
  return { valid: true }
}

function validateEstimatedHours(hours: number | undefined): { valid: boolean; error?: string } {
  if (hours === undefined) return { valid: true }
  if (hours < 0) {
    return { valid: false, error: "Hours cannot be negative" }
  }
  if (hours > 168) {
    return { valid: false, error: "Hours cannot exceed 168 (hours in a week)" }
  }
  return { valid: true }
}

function validateTask(data: TaskData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const typeResult = validateTaskType(data.task_type)
  if (!typeResult.valid) errors.push(typeResult.error!)

  const freqResult = validateFrequency(data.frequency)
  if (!freqResult.valid) errors.push(freqResult.error!)

  const hoursResult = validateEstimatedHours(data.estimated_hours_per_week)
  if (!hoursResult.valid) errors.push(hoursResult.error!)

  if (data.description && data.description.length > 1000) {
    errors.push("Task description too long (max 1000 characters)")
  }

  return { valid: errors.length === 0, errors }
}

export async function testTaskValidation(): Promise<{
  name: string
  passed: number
  failed: number
  errors: string[]
}> {
  const errors: string[] = []
  let passed = 0
  let failed = 0

  // Test valid task
  if (
    validateTask({
      task_type: "pet_feeding",
      description: "Feed the dogs twice daily",
      frequency: "daily",
      is_required: true,
      estimated_hours_per_week: 3.5,
    }).valid
  )
    passed++
  else {
    failed++
    errors.push("Valid task should pass")
  }

  // Test all valid task types
  let typesPass = true
  for (const type of VALID_TASK_TYPES) {
    if (!validateTaskType(type).valid) {
      typesPass = false
      break
    }
  }
  if (typesPass) passed++
  else {
    failed++
    errors.push("All valid task types should pass")
  }

  // Test invalid task type fails
  if (!validateTaskType("rocket_science").valid) passed++
  else {
    failed++
    errors.push("Invalid task type should fail")
  }

  // Test all valid frequencies
  let freqPass = true
  for (const freq of VALID_FREQUENCIES) {
    if (!validateFrequency(freq).valid) {
      freqPass = false
      break
    }
  }
  if (freqPass) passed++
  else {
    failed++
    errors.push("All valid frequencies should pass")
  }

  // Test invalid frequency fails
  if (!validateFrequency("every_second").valid) passed++
  else {
    failed++
    errors.push("Invalid frequency should fail")
  }

  // Test negative hours fails
  if (!validateEstimatedHours(-5).valid) passed++
  else {
    failed++
    errors.push("Negative hours should fail")
  }

  // Test excessive hours fails
  if (!validateEstimatedHours(200).valid) passed++
  else {
    failed++
    errors.push("Excessive hours should fail")
  }

  // Test minimal task passes
  if (validateTask({ task_type: "gardening" }).valid) passed++
  else {
    failed++
    errors.push("Minimal task should pass")
  }

  // Test long description fails
  if (!validateTask({ task_type: "pet_walking", description: "A".repeat(1001) }).valid) passed++
  else {
    failed++
    errors.push("Long description should fail")
  }

  // Test empty task type fails
  if (!validateTaskType("").valid) passed++
  else {
    failed++
    errors.push("Empty task type should fail")
  }

  return { name: "Task Validation", passed, failed, errors }
}
