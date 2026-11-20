// The skill folder, command-line options and stopping with a message, for every script.
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/** The skill folder, which holds package.json and the node_modules that setup installs. */
export const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

/** fail(message) prints the prefix and message to stderr and exits with 1. */
export const failWith = (prefix) => (message) => (console.error(`${prefix}${message}`), process.exit(1))

// option(name) returns the value after name: null when name is absent, and fail() when no value
// follows it. has(name) reads a switch. Each read removes what it found, so `rest` ends as the
// positional arguments. Unknown options are left in place.
export function readArgs(fail, rest = process.argv.slice(2)) {
  return {
    rest,
    has: (name) => rest.includes(name) && rest.splice(rest.indexOf(name), 1).length === 1,
    option(name) {
      const i = rest.indexOf(name)
      if (i === -1) return null
      if (rest[i + 1] === undefined || rest[i + 1].startsWith("--")) fail(`${name} needs a value`)
      return rest.splice(i, 2)[1]
    },
  }
}

// Remotion keeps its headless Chrome beside the nearest package.json of the current folder, so
// open or download it from the skill folder: setup's copy is used and nothing lands in the project.
export async function inSkillDir(fn) {
  const from = process.cwd()
  process.chdir(SKILL_DIR)
  try {
    return await fn()
  } finally {
    process.chdir(from)
  }
}
