// Renders a deterministic HTML timeline to MP4 by seeking every frame in headless
// Chrome and piping the frames to ffmpeg. The page must expose window.__ready,
// window.__duration, window.__scenes and window.__seek(t).
// Adapted from the frame-capture renderer in Pizza Yap's explainer-video skills.
import { spawn } from "node:child_process"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { cpus } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import { launch } from "./browser.mjs"

async function openPage(browser, html, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  const errors = []
  page.on("pageerror", (e) => errors.push(String(e)))
  await page.goto(pathToFileURL(html).href + "?render")
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 }).catch(() => {
    throw new Error("the video page never became ready: " + (errors.join("; ") || "no error reported"))
  })
  if (errors.length) throw new Error("video page errors: " + errors.join("; "))
  return page
}

async function shot(page, t, type = "jpeg") {
  await page.evaluate((t) => {
    window.__seek(t)
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  }, t)
  return page.screenshot({ type, quality: type === "jpeg" ? 92 : undefined })
}

export function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] })
    let err = ""
    p.stderr.on("data", (d) => (err += d))
    p.on("error", (e) => reject(new Error(`${cmd} could not start: ${e.message}`)))
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} exited ${c}\n${err.slice(-1500)}`))))
  })
}

export async function render({ html, out, width = 1920, height = 1080, fps = 30, audio, log = console.log }) {
  const browser = await launch()
  try {
    const probe = await openPage(browser, html, 640, 360)
    const duration = await probe.evaluate(() => window.__duration)
    await probe.close()
    const total = Math.max(1, Math.round(duration * fps))
    const workers = Math.max(1, Math.min(6, Math.max(2, cpus().length - 2), Math.ceil(total / 30)))
    log(`Rendering ${total} frames (${duration.toFixed(1)} s at ${fps} fps, ${width}x${height}) with ${workers} workers`)
    const tmp = join(dirname(out), `.segments-${process.pid}`)
    await mkdir(tmp, { recursive: true })
    const per = Math.ceil(total / workers)
    let done = 0
    let lastPct = -1
    const t0 = Date.now()
    const segments = await Promise.all(
      Array.from({ length: workers }, async (_, w) => {
        const a = w * per
        const b = Math.min(total, a + per)
        if (a >= b) return null
        const seg = join(tmp, `seg${String(w).padStart(2, "0")}.mp4`)
        const page = await openPage(browser, html, width, height)
        const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(fps), seg], { stdio: ["pipe", "ignore", "pipe"] })
        let ferr = ""
        ff.stderr.on("data", (d) => (ferr += d))
        const closed = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg: " + ferr)))))
        for (let f = a; f < b; f++) {
          const buf = await shot(page, f / fps)
          if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r))
          done++
          const pct = Math.floor((done / total) * 10) * 10
          if (pct !== lastPct) {
            lastPct = pct
            log(`  ${pct}%  (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
          }
        }
        ff.stdin.end()
        await closed
        await page.close()
        return seg
      }),
    )
    const list = join(tmp, "list.txt")
    await writeFile(list, segments.filter(Boolean).map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join("\n"))
    const silent = audio ? join(tmp, "video.mp4") : out
    await run("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", silent])
    if (audio) {
      const fade = Math.min(1.5, duration / 4)
      await run("ffmpeg", ["-y", "-v", "error", "-i", silent, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", `apad,afade=t=out:st=${(duration - fade).toFixed(2)}:d=${fade.toFixed(2)}`, "-t", duration.toFixed(3), "-movflags", "+faststart", out])
    }
    await rm(tmp, { recursive: true, force: true })
    log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
    return { out, duration }
  } finally {
    await browser.close()
  }
}

// Three stills per scene, tiled into one PNG, so the storyboard can be checked before rendering.
export async function contactSheet({ html, out, scene, width = 1920, height = 1080, cols = 4, thumb = 480 }) {
  const browser = await launch()
  try {
    const page = await openPage(browser, html, width, height)
    const scenes = await page.evaluate(() => window.__scenes)
    let times
    if (scene != null) {
      const s = scenes[scene]
      if (!s) throw new Error(`no scene ${scene} (0-${scenes.length - 1})`)
      times = Array.from({ length: 12 }, (_, i) => +(s.start + (s.dur * (i + 0.5)) / 12).toFixed(2))
    } else times = scenes.flatMap((s) => [0.3, 0.6, 0.9].map((f) => +(s.start + s.dur * f).toFixed(2)))
    const dir = out.replace(/\.png$/, "") + "-frames"
    await mkdir(dir, { recursive: true })
    const files = []
    for (const [i, t] of times.entries()) {
      const f = join(dir, `${String(i).padStart(3, "0")}_${t.toFixed(2)}s.png`)
      await writeFile(f, await shot(page, t, "png"))
      files.push(f)
    }
    await page.close()
    const rows = Math.ceil(files.length / cols)
    const th = Math.round((thumb * height) / width)
    const inputs = files.flatMap((f) => ["-i", f])
    const filters = files.map((_, i) => `[${i}:v]scale=${thumb}:${th}[v${i}]`)
    let chain = files.map((_, i) => `[v${i}]`).join("")
    const pad = rows * cols - files.length
    if (pad > 0) {
      filters.push(`color=black:s=${thumb}x${th}:d=1,split=${pad}${Array.from({ length: pad }, (_, k) => `[p${k}]`).join("")}`)
      chain += Array.from({ length: pad }, (_, k) => `[p${k}]`).join("")
    }
    const layout = Array.from({ length: rows * cols }, (_, i) => `${(i % cols) * thumb}_${Math.floor(i / cols) * th}`).join("|")
    filters.push(`${chain}xstack=inputs=${rows * cols}:layout=${layout}[out]`)
    await run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", filters.join(";"), "-map", "[out]", "-frames:v", "1", out])
    return { out, dir, scenes }
  } finally {
    await browser.close()
  }
}
