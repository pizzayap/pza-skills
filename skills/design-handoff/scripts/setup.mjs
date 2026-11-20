#!/usr/bin/env node
// One-time setup: every download the skill needs, in one command, so the designer approves
// network access once. Safe to run again; finished parts are skipped.
// Usage: node setup.mjs [--voice local] [--project <dir>]
//   --voice local     also install the free Kokoro voice and download its model
//   --project <dir>   also install the prototype's locked packages (`npm ci`) when its node_modules is missing
//
// Downloads (approximate):
//   npm packages for captures, the deck check and Remotion   ~200 MB  (registry.npmjs.org)
//   Remotion's headless Chrome, used to render the video      ~170 MB  (remotion.media)
//   with --voice local: kokoro-js and its runtime              ~400 MB  (registry.npmjs.org)
//                       the Kokoro-82M voice model              ~90 MB  (huggingface.co)
import { existsSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { KOKORO } from "./lib/voice.mjs"
import { chromePath } from "./lib/browser.mjs"
import { SKILL_DIR, failWith, inSkillDir, readArgs } from "./lib/cli.mjs"

const fail = failWith("\nSetup stopped: ")
const cli = readArgs(fail)
const local = cli.option("--voice") === "local"
const projectArg = cli.option("--project")
const project = projectArg && resolve(projectArg)
const npm = process.platform === "win32" ? "npm.cmd" : "npm"
// Fail fast when the network is blocked instead of retrying for a minute or more.
const FAST = ["--fetch-retries=0", "--fetch-timeout=30000", "--no-audit", "--no-fund"]
const step = (n, text) => console.log(`\n[${n}] ${text}`)
const networkHint = (host) =>
  `Could not reach ${host}. The download needs network access: if your coding agent runs commands in a sandbox, approve the request when it asks (or rerun this command with network permission), then run setup again.`
const writeHint = (what) =>
  `Could not write to ${what}. Setup installs into the skill folder and npm's cache: if your coding agent runs commands in a sandbox, approve the request when it asks (or rerun this command outside the sandbox), then run setup again.`
const NET = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|fetch failed|network|Exit handler never called/i
const PERM = /EPERM|EACCES|EROFS|operation not permitted|permission denied/i

console.log("design-handoff setup")
console.log(`Downloads, once: about ${local ? "860" : "370"} MB in total (npm packages, Remotion's headless Chrome${local ? ", the Kokoro voice and its model" : ""}).`)

// 1. Tools that must already be on the machine
step(1, "Checking Node, ffmpeg and Chrome")
const major = parseInt(process.versions.node, 10)
if (major < 20) fail(`Node ${process.versions.node} is too old; install Node 20 or later.`)
for (const tool of ["ffmpeg", "ffprobe"]) {
  const r = spawnSync(tool, ["-version"], { encoding: "utf8" })
  if (r.status !== 0) fail(`${tool} was not found. Install ffmpeg (it includes ffprobe), then run setup again.`)
}
const chrome = chromePath()
if (!chrome) fail("Google Chrome was not found. The captures and the deck check use it: install Google Chrome, then run setup again.")
console.log(`  Node ${process.versions.node}, ffmpeg found, Chrome at ${chrome}`)

// 2. npm packages (and Kokoro when asked), in one install
const have = (name) => {
  try {
    return JSON.parse(readFileSync(join(SKILL_DIR, "node_modules", name, "package.json"), "utf8")).version
  } catch {
    return null
  }
}
// Kokoro is installed with --no-save, so a plain install would remove it: keep it once it is there.
const voice = local || have("kokoro-js") !== null
step(2, `Installing packages into the skill folder${voice ? " (with the Kokoro voice)" : ""}`)
const pkgs = voice ? ["--no-save", KOKORO.pkg] : []
// Skip npm entirely when every pinned package is already there: npm would still ask the registry.
const want = { ...JSON.parse(readFileSync(join(SKILL_DIR, "package.json"), "utf8")).dependencies, ...(voice ? { "kokoro-js": KOKORO.pkg.split("@").pop() } : {}) }
const missing = Object.entries(want).filter(([name, v]) => have(name) !== v)
const r = missing.length === 0 ? (console.log("  already installed"), { status: 0 }) : spawnSync(npm, ["install", "--prefix", SKILL_DIR, ...FAST, ...pkgs], { stdio: ["ignore", "inherit", "pipe"], encoding: "utf8" })
if (r.status !== 0) {
  const err = r.stderr ?? ""
  process.stderr.write(err.split("\n").slice(-8).join("\n"))
  if (NET.test(err)) fail(networkHint("registry.npmjs.org"))
  if (PERM.test(err)) fail(writeHint(`${SKILL_DIR} or npm's cache`))
  fail("npm install failed; the lines above say why.")
}

// 3. Remotion's headless Chrome
step(3, "Downloading Remotion's headless Chrome (about 170 MB, first time only)")
try {
  const { ensureBrowser } = await import(pathToFileURL(createRequire(join(SKILL_DIR, "noop.js")).resolve("@remotion/renderer")).href)
  await inSkillDir(() => ensureBrowser({ logLevel: "error" }))
} catch (e) {
  const msg = `${e.message} ${e.cause?.code ?? ""}`
  if (NET.test(msg)) fail(networkHint("remotion.media"))
  if (PERM.test(msg)) fail(writeHint(SKILL_DIR))
  fail(`Remotion could not prepare its browser: ${e.message}`)
}

// 4. The Kokoro model
// Also when Kokoro was kept from an earlier run: a cached model loads without the network.
if (voice) {
  step(4, "Downloading the Kokoro-82M voice model (about 90 MB, first time only)")
  try {
    const { KokoroTTS } = await import(pathToFileURL(createRequire(join(SKILL_DIR, "noop.js")).resolve("kokoro-js")).href)
    await KokoroTTS.from_pretrained(KOKORO.model, { dtype: "q8", device: "cpu" })
  } catch (e) {
    const msg = `${e.message} ${e.cause?.code ?? ""}`
    if (NET.test(msg)) fail(networkHint("huggingface.co"))
    if (PERM.test(msg)) fail(writeHint(SKILL_DIR))
    fail(`the Kokoro model did not load: ${e.message}`)
  }
}

// 5. The prototype's own packages, only when asked and only when missing.
// `npm ci` installs exactly what the lockfile says and never rewrites it, so the project gets no diff.
if (project) {
  const dir = project
  step(5, `Installing the prototype's packages in ${dir}`)
  if (existsSync(join(dir, "node_modules"))) console.log("  already installed")
  else if (!existsSync(join(dir, "package.json"))) console.log("  no package.json; nothing to install")
  else if (!existsSync(join(dir, "package-lock.json")))
    console.log("  no package-lock.json (pnpm, yarn or no lockfile): ask the designer to run the project's own install command, since it may change project files")
  else {
    const p = spawnSync(npm, ["ci", ...FAST], { cwd: dir, stdio: ["ignore", "inherit", "pipe"], encoding: "utf8" })
    if (p.status !== 0) {
      const err = p.stderr ?? ""
      process.stderr.write(err.split("\n").slice(-8).join("\n"))
      if (NET.test(err)) fail(networkHint("registry.npmjs.org"))
      if (PERM.test(err)) fail(writeHint(`${dir}/node_modules or npm's cache`))
      fail("the prototype's npm ci failed; the lines above say why.")
    }
  }
}

console.log(`\nSetup done. Nothing else will be downloaded${voice ? "" : " unless you pick the free local voice later (run setup again with --voice local)"}.`)
