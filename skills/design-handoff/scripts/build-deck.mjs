#!/usr/bin/env node
// Builds the developer deck: one self-contained HTML file that opens by double click.
// Usage: node build-deck.mjs <handoff.json> [--shots <manifest.json>] [--out <deck.html>] [--check]
//   --shots  the manifest capture.mjs wrote (default: shots/manifest.json beside handoff.json)
//   --out    default: deck.html beside handoff.json
//   --check  also render every slide to slides/ and a contact sheet, and report overflow
//            (needs playwright-core, Chrome and ffmpeg; the build itself needs only Node 18+)
// Data format: references/handoff-data.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, extname, join, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { spawnSync } from "node:child_process"

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  if (i === -1) return null
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const check = args.includes("--check")
if (check) args.splice(args.indexOf("--check"), 1)
const shotsArg = flag("--shots")
const outArg = flag("--out")
const dataPath = args[0]
if (!dataPath) {
  console.error("usage: node build-deck.mjs <handoff.json> [--shots manifest.json] [--out deck.html] [--check]")
  process.exit(1)
}

const root = dirname(resolve(dataPath))
const data = JSON.parse(readFileSync(resolve(dataPath), "utf8"))
const manifestPath = resolve(shotsArg ?? join(root, "shots", "manifest.json"))
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : []
const manifestRoot = dirname(manifestPath) // capture.mjs writes image paths relative to the manifest
const outPath = resolve(outArg ?? join(root, "deck.html"))

const problems = []
const warnings = []
const isText = (v) => typeof v === "string" && v.trim() !== ""
const limit = (v, max, at) => {
  if (typeof v === "string" && v.length > max) problems.push(`${at} is ${v.length} characters; keep it under ${max}`)
}

// Copy rules that apply to every string in the deck.
const walk = (v, at) => {
  if (typeof v === "string") {
    if (/\bAI[- ]generated\b/i.test(v)) problems.push(`${at}: do not label anything "AI-generated"`)
    if (/lorem ipsum/i.test(v)) problems.push(`${at}: placeholder text`)
  } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`))
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!k.startsWith("__")) walk(x, at ? `${at}.${k}` : k)
}
walk(data, "")

const P = data.project ?? {}
if (!isText(P.name)) problems.push("project.name is required")
if (!isText(P.summary)) problems.push("project.summary is required: one or two sentences on what changed and why")
limit(P.name, 60, "project.name")
limit(P.title, 90, "project.title")
limit(P.summary, 280, "project.summary")
if (!data.screens?.length) problems.push("screens needs at least one screen")
;(data.screens ?? []).forEach((s, i) => {
  if (!isText(s.title)) problems.push(`screens[${i}].title is required`)
  limit(s.title, 60, `screens[${i}].title`)
  limit(s.summary, 220, `screens[${i}].summary`)
  if ((s.notes ?? []).length > 5) problems.push(`screens[${i}] has ${s.notes.length} notes; keep 5 or fewer`)
  ;(s.notes ?? []).forEach((n, k) => {
    limit(n.text, 120, `screens[${i}].notes[${k}].text`)
    if (n.region && !(Array.isArray(n.region) && n.region.length === 4 && n.region.every((x) => typeof x === "number" && x >= 0 && x <= 100)))
      problems.push(`screens[${i}].notes[${k}].region must be [x, y, w, h] in percent`)
  })
  if ((s.done ?? []).length > 4) problems.push(`screens[${i}].done has ${s.done.length} checks; keep 4 or fewer`)
  ;(s.done ?? []).forEach((d, k) => limit(d, 90, `screens[${i}].done[${k}]`))
  const words = [s.summary, ...(s.notes ?? []).map((n) => n.text), ...(s.done ?? [])].join(" ").length
  if (words > 760) problems.push(`screens[${i}] has ${words} characters of side text; the column fits about 760, so cut notes or checks`)
})

// Every state group must say what happens when empty, loading and failing, even if the answer is "not needed".
const STATUSES = ["built", "mock", "missing", "na"]
if (!data.states?.length) warnings.push("no states listed; the deck will have no state slides")
;(data.states ?? []).forEach((g, i) => {
  if (!isText(g.group)) problems.push(`states[${i}].group is required`)
  const kinds = new Set((g.states ?? []).map((s) => s.kind))
  for (const k of ["empty", "loading", "error"])
    if (!kinds.has(k)) warnings.push(`states "${g.group}" has no ${k} state; add one with status "missing" or "na" so engineers know it was considered`)
  ;(g.states ?? []).forEach((s, k) => {
    const at = `states[${i}].states[${k}]`
    if (!isText(s.name)) problems.push(`${at}.name is required`)
    if (!STATUSES.includes(s.status)) problems.push(`${at}.status must be one of ${STATUSES.join(", ")}`)
    if ((s.status === "built" || s.status === "mock") && !s.shot) warnings.push(`${at} (${s.name}) is ${s.status} but has no capture`)
    limit(s.note, 100, `${at}.note`)
    limit(s.name, 28, `${at}.name`)
  })
})
;(data.questions ?? []).forEach((q, i) => {
  if (!isText(q.question)) problems.push(`questions[${i}].question is required`)
  if (!isText(q.recommendation)) warnings.push(`questions[${i}] has no recommendation`)
  limit(q.question, 160, `questions[${i}].question`)
})
if (!data.left?.length) warnings.push('no "left" items: say what is not done, or add one row saying nothing is left')
if (!data.questions?.length) warnings.push("no open questions")
;(data.tokens?.colors ?? []).forEach((c, i) => {
  if (/var\(/.test(c.value ?? "")) problems.push(`tokens.colors[${i}].value is ${c.value}; give the resolved color (put the alias in "use")`)
})

// Resolve every shot reference to an embedded image.
const images = {}
const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }
const injected = new Set(manifest.filter((m) => m.injected).map((m) => m.id))
const mocked = new Set(manifest.filter((m) => m.mocked).map((m) => m.id))
const resolveShot = (ref, at) => {
  if (!ref || images[ref]) return
  let file = null
  const m = manifest.find((e) => e.id === ref) ?? manifest.flatMap((e) => e.images ?? []).find((e) => e.name === ref)
  if (m) file = resolve(manifestRoot, m.image ?? m.file)
  else if (existsSync(resolve(root, ref))) file = resolve(root, ref)
  if (!file || !existsSync(file)) {
    problems.push(`${at}: no capture named "${ref}" in ${relative(process.cwd(), manifestPath)}`)
    return
  }
  const type = mime[extname(file).toLowerCase()]
  if (!type) return problems.push(`${at}: unsupported image type ${file}`)
  images[ref] = `data:${type};base64,${readFileSync(file).toString("base64")}`
}
;(data.screens ?? []).forEach((s, i) => resolveShot(s.shot, `screens[${i}].shot`))
;(data.states ?? []).forEach((g, i) =>
  (g.states ?? []).forEach((s, k) => {
    resolveShot(s.shot, `states[${i}].states[${k}].shot`)
    if (s.shot && injected.has(s.shot) && !/inject|simulat|test text/i.test(s.note ?? ""))
      warnings.push(`states[${i}].states[${k}] uses a capture with injected content; say so in its note`)
    if (s.shot && mocked.has(s.shot) && s.status === "built")
      warnings.push(`states[${i}].states[${k}] (${s.name}) is "built" but its capture used mocked requests; use status "mock"`)
  }),
)
;(data.edgeCases ?? []).forEach((e, i) => {
  resolveShot(e.shot, `edgeCases[${i}].shot`)
  if (e.shot && injected.has(e.shot) && !/inject|simulat|test text/i.test(e.note ?? ""))
    warnings.push(`edgeCases[${i}] uses a capture with injected content; say so in its note`)
})

for (const w of warnings) console.warn(`warn: ${w}`)
if (problems.length) {
  for (const p of problems) console.error(`error: ${p}`)
  process.exit(1)
}

const template = readFileSync(join(SKILL_DIR, "assets", "deck-template.html"), "utf8")
const payload = JSON.stringify({ ...data, video: undefined, __images: images })
  .replace(/</g, "\\u003c")
const marker = '<script type="application/json" id="handoff-data">{}</script>'
if (!template.includes(marker)) throw new Error("deck template is missing its data block")
const html = template.replace(marker, () => `<script type="application/json" id="handoff-data">${payload}</script>`)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, html)
const mb = (Buffer.byteLength(html) / 1048576).toFixed(1)
console.log(`Deck: ${outPath} (${mb} MB, ${Object.keys(images).length} images)`)
if (mb > 25) console.warn("warn: the deck is over 25 MB; capture fewer or smaller images so it can be shared")

if (check) {
  const { launch } = await import("./lib/browser.mjs")
  const browser = await launch()
  const dir = join(dirname(outPath), "slides")
  mkdirSync(dir, { recursive: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
    const errors = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.goto(pathToFileURL(outPath).href)
    await page.evaluate(() => document.body.classList.add("capture"))
    const count = await page.evaluate(() => window.__deck?.count ?? 0)
    if (!count) throw new Error("the deck rendered no slides: " + errors.join("; "))
    const files = []
    const overflow = []
    for (let i = 0; i < count; i++) {
      const info = await page.evaluate((i) => {
        window.__deck.go(i)
        const s = document.querySelectorAll(".slide")[i]
        s.style.transform = "translate(-50%, -50%) scale(1)"
        const box = s.getBoundingClientRect()
        const out = [...s.querySelectorAll("*")].filter((n) => {
          if (n.closest(".foot")) return false
          const r = n.getBoundingClientRect()
          return r.width && (r.bottom > box.bottom - 60 || r.right > box.right + 1)
        })
        return { title: window.__deck.titles[i], overflow: out.length }
      }, i)
      if (info.overflow) overflow.push(`slide ${i + 1} "${info.title}": ${info.overflow} elements run into the footer or off the slide`)
      const file = join(dir, `slide-${String(i + 1).padStart(2, "0")}.png`)
      await page.screenshot({ path: file })
      files.push(file)
    }
    const cols = 4
    const rows = Math.ceil(files.length / cols)
    const sheet = join(dirname(outPath), "deck-sheet.png")
    const inputs = files.flatMap((f) => ["-i", f])
    const filters = files.map((_, i) => `[${i}:v]scale=400:225[v${i}]`)
    const pad = rows * cols - files.length
    let chain = files.map((_, i) => `[v${i}]`).join("")
    if (pad > 0) {
      filters.push(`color=c=0xecebe7:s=400x225:d=1,split=${pad}${Array.from({ length: pad }, (_, k) => `[p${k}]`).join("")}`)
      chain += Array.from({ length: pad }, (_, k) => `[p${k}]`).join("")
    }
    const layout = Array.from({ length: rows * cols }, (_, i) => `${(i % cols) * 400}_${Math.floor(i / cols) * 225}`).join("|")
    filters.push(`${chain}xstack=inputs=${rows * cols}:layout=${layout}[out]`)
    const ff = spawnSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", filters.join(";"), "-map", "[out]", "-frames:v", "1", sheet])
    console.log(`Slides: ${dir} (${count})`)
    if (ff.status === 0) console.log(`Sheet: ${sheet}`)
    else console.warn("warn: ffmpeg could not tile the contact sheet; open the slide images instead")
    if (errors.length) console.warn(`warn: page errors: ${errors.join("; ")}`)
    for (const o of overflow) console.warn(`warn: ${o}`)
  } finally {
    await browser.close()
  }
}
