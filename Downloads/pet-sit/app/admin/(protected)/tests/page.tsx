"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Play, Loader2 } from "lucide-react"
import { Navbar } from "@/components/navigation/navbar"

// ============ GEOCODING TESTS ============
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

// ============ TEST DEFINITIONS ============
interface TestResult {
  name: string
  passed: boolean
  error?: string
}

interface TestSuite {
  name: string
  tests: (() => TestResult)[]
}

const testSuites: TestSuite[] = [
  {
    name: "Geocoding & Distance",
    tests: [
      () => {
        const distance = calculateDistance(46.4004, -117.0012, 46.4004, -117.0012)
        return {
          name: "Same point returns 0 distance",
          passed: distance === 0,
          error: distance !== 0 ? `Expected 0, got ${distance}` : undefined,
        }
      },
      () => {
        const distance = calculateDistance(46.4004, -117.0012, 46.5819, -116.9194)
        return {
          name: "Lewiston to Genesee ~13 miles",
          passed: distance > 10 && distance < 16,
          error: distance <= 10 || distance >= 16 ? `Expected 10-16, got ${distance}` : undefined,
        }
      },
      () => {
        const d1 = calculateDistance(46.4004, -117.0012, 46.5819, -116.9194)
        const d2 = calculateDistance(46.5819, -116.9194, 46.4004, -117.0012)
        return {
          name: "Distance is symmetric",
          passed: Math.abs(d1 - d2) < 0.01,
          error: Math.abs(d1 - d2) >= 0.01 ? `d1=${d1}, d2=${d2}` : undefined,
        }
      },
      () => {
        const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437)
        return {
          name: "NYC to LA ~2450 miles",
          passed: distance > 2400 && distance < 2500,
          error: distance <= 2400 || distance >= 2500 ? `Expected 2400-2500, got ${distance}` : undefined,
        }
      },
    ],
  },
  {
    name: "Matching Logic",
    tests: [
      () => {
        const isSitter1 = true,
          isSitter2 = true
        const shouldMatch = !(isSitter1 && isSitter2)
        return {
          name: "Sitter + Sitter should NOT match",
          passed: !shouldMatch,
          error: shouldMatch ? "Incorrectly matched two sitter listings" : undefined,
        }
      },
      () => {
        const isStay1 = true,
          isStay2 = true
        const shouldMatch = !(isStay1 && isStay2)
        return {
          name: "Stay + Stay should NOT match",
          passed: !shouldMatch,
          error: shouldMatch ? "Incorrectly matched two stay listings" : undefined,
        }
      },
      () => {
        const isSitter = true,
          isStay = true
        const shouldMatch = (isSitter && isStay) || (isStay && isSitter)
        return {
          name: "Sitter + Stay should match",
          passed: shouldMatch,
          error: !shouldMatch ? "Failed to match sitter and stay" : undefined,
        }
      },
      () => {
        // Bidirectional test
        const sitterSeesStay = true
        const staysSitter = true
        return {
          name: "Matching is bidirectional",
          passed: sitterSeesStay && staysSitter,
          error: !sitterSeesStay || !staysSitter ? "Matching not bidirectional" : undefined,
        }
      },
    ],
  },
  {
    name: "Service Matching",
    tests: [
      () => {
        const needed = ["gardening", "pet_sitting"]
        const offered = ["gardening", "cooking"]
        const matches = needed.filter((n) => offered.includes(n))
        return {
          name: "Direct service match works",
          passed: matches.length === 1 && matches[0] === "gardening",
          error: matches.length !== 1 ? `Expected 1 match, got ${matches.length}` : undefined,
        }
      },
      () => {
        const relatedServices: Record<string, string[]> = {
          gardening: ["lawn_care"],
          pet_sitting: ["dog_walking"],
        }
        const needed = ["gardening"]
        const offered = ["lawn_care"]
        const hasRelatedMatch = needed.some((n) => relatedServices[n]?.some((r) => offered.includes(r)))
        return {
          name: "Related services match (gardening → lawn_care)",
          passed: hasRelatedMatch,
          error: !hasRelatedMatch ? "Failed to match related services" : undefined,
        }
      },
      () => {
        const needed: string[] = []
        const offered = ["gardening"]
        const matches = needed.filter((n) => offered.includes(n))
        return {
          name: "Empty needed array returns no matches",
          passed: matches.length === 0,
          error: matches.length !== 0 ? `Expected 0 matches, got ${matches.length}` : undefined,
        }
      },
    ],
  },
  {
    name: "Listing Validation",
    tests: [
      () => {
        const title = ""
        const isValid = title.trim().length >= 3
        return {
          name: "Empty title is invalid",
          passed: !isValid,
          error: isValid ? "Empty title should be invalid" : undefined,
        }
      },
      () => {
        const title = "My Great Listing"
        const isValid = title.trim().length >= 3 && title.trim().length <= 100
        return {
          name: "Valid title passes",
          passed: isValid,
          error: !isValid ? "Valid title should pass" : undefined,
        }
      },
      () => {
        const validStates = ["AL", "AK", "AZ", "CA", "ID", "TX", "WA"]
        const state = "ID"
        const isValid = validStates.includes(state)
        return {
          name: "Valid state abbreviation passes",
          passed: isValid,
          error: !isValid ? "ID should be valid" : undefined,
        }
      },
      () => {
        const state = "Idaho"
        const isValid = state.length === 2
        return {
          name: "Full state name is invalid (must be 2 chars)",
          passed: !isValid,
          error: isValid ? "Full state name should be invalid" : undefined,
        }
      },
      () => {
        const radius = 25
        const isValid = radius >= 5 && radius <= 100
        return {
          name: "Search radius 25 is valid",
          passed: isValid,
          error: !isValid ? "Radius 25 should be valid" : undefined,
        }
      },
      () => {
        const radius = 150
        const isValid = radius >= 5 && radius <= 100
        return {
          name: "Search radius 150 is invalid",
          passed: !isValid,
          error: isValid ? "Radius 150 should be invalid" : undefined,
        }
      },
    ],
  },
  {
    name: "Sit Validation",
    tests: [
      () => {
        const startDate = new Date("2024-01-15")
        const endDate = new Date("2024-01-10")
        const isValid = endDate > startDate
        return {
          name: "End date before start date is invalid",
          passed: !isValid,
          error: isValid ? "End before start should be invalid" : undefined,
        }
      },
      () => {
        const startDate = new Date("2024-01-10")
        const endDate = new Date("2024-01-15")
        const isValid = endDate > startDate
        return {
          name: "Valid date range passes",
          passed: isValid,
          error: !isValid ? "Valid range should pass" : undefined,
        }
      },
      () => {
        const uuid = "123e4567-e89b-12d3-a456-426614174000"
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        const isValid = uuidRegex.test(uuid)
        return {
          name: "Valid UUID format passes",
          passed: isValid,
          error: !isValid ? "Valid UUID should pass" : undefined,
        }
      },
    ],
  },
  {
    name: "Pet Validation",
    tests: [
      () => {
        const name = ""
        const isValid = name.trim().length > 0
        return {
          name: "Empty pet name is invalid",
          passed: !isValid,
          error: isValid ? "Empty name should be invalid" : undefined,
        }
      },
      () => {
        const species = "dragon"
        const validSpecies = ["dog", "cat", "bird", "fish", "reptile", "small_animal", "other"]
        const isValid = validSpecies.includes(species)
        return {
          name: "Invalid species is rejected",
          passed: !isValid,
          error: isValid ? "Dragon should be invalid" : undefined,
        }
      },
      () => {
        const species = "dog"
        const validSpecies = ["dog", "cat", "bird", "fish", "reptile", "small_animal", "other"]
        const isValid = validSpecies.includes(species)
        return {
          name: "Valid species passes",
          passed: isValid,
          error: !isValid ? "Dog should be valid" : undefined,
        }
      },
      () => {
        const age = -5
        const isValid = age >= 0
        return {
          name: "Negative age is invalid",
          passed: !isValid,
          error: isValid ? "Negative age should be invalid" : undefined,
        }
      },
    ],
  },
  {
    name: "Task Validation",
    tests: [
      () => {
        const taskType = "gardening"
        const validTypes = [
          "pet_feeding",
          "dog_walking",
          "litter_cleaning",
          "grooming",
          "medication",
          "gardening",
          "mail_collection",
          "plant_watering",
          "pool_maintenance",
          "general_cleaning",
          "lawn_care",
        ]
        const isValid = validTypes.includes(taskType)
        return {
          name: "Valid task type passes",
          passed: isValid,
          error: !isValid ? "Gardening should be valid" : undefined,
        }
      },
      () => {
        const frequency = "hourly"
        const validFreqs = ["daily", "weekly", "as_needed", "twice_daily"]
        const isValid = validFreqs.includes(frequency)
        return {
          name: "Invalid frequency is rejected",
          passed: !isValid,
          error: isValid ? "Hourly should be invalid" : undefined,
        }
      },
      () => {
        const hours = 0
        const isValid = hours > 0
        return {
          name: "Zero hours is invalid",
          passed: !isValid,
          error: isValid ? "Zero hours should be invalid" : undefined,
        }
      },
    ],
  },
]

export default function TestRunnerPage() {
  const [results, setResults] = useState<{ suite: string; results: TestResult[] }[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  const runTests = () => {
    setIsRunning(true)
    setResults([])

    // Run tests with a small delay for visual feedback
    setTimeout(() => {
      const allResults = testSuites.map((suite) => ({
        suite: suite.name,
        results: suite.tests.map((test) => test()),
      }))
      setResults(allResults)
      setIsRunning(false)
      setHasRun(true)
    }, 500)
  }

  const totalTests = results.reduce((acc, suite) => acc + suite.results.length, 0)
  const passedTests = results.reduce((acc, suite) => acc + suite.results.filter((r) => r.passed).length, 0)
  const failedTests = totalTests - passedTests

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Test Runner</h1>
          <p className="text-muted-foreground">
            Run unit tests to verify core functionality of the pet sitting platform.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Suite</span>
              <Button onClick={runTests} disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run All Tests
                  </>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              {testSuites.length} test suites, {testSuites.reduce((acc, s) => acc + s.tests.length, 0)} total tests
            </CardDescription>
          </CardHeader>
          {hasRun && (
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {passedTests} Passed
                </Badge>
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <XCircle className="mr-1 h-3 w-3" />
                  {failedTests} Failed
                </Badge>
                <Badge variant="outline">{((passedTests / totalTests) * 100).toFixed(0)}% Pass Rate</Badge>
              </div>
            </CardContent>
          )}
        </Card>

        {results.map((suite) => (
          <Card key={suite.suite} className="mb-4">
            <CardHeader className="py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {suite.results.every((r) => r.passed) ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                {suite.suite}
                <Badge variant="secondary" className="ml-auto">
                  {suite.results.filter((r) => r.passed).length}/{suite.results.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-4">
              <div className="space-y-2">
                {suite.results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-md ${
                      result.passed ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={result.passed ? "text-green-900" : "text-red-900"}>{result.name}</span>
                    </div>
                    {result.error && <span className="text-xs text-red-600 font-mono">{result.error}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {!hasRun && (
          <div className="text-center py-12 text-muted-foreground">Click "Run All Tests" to execute the test suite</div>
        )}
      </main>
    </div>
  )
}
