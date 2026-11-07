#!/usr/bin/env node
// Builds the stakeholder video from the "video" part of handoff.json.
// Usage: node make-video.mjs <handoff.json> [options]
//   --shots <manifest.json>   default: shots/manifest.json beside handoff.json
//   --out <dir>               default: video/ beside handoff.json
//   --sheet-only              build video.html and a contact sheet (3 stills per scene), no MP4
//   --sheet-scene <n>         12 stills inside scene n (0-based), no MP4
//   --voice [name]            narrate each caption with macOS `say` (scratch quality; default voice Samantha)
//   --audio <file>            use your own recorded voice-over or music as the soundtrack
//   --res 720|1080            default 1080
//   --fps <n>                 default 30
// Writes video.html (live preview: space pauses), captions.srt, sheet.png and <name>.mp4.
// Format: references/video.md. Needs playwright-core, Chrome and ffmpeg.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { basename, dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const has = (name) => {
  const i = args.indexOf(name)
  if (i === -1) return false
  args.splice(i, 1)
  return true
}
const flag = (name) => {
  const i = args.indexOf(name)
  if (i === -1) return null
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
// --voice takes an optional name, so read it before the positional argument
let voice = null
{
  const i = args.indexOf("--voice")
  if (i !== -1) {
    const next = args[i + 1]
    const named = next && !next.startsWith("--") && !next.endsWith(".json")
    voice = named ? next : "Samantha"
    args.splice(i, named ? 2 : 1)
  }
}
const sheetOnly = has("--sheet-only")
const sheetScene = flag("--sheet-scene")
const shotsArg = flag("--shots")
const outArg = flag("--out")
const audioArg = flag("--audio")
const res = parseInt(flag("--res") ?? "1080", 10)
const fps = parseInt(flag("--fps") ?? "30", 10)
const dataPath = args[0]
if (!dataPath) {
  console.error("usage: node make-video.mjs <handoff.json> [--sheet-only] [--voice [name]] [--audio file] [--res 1080]")
  process.exit(1)
}

const root = dirname(resolve(dataPath))
const data = JSON.parse(readFileSync(resolve(dataPath), "utf8"))
const story = data.video
if (!story?.scenes?.length) {
  console.error('make-video: handoff.json has no "video" with scenes; see references/video.md')
  process.exit(1)
}
const manifestPath = resolve(shotsArg ?? join(root, "shots", "manifest.json"))
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : []
const outDir = resolve(outArg ?? join(root, "video"))
mkdirSync(outDir, { recursive: true })

const problems = []
const warnings = []
const isText = (v) => typeof v === "string" && v.trim() !== ""
const words = (s) => String(s ?? "").replace(/\*\*/g, "").split(/\s+/).filter(Boolean).length
const banned = (s, at) => {
  if (/\bAI[- ]generated\b/i.test(s ?? "")) problems.push(`${at}: do not label anything "AI-generated"`)
}

// ---- images: resolve shot ids to data URIs and read their size for the window shape
const images = {}
const sizes = {}
const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }
const imageSize = (buf) => {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue }
      const m = buf[i + 1]
      const len = buf.readUInt16BE(i + 2)
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) }
      i += 2 + len
    }
  }
  return null
}
const useImage = (ref, at) => {
  if (!ref) return
  if (images[ref]) return
  const entry = manifest.find((e) => e.id === ref) ?? manifest.flatMap((e) => e.images ?? []).find((e) => e.name === ref)
  const file = entry ? resolve(dirname(manifestPath), entry.image ?? entry.file) : resolve(root, ref)
  if (!existsSync(file)) return problems.push(`${at}: no capture named "${ref}"`)
  const type = mime[extname(file).toLowerCase()]
  if (!type) return problems.push(`${at}: unsupported image ${file}`)
  const buf = readFileSync(file)
  images[ref] = `data:${type};base64,${buf.toString("base64")}`
  sizes[ref] = imageSize(buf)
}
const aspectOf = (ref) => (sizes[ref] ? sizes[ref].w / sizes[ref].h : 1.6)

// ---- timing: about 2.6 spoken words per second, plus room to look
const B_TYPES = ["title", "statement", "screen", "walk", "compare", "states", "list", "end"]
const MIN = { title: 3.5, statement: 3.5, screen: 4.5, compare: 5.5, states: 5, list: 4, end: 4 }
const readTime = (s) => words(s) / 2.6 + 1.2
const voiceDir = join(outDir, "voice")
const voiceLen = new Map()
const speak = (text) => {
  if (!voice || !isText(text)) return 0
  if (voiceLen.has(text)) return voiceLen.get(text).len
  mkdirSync(voiceDir, { recursive: true })
  const file = join(voiceDir, `line-${voiceLen.size + 1}.aiff`)
  const said = spawnSync("say", ["-v", voice, "-r", "180", "-o", file, text.replace(/\*\*/g, "")])
  if (said.status !== 0) {
    console.error("make-video: `say` failed. --voice needs macOS; record your own track and pass --audio instead.")
    process.exit(1)
  }
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file])
  const len = parseFloat(String(probe.stdout)) || 0
  voiceLen.set(text, { file, len })
  return len
}
const fitTime = (text, min) => Math.max(min, readTime(text), voice ? speak(text) + 0.8 : 0)

const scenes = story.scenes.map((s, i) => {
  const at = `video.scenes[${i}]`
  const d = { ...s }
  if (!B_TYPES.includes(d.type)) problems.push(`${at}.type "${d.type}" is not one of ${B_TYPES.join(", ")}`)
  for (const [k, max] of [["say", 150], ["headline", 70], ["text", 110], ["sub", 120], ["title", 50]]) {
    if (typeof d[k] === "string" && d[k].length > max) problems.push(`${at}.${k} is ${d[k].length} characters; keep it under ${max}`)
    banned(d[k], `${at}.${k}`)
  }
  if (d.type !== "walk" && !isText(d.say)) warnings.push(`${at} has no "say" caption`)
  ;(d.items ?? []).forEach((it, k) => banned(typeof it === "string" ? it : it.label, `${at}.items[${k}]`))
  if (d.type === "screen") {
    useImage(d.image, `${at}.image`)
    d.aspect = aspectOf(d.image)
    d.dur = d.duration ?? fitTime(d.say, MIN.screen)
  } else if (d.type === "compare") {
    useImage(d.before, `${at}.before`)
    useImage(d.after, `${at}.after`)
    d.aspect = aspectOf(d.after)
    d.dur = d.duration ?? fitTime(d.say, MIN.compare)
  } else if (d.type === "walk") {
    if (!d.steps?.length) problems.push(`${at}.steps needs at least one step`)
    d.steps = (d.steps ?? []).map((st, k) => {
      useImage(st.image, `${at}.steps[${k}].image`)
      banned(st.say, `${at}.steps[${k}].say`)
      if (st.say && st.say.length > 150) problems.push(`${at}.steps[${k}].say is over 150 characters`)
      if (st.click && !(Array.isArray(st.click) && st.click.length === 4)) problems.push(`${at}.steps[${k}].click must be [x, y, w, h] in percent`)
      return { ...st, dur: st.duration ?? fitTime(st.say ?? (k === 0 ? d.say : ""), 2.6) }
    })
    d.aspect = aspectOf(d.steps[0]?.image)
    d.dur = d.steps.reduce((a, st) => a + st.dur, 0)
  } else if (d.type === "states") {
    ;(d.items ?? []).forEach((it, k) => useImage(it.image, `${at}.items[${k}].image`))
    const n = Math.min(8, d.items?.length ?? 0)
    d.dur = d.duration ?? fitTime(d.say, Math.max(MIN.states, 1.6 + n * 0.8))
  } else if (d.type === "list") {
    d.dur = d.duration ?? fitTime(d.say, Math.max(MIN.list, 1.2 + (d.items?.length ?? 0) * 1.4))
  } else d.dur = d.duration ?? fitTime(d.say, MIN[d.type] ?? 4)
  d.dur = Math.round(d.dur * 100) / 100
  return d
})
const total = scenes.reduce((a, s) => a + s.dur, 0)
if (total < 45 || total > 90) warnings.push(`the video runs ${total.toFixed(1)} s; aim for 45 to 90 s (cut or merge scenes, or shorten captions)`)
for (const w of warnings) console.warn(`warn: ${w}`)
if (problems.length) {
  for (const p of problems) console.error(`error: ${p}`)
  process.exit(1)
}

// ---- page
const template = readFileSync(join(SKILL_DIR, "assets", "video-template.html"), "utf8")
const payload = JSON.stringify({ accent: story.accent, captions: story.captions, scenes, __images: images })
  .replace(/</g, "\\u003c")
const marker = '<script type="application/json" id="story">{}</script>'
const html = template.replace(marker, () => `<script type="application/json" id="story">${payload}</script>`)
const htmlPath = join(outDir, "video.html")
writeFileSync(htmlPath, html)
console.log(`Preview: ${htmlPath}  (${total.toFixed(1)} s, ${scenes.length} scenes)`)

// ---- captions file, timed like the page (walk steps get their own cues)
const stamp = (t) => {
  const ms = Math.round(t * 1000)
  const p = (n, w = 2) => String(n).padStart(w, "0")
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
}
const cues = []
{
  let at = 0
  for (const s of scenes) {
    if (s.type === "walk") {
      let st0 = at
      s.steps.forEach((st, k) => {
        const text = st.say ?? (k === 0 ? s.say : null)
        if (text) cues.push({ a: st0 + 0.15, b: st0 + st.dur - 0.1, text })
        st0 += st.dur
      })
    } else if (s.say) cues.push({ a: at + 0.15, b: at + s.dur - 0.1, text: s.say })
    at += s.dur
  }
}
writeFileSync(join(outDir, "captions.srt"), cues.map((c, i) => `${i + 1}\n${stamp(c.a)} --> ${stamp(c.b)}\n${c.text.replace(/\*\*/g, "")}\n`).join("\n"))

const { render, contactSheet, run } = await import("./lib/render.mjs")
if (sheetOnly || sheetScene != null) {
  const n = sheetScene == null ? undefined : parseInt(sheetScene, 10)
  const r = await contactSheet({ html: htmlPath, out: join(outDir, n == null ? "sheet.png" : `sheet-scene${n}.png`), scene: n })
  console.log(`Sheet: ${r.out}`)
  console.log("Scenes: " + r.scenes.map((s, i) => `${i}:${s.type}@${s.start}s`).join("  "))
  process.exit(0)
}

// ---- soundtrack: generated voice lines placed at their scene starts, or the user's file
let audio = audioArg ? resolve(audioArg) : null
if (audio && !existsSync(audio)) {
  console.error(`make-video: audio file not found: ${audio}`)
  process.exit(1)
}
if (voice && !audio) {
  const lines = []
  let at = 0
  for (const s of scenes) {
    if (s.type === "walk") {
      let st0 = at
      s.steps.forEach((st, k) => {
        const text = st.say ?? (k === 0 ? s.say : null)
        if (text && voiceLen.has(text)) lines.push({ file: voiceLen.get(text).file, at: st0 + 0.3 })
        st0 += st.dur
      })
    } else if (s.say && voiceLen.has(s.say)) lines.push({ file: voiceLen.get(s.say).file, at: at + 0.3 })
    at += s.dur
  }
  audio = join(outDir, "voice.m4a")
  const inputs = lines.flatMap((l) => ["-i", l.file])
  const delays = lines.map((l, i) => `[${i}:a]adelay=${Math.round(l.at * 1000)}:all=1[a${i}]`)
  const mix = `${lines.map((_, i) => `[a${i}]`).join("")}amix=inputs=${lines.length}:normalize=0[out]`
  await run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", [...delays, mix].join(";"), "-map", "[out]", "-c:a", "aac", "-b:a", "160k", audio])
}

const height = res
const width = Math.round((res * 16) / 9 / 2) * 2
const name = (story.output ?? `${basename(root)}-update`).replace(/[^a-z0-9-]+/gi, "-").toLowerCase()
const mp4 = join(outDir, `${name}.mp4`)
await render({ html: htmlPath, out: mp4, width, height, fps, audio })
console.log(`Video: ${mp4}`)
