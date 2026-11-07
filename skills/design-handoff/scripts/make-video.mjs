#!/usr/bin/env node
// Renders the team update video from the "video" part of handoff.json with Remotion.
// Usage: node make-video.mjs <handoff.json> [options]
//   --voice none|local|elevenlabs|fish|record   narration (default none: captions only)
//   --voice-id <id>     Kokoro voice name, ElevenLabs voice_id, or Fish Audio reference_id
//   --model <id>        ElevenLabs model_id or Fish Audio model (default eleven_multilingual_v2, s2.1-pro-free)
//   --audio <file>      with --voice record: your recording of script.md
//   --script            write script.md (lines to record, with timings) and stop
//   --sheet-only        render a contact sheet (3 stills per scene), no MP4
//   --sheet-scene <n>   12 stills inside scene n (0-based), no MP4
//   --res 720|1080      default 1080
//   --fps <n>           default 30
//   --shots <manifest>  default shots/manifest.json beside handoff.json
//   --out <dir>         default video/ beside handoff.json
// Writes <output>.mp4, captions.srt, script.md, sheet.png and props.json. Format: references/video.md.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { basename, dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { PROVIDERS, mixTrack, splitRecording, synthLines } from "./lib/voice.mjs"

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
const voice = flag("--voice") ?? "none"
const voiceId = flag("--voice-id")
const model = flag("--model")
const audioArg = flag("--audio")
const scriptOnly = has("--script")
const sheetOnly = has("--sheet-only")
const sheetScene = flag("--sheet-scene")
const shotsArg = flag("--shots")
const outArg = flag("--out")
const res = parseInt(flag("--res") ?? "1080", 10)
const fps = parseInt(flag("--fps") ?? "30", 10)
const dataPath = args[0]
const fail = (msg) => {
  console.error(`make-video: ${msg}`)
  process.exit(1)
}
if (!dataPath) fail("usage: node make-video.mjs <handoff.json> [--voice none|local|elevenlabs|fish|record] [--sheet-only]")
if (!PROVIDERS.includes(voice)) fail(`--voice must be one of ${PROVIDERS.join(", ")}`)
if (voice === "record" && !audioArg && !scriptOnly) fail("--voice record needs --audio <your recording>. Run with --script first to get the lines to read.")

const root = dirname(resolve(dataPath))
const data = JSON.parse(readFileSync(resolve(dataPath), "utf8"))
const story = data.video
if (!story?.scenes?.length) fail('handoff.json has no "video" with scenes; see references/video.md')
const manifestPath = resolve(shotsArg ?? join(root, "shots", "manifest.json"))
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : []
const outDir = resolve(outArg ?? join(root, "video"))
const publicDir = join(outDir, "public")
mkdirSync(join(publicDir, "shots"), { recursive: true })

// ---- the story: five acts in a fixed order
const ACTS = [
  { id: "problem", label: "The problem" },
  { id: "built", label: "What we built" },
  { id: "how", label: "How it works" },
  { id: "left", label: "What's left" },
  { id: "ask", label: "What we need" },
]
const ACT_IDS = ACTS.map((a) => a.id)

const problems = []
const warnings = []
const isText = (v) => typeof v === "string" && v.trim() !== ""
const plain = (s) => String(s ?? "").replace(/\*\*/g, "")
const words = (s) => plain(s).split(/\s+/).filter(Boolean).length
const limit = (v, n, at) => {
  if (v != null && plain(v).length > n) problems.push(`${at} is ${plain(v).length} characters; keep it to ${n}`)
}
const banned = (s, at) => {
  if (/\bAI[- ]generated\b/i.test(s ?? "")) problems.push(`${at}: do not label anything "AI-generated"`)
  if (/^\s*introducing\b/i.test(plain(s))) problems.push(`${at}: this is a team update, not a launch; drop "Introducing"`)
}

// ---- images: shot ids from the manifest, or paths relative to handoff.json
const sizeOf = (file) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" })
  const [w, h] = r.stdout.trim().split(",").map(Number)
  return w && h ? { w, h } : null
}
const images = {}
const image = (ref, at) => {
  if (!isText(ref)) {
    problems.push(`${at} needs an image (a shot id)`)
    return null
  }
  if (images[ref]) return images[ref]
  const m = manifest.find((x) => x.id === ref) ?? manifest.flatMap((x) => (x.images ?? []).map((i) => ({ ...i, image: i.file }))).find((x) => x.name === ref)
  const file = m ? resolve(dirname(manifestPath), m.image) : resolve(root, ref)
  if (!existsSync(file)) {
    problems.push(`${at}: no capture "${ref}" in ${basename(manifestPath)} and no file at ${file}`)
    return null
  }
  const size = sizeOf(file)
  if (!size) {
    problems.push(`${at}: could not read ${file}`)
    return null
  }
  const name = `${ref.replace(/[^\w.-]+/g, "_")}${extname(file)}`
  copyFileSync(file, join(publicDir, "shots", name))
  return (images[ref] = { src: `shots/${name}`, ...size })
}

// ---- per scene: check the fields, resolve images, collect the narration lines
const rules = {
  title: (d, at) => (limit(d.headline, 70, `${at}.headline`), limit(d.sub, 120, `${at}.sub`), isText(d.headline) || problems.push(`${at}.headline is required`)),
  end: (d, at) => rules.title(d, at),
  statement: (d, at) => (limit(d.text, 110, `${at}.text`), limit(d.sub, 120, `${at}.sub`), isText(d.text) || problems.push(`${at}.text is required`)),
  reveal: (d, at) => ((d.image = image(d.image, `${at}.image`)), limit(d.headline, 60, `${at}.headline`)),
  zoom: (d, at) => {
    d.image = image(d.image, `${at}.image`)
    if (!d.beats?.length || d.beats.length > 4) problems.push(`${at}.beats needs 1 to 4 beats`)
    ;(d.beats ?? []).forEach((b, i) => {
      if (b.focus && !(Array.isArray(b.focus) && b.focus.length === 4)) problems.push(`${at}.beats[${i}].focus must be [x, y, w, h] in percent`)
    })
  },
  walk: (d, at) => {
    if (!d.steps?.length || d.steps.length > 5) problems.push(`${at}.steps needs 1 to 5 steps`)
    ;(d.steps ?? []).forEach((s, i) => {
      s.image = image(s.image, `${at}.steps[${i}].image`)
      if (i < d.steps.length - 1 && !s.click) warnings.push(`${at}.steps[${i}] has no click box; the cursor will not move to anything`)
    })
  },
  compare: (d, at) => ((d.before = image(d.before, `${at}.before`)), (d.after = image(d.after, `${at}.after`)), limit(d.beforeLabel, 30, `${at}.beforeLabel`), limit(d.afterLabel, 30, `${at}.afterLabel`)),
  states: (d, at) => {
    limit(d.title, 50, `${at}.title`)
    if (!d.items?.length || d.items.length > 6) problems.push(`${at}.items needs 1 to 6 states`)
    ;(d.items ?? []).forEach((it, i) => {
      if (it.image) it.image = image(it.image, `${at}.items[${i}].image`)
      else it.status = "missing"
      limit(it.label, 28, `${at}.items[${i}].label`)
      if (it.status && !["built", "mock", "missing"].includes(it.status)) problems.push(`${at}.items[${i}].status must be built, mock or missing`)
    })
  },
  checklist: (d, at) => {
    limit(d.title, 50, `${at}.title`)
    if (!d.items?.length || d.items.length > 5) problems.push(`${at}.items needs 1 to 5 rows`)
    ;(d.items ?? []).forEach((it, i) => {
      const o = typeof it === "string" ? { text: it } : it
      limit(o.text, 60, `${at}.items[${i}].text`)
      limit(o.detail, 80, `${at}.items[${i}].detail`)
      if (o.status && !["done", "open", "blocking"].includes(o.status)) problems.push(`${at}.items[${i}].status must be done, open or blocking`)
    })
  },
  ask: (d, at) => {
    limit(d.title, 50, `${at}.title`)
    if (!d.items?.length || d.items.length > 3) problems.push(`${at}.items needs 1 to 3 asks`)
    ;(d.items ?? []).forEach((it, i) => {
      limit(it.ask, 90, `${at}.items[${i}].ask`)
      if (!isText(it.who)) problems.push(`${at}.items[${i}].who is required: who decides`)
    })
  },
}
// Minimum seconds per line, so each scene has time for its motion even with a short line.
const MIN = { title: 3, end: 3.6, statement: 3.2, reveal: 3.6, zoom: 2.8, walk: 2.8, compare: 4.6, states: 0.8, checklist: 1.4, ask: 1.6 }
const PER_ITEM = { states: 2.2, checklist: 1.1, ask: 1.7 }

const scenes = story.scenes.map((raw, i) => {
  const at = `video.scenes[${i}]`
  const d = structuredClone(raw)
  if (!rules[d.type]) {
    problems.push(`${at}.type "${d.type}" is not one of ${Object.keys(rules).join(", ")}`)
    return null
  }
  rules[d.type](d, at)
  if (!["title", "end"].includes(d.type) && !ACT_IDS.includes(d.act)) problems.push(`${at}.act must be one of ${ACT_IDS.join(", ")}`)
  // A one-item ask may carry its line on the item, as video.md documents; speak it as the scene's line.
  if (d.type === "ask" && d.items?.length === 1 && !isText(d.say) && isText(d.items[0].say)) d.say = d.items[0].say
  const perItem = d.type === "ask" && d.items?.length > 1 && d.items.every((it) => isText(it.say))
  const says = d.type === "zoom" ? (d.beats ?? []).map((b) => b.say) : d.type === "walk" ? (d.steps ?? []).map((s) => s.say) : perItem ? d.items.map((it) => it.say) : [d.say]
  says.forEach((s, k) => {
    if (!isText(s)) problems.push(`${at}${says.length > 1 ? ` line ${k + 1}` : ""}: "say" is required`)
    limit(s, 150, `${at} say`)
    banned(s, `${at} say`)
  })
  for (const v of [d.headline, d.sub, d.text, d.title]) banned(v, at)
  return { type: d.type, act: d.act ?? null, d, says, perItem }
})
const seen = new Set(scenes.filter(Boolean).map((s) => s.act))
for (const a of ACTS) if (!seen.has(a.id)) warnings.push(`no scene in the "${a.label}" act; the story is easier to follow with all five`)
let lastAct = -1
for (const s of scenes.filter(Boolean)) {
  const k = ACT_IDS.indexOf(s.act)
  if (k === -1) continue
  if (k < lastAct) warnings.push(`scene "${s.type}" goes back to "${ACTS[k].label}"; keep the acts in order`)
  lastAct = Math.max(lastAct, k)
}
if (problems.length) {
  for (const p of problems) console.error(`  - ${p}`)
  fail(`${problems.length} problem(s) in the storyboard`)
}

// ---- timing: estimate from word count, or use the narration clips
const allLines = scenes.flatMap((s) => s.says)
const estimate = (text) => words(text) / 2.8 + 0.3
const LEAD = 0.4
const GAP = 0.35
const TAIL = 0.35
const layout = (clipSecs) => {
  let t = 0
  let n = 0
  const timed = scenes.map((s) => {
    const start = t
    const items = s.d.items?.length ?? 0
    const lines = s.says.map((text, k) => {
      const speech = clipSecs ? clipSecs[n] : estimate(text)
      n++
      const min = s.perItem ? 2.6 : (MIN[s.type] ?? 3) + (k === 0 ? items * (PER_ITEM[s.type] ?? 0) : 0)
      const lead = k === 0 ? LEAD : 0
      const dur = Math.max(min, lead + speech + GAP)
      const line = { from: t - start, dur, text, speechAt: t + lead }
      t += dur
      return line
    })
    t += TAIL
    return { ...s, start, end: t, lines }
  })
  return { timed, total: t + 0.6 }
}

const scriptPath = join(outDir, "script.md")
const writeScript = (plan) => {
  const fmt = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, "0")}`
  const rows = plan.timed.flatMap((s) => s.lines.map((l) => `| ${fmt(s.start + l.from)} | ${l.dur.toFixed(1)} s | ${plain(l.text).replace(/\|/g, "/")} |`))
  writeFileSync(
    scriptPath,
    [
      `# Voice-over script: ${data.project?.name ?? "handoff"}`,
      "",
      `Read each line once, in order, in one take. Pause for about one second between lines; the pauses are where the video cuts. Speak at your normal pace: the video stretches to fit you. Total about ${Math.round(plan.total)} seconds.`,
      "",
      "Save the recording as an audio file (m4a, mp3 or wav), then run:",
      "",
      "```bash",
      `node <skill-dir>/scripts/make-video.mjs ${basename(dataPath)} --voice record --audio <your file>`,
      "```",
      "",
      "| Starts | Allow | Line |",
      "| --- | --- | --- |",
      ...rows,
      "",
    ].join("\n"),
  )
}

let clips = null
if (scriptOnly) {
  writeScript(layout(null))
  console.log(`Script: ${scriptPath}  (${allLines.length} lines)`)
  process.exit(0)
}
if (voice === "record") {
  const take = resolve(audioArg)
  if (!existsSync(take)) fail(`no recording at ${take}`)
  const r = splitRecording(take, allLines.map(plain), join(outDir, "voice"))
  for (const w of r.warnings) warnings.push(w)
  clips = r.clips
} else if (voice !== "none" && !sheetOnly && sheetScene == null) {
  console.log(`Voice: ${voice}${voiceId ? ` (${voiceId})` : ""}`)
  try {
    clips = await synthLines(voice, allLines, { dir: join(outDir, "voice"), voiceId, model, skillDir: SKILL_DIR })
  } catch (e) {
    fail(e.message)
  }
}
const plan = layout(clips?.map((c) => c.seconds) ?? null)
writeScript(plan)
if (plan.total < 45 || plan.total > 90) warnings.push(`the video runs ${plan.total.toFixed(1)} s; aim for 45 to 90 seconds`)

// ---- captions.srt from the line timings
const srtTime = (x) => {
  const ms = Math.round(x * 1000)
  const p = (n, w = 2) => String(n).padStart(w, "0")
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
}
const cues = plan.timed.flatMap((s) => s.lines.map((l) => ({ a: s.start + l.from, b: s.start + l.from + l.dur, text: plain(l.text) })))
writeFileSync(join(outDir, "captions.srt"), cues.map((c, i) => `${i + 1}\n${srtTime(c.a)} --> ${srtTime(c.b)}\n${c.text}\n`).join("\n"))

// ---- props for the Remotion composition, in frames
const F = (x) => Math.round(x * fps)
const props = {
  fps,
  width: 1920,
  height: 1080,
  total: F(plan.total),
  accent: /^#[0-9a-f]{6}$/i.test(story.accent ?? "") ? story.accent : "#1f56c9",
  presenter: story.presenter ?? null,
  title: data.project?.name ?? "",
  captions: story.captions !== false,
  acts: ACTS,
  scenes: plan.timed.map((s) => {
    const from = F(s.start)
    return {
      type: s.type,
      act: s.act,
      from,
      dur: F(s.end) - from,
      d: s.d,
      lines: s.lines.map((l) => ({ from: F(s.start + l.from) - from, dur: Math.max(1, F(s.start + l.from + l.dur) - F(s.start + l.from)), text: l.text })),
    }
  }),
}
writeFileSync(join(outDir, "props.json"), JSON.stringify(props, null, 2))
for (const w of warnings) console.warn(`warn: ${w}`)

// ---- render with Remotion
const { bundle } = await import("@remotion/bundler").catch(() => fail(`Remotion is not installed. Run setup once:\n  node "${join(SKILL_DIR, "scripts", "setup.mjs")}"`))
const { openBrowser, renderMedia, renderStill, selectComposition } = await import("@remotion/renderer")
const t0 = Date.now()
const serveUrl = await bundle({ entryPoint: join(SKILL_DIR, "video", "index.jsx"), publicDir, onProgress: () => {} })
let browser
// Remotion keeps its headless Chrome in node_modules/.remotion beside the nearest package.json of the
// current folder. Open it from the skill folder, so setup's copy is used and nothing lands in the project.
const projectDir = process.cwd()
try {
  process.chdir(SKILL_DIR)
  browser = await openBrowser("chrome")
} catch (e) {
  const cause = `${e.message}${e.cause?.code ? ` (${e.cause.code})` : ""}`
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|fetch failed|download/i.test(cause))
    fail(`Remotion could not download its headless Chrome from remotion.media (first render only, about 170 MB). Allow network access for this command (in the Codex app, approve the request), or run scripts/setup.mjs, then try again.\n(${cause.split("\n")[0]})`)
  fail(`Remotion's browser could not start. In a sandbox such as the Codex app, approve the request to run it, then try again.\n(${cause.split("\n")[0]})`)
} finally {
  process.chdir(projectDir)
}
const composition = await selectComposition({ serveUrl, id: "Handoff", inputProps: props, puppeteerInstance: browser })

if (sheetOnly || sheetScene != null) {
  const tmp = join(outDir, ".sheet")
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  const one = sheetScene != null ? props.scenes[parseInt(sheetScene, 10)] : null
  if (sheetScene != null && !one) fail(`no scene ${sheetScene}`)
  const frames = one
    ? Array.from({ length: 12 }, (_, i) => one.from + Math.round(((i + 0.5) / 12) * one.dur))
    : props.scenes.flatMap((s) => [0.18, 0.55, 0.92].map((p) => s.from + Math.min(s.dur - 1, Math.round(p * s.dur))))
  let k = 0
  for (const frame of frames) {
    await renderStill({ composition, serveUrl, inputProps: props, frame, output: join(tmp, `${String(k++).padStart(3, "0")}.png`), scale: 0.25, puppeteerInstance: browser })
  }
  const sheet = join(outDir, one ? `sheet-scene${sheetScene}.png` : "sheet.png")
  const cols = one ? 4 : 3
  const rows = Math.ceil(frames.length / cols)
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "1", "-i", join(tmp, "%03d.png"), "-vf", `tile=${cols}x${rows}:padding=6:margin=6:color=white`, "-frames:v", "1", sheet])
  if (r.status !== 0) fail(`ffmpeg could not tile the sheet: ${r.stderr}`)
  rmSync(tmp, { recursive: true, force: true })
  await browser.close({ silent: true })
  console.log(`Sheet: ${sheet}`)
  console.log(`Scenes: ${props.scenes.map((s, i) => `${i}:${s.type}@${(s.from / fps).toFixed(1)}s`).join("  ")}`)
  console.log(`Length: ${plan.total.toFixed(1)} s${voice === "none" ? " (estimated from the captions; a voice changes it)" : ""}`)
  process.exit(0)
}

const name = (story.output ?? "handoff-update").replace(/[^\w.-]+/g, "-")
const silent = join(outDir, `.${name}.silent.mp4`)
let last = -1
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  inputProps: props,
  outputLocation: silent,
  scale: res / 1080,
  muted: true,
  puppeteerInstance: browser,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10)
    if (p !== last) {
      last = p
      process.stdout.write(`  ${p * 10}%\r`)
    }
  },
})
await browser.close({ silent: true })
const mp4 = join(outDir, `${name}.mp4`)
if (clips) {
  const lineStarts = plan.timed.flatMap((s) => s.lines.map((l) => l.speechAt))
  const track = mixTrack(clips.map((c, i) => ({ ...c, at: lineStarts[i] })), plan.total, join(outDir, "voice.m4a"))
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", silent, "-i", track, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", mp4], { encoding: "utf8" })
  if (r.status !== 0) fail(`ffmpeg could not add the voice: ${r.stderr}`)
  rmSync(silent)
} else {
  copyFileSync(silent, mp4)
  rmSync(silent)
}
console.log(`\nDone in ${Math.round((Date.now() - t0) / 1000)} s`)
console.log(`Video: ${mp4}  (${plan.total.toFixed(1)} s, ${voice === "none" ? "captions only" : `voice: ${voice}`})`)
console.log(`Captions: ${join(outDir, "captions.srt")}  Script: ${scriptPath}`)
