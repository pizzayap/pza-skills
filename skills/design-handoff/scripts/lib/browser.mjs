// Finds playwright-core and a Chrome or Chromium to drive. Shared by capture.mjs,
// build-deck.mjs (--check) and make-video.mjs.
//
// Lookup order for playwright-core: the project in the current directory, then this
// skill's own node_modules. Browser order: installed Google Chrome, then Playwright's
// Chromium. Nothing is installed here; a missing piece prints the command that fixes it.
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
let corePath = null // the playwright-core entry that was loaded, for the install hint

export async function loadPlaywright() {
  const bases = [join(process.cwd(), "noop.js"), join(SKILL_DIR, "noop.js")]
  for (const base of bases) {
    try {
      const path = createRequire(base).resolve("playwright-core")
      corePath = path
      return await import(pathToFileURL(path).href)
    } catch {
      // try the next place
    }
  }
  throw new Error(
    `playwright-core is not installed. Run this once, then try again:\n  npm install --prefix "${SKILL_DIR}"`,
  )
}

export async function launch() {
  const pw = await loadPlaywright()
  const chromium = pw.chromium ?? pw.default?.chromium
  const args = ["--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files"]
  try {
    return await chromium.launch({ headless: true, channel: "chrome", args })
  } catch (chromeError) {
    try {
      return await chromium.launch({ headless: true, args })
    } catch {
      throw new Error(
        `No browser found. Install Google Chrome, or run once:\n  node "${join(dirname(corePath), "cli.js")}" install chromium\n` +
          `(${String(chromeError.message).split("\n")[0]})`,
      )
    }
  }
}

export const skillDir = SKILL_DIR
