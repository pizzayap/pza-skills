// Reads an API key from the environment, or from a .env file the user created in the
// project folder. Only the named keys are read, values are never printed, and nothing
// else in .env is touched.
import { existsSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { join } from "node:path"

export function readKey(names, cwd = process.cwd()) {
  for (const name of names) if (process.env[name]?.trim()) return { name, value: process.env[name].trim(), from: "environment" }
  const file = join(cwd, ".env")
  if (!existsSync(file)) return null
  const text = readFileSync(file, "utf8")
  for (const name of names) {
    const m = text.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*)$`, "m"))
    if (!m) continue
    const raw = m[1].trim()
    const quoted = raw.match(/^(['"])(.*?)\1/)
    const value = quoted ? quoted[2] : raw.replace(/\s+#.*$/, "")
    if (value) {
      warnIfTracked(cwd)
      return { name, value, from: ".env" }
    }
  }
  return null
}

// A key in a .env that Git would commit is a leak waiting to happen; say so once.
function warnIfTracked(cwd) {
  const git = spawnSync("git", ["check-ignore", "-q", ".env"], { cwd })
  if (git.status === 1) console.warn("warn: .env is not in .gitignore. Add it before committing, so the key stays on this machine.")
}
