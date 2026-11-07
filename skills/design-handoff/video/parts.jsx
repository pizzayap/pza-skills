// Shared pieces for the handoff video: palette, text, the browser window, the cursor,
// the act bar and captions. Editorial look: warm paper, ink type, one accent color,
// flat surfaces. No gradients, no glows.
import React from "react"
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"

export const C = {
  paper: "#efede9",
  panel: "#e4e1dc",
  line: "#d3cfc8",
  ink: "#2a2727",
  ink2: "#7d7874",
  ink3: "#bdb8b2",
  white: "#ffffff",
  alert: "#c8384f",
  ok: "#2d7d4f",
}
export const SANS = '"Inter Variable", Inter, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
export const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif'
export const W = 1920
export const H = 1080
export const BAR = 44 // browser bar height
export const STAGE = { top: 120, bottom: 160 } // room for the act bar and the caption

export const clamp01 = (v) => Math.max(0, Math.min(1, v))
export const ease = Easing.bezier(0.22, 1, 0.36, 1) // fast out, gentle settle
export const inOut = Easing.bezier(0.65, 0, 0.35, 1)
export const ramp = (f, a, b, fn = ease) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: fn })
export const lerp = (a, b, t) => a + (b - a) * t

/** Rising entrance with a focus pull: opacity, y and blur over ~0.6 s from `delay` frames. */
export const useRise = (delay = 0, distance = 28) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = spring({ frame: f - delay, fps, config: { damping: 200, stiffness: 120, mass: 0.9 } })
  return { opacity: t, transform: `translateY(${(1 - t) * distance}px)`, filter: t < 0.995 ? `blur(${(1 - t) * 10}px)` : "none" }
}

/** "**word**" becomes the accent word: serif italic in the accent color. */
export const Rich = ({ text, accent, serif = true }) => {
  const parts = String(text ?? "").split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <span key={i} style={serif ? { fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color: accent, fontSize: "1.1em", letterSpacing: "-0.01em" } : { color: accent }}>
            {p.slice(2, -2)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

/** Words rise one after another. Keeps "**accent**" runs together. */
export const RiseWords = ({ text, accent, delay = 0, step = 2.5, style }) => {
  // Split into words; accent runs become accent words, and punctuation stays on its word.
  const tokens = []
  let spaceBefore = true
  for (const part of String(text ?? "").split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue
    const isAccent = part.startsWith("**") && part.endsWith("**")
    const body = isAccent ? part.slice(2, -2) : part
    const glued = tokens.length > 0 && !spaceBefore && !/^\s/.test(body)
    spaceBefore = /\s$/.test(body)
    body.split(/\s+/).filter(Boolean).forEach((w, k) => {
      const seg = { text: w, accent: isAccent }
      if (k === 0 && glued) tokens.at(-1).push(seg)
      else tokens.push([seg])
    })
  }
  return (
    <div style={style}>
      {tokens.map((segs, i) => (
        <Word key={i} delay={delay + i * step}>
          {segs.map((s, k) => (
            <span key={k} style={s.accent ? { fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color: accent, fontSize: "1.1em", letterSpacing: "-0.01em" } : undefined}>
              {s.text}
            </span>
          ))}
        </Word>
      ))}
    </div>
  )
}
const Word = ({ delay, children }) => {
  const s = useRise(delay, 36)
  return <span style={{ display: "inline-block", marginRight: "0.25em", ...s }}>{children}</span>
}

/** Fits an image of aspect `ar` (w/h) plus the browser bar inside a box. */
export const fitWindow = (ar, box) => {
  let w = box.w
  let h = w / ar + BAR
  if (h > box.h) {
    h = box.h
    w = (h - BAR) * ar
  }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }
}
export const stageBox = (pad = 120) => ({ x: pad, y: STAGE.top, w: W - pad * 2, h: H - STAGE.top - STAGE.bottom })

/** A plain browser window with the capture inside. */
export const Window = ({ img, url, rect, style, imgStyle, children }) => (
  <div
    style={{
      position: "absolute",
      left: rect.x,
      top: rect.y,
      width: rect.w,
      height: rect.h,
      borderRadius: 16,
      overflow: "hidden",
      background: C.white,
      border: `1px solid ${C.line}`,
      boxShadow: "0 24px 48px rgba(42, 39, 39, 0.12)",
      ...style,
    }}
  >
    <div style={{ height: BAR, display: "flex", alignItems: "center", gap: 8, padding: "0 18px", borderBottom: `1px solid ${C.line}`, background: "#f7f6f3" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: C.ink3 }} />
      ))}
      {url ? <div style={{ marginLeft: 18, fontFamily: SANS, fontSize: 18, color: C.ink2, fontWeight: 450 }}>{url}</div> : null}
    </div>
    <div style={{ position: "relative", width: "100%", height: rect.h - BAR, overflow: "hidden" }}>
      {img ? <Img src={staticFile(img.src)} style={{ width: "100%", display: "block", ...imgStyle }} /> : null}
      {children}
    </div>
  </div>
)

/** An outline around a region, given in pixels inside the window's image area. */
export const Outline = ({ box, accent, opacity = 1 }) =>
  box ? (
    <div
      style={{
        position: "absolute",
        left: box.x - 8,
        top: box.y - 8,
        width: box.w + 16,
        height: box.h + 16,
        border: `4px solid ${accent}`,
        borderRadius: 14,
        opacity,
      }}
    />
  ) : null

/** Multiplayer-style cursor: black arrow with the presenter's name in the accent color. */
export const Cursor = ({ x, y, name, accent, press = 0 }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `scale(${1 - press * 0.14})`, transformOrigin: "0 0" }}>
    <svg width="34" height="40" viewBox="0 0 34 40" style={{ display: "block" }}>
      <path d="M2 2 L2 32 L10 25 L16 38 L22 35 L16 22 L27 22 Z" fill={C.ink} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
    {name ? (
      <div style={{ position: "absolute", left: 26, top: 32, background: accent, color: "#fff", fontFamily: SANS, fontWeight: 560, fontSize: 20, padding: "5px 12px", borderRadius: 10, whiteSpace: "nowrap" }}>
        {name}
      </div>
    ) : null}
  </div>
)

/** A ring that expands from a click and fades. Flat stroke, no blur. */
export const ClickRing = ({ x, y, t, accent }) =>
  t > 0 && t < 1 ? (
    <div
      style={{
        position: "absolute",
        left: x - 30 - t * 40,
        top: y - 30 - t * 40,
        width: 60 + t * 80,
        height: 60 + t * 80,
        borderRadius: "50%",
        border: `4px solid ${accent}`,
        opacity: 1 - t,
      }}
    />
  ) : null

/** Where the story is: five acts across the top. Sentence case, no eyebrow labels. */
export const ActBar = ({ acts, current, title, accent }) => {
  if (!acts?.length || !current) return null
  const idx = acts.findIndex((a) => a.id === current)
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 100, background: C.paper, borderBottom: `1px solid ${C.line}`, padding: "40px 72px 0", boxSizing: "border-box", display: "flex", alignItems: "flex-start", fontFamily: SANS, fontSize: 22, fontWeight: 500 }}>
      <div style={{ display: "flex", gap: 34 }}>
        {acts.map((a, i) => (
          <div key={a.id} style={{ position: "relative", color: i === idx ? C.ink : i < idx ? C.ink2 : C.ink3, paddingBottom: 8 }}>
            {a.label}
            {i === idx ? <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, borderRadius: 2, background: accent }} /> : null}
          </div>
        ))}
      </div>
      <div style={{ marginLeft: "auto", color: C.ink2, fontWeight: 450 }}>{title}</div>
    </div>
  )
}

export const Caption = ({ text }) => {
  const f = useCurrentFrame()
  if (!text) return null
  const o = ramp(f, 0, 6)
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 48, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ maxWidth: 1460, background: C.ink, color: "#fff", fontFamily: SANS, fontSize: 36, lineHeight: 1.3, fontWeight: 480, padding: "14px 28px", borderRadius: 14, textAlign: "center", letterSpacing: "-0.005em" }}>
        {String(text).replace(/\*\*/g, "")}
      </div>
    </div>
  )
}

const STATUS = {
  built: { label: "Built", fg: C.ok, bg: "#dcefe2" },
  mock: { label: "With test data", fg: "#8a5a00", bg: "#f6e7c4" },
  missing: { label: "Not in the prototype yet", fg: C.alert, bg: "#f6dde1" },
  done: { label: "Done", fg: C.ok, bg: "#dcefe2" },
  open: { label: "Open", fg: C.ink2, bg: C.panel },
  blocking: { label: "Blocks build", fg: C.alert, bg: "#f6dde1" },
}
export const Chip = ({ status, size = 20 }) => {
  const s = STATUS[status]
  if (!s) return null
  return <span style={{ display: "inline-block", fontFamily: SANS, fontSize: size, fontWeight: 560, color: s.fg, background: s.bg, padding: `${size * 0.22}px ${size * 0.55}px`, borderRadius: size * 0.5 }}>{s.label}</span>
}
