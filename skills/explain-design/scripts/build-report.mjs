#!/usr/bin/env node
// Builds one self-contained explain-design report from a data file.
// Usage: node build-report.mjs <data.json> <out-dir | out.html> [--image <capture>] [--force]
// Given a directory, writes report-<source>-<ddmmmyyyy>.html into it, e.g. report-libraries.dev-28oct2026.html.
// Node 18+, no dependencies. Reads only the files named; writes only the report.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { basename, dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  if (i === -1) return null
  const value = args[i + 1]
  args.splice(i, 2)
  return value ?? fail(`${name} needs a value`)
}
function fail(message) {
  console.error(`build-report: ${message}`)
  process.exit(1)
}

const force = args.includes("--force")
if (force) args.splice(args.indexOf("--force"), 1)
const imagePath = flag("--image")
const [dataPath, outPath] = args
if (!dataPath || !outPath) fail("usage: node build-report.mjs <data.json> <out-dir | out.html> [--image <capture>] [--force]")

let data
try {
  data = JSON.parse(readFileSync(resolve(dataPath), "utf8"))
} catch (error) {
  fail(`cannot read ${dataPath}: ${error.message}`)
}

// Shape checks, so a broken report fails here instead of in the browser.
const problems = []
const isText = (v) => typeof v === "string" && v.trim() !== ""
if (!data || typeof data !== "object" || Array.isArray(data)) fail("data must be a JSON object")
if (!isText(data.title)) problems.push("title must be a non-empty string")
if (!isText(data.summary)) problems.push("summary must be a non-empty string")
const point = (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && n >= 0 && n <= 100)
const sections = Array.isArray(data.sections) ? data.sections : []

// Checks one view's points: the single design, the page overview, or one section.
const checkView = (v, at, { minWorks, overview }) => {
  for (const [key, min, max] of [["works", minWorks, 6], ["improve", 0, 5]]) {
    const items = v[key] ?? []
    if (!Array.isArray(items)) {
      problems.push(`${at}${key} must be an array`)
      continue
    }
    if (items.length < min || items.length > max) problems.push(`${at}${key} should hold ${min} to ${max} items (has ${items.length})`)
    items.forEach((item, i) => {
      const where = `${at}${key}[${i}]`
      if (!isText(item?.title)) problems.push(`${where}.title is missing`)
      else if (item.title.length > 32) problems.push(`${where}.title is over 32 characters; callouts need short labels`)
      if (!isText(item?.why)) problems.push(`${where}.why is missing`)
      else if (item.why.length > 180) problems.push(`${where}.why is over 180 characters; keep it to one or two sentences`)
      if (item?.side !== undefined && !["left", "right"].includes(item.side)) problems.push(`${where}.side must be left or right`)
      if (item?.lens !== undefined && !["craft", "behaviour"].includes(item.lens)) problems.push(`${where}.lens must be craft or behaviour`)
      if (item?.thought !== undefined && (!isText(item.thought) || item.thought.length > 90)) problems.push(`${where}.thought must be 1 to 90 characters`)
      if (key === "improve" && !isText(item?.fix)) problems.push(`${where}.fix is missing`)
      if (key === "improve" && item?.impact && !["High", "Medium", "Low"].includes(item.impact)) problems.push(`${where}.impact must be High, Medium or Low`)
      if (overview) {
        if (!Number.isInteger(item?.section) || item.section < 1 || item.section > sections.length) {
          problems.push(`${where}.section must be a section number from 1 to ${sections.length}`)
        }
        return
      }
      const r = item?.region
      if (r !== undefined) {
        const ok = Array.isArray(r) && r.length === 4 && r.every((n) => typeof n === "number" && n >= 0 && n <= 100) &&
          r[0] + r[2] <= 100.5 && r[1] + r[3] <= 100.5
        if (!ok) problems.push(`${where}.region must be [x, y, width, height] in percent, inside 0 to 100`)
      }
    })
  }
  const total = (Array.isArray(v.works) ? v.works.length : 0) + (Array.isArray(v.improve) ? v.improve.length : 0)
  if (total > 8) problems.push(`${at || "report "}has ${total} points; keep 8 or fewer so they fit around the design`)
  for (const [i, dim] of (Array.isArray(v.dimensions) ? v.dimensions : []).entries()) {
    if (!point(dim?.from) || !point(dim?.to)) problems.push(`${at}dimensions[${i}] needs from and to as [x, y] in percent`)
    if (!isText(String(dim?.label ?? ""))) problems.push(`${at}dimensions[${i}].label is missing`)
  }
}

if (sections.length) {
  // Whole page: top-level points are the overview and pin to a section by number.
  checkView(data, "", { minWorks: 0, overview: true })
  sections.forEach((sec, i) => {
    const at = `sections[${i}].`
    if (!isText(sec?.title)) problems.push(`${at}title is missing`)
    else if (sec.title.length > 24) problems.push(`${at}title is over 24 characters`)
    if (sec?.range !== undefined && !(point(sec.range) && sec.range[0] <= sec.range[1])) problems.push(`${at}range must be [top, bottom] in percent of the page`)
    checkView(sec, at, { minWorks: 0, overview: false })
  })
  const works = [data, ...sections].reduce((sum, v) => sum + (Array.isArray(v.works) ? v.works.length : 0), 0)
  if (works < 1) problems.push("a whole-page report needs at least one point under works")
} else {
  checkView(data, "", { minWorks: 1, overview: false })
}

// File name: report-<source>-<ddmmmyyyy>.html, from the source host or label and the capture date.
const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 60)
const sourceName = () => {
  const src = data?.source || {}
  try {
    if (src.href) return new URL(src.href).hostname.replace(/^www\./, "")
  } catch {}
  if (src.label) return basename(String(src.label)).replace(/\.(png|jpe?g|webp|gif|avif|svg)$/i, "")
  if (imagePath) return basename(imagePath, extname(imagePath))
  return data?.title || "design"
}
const stamp = () => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data?.source?.date || ""))
  const date = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date()
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
  const day = m ? date.getUTCDate() : date.getDate()
  const month = m ? date.getUTCMonth() : date.getMonth()
  const year = m ? date.getUTCFullYear() : date.getFullYear()
  return `${String(day).padStart(2, "0")}${months[month]}${year}`
}
const out = outPath.toLowerCase().endsWith(".html")
  ? resolve(outPath)
  : join(resolve(outPath), `report-${slug(sourceName()) || "design"}-${stamp()}.html`)
if (existsSync(out) && !force) fail(`${out} exists; pass --force to replace it`)

if (problems.length) fail(`invalid data:\n  - ${problems.join("\n  - ")}`)

// Embeds local images so the report is one file. Paths are relative to the data file.
const types = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml" }
const embed = (path, base) => {
  const type = types[extname(path).toLowerCase()]
  if (!type) fail(`unsupported image type ${extname(path) || "(none)"} for ${path}`)
  try {
    return `data:${type};base64,${readFileSync(resolve(base, path)).toString("base64")}`
  } catch (error) {
    fail(`cannot read image ${path}: ${error.message}`)
  }
}
const local = (src) => typeof src === "string" && src.trim() !== "" && !/^(data:|https?:)/i.test(src.trim())
const dataDir = dirname(resolve(dataPath))
if (imagePath) data.image = { ...(data.image || {}), src: embed(imagePath, process.cwd()) }
for (const holder of [data.image, data.page?.image, ...sections.map((sec) => sec?.image)]) {
  if (holder && local(holder.src)) holder.src = embed(holder.src, dataDir)
}

const template = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../assets/report-template.html"), "utf8")
const block = /(<script type="application\/json" id="report-data">)[\s\S]*?(<\/script>)/
if (!block.test(template)) fail("template is missing its report-data block")

// "<" is escaped so no string in the data can close the script tag.
const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c")

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, template.replace(block, (_, open, close) => `${open}\n${json}\n${close}`))
console.log(out)
