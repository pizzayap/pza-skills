#!/usr/bin/env node
// Builds report.html for one persona-walkthrough run.
// Usage: node build-report.mjs <run-folder> [--out <file.html>]
// Node 18+, no dependencies. Reads only the run folder; writes only the report.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const args = process.argv.slice(2)
const outIndex = args.indexOf("--out")
const outArg = outIndex === -1 ? null : args.splice(outIndex, 2)[1]
const runDir = args[0] && resolve(args[0])
const fail = (message) => {
  console.error(`build-report: ${message}`)
  process.exit(1)
}
if (!runDir) fail("usage: node build-report.mjs <run-folder> [--out <file.html>]")
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
const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }
const inside = (file, root) => file.startsWith(root + sep)

const report = readJson(join(runDir, "report.json"))
for (const key of ["title", "goal", "start", "date"]) if (!isText(report[key])) problems.push(`report.json: ${key} is missing`)
if (isText(report.goal) && report.goal.length > 200) problems.push("report.json: goal is over 200 characters; put caveats in notes")
if (report.notes != null && !(Array.isArray(report.notes) && report.notes.every(isText))) problems.push("report.json: notes must be a list of text lines")
if (report.mode && !["subagents", "one after another"].includes(report.mode)) problems.push('report.json: mode must be "subagents" or "one after another"')

const walksDir = join(runDir, "walks")
if (!existsSync(walksDir)) fail("no walks/ folder in the run folder")
const folders = readdirSync(walksDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d+-/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => parseInt(a) - parseInt(b))
if (folders.length < 1 || folders.length > 5) problems.push(`found ${folders.length} walk folders; expected 1 to 5 named <n>-<persona>`)

const outcomes = ["completed", "completed with trouble", "gave up", "stopped before a real action"]
const frictions = ["none", "slowed", "stuck"]
const walks = []
const limit = (value, max, at) => { if (isText(value) && value.length > max) problems.push(`${at} is over ${max} characters; shorten it`) }
for (const folder of folders) {
  const label = `walks/${folder}`
  const dir = join(walksDir, folder)
  const file = join(dir, "walk.json")
  if (!existsSync(file)) { problems.push(`${label}: walk.json is missing`); continue }
  const w = readJson(file)
  for (const key of ["persona", "who", "moves", "viewport", "summary"]) if (!isText(w[key])) problems.push(`${label}: ${key} is missing`)
  if (walks.some((x) => x.number === parseInt(folder))) problems.push(`${label}: another folder already uses number ${parseInt(folder)}`)
  limit(w.summary, 300, `${label}: summary`)
  if (!outcomes.includes(w.outcome)) problems.push(`${label}: outcome must be one of: ${outcomes.join(", ")}`)
  if (!Array.isArray(w.steps) || w.steps.length === 0) { problems.push(`${label}: steps must be a non-empty list`); continue }
  const steps = w.steps.map((s, i) => {
    const at = `${label} step ${i + 1}`
    if (s.n !== i + 1) problems.push(`${at}: n should be ${i + 1}`)
    if (!isText(s.did)) problems.push(`${at}: did is missing`)
    const friction = s.friction || "none"
    if (!frictions.includes(friction)) problems.push(`${at}: friction must be none, slowed or stuck`)
    limit(s.evidence, 400, `${at}: evidence`)
    limit(s.fix, 240, `${at}: fix`)
    if (friction !== "none") {
      for (const key of ["element", "evidence", "fix"]) if (!isText(s[key])) problems.push(`${at}: ${friction} steps need ${key}`)
    }
    let shot = null
    if (s.shot) {
      const img = resolve(dir, s.shot)
      if (!inside(img, runDir) || !existsSync(img) || !mime[extname(img).toLowerCase()]) warnings.push(`${at}: screenshot ${s.shot} is missing or not png, jpg or webp`)
      else shot = `data:${mime[extname(img).toLowerCase()]};base64,${readFileSync(img).toString("base64")}`
    }
    return { n: s.n, shot, heard: s.heard || "", saw: s.saw || "", thought: s.thought || "", did: s.did, result: s.result || "",
      friction, element: s.element || "", evidence: s.evidence || "", fix: s.fix || "" }
  })
  walks.push({ number: parseInt(folder), persona: w.persona, who: w.who, moves: w.moves, viewport: w.viewport,
    outcome: w.outcome, summary: w.summary, steps })
}

const issues = Array.isArray(report.issues) ? report.issues : []
if (!Array.isArray(report.issues)) problems.push("report.json: issues must be a list (empty when nobody got stuck)")
if (issues.length > 10) problems.push(`report.json: ${issues.length} issues; keep the 10 that matter most`)
const numbers = new Set(walks.map((w) => w.number))
issues.forEach((issue, i) => {
  const at = `report.json issues[${i}]`
  for (const key of ["title", "where", "evidence", "fix"]) if (!isText(issue[key])) problems.push(`${at}: ${key} is missing`)
  limit(issue.title, 90, `${at}: title`)
  limit(issue.evidence, 400, `${at}: evidence`)
  limit(issue.fix, 240, `${at}: fix`)
  if (!["Blocks", "Slows", "Polish"].includes(issue.severity)) problems.push(`${at}: severity must be Blocks, Slows or Polish`)
  if (!Array.isArray(issue.personas) || !issue.personas.length || !issue.personas.every((n) => numbers.has(n))) problems.push(`${at}: personas must list walk numbers that exist`)
  if (issue.steps != null && !(Array.isArray(issue.steps) && issue.steps.every((s) => /^\d+\.\d+$/.test(s)))) problems.push(`${at}: steps must look like "2.4" (walk.step)`)
  else for (const ref of issue.steps || []) {
    const [wn, sn] = ref.split(".").map(Number)
    if (!walks.some((w) => w.number === wn && w.steps.some((s) => s.n === sn))) problems.push(`${at}: step ${ref} does not exist`)
  }
})
const stuckSteps = walks.flatMap((w) => w.steps.filter((s) => s.friction !== "none"))
if (stuckSteps.length && !issues.length) warnings.push("walks have stuck or slowed steps but report.json lists no issues")

if (problems.length) {
  problems.forEach((p) => console.error(`problem: ${p}`))
  warnings.forEach((w) => console.error(`warning: ${w}`))
  fail(`${problems.length} problem(s); fix them and run again`)
}

const data = { title: report.title, goal: report.goal, app: report.app || "", start: report.start, date: report.date,
  mode: report.mode || "subagents", notes: report.notes || [], walks, issues }
const json = JSON.stringify(data)
  .replace(/</g, "\\u003c")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029")
const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../assets/report-template.html"), "utf8")
const out = outArg ? resolve(outArg) : join(runDir, "report.html")
const html = template.replace("__REPORT_DATA__", () => json)
writeFileSync(out, html)
warnings.forEach((w) => console.warn(`warning: ${w}`))
const mb = (Buffer.byteLength(html) / 1048576).toFixed(1)
console.log(`report: ${out} (${walks.length} walks, ${issues.length} issues, ${mb} MB)`)
if (mb > 15) console.warn("warning: the report is over 15 MB; save screenshots as jpg or at a smaller size")
