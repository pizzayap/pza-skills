// One component per scene type. Every value is a function of the frame, so any frame
// renders the same way on its own. Scene data comes from handoff.json "video", with
// images already resolved to { src, w, h } by make-video.mjs.
import React from "react"
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import {
  BAR, C, ClickRing, Chip, Cursor, H, Outline, Rich, RiseWords, SANS, STAGE, W, Window,
  clamp01, fitWindow, inOut, lerp, ramp, stageBox, useRise,
} from "./parts.jsx"

const lineAt = (lines, f) => {
  let k = 0
  for (let i = 0; i < lines.length; i++) if (f >= lines[i].from) k = i
  return k
}
const imgArea = (rect) => ({ x: rect.x, y: rect.y + BAR, w: rect.w, h: rect.h - BAR })
const regionPx = (area, r) => (r ? { x: (r[0] / 100) * area.w, y: (r[1] / 100) * area.h, w: (r[2] / 100) * area.w, h: (r[3] / 100) * area.h } : null)

// ---------- title and end: the opening and closing cards
const Title = ({ d, accent, dur }) => {
  const f = useCurrentFrame()
  const sub = useRise(16)
  const meta = useRise(24)
  const bar = ramp(f, 0, 18)
  const push = interpolate(f, [0, dur], [1, 1.025])
  return (
    <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "30% 50%" }}>
      <div style={{ position: "absolute", left: 150, top: 290, right: 150, fontFamily: SANS }}>
        <div style={{ width: 120, height: 8, borderRadius: 4, background: accent, transform: `scaleX(${bar})`, transformOrigin: "0 50%", marginBottom: 54 }} />
        <RiseWords text={d.headline} accent={accent} style={{ fontSize: 132, fontWeight: 520, letterSpacing: "-0.045em", lineHeight: 1.02, color: C.ink }} />
        {d.sub ? <div style={{ ...sub, marginTop: 36, fontSize: 46, fontWeight: 450, color: C.ink2, letterSpacing: "-0.02em", maxWidth: 1400 }}><Rich text={d.sub} accent={accent} /></div> : null}
        {d.meta ? <div style={{ ...meta, marginTop: 70, fontSize: 26, fontWeight: 500, color: C.ink2 }}>{d.meta}</div> : null}
      </div>
    </AbsoluteFill>
  )
}

// ---------- statement: the problem or the goal in one large sentence
const Statement = ({ d, accent, dur }) => {
  const f = useCurrentFrame()
  const sub = useRise(18)
  const push = interpolate(f, [0, dur], [1, 1.03])
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <div style={{ position: "absolute", left: 150, right: 200, top: 0, bottom: 120, display: "flex", flexDirection: "column", justifyContent: "center", fontFamily: SANS }}>
        <RiseWords text={d.text} accent={accent} step={2} style={{ fontSize: 96, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1.08, color: C.ink }} />
        {d.sub ? <div style={{ ...sub, marginTop: 40, fontSize: 42, color: C.ink2, fontWeight: 450, letterSpacing: "-0.015em" }}><Rich text={d.sub} accent={accent} /></div> : null}
      </div>
    </AbsoluteFill>
  )
}

// ---------- reveal: the headline, then the prototype rises into view
const Reveal = ({ d, accent, dur }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const img = d.image
  const rect = fitWindow(img.w / img.h, { x: 120, y: 245, w: W - 240, h: H - 245 - STAGE.bottom + 20 })
  const t = ramp(f, 8, 8 + fps * 0.9)
  const push = interpolate(f, [0, dur], [1, 1.035])
  return (
    <AbsoluteFill>
      <RiseWords text={d.headline} accent={accent} style={{ position: "absolute", left: 160, top: 140, fontFamily: SANS, fontSize: 76, fontWeight: 520, letterSpacing: "-0.04em", color: C.ink }} />
      <Window img={img} url={d.url} rect={{ ...rect, y: rect.y + (1 - t) * 260 }} style={{ opacity: t }} imgStyle={{ transform: `scale(${push})`, transformOrigin: "50% 30%" }} />
    </AbsoluteFill>
  )
}

// ---------- zoom: one capture, the camera moves to each part as the narration names it
const Zoom = ({ d, lines, accent }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const img = d.image
  const rect = fitWindow(img.w / img.h, stageBox(150))
  const area = imgArea(rect)
  const enter = useRise(0, 60)
  const cam = (beat) => {
    const r = regionPx(area, beat?.focus)
    if (!r) return { s: 1, tx: 0, ty: 0, r: null }
    const cx = area.x + r.x + r.w / 2
    const cy = area.y + r.y + r.h / 2
    const s = Math.max(1, Math.min(beat.zoom ?? 2.4, 1500 / r.w, 700 / r.h))
    return { s, tx: W / 2 - s * cx, ty: (STAGE.top + H - STAGE.bottom) / 2 - s * cy, r }
  }
  const k = lineAt(lines, f)
  const beats = d.beats ?? []
  const from = k > 0 ? cam(beats[k - 1]) : { s: 1, tx: 0, ty: 0 }
  const to = cam(beats[k])
  const local = f - lines[k].from
  const move = ramp(local, 0, fps * 0.7, inOut)
  const drift = 1 + 0.02 * clamp01(local / (lines[k].dur || 1))
  const s = lerp(from.s, to.s, move) * drift
  const tx = lerp(from.tx, to.tx, move)
  const ty = lerp(from.ty, to.ty, move)
  return (
    <AbsoluteFill style={{ ...enter, transform: `${enter.transform} translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: "0 0" }}>
      <Window img={img} url={d.url} rect={rect}>
        <Outline box={to.r} accent={accent} opacity={ramp(local, fps * 0.6, fps * 0.9)} />
      </Window>
    </AbsoluteFill>
  )
}

// ---------- walk: the cursor clicks through a flow, each click cuts to the next capture
const Walk = ({ d, lines, accent, presenter }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const steps = d.steps ?? []
  const first = steps[0].image
  const rect = fitWindow(first.w / first.h, stageBox(150))
  const area = imgArea(rect)
  const center = (c) => (c ? { x: area.x + ((c[0] + c[2] / 2) / 100) * area.w, y: area.y + ((c[1] + c[3] / 2) / 100) * area.h } : null)
  const k = lineAt(lines, f)
  const step = steps[k]
  const L = lines[k].dur
  const local = f - lines[k].from
  const enter = useRise(0, 60)
  let start = { x: rect.x + rect.w * 0.72, y: rect.y + rect.h * 0.82 }
  for (let i = k - 1; i >= 0; i--) if (steps[i].click) { start = center(steps[i].click); break }
  const target = center(step.click)
  const pressAt = L - fps * 0.4
  const travel = ramp(local, fps * 0.3, Math.min(fps * 1.3, pressAt - 4), inOut)
  const pos = target ? { x: lerp(start.x, target.x, travel), y: lerp(start.y, target.y, travel) } : start
  const press = target ? Math.max(0, 1 - Math.abs(local - pressAt) / 5) : 0
  const ring = target ? (local - pressAt) / (fps * 0.5) : 0
  const lastClick = k === steps.length - 1 && !target
  const cursorOpacity = lastClick ? 1 - ramp(local, fps * 0.6, fps * 1.0) : 1
  const box = regionPx(area, step.click)
  return (
    <AbsoluteFill style={enter}>
      <Window img={step.image} url={step.url ?? d.url} rect={rect}>
        <Outline box={box} accent={accent} opacity={target ? ramp(local, Math.min(fps * 1.1, pressAt - 6), Math.min(fps * 1.4, pressAt)) : 0} />
      </Window>
      <ClickRing x={pos.x} y={pos.y} t={ring} accent={accent} />
      <div style={{ opacity: cursorOpacity }}>
        <Cursor x={pos.x} y={pos.y} name={presenter} accent={accent} press={press} />
      </div>
    </AbsoluteFill>
  )
}

// ---------- compare: before and after side by side, then the eye moves to "after"
const Compare = ({ d, accent, dur }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const gap = 90
  const bw = (W - 240 - gap) / 2
  const box = (x) => ({ x, y: STAGE.top + 30, w: bw, h: H - STAGE.top - STAGE.bottom - 90 })
  const a = fitWindow(d.before.w / d.before.h, box(120))
  const b = fitWindow(d.after.w / d.after.h, box(120 + bw + gap))
  const ea = useRise(0, 50)
  const eb = useRise(8, 50)
  const shift = ramp(f, dur * 0.42, dur * 0.42 + fps * 0.6, inOut)
  const label = (r, text, o) => (
    <div style={{ position: "absolute", left: r.x, width: r.w, top: r.y + r.h + 22, textAlign: "center", fontFamily: SANS, fontSize: 32, fontWeight: 560, color: C.ink, opacity: o }}>{text}</div>
  )
  return (
    <AbsoluteFill>
      <div style={{ ...ea, opacity: ea.opacity * (1 - shift * 0.55) }}>
        <Window img={d.before} url={d.url} rect={a} />
        {label(a, d.beforeLabel ?? "Before", 1)}
      </div>
      <div style={{ position: "absolute", left: 120 + bw, width: gap, top: a.y + a.h / 2 - 30, textAlign: "center", fontFamily: SANS, fontSize: 52, color: C.ink2, opacity: ea.opacity }}>→</div>
      <div style={{ ...eb, transform: `${eb.transform} scale(${1 + shift * 0.03})`, transformOrigin: "50% 50%" }}>
        <Window img={d.after} url={d.url} rect={b} style={{ outline: shift > 0.01 ? `4px solid ${accent}` : "none", outlineOffset: 6 }} />
        {label(b, d.afterLabel ?? "After", 1)}
      </div>
    </AbsoluteFill>
  )
}

// ---------- states: a list of states on the left, the current one large on the right.
// Each state gets an equal share of the scene and a hard cut, so every capture is readable.
const States = ({ d, accent, dur }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const items = (d.items ?? []).slice(0, 6)
  const n = items.length
  const start = fps * 0.5
  const per = (dur - start - fps * 0.3) / Math.max(1, n)
  const cur = Math.max(0, Math.min(n - 1, Math.floor((f - start) / per)))
  const local = f - start - cur * per
  const it = items[cur]
  const listX = 120
  const listW = 470
  const box = { x: listX + listW + 60, y: STAGE.top + 20, w: W - (listX + listW + 60) - 110, h: H - STAGE.top - STAGE.bottom - 20 }
  const rect = it.image ? fitWindow(it.image.w / it.image.h, box) : { x: box.x, y: box.y + 40, w: box.w, h: box.h - 80 }
  const enter = useRise(0, 50)
  const push = interpolate(local, [0, per], [1, 1.03], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  return (
    <AbsoluteFill style={{ fontFamily: SANS }}>
      <RiseWords text={d.title} accent={accent} style={{ position: "absolute", left: listX, top: 150, width: listW, fontSize: 56, fontWeight: 520, letterSpacing: "-0.035em", lineHeight: 1.08, color: C.ink }} />
      <div style={{ position: "absolute", left: listX, top: 330, width: listW }}>
        {items.map((x, i) => (
          <StateRow key={i} delay={6 + i * 3} item={x} on={i === cur} done={i < cur} accent={accent} />
        ))}
      </div>
      <div style={enter}>
        {it.image ? (
          <Window img={it.image} url={it.url ?? d.url} rect={rect} imgStyle={{ transform: `scale(${push})`, transformOrigin: "50% 30%" }} />
        ) : (
          <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, border: `4px dashed ${C.ink3}`, borderRadius: 16, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, color: C.ink2 }}>
            Not in the prototype yet
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
const StateRow = ({ delay, item, on, done, accent }) => {
  const e = useRise(delay, 24)
  return (
    <div style={{ ...e, display: "flex", alignItems: "center", gap: 18, padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ width: 6, alignSelf: "stretch", borderRadius: 3, background: on ? accent : "transparent" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 34, fontWeight: on ? 560 : 480, color: on ? C.ink : done ? C.ink2 : C.ink3, letterSpacing: "-0.02em" }}>{item.label}</div>
        {item.status && item.status !== "built" ? <div style={{ marginTop: 6 }}><Chip status={item.status} size={18} /></div> : null}
      </div>
    </div>
  )
}

// ---------- left: what is not done yet, row by row
const Checklist = ({ d, accent, dur }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const items = (d.items ?? []).slice(0, 5)
  const span = Math.max(fps * 0.5, dur * 0.55)
  return (
    <AbsoluteFill style={{ fontFamily: SANS }}>
      <RiseWords text={d.title} accent={accent} style={{ position: "absolute", left: 150, top: 150, fontSize: 72, fontWeight: 520, letterSpacing: "-0.04em", color: C.ink }} />
      <div style={{ position: "absolute", left: 150, right: 150, top: 300 }}>
        {items.map((it, i) => (
          <Row key={i} delay={fps * 0.5 + (span / items.length) * i} item={typeof it === "string" ? { text: it, status: "open" } : it} />
        ))}
      </div>
    </AbsoluteFill>
  )
}
const Row = ({ delay, item }) => {
  const e = useRise(delay, 30)
  const st = item.status ?? "open"
  const icon =
    st === "done" ? (
      <div style={{ width: 46, height: 46, borderRadius: 23, background: C.ok, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>✓</div>
    ) : st === "blocking" ? (
      <div style={{ width: 46, height: 46, borderRadius: 23, background: C.alert, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>!</div>
    ) : (
      <div style={{ width: 46, height: 46, borderRadius: 23, border: `4px solid ${C.ink3}`, boxSizing: "border-box" }} />
    )
  return (
    <div style={{ ...e, display: "flex", alignItems: "center", gap: 28, padding: "20px 0", borderBottom: `1px solid ${C.line}` }}>
      {icon}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 46, fontWeight: 500, letterSpacing: "-0.025em", color: st === "done" ? C.ink2 : C.ink }}>{item.text}</div>
        {item.detail ? <div style={{ fontSize: 28, color: C.ink2, marginTop: 6 }}>{item.detail}</div> : null}
      </div>
      {st === "blocking" ? <Chip status="blocking" size={22} /> : null}
    </div>
  )
}

// ---------- ask: the decisions we need, with who and by when
const Ask = ({ d, lines, accent, dur }) => {
  const { fps } = useVideoConfig()
  const items = (d.items ?? []).slice(0, 3)
  const perItem = lines.length === items.length && items.length > 1
  const span = Math.max(fps * 0.5, dur * 0.5)
  return (
    <AbsoluteFill style={{ fontFamily: SANS }}>
      <RiseWords text={d.title} accent={accent} style={{ position: "absolute", left: 150, top: 150, fontSize: 72, fontWeight: 520, letterSpacing: "-0.04em", color: C.ink }} />
      <div style={{ position: "absolute", left: 150, right: 150, top: 300, display: "flex", flexDirection: "column", gap: 26 }}>
        {items.map((it, i) => (
          <AskCard key={i} delay={perItem ? lines[i].from + 4 : fps * 0.5 + (span / items.length) * i} item={it} accent={accent} />
        ))}
      </div>
    </AbsoluteFill>
  )
}
const AskCard = ({ delay, item, accent }) => {
  const e = useRise(delay, 30)
  const meta = [item.who && `Who decides: ${item.who}`, item.by && `By ${item.by}`].filter(Boolean).join("  ·  ")
  return (
    <div style={{ ...e, background: C.white, borderRadius: 16, border: `1px solid ${C.line}`, padding: "26px 34px 26px 40px", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: accent, borderRadius: "16px 0 0 16px" }} />
      <div style={{ fontSize: 46, fontWeight: 520, letterSpacing: "-0.025em", color: C.ink }}>
        <Rich text={item.ask} accent={accent} serif={false} />
      </div>
      {meta ? <div style={{ fontSize: 28, color: C.ink2, marginTop: 10, fontWeight: 480 }}>{meta}</div> : null}
    </div>
  )
}

export const SCENES = { title: Title, end: Title, statement: Statement, reveal: Reveal, zoom: Zoom, walk: Walk, compare: Compare, states: States, checklist: Checklist, ask: Ask }
