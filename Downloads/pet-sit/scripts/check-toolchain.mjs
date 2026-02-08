import fs from "node:fs"
import path from "node:path"
import process from "node:process"

function parseSemver(raw) {
  const value = String(raw || "").trim()
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  return {
    raw: value,
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  }
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  return a.patch - b.patch
}

function resolveProjectFile(filename) {
  return path.join(process.cwd(), filename)
}

function readJsonFile(filepath) {
  return JSON.parse(fs.readFileSync(filepath, "utf8"))
}

function fail(message) {
  console.error(`[sitswap] Toolchain check failed: ${message}`)
  process.exit(1)
}

function main() {
  const packageJsonPath = resolveProjectFile("package.json")
  const packageJson = readJsonFile(packageJsonPath)

  const requiredNodeRaw = String(packageJson?.engines?.node ?? "").replace(">=", "").trim()
  const requiredNode = parseSemver(requiredNodeRaw)
  const currentNode = parseSemver(process.versions.node)

  if (!requiredNode || !currentNode) {
    fail("Unable to parse Node.js versions from package.json/process metadata.")
  }

  if (compareSemver(currentNode, requiredNode) < 0) {
    fail(
      `Node.js ${currentNode.raw} is too old. Required: >= ${requiredNode.raw}. ` +
        `Use nvm/fnm to install the project version (see .nvmrc).`,
    )
  }

  const packageManagerRaw = String(packageJson?.packageManager ?? "")
  const packageManagerMatch = packageManagerRaw.match(/^npm@(.+)$/)
  if (!packageManagerMatch) {
    fail("packageManager must be pinned to npm@<version>.")
  }

  const requiredNpm = parseSemver(packageManagerMatch[1])
  if (!requiredNpm) {
    fail(`Unable to parse required npm version from packageManager: ${packageManagerRaw}`)
  }

  const npmUserAgent = String(process.env.npm_config_user_agent ?? "")
  const npmUserAgentMatch = npmUserAgent.match(/npm\/(\d+\.\d+\.\d+)/)
  const currentNpm = npmUserAgentMatch ? parseSemver(npmUserAgentMatch[1]) : null

  if (!currentNpm) {
    console.warn("[sitswap] npm version could not be detected from npm_config_user_agent; skipping npm version check.")
  } else if (compareSemver(currentNpm, requiredNpm) < 0) {
    fail(`npm ${currentNpm.raw} is too old. Required: >= ${requiredNpm.raw}.`)
  }

  const lockfileExists = fs.existsSync(resolveProjectFile("package-lock.json"))
  const nodeModulesExists = fs.existsSync(resolveProjectFile("node_modules"))
  const requiredBins = ["eslint", "tsx", "vitest"]
  const missingBins = requiredBins.filter((bin) => !fs.existsSync(resolveProjectFile(path.join("node_modules", ".bin", bin))))

  if (lockfileExists && nodeModulesExists && missingBins.length > 0) {
    fail(`Missing local npm binaries (${missingBins.join(", ")}). Run \`npm ci\` to repair node_modules.`)
  }

  console.log(`[sitswap] Toolchain OK (node ${currentNode.raw}${currentNpm ? `, npm ${currentNpm.raw}` : ""})`)
}

main()
