// State lab: a dark switcher panel beside the real component, one state at a time.
// Copy this folder into the lab folder unchanged. It is a tool, not part of the design.
// React 18+, no other dependencies.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import "./state-lab.css"

export type StateGroup = { label: string; states: { slug: string; label: string }[] }

type Props = {
  groups: StateGroup[]
  /** Renders the component for one state. */
  children: (state: string) => ReactNode
  /** URL query name. Change it only when several labs share one page. */
  param?: string
  /** The component's production width in px. */
  width?: number
  /** Wraps the lab in a full-height #fafafa page. Turn off to place several labs on one page. */
  standalone?: boolean
}

export function StateLab({ groups, children, param = "state", width, standalone = true }: Props) {
  const all = groups.flatMap((g) => g.states.map((s) => s.slug))
  const read = useCallback(() => {
    const v = new URLSearchParams(window.location.search).get(param)
    return v && all.includes(v) ? v : all[0]
  }, [param, all.join("|")]) // eslint-disable-line react-hooks/exhaustive-deps
  const [state, setState] = useState(read)
  const [hidden, setHidden] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const panel = useRef<HTMLElement>(null)

  const go = useCallback(
    (slug: string) => {
      const url = new URL(window.location.href)
      if (slug === all[0]) url.searchParams.delete(param)
      else url.searchParams.set(param, slug)
      window.history.replaceState(window.history.state, "", url)
      setState(slug)
    },
    [param, all.join("|")], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    const onPop = () => setState(read())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [read])

  // Keep the active row visible inside the panel without scrolling the page.
  useEffect(() => {
    const row = panel.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    const box = panel.current
    if (!row || !box) return
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop - 8
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight + 8
  }, [state])

  const latest = useRef({ state, go, all })
  latest.current = { state, go, all }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
      const el = ref.current
      if (!el) return
      const several = document.querySelectorAll("[data-lab-stage]").length > 1
      if (several && !el.contains(document.activeElement) && !el.matches(":hover")) return
      const { state: s, go: to, all: list } = latest.current
      const i = list.indexOf(s)
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
      if (step) {
        e.preventDefault()
        to(list[(i + step + list.length) % list.length])
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault()
        setHidden((h) => !h)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const lab = (
    <section
      ref={ref}
      className="sl-lab"
      aria-label="State lab"
      data-lab-stage=""
      data-chrome-hidden={hidden ? "" : undefined}
      style={width ? ({ "--sl-width": `${width}px` } as CSSProperties) : undefined}
    >
      <div className="sl-side">
        <nav ref={panel} className="sl-panel" aria-label="States">
          {groups.map((g) => (
            <div key={g.label} role="group" aria-labelledby={`sl-${param}-${g.label}`}>
              <div className="sl-heading" id={`sl-${param}-${g.label}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6v5a3 3 0 0 0 3 3h12m-4-4 4 4-4 4" />
                </svg>
                {g.label}
              </div>
              {g.states.map((s) => (
                <button key={s.slug} type="button" className="sl-row" aria-pressed={s.slug === state} onClick={() => go(s.slug)}>
                  {s.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <label className="sl-select">
        <span>State</span>
        <select value={state} onChange={(e) => go(e.target.value)}>
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.states.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="sl-subject" data-lab-root="">
        {children(state)}
      </div>
    </section>
  )
  return standalone ? <main className="sl-page">{lab}</main> : lab
}
