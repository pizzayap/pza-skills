#!/usr/bin/env node
// Builds board.html for one design-directions run.
// Usage: node build-board.mjs <run-folder> [--out <file.html>]
// Node 18+, no dependencies. Reads only the run folder; writes only the board.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const args = process.argv.slice(2)
const outIndex = args.indexOf("--out")
const outArg = outIndex === -1 ? null : args.splice(outIndex, 2)[1]
const runDir = args[0] && resolve(args[0])
const fail = (message) => {
  console.error(`build-board: ${message}`)
  process.exit(1)
}
if (!runDir) fail("usage: node build-board.mjs <run-folder> [--out <file.html>]")
if (!existsSync(runDir) || !statSync(runDir).isDirectory()) fail(`${runDir} is not a folder`)

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"))
  } catch (error) {
    fail(`cannot read ${relative(process.cwd(), file)}: ${error.message}`)
  }
}

const problems = []
const warnings = []
const isText = (v) => typeof v === "string" && v.trim() !== ""
const run = readJson(join(runDir, "run.json"))
for (const key of ["title", "brief", "axis", "date"]) if (!isText(run[key])) problems.push(`run.json: ${key} is missing`)
if (run.mode && !["subagents", "one after another"].includes(run.mode)) problems.push('run.json: mode must be "subagents" or "one after another"')

const mime = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf"
}
const inside = (file, root) => file === root || file.startsWith(root + sep)
const dataUri = (file) => `data:${mime[extname(file).toLowerCase()]};base64,${readFileSync(file).toString("base64")}`

// Replaces local asset references with data URIs, so the page works inside the board.
function inlineAssets(html, baseDir, label) {
  const swap = (ref) => {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(ref) || ref.startsWith("/")) return null
    let file
    try {
      file = resolve(baseDir, decodeURI(ref.split(/[?#]/)[0]))
    } catch {
      warnings.push(`${label}: ${ref} is not a valid path`)
      return null
    }
    if (!mime[extname(file).toLowerCase()]) return null
    if (!inside(file, runDir)) {
      warnings.push(`${label}: ${ref} is outside the run folder; it won't show on the board`)
      return null
    }
    if (!existsSync(file)) {
      warnings.push(`${label}: ${ref} is missing`)
      return null
    }
    return dataUri(file)
  }
  return html
    .replace(/(\s(?:src|href|poster)=)(?:(["'])([^"']+)\2|([^\s"'=<>`]+))/gi, (all, attr, q, quoted, bare) => {
      const uri = swap(quoted ?? bare)
      return uri ? `${attr}"${uri}"` : all
    })
    .replace(/url\(&quot;([^&]+)&quot;\)/gi, (all, ref) => {
      const uri = swap(ref.trim())
      return uri ? `url(${uri})` : all
    })
    .replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (all, q, ref) => {
      const uri = swap(ref.trim())
      return uri ? `url(${uri})` : all
    })
}

const directionsDir = join(runDir, "directions")
if (!existsSync(directionsDir)) fail("no directions/ folder in the run folder")
const folders = readdirSync(directionsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d+-/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => parseInt(a) - parseInt(b))
if (folders.length < 2 || folders.length > 5) problems.push(`found ${folders.length} direction folders; expected 2 to 5 named <n>-<name>`)

const directions = []
const seen = new Set()
for (const folder of folders) {
  const dir = join(directionsDir, folder)
  const label = `directions/${folder}`
  const page = join(dir, "index.html")
  const metaFile = join(dir, "direction.json")
  if (!existsSync(page)) { problems.push(`${label}: index.html is missing`); continue }
  if (!existsSync(metaFile)) { problems.push(`${label}: direction.json is missing`); continue }
  const meta = readJson(metaFile)
  if (seen.has(parseInt(folder))) problems.push(`${label}: another folder already uses number ${parseInt(folder)}`)
  seen.add(parseInt(folder))
  if (meta.number !== parseInt(folder)) problems.push(`${label}: direction.json number should be ${parseInt(folder)}`)
  if (!isText(meta.name) || meta.name.length > 32) problems.push(`${label}: name must be 1 to 32 characters`)
  for (const key of ["bet", "tradeoff"]) {
    if (!isText(meta[key]) || meta[key].length > 200) problems.push(`${label}: ${key} must be 1 to 200 characters`)
  }
  for (const key of ["steal", "needs"]) {
    if (meta[key] != null && (typeof meta[key] !== "string" || meta[key].length > 200)) problems.push(`${label}: ${key} must be text up to 200 characters`)
  }
  for (const key of ["changes", "issues"]) {
    if (meta[key] != null && !(Array.isArray(meta[key]) && meta[key].every(isText))) problems.push(`${label}: ${key} must be a list of text lines`)
  }
  let html = readFileSync(page, "utf8")
  const external = [...html.matchAll(/https?:\/\/[^\s"'<>)]+/g)]
    .map((m) => m[0])
    .filter((u) => !/^https?:\/\/www\.w3\.org\//.test(u))
  if (external.length) warnings.push(`${label}: outside URLs won't load offline: ${[...new Set(external)].slice(0, 3).join(", ")}`)
  if (/\ssrcset=/i.test(html)) warnings.push(`${label}: srcset images are not inlined; use src with one local file`)
  if (/lorem ipsum/i.test(html)) warnings.push(`${label}: contains placeholder "lorem ipsum" text`)
  html = inlineAssets(html, dir, label)
  directions.push({
    number: meta.number, name: meta.name, bet: meta.bet, tradeoff: meta.tradeoff,
    steal: meta.steal || "", needs: meta.needs || "", changes: meta.changes || [], issues: meta.issues || [],
    folder, html
  })
}

let today = null
if (run.today) {
  const file = resolve(runDir, run.today)
  if (inside(file, runDir) && existsSync(file) && mime[extname(file).toLowerCase()]?.startsWith("image/")) today = dataUri(file)
  else warnings.push(`run.json: today ${run.today} is missing or not an image in the run folder`)
}

if (problems.length) {
  problems.forEach((p) => console.error(`problem: ${p}`))
  warnings.forEach((w) => console.error(`warning: ${w}`))
  fail(`${problems.length} problem(s); fix them and run again`)
}

const data = {
  title: run.title, brief: run.brief, audience: run.audience || "", axis: run.axis, date: run.date,
  mode: run.mode || "subagents", today, directions
}
// Escape so page content can never close the data script or run as markup.
const json = JSON.stringify(data)
  .replace(/</g, "\\u003c")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029")
const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../assets/board-template.html"), "utf8")
const out = outArg ? resolve(outArg) : join(runDir, "board.html")
const html = template.replace("__BOARD_DATA__", () => json)
writeFileSync(out, html)
warnings.forEach((w) => console.warn(`warning: ${w}`))
const mb = (Buffer.byteLength(html) / 1048576).toFixed(1)
console.log(`board: ${out} (${directions.length} directions, ${mb} MB)`)
if (mb > 15) console.warn("warning: the board is over 15 MB; use smaller images in the directions")
