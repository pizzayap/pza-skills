// State lab: a dark switcher panel beside the real component, one state at a time.
// Copy this folder into the lab folder unchanged. It is a tool, not part of the design.
// React 18+, no other dependencies.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useLabKeys, useUrlParam } from "./lab-hooks"
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
  // An empty ?state= means the first state, even if some slug is "".
  const [state, go] = useUrlParam(param, all.filter((s) => s !== ""), all[0])
  const [hidden, setHidden] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const panel = useRef<HTMLElement>(null)

  // Keep the active row visible inside the panel without scrolling the page.
  useEffect(() => {
    const row = panel.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    const box = panel.current
    if (!row || !box) return
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop - 8
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight + 8
  }, [state])

  // Steps through every state in list order, across groups, wrapping at the ends.
  const i = all.indexOf(state)
  const step = (by: number) => () => go(all[(i + by + all.length) % all.length])
  useLabKeys(ref, {
    ArrowDown: step(1),
    ArrowRight: step(1),
    ArrowUp: step(-1),
    ArrowLeft: step(-1),
    h: () => setHidden((h) => !h),
  })

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
