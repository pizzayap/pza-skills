// What build-deck.mjs and make-video.mjs both check in handoff.json, and how they find captures.
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { readJson } from "./cli.mjs"

export const isText = (v) => typeof v === "string" && v.trim() !== ""

// Collects problems (the build stops) and warnings. `measure` gives the text whose length counts:
// strings as written by default; the video drops its `**` accent markers.
export function checks(measure = (v) => (typeof v === "string" ? v : "")) {
  const problems = []
  const warnings = []
  const limit = (v, max, at) => {
    const n = measure(v).length
    if (n > max) problems.push(`${at} is ${n} characters; keep it to ${max}`)
  }
  // SKILL.md rule 5.
  const wording = (text, at) => {
    if (/\bAI[- ]generated\b/i.test(text ?? "")) problems.push(`${at}: do not label anything "AI-generated"`)
  }
  return { problems, warnings, limit, wording }
}

// Reads the capture manifest (no file means no captures). find(ref) takes a shot id, a step image's
// name or a path relative to root, and returns the file it names even when nothing is there, so the
// caller can say where it looked; null for a manifest entry without an image.
export function openManifest(manifestPath, root, fail) {
  const manifest = existsSync(manifestPath) ? readJson(manifestPath, fail) : []
  const find = (ref) => {
    const m = manifest.find((e) => e.id === ref) ?? manifest.flatMap((e) => e.images ?? []).find((e) => e.name === ref)
    if (!m) return resolve(root, ref)
    // capture.mjs writes image paths relative to the manifest
    return m.image ?? m.file ? resolve(dirname(manifestPath), m.image ?? m.file) : null
  }
  return { manifest, find }
}
