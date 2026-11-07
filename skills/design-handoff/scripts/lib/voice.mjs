// Narration for the handoff video. Each caption line becomes one audio clip, so every
// scene can be timed to its own line. Clips are cached by provider, voice, model and text, so
// re-rendering after a visual fix does not pay for the same speech twice.
//
//   local       Kokoro-82M through kokoro-js: free, offline after one model download
//   elevenlabs  ElevenLabs API with the user's key (ELEVENLABS_API_KEY)
//   fish        Fish Audio API with the user's key (FISH_API_KEY)
//   record      the user's own recording of script.md, split at the pauses
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { readKey } from "./env.mjs"

export const PROVIDERS = ["none", "local", "elevenlabs", "fish", "record"]
export const KOKORO = { pkg: "kokoro-js@1.2.1", model: "onnx-community/Kokoro-82M-v1.0-ONNX", voice: "af_heart", speed: 1.1 }
// Checked 2026-11-07 (docs/design-handoff-research.md). ElevenLabs premade voices differ by
// account, so without --voice-id the script asks the account for its voices and takes George
// if it is there, else the first one. Fish Audio's "Energetic Male" is the docs' example voice.
export const ELEVEN = { model: "eleven_multilingual_v2", prefer: "George", keys: ["ELEVENLABS_API_KEY"], voiceKeys: ["ELEVENLABS_VOICE_ID"] }
export const FISH = { model: "s2.1-pro-free", models: ["s2.1-pro-free", "s2.1-pro", "s2-pro", "drama-3"], voice: "9a9cf47702da476aa4629e2506d4a857", keys: ["FISH_API_KEY", "FISH_AUDIO_API_KEY"], voiceKeys: ["FISH_VOICE_ID"] }

export function probeSeconds(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" })
  const s = parseFloat(r.stdout)
  if (!Number.isFinite(s)) throw new Error(`could not read the length of ${file}`)
  return s
}

const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { encoding: "utf8" })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.split("\n").slice(-3).join(" ")}`)
}

/** Speaks every line and returns [{ file, seconds }] in the same order. */
export async function synthLines(provider, lines, { dir, voiceId, model, skillDir }) {
  mkdirSync(dir, { recursive: true })
  let voice = voiceId
  let speak
  // Part of the cache key: a different model or speed must not reuse old clips.
  let variant = ""
  if (provider === "local") {
    voice ??= KOKORO.voice
    speak = await kokoro(skillDir, voice)
    variant = String(KOKORO.speed)
  } else if (provider === "elevenlabs") {
    const key = needKey(ELEVEN.keys, "ElevenLabs")
    voice ??= readKey(ELEVEN.voiceKeys)?.value ?? (await elevenDefaultVoice(key))
    variant = model ?? ELEVEN.model
    speak = elevenlabs(key, voice, variant)
  } else if (provider === "fish") {
    const key = needKey(FISH.keys, "Fish Audio")
    voice ??= readKey(FISH.voiceKeys)?.value ?? FISH.voice
    variant = model ?? FISH.model
    // Fish bills an unknown model name as the paid s2.1-pro, so refuse it here.
    if (!FISH.models.includes(variant)) throw new Error(`Fish Audio has no model "${variant}". Use one of ${FISH.models.join(", ")}.`)
    speak = fish(key, voice, variant)
  } else throw new Error(`unknown voice provider ${provider}`)
  console.log(`  voice: ${voice}`)

  const out = []
  for (const [i, text] of lines.entries()) {
    const plain = text.replace(/\*\*/g, "")
    const hash = createHash("sha1").update(`${provider}|${voice}|${variant}|${plain}`).digest("hex").slice(0, 12)
    const file = join(dir, `${provider}-${hash}.wav`)
    if (!existsSync(file)) {
      process.stdout.write(`  voice ${i + 1}/${lines.length}\r`)
      await speak(plain, file)
    }
    out.push({ file, seconds: probeSeconds(file) })
  }
  process.stdout.write("\n")
  return out
}

async function kokoro(skillDir, voice) {
  let mod
  try {
    const path = createRequire(join(skillDir, "noop.js")).resolve("kokoro-js")
    mod = await import(pathToFileURL(path).href)
  } catch {
    throw new Error(`The free local voice is not installed (about 400 MB, plus a 90 MB model). Install it once with:\n  node "${join(skillDir, "scripts", "setup.mjs")}" --voice local`)
  }
  let tts
  try {
    tts = await mod.KokoroTTS.from_pretrained(KOKORO.model, { dtype: "q8", device: "cpu" })
  } catch (e) {
    const cause = `${e.message}${e.cause?.code ? ` (${e.cause.code})` : ""}`
    if (/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|network/i.test(cause))
      throw new Error(`Could not download the Kokoro voice model from huggingface.co. This happens once, on first use (about 90 MB). Allow network access for this command (in the Codex app, approve the request), or run setup with --voice local, then try again.\n(${cause})`)
    throw new Error(`The Kokoro voice model did not load: ${cause}`)
  }
  if (!tts.voices?.[voice]) throw new Error(`Kokoro has no voice "${voice}". Try af_heart, af_bella, am_michael, bf_emma or bm_george.`)
  return async (text, file) => {
    const audio = await tts.generate(text, { voice, speed: KOKORO.speed })
    await audio.save(file)
  }
}

function needKey(keys, label) {
  const key = readKey(keys)
  if (!key) throw new Error(`${label} needs an API key. Set ${keys[0]} in your environment, or add a line ${keys[0]}=... to a .env file in the project folder (keep .env out of Git).`)
  return key.value
}

async function fetchAudio(url, init, label, file) {
  // 429 (too many requests at once, sent without Retry-After) and 5xx are worth retrying.
  let res
  for (let wait = 1000; ; wait *= 2) {
    res = await fetch(url, init)
    if (res.ok || !(res.status === 429 || res.status >= 500) || wait > 8000) break
    await new Promise((r) => setTimeout(r, wait))
  }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300).replace(/\s+/g, " ")
    const hint =
      res.status === 401 ? " The key was refused; check it." :
      res.status === 402 ? " The account has no credit for this model. Add credit, or for Fish Audio leave out --model to use the free s2.1-pro-free." :
      res.status === 429 ? " Too many requests at once, even after waiting; try again in a minute." :
      res.status === 404 ? " The voice was not found; check --voice-id." : ""
    throw new Error(`${label} answered ${res.status}.${hint} ${body}`)
  }
  const tmp = `${file}.mp3`
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()))
  ff(["-i", tmp, "-ac", "1", "-ar", "44100", file])
}

async function elevenDefaultVoice(key) {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } })
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status} when listing voices; check the key, or pass --voice-id`)
  const { voices = [] } = await res.json()
  const pick = voices.find((v) => v.name?.startsWith(ELEVEN.prefer)) ?? voices[0]
  if (!pick) throw new Error("This ElevenLabs account has no voices. Add one in the Voice Library, then pass --voice-id")
  console.log(`  ElevenLabs voice: ${pick.name}`)
  return pick.voice_id
}

function elevenlabs(key, voice, model) {
  return (text, file) =>
    fetchAudio(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: model }),
      },
      "ElevenLabs",
      file,
    )
}

function fish(key, voice, model) {
  return (text, file) =>
    fetchAudio(
      "https://api.fish.audio/v1/tts",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model },
        body: JSON.stringify({ text, reference_id: voice, format: "mp3", mp3_bitrate: 128, normalize: true, latency: "normal" }),
      },
      "Fish Audio",
      file,
    )
}

/**
 * Splits one recording of the whole script into one clip per line. The reader pauses
 * between lines; the longest pauses become the cuts. Returns clips plus warnings.
 */
export function splitRecording(take, lines, dir) {
  mkdirSync(dir, { recursive: true })
  const total = probeSeconds(take)
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", take, "-af", "silencedetect=noise=-38dB:d=0.35", "-f", "null", "-"], { encoding: "utf8" })
  const sil = []
  let open = null
  for (const m of r.stderr.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    if (m[1] === "start") open = Math.max(0, parseFloat(m[2]))
    else if (open != null) {
      sil.push({ a: open, b: parseFloat(m[2]) })
      open = null
    }
  }
  if (open != null) sil.push({ a: open, b: total })
  const head = sil.length && sil[0].a < 0.05 ? sil.shift().b : 0
  const tail = sil.length && sil.at(-1).b > total - 0.05 ? sil.pop().a : total
  const warnings = []
  const need = lines.length - 1
  let cuts
  if (sil.length >= need) {
    cuts = [...sil].sort((x, y) => y.b - y.a - (x.b - x.a)).slice(0, need).sort((x, y) => x.a - y.a)
  } else {
    warnings.push(`found ${sil.length} pauses for ${lines.length} lines, so the cuts are estimated from word counts. Pause about one second between lines and record again for exact timing.`)
    const w = lines.map((l) => l.split(/\s+/).length)
    const sum = w.reduce((a, b) => a + b, 0)
    let acc = 0
    cuts = w.slice(0, -1).map((n) => {
      acc += n
      const t = head + ((tail - head) * acc) / sum
      return { a: t, b: t }
    })
  }
  const bounds = [{ a: 0, b: head }, ...cuts, { a: tail, b: total }]
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const start = bounds[i].b
    const end = bounds[i + 1].a
    const file = join(dir, `take-${String(i + 1).padStart(2, "0")}.wav`)
    ff(["-i", take, "-ss", start.toFixed(3), "-to", end.toFixed(3), "-ac", "1", "-ar", "44100", file])
    const seconds = Math.max(0.1, end - start)
    const expected = lines[i].split(/\s+/).length / 2.6
    if (seconds > expected * 2.2 + 1 || seconds < expected * 0.4)
      warnings.push(`line ${i + 1} runs ${seconds.toFixed(1)} s against about ${expected.toFixed(1)} s expected; check it was read once and in order`)
    out.push({ file, seconds })
  }
  return { clips: out, warnings }
}

/** Lays the clips at their start times on one track, evens out loudness, and writes AAC. */
export function mixTrack(clips, total, out) {
  if (!clips.length) return null
  const inputs = clips.flatMap((c) => ["-i", c.file])
  const pads = clips.map((c, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=mono,adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`)
  const mix = `${clips.map((_, i) => `[a${i}]`).join("")}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11[out]`
  ff([...inputs, "-filter_complex", [...pads, mix].join(";"), "-map", "[out]", "-ar", "48000", "-c:a", "aac", "-b:a", "160k", out])
  return out
}
