// Finds playwright-core and a Chrome or Chromium to drive. Shared by capture.mjs,
// build-deck.mjs (--check) and make-video.mjs.
//
// Lookup order for playwright-core: the project in the current directory, then this
// skill's own node_modules. Browser order: installed Google Chrome, then Playwright's
// Chromium. Nothing is installed here; a missing piece prints the command that fixes it.
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

export async function loadPlaywright() {
  const bases = [join(process.cwd(), "noop.js"), join(SKILL_DIR, "noop.js")]
  for (const base of bases) {
    try {
      const path = createRequire(base).resolve("playwright-core")
      return await import(pathToFileURL(path).href)
    } catch {
      // try the next place
    }
  }
  throw new Error(
    `playwright-core is not installed. Run setup once, then try again:\n  node "${join(SKILL_DIR, "scripts", "setup.mjs")}"`,
  )
}

/** Where Google Chrome is installed, or null. */
export function chromePath() {
  const candidates =
    process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", join(process.env.HOME ?? "", "Applications/Google Chrome.app/Contents/MacOS/Google Chrome")]
      : process.platform === "win32"
        ? [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => join(d, "Google", "Chrome", "Application", "chrome.exe"))
        : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome"]
  return candidates.find((p) => existsSync(p)) ?? null
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
      const cause = String(chromeError.message).split("\n")[0]
      const installed = chromePath()
      // Chrome is there but could not start: almost always a sandbox that blocks launching apps.
      if (installed && !/is not found|not found at|Executable doesn't exist/i.test(chromeError.message))
        throw new Error(
          `Google Chrome is installed (${installed}) but could not start. In a sandbox such as the Codex app, starting a browser needs permission: approve the request, or rerun this command with permission. Do not install another browser.\n(${cause})`,
        )
      throw new Error(
        `Google Chrome was not found. Ask the designer to install Google Chrome, then run this again.\n(${cause})`,
      )
    }
  }
}

export const skillDir = SKILL_DIR
