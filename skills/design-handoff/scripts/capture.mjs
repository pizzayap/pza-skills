#!/usr/bin/env node
// Captures every planned screen, state and edge case of a running prototype.
// Usage: node capture.mjs <shots.json> [--only id1,id2]
// Writes images and manifest.json into the shots file's "out" folder (default: shots/ beside it).
// Image paths in manifest.json are relative to the manifest.
// Format: references/capture.md. Needs playwright-core and Chrome (see lib/browser.mjs).
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { launch } from "./lib/browser.mjs"

const args = process.argv.slice(2)
const onlyAt = args.indexOf("--only")
const only = onlyAt === -1 ? null : new Set(String(args.splice(onlyAt, 2)[1] ?? "").split(",").filter(Boolean))
const specPath = args[0]
if (!specPath) {
  console.error("usage: node capture.mjs <shots.json> [--only id1,id2]")
  process.exit(1)
}

const spec = JSON.parse(readFileSync(resolve(specPath), "utf8"))
const root = dirname(resolve(specPath))
const outDir = resolve(root, spec.out ?? "shots")
mkdirSync(outDir, { recursive: true })

const viewports = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844, scale: 2 },
  ...(spec.viewports ?? {}),
}
const defaults = { viewport: "desktop", reducedMotion: true, colorScheme: "light", wait: 300, format: "jpeg", ...(spec.defaults ?? {}) }
if (!spec.baseUrl && spec.shots?.some((s) => !/^https?:|^file:/.test(s.path ?? s.url ?? ""))) {
  console.error("capture: shots.json needs baseUrl, or full URLs on every shot")
  process.exit(1)
}
const idPattern = /^[a-z0-9][a-z0-9-]*$/
const ids = new Set()
for (const shot of spec.shots ?? []) {
  if (!idPattern.test(shot.id ?? "")) throw new Error(`shot id "${shot.id}" must be lowercase-kebab-case`)
  if (ids.has(shot.id)) throw new Error(`duplicate shot id ${shot.id}`)
  ids.add(shot.id)
}

const pct = (v, total) => Math.round((v / total) * 1000) / 10

async function settle(page, ms) {
  await page.evaluate(() => document.fonts?.ready)
  await page
    .waitForFunction(
      () =>
        document
          .getAnimations()
          .every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
      null,
      { timeout: 5000 },
    )
    .catch(() => {})
  await page.waitForTimeout(ms)
}

async function snap(page, shot, name, vp) {
  const ext = (shot.format ?? defaults.format) === "png" ? "png" : "jpg"
  const file = join(outDir, `${name}.${ext}`)
  const options = { path: file, type: ext === "png" ? "png" : "jpeg", fullPage: Boolean(shot.fullPage) }
  if (options.type === "jpeg") options.quality = 88
  if (shot.clip) {
    const box = await page.locator(shot.clip).first().boundingBox()
    if (!box) throw new Error(`clip selector not visible: ${shot.clip}`)
    const pad = shot.clipPad ?? 16
    options.clip = {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: Math.min(vp.width, box.width + pad * 2),
      height: box.height + pad * 2,
    }
    options.fullPage = false
  }
  await page.screenshot(options)
  return relative(outDir, file)
}

const browser = await launch()
const manifest = []
const failed = []
try {
  for (const shot of spec.shots ?? []) {
    if (only && !only.has(shot.id)) continue
    const vpName = shot.viewport ?? defaults.viewport
    const vp = typeof vpName === "object" ? vpName : viewports[vpName]
    if (!vp) {
      failed.push(`${shot.id}: unknown viewport ${vpName}`)
      continue
    }
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.scale ?? 1,
      colorScheme: shot.colorScheme ?? defaults.colorScheme,
      reducedMotion: (shot.reducedMotion ?? defaults.reducedMotion) ? "reduce" : "no-preference",
    })
    const page = await context.newPage()
    const pageErrors = []
    page.on("pageerror", (e) => pageErrors.push(String(e.message).split("\n")[0]))
    const entry = {
      id: shot.id,
      title: shot.title ?? shot.id,
      url: "",
      viewport: { name: typeof vpName === "string" ? vpName : "custom", width: vp.width, height: vp.height },
      images: [],
      clicks: [],
      mocked: Boolean(shot.mock?.length),
      injected: Boolean(shot.script),
    }
    try {
      for (const m of shot.mock ?? []) {
        await page.route(m.url, async (route) => {
          if (m.hold) return // never answer, so a loading state holds still
          if (m.abort) return route.abort()
          const body = m.json !== undefined ? JSON.stringify(m.json) : (m.body ?? "")
          await route.fulfill({
            status: m.status ?? 200,
            contentType: m.json !== undefined ? "application/json" : (m.contentType ?? "text/plain"),
            body,
          })
        })
      }
      const target = shot.url ?? new URL(shot.path ?? "/", spec.baseUrl).href
      entry.url = target
      await page.goto(target, { waitUntil: shot.mock?.some((m) => m.hold) ? "domcontentloaded" : "load", timeout: 30000 })
      if (shot.waitFor) await page.locator(shot.waitFor).first().waitFor({ timeout: 15000 })
      await settle(page, shot.wait ?? defaults.wait)
      const width = await page.evaluate(() => innerWidth)
      if (width !== vp.width) throw new Error(`viewport is ${width} wide, expected ${vp.width}`)

      let lastImage = null // the name of the last saved step image, for clicks[].after
      for (const step of shot.steps ?? []) {
        if (step.shot) {
          entry.images.push({ name: step.shot, file: await snap(page, shot, step.shot, vp) })
          lastImage = step.shot
          continue
        }
        if (step.click || step.hover) {
          const sel = step.click ?? step.hover
          const loc = page.locator(sel).first()
          await loc.scrollIntoViewIfNeeded()
          const box = await loc.boundingBox()
          if (box && step.click)
            entry.clicks.push({
              after: lastImage,
              selector: sel,
              box: [pct(box.x, vp.width), pct(box.y, vp.height), pct(box.width, vp.width), pct(box.height, vp.height)],
            })
          if (step.click) await loc.click({ force: Boolean(step.force), timeout: 10000 })
          else await loc.hover({ force: Boolean(step.force), timeout: 10000 })
        } else if (step.fill) {
          await page.locator(step.fill[0]).first().fill(step.fill[1])
        } else if (step.press) {
          await page.keyboard.press(step.press)
        } else if (step.waitFor) {
          await page.locator(step.waitFor).first().waitFor({ timeout: 15000 })
        } else if (step.scroll) {
          await page.mouse.wheel(step.scroll[0] ?? 0, step.scroll[1] ?? 0)
        } else if (step.wait) {
          await page.waitForTimeout(step.wait)
        }
        await settle(page, step.settle ?? defaults.wait)
      }
      if (shot.script) {
        await page.evaluate(shot.script)
        await settle(page, shot.wait ?? defaults.wait)
      }
      // Element boxes in percent of the capture, for note pins and video focus boxes.
      if (shot.measure) {
        entry.regions = {}
        const area = shot.clip ? await page.locator(shot.clip).first().boundingBox() : { x: 0, y: 0, width: vp.width, height: vp.height }
        for (const [name, sel] of Object.entries(shot.measure)) {
          const box = await page.locator(sel).first().boundingBox().catch(() => null)
          if (!box) {
            console.log(`warn ${shot.id}: measure "${name}" matched nothing visible (${sel})`)
            continue
          }
          entry.regions[name] = [pct(box.x - area.x, area.width), pct(box.y - area.y, area.height), pct(box.width, area.width), pct(box.height, area.height)]
        }
      }
      const file = await snap(page, shot, shot.id, vp)
      entry.image = file
      entry.overflowX = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      entry.pageErrors = pageErrors
      manifest.push(entry)
      const notes = [entry.mocked && "mocked", entry.injected && "injected", entry.overflowX && "scrolls sideways", pageErrors.length && `${pageErrors.length} page errors`].filter(Boolean)
      console.log(`ok   ${shot.id} -> ${file}${notes.length ? `  (${notes.join(", ")})` : ""}`)
    } catch (error) {
      failed.push(`${shot.id}: ${String(error.message).split("\n")[0]}`)
      console.log(`FAIL ${shot.id}: ${String(error.message).split("\n")[0]}`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}

const manifestPath = join(outDir, "manifest.json")
let previous = []
try {
  previous = only ? JSON.parse(readFileSync(manifestPath, "utf8")) : []
} catch {
  previous = []
}
const merged = [...previous.filter((p) => !manifest.some((m) => m.id === p.id)), ...manifest]
writeFileSync(manifestPath, JSON.stringify(merged, null, 2))

// Two states that render the same pixels usually mean one of them is not really reachable.
const byHash = new Map()
for (const m of merged) {
  let hash
  try {
    hash = createHash("sha1").update(readFileSync(join(outDir, m.image))).digest("hex")
  } catch {
    continue
  }
  byHash.set(hash, [...(byHash.get(hash) ?? []), m.id])
}
for (const same of byHash.values())
  if (same.length > 1) console.log(`same  ${same.join(" = ")}: identical captures; check the state is really reached, or say in the deck that nothing changes`)
console.log(`\n${manifest.length} captured, ${failed.length} failed. Manifest: ${relative(process.cwd(), manifestPath)}`)
if (failed.length) {
  for (const f of failed) console.log(`  - ${f}`)
  process.exit(1)
}
