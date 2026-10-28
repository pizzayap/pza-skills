// Callout layer for ui-review: pins each finding to its element, the way a designer marks up a screenshot.
// Copy unchanged next to lab-kit.tsx and pass it to <LabStage overlay={...}>. Show at most 4 findings per view.
import { useLayoutEffect, useRef, useState } from "react"
import "./callouts.css"

export type Finding = {
  id: string
  /** Selector inside the rendered component, e.g. "h3" or 'button[aria-label="Bookmark"]'. */
  target: string
  title: string
  body: string
  fixed?: boolean
}

/** Findings for one view: 4 per page, 2 per side. */
export const PER_VIEW = 4
export const pageOf = (findings: Finding[], page: number) => findings.slice(page * PER_VIEW, page * PER_VIEW + PER_VIEW)

const CARD_W = 280
const GAP = 40
const STACK = 16
const EDGE = 12

type Side = "left" | "right"
type Placed = { id: string; side: Side; x: number; y: number; h: number; tx: number; ty: number }
type Box = { left: number; top: number; width: number; height: number }

export function Callouts({ findings, showFixed = false, layoutKey }: { findings: Finding[]; showFixed?: boolean; layoutKey?: string }) {
  const layer = useRef<HTMLDivElement>(null)
  const cards = useRef(new Map<string, HTMLDivElement>())
  const [placed, setPlaced] = useState<Placed[]>([])
  const [pins, setPins] = useState<{ n: number; x: number; y: number }[]>([])
  const [stacked, setStacked] = useState(false)

  useLayoutEffect(() => {
    const el = layer.current
    const canvas = el?.parentElement
    const root = canvas?.querySelector<HTMLElement>("[data-lab-root]")
    if (!el || !canvas || !root) return

    const measure = () => {
      const c = canvas.getBoundingClientRect()
      // Works under CSS zoom or transforms: convert screen px back to the canvas's own px.
      const scale = c.width / canvas.offsetWidth || 1
      const local = (r: DOMRect): Box => ({
        left: (r.left - c.left) / scale,
        top: (r.top - c.top) / scale,
        width: r.width / scale,
        height: r.height / scale,
      })
      const rr = local(root.getBoundingClientRect())
      const mid = rr.left + rr.width / 2
      // Cards may hang past the stage, but never past the window.
      const screen = root.getBoundingClientRect()
      const room = Math.min(screen.left, document.documentElement.clientWidth - screen.right) / scale
      const narrow = room < CARD_W + GAP + EDGE
      setStacked(narrow)

      const items = findings.map((f, i) => {
        const t = root.querySelector<HTMLElement>(f.target)
        const r = t ? local(t.getBoundingClientRect()) : { left: mid, top: rr.top, width: 0, height: 0 }
        const side: Side = r.left + r.width / 2 < mid ? "left" : "right"
        return { f, n: i + 1, r, side }
      })

      if (narrow) {
        setPins(items.map((i) => ({ n: i.n, x: i.r.left + i.r.width, y: i.r.top })))
        setPlaced([])
        return
      }

      // Balance the columns: move the target nearest the middle when one side has too many.
      const cap = Math.ceil(items.length / 2)
      for (const [from, to] of [
        ["left", "right"],
        ["right", "left"],
      ] as const) {
        while (items.filter((i) => i.side === from).length > cap) {
          const nearest = items
            .filter((i) => i.side === from)
            .sort((a, b) => Math.abs(a.r.left + a.r.width / 2 - mid) - Math.abs(b.r.left + b.r.width / 2 - mid))[0]
          nearest.side = to
        }
      }

      const out: Placed[] = []
      let top = rr.top
      let bottom = rr.top + rr.height
      for (const side of ["left", "right"] as const) {
        let floor = -Infinity
        items
          .filter((i) => i.side === side)
          .sort((a, b) => a.r.top - b.r.top)
          .forEach((i) => {
            const h = cards.current.get(i.f.id)?.offsetHeight ?? 96
            const ty = i.r.height > 40 ? i.r.top + 20 : i.r.top + i.r.height / 2
            const y = Math.max(ty - 28, floor + STACK)
            floor = y + h
            top = Math.min(top, y)
            bottom = Math.max(bottom, floor)
            const x = side === "left" ? rr.left - GAP - CARD_W : rr.left + rr.width + GAP
            const tx = side === "left" ? i.r.left - 6 : i.r.left + i.r.width + 6
            out.push({ id: i.f.id, side, x, y, h, tx, ty })
          })
      }
      // Grow the canvas when a column runs past the component. Each side is measured from the component, so this is stable.
      const above = rr.top - top + 32
      const below = bottom - rr.top - rr.height + 32
      canvas.style.paddingTop = above > 64 ? `${Math.ceil(above)}px` : ""
      canvas.style.paddingBottom = below > 64 ? `${Math.ceil(below)}px` : ""
      setPins([])
      setPlaced(out)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [findings, layoutKey])

  const at = new Map(placed.map((p) => [p.id, p]))

  return (
    <div ref={layer} className="lab-overlay" data-stacked={stacked ? "" : undefined}>
      {!stacked && (
        <svg className="lab-leaders" width="1" height="1" aria-hidden="true">
          {placed.map((p) => {
            const cx = p.side === "left" ? p.x + CARD_W + 10 : p.x - 10
            const cy = Math.min(Math.max(p.ty, p.y + 22), p.y + p.h - 22)
            const mx = (cx + p.tx) / 2
            return (
              <g key={p.id}>
                <path d={`M${cx} ${cy}H${mx}V${p.ty}H${p.tx}`} />
                <circle cx={cx} cy={cy} r="3" />
                <circle cx={p.tx} cy={p.ty} r="3" />
              </g>
            )
          })}
        </svg>
      )}
      {pins.map((p) => (
        <span key={p.n} className="lab-pin" style={{ left: p.x, top: p.y }} aria-hidden="true">
          {p.n}
        </span>
      ))}
      {findings.map((f, i) => {
        const p = at.get(f.id)
        const done = showFixed && f.fixed
        return (
          <div
            key={f.id}
            ref={(node) => {
              if (node) cards.current.set(f.id, node)
              else cards.current.delete(f.id)
            }}
            className="lab-callout"
            data-fixed={done ? "" : undefined}
            style={stacked ? undefined : p ? { left: p.x, top: p.y } : { visibility: "hidden" }}
          >
            <h4>
              {stacked && <span className="lab-callout-n">{i + 1}</span>}
              {done && <span className="lab-callout-check">✓ </span>}
              {f.title}
            </h4>
            <p>{f.body}</p>
          </div>
        )
      })}
    </div>
  )
}
