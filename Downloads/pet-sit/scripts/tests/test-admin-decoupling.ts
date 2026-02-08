/**
 * Ensures standalone admin app does not import main-app admin route modules.
 */

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

interface TestResult {
  name: string
  passed: number
  failed: number
  errors: string[]
}

const DISALLOWED_IMPORT_PATTERNS = ["@/app/admin", "@/app/actions/admin"]

async function listTypeScriptFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(fullPath)))
      continue
    }

    if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(fullPath)
    }
  }

  return files
}

export async function testAdminDecoupling(): Promise<TestResult> {
  const result: TestResult = {
    name: "Admin Decoupling Guard",
    passed: 0,
    failed: 0,
    errors: [],
  }

  const adminAppRoot = path.resolve(process.cwd(), "apps/admin")
  const files = await listTypeScriptFiles(adminAppRoot)
  const violations: string[] = []

  for (const file of files) {
    const content = await readFile(file, "utf8")
    for (const disallowed of DISALLOWED_IMPORT_PATTERNS) {
      if (content.includes(disallowed)) {
        const relativePath = path.relative(process.cwd(), file)
        violations.push(`${relativePath} imports disallowed path "${disallowed}"`)
      }
    }
  }

  if (violations.length > 0) {
    result.failed = 1
    result.errors = violations
    console.log("  ✗ Admin decoupling guard failed")
  } else {
    result.passed = 1
    console.log("  ✓ Admin app imports are decoupled from main-app admin route modules")
  }

  return result
}
