// Lab kit: the stage, tray and controls for a throwaway lab page.
// Copy this folder into the lab folder unchanged. It is a tool, not part of the design.
// React 18+, no other dependencies.
import { useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useLabKeys } from "./lab-hooks"
import "./lab-kit.css"

export { useLabKeys, useStepper, useUrlParam } from "./lab-hooks"

type LabStageProps = {
  children: ReactNode
  /** Row above the component: usually <CaseBar>. */
  bar?: ReactNode
  /** Controls in the bottom tray: <BeforeAfter>, <Segmented>. */
  tray?: ReactNode
  /** Absolutely positioned layer over the canvas, e.g. ui-review callouts. */
  overlay?: ReactNode
  /** The component's production width in px. */
  width?: number
  keys?: Record<string, () => void>
  /** Wraps the stage in a full-height #fafafa page. Turn off to place several stages on one page. */
  standalone?: boolean
  label?: string
}

export function LabStage({ children, bar, tray, overlay, width, keys = {}, standalone = true, label = "Lab" }: LabStageProps) {
  const ref = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useState(false)
  useLabKeys(ref, { ...keys, h: () => setHidden((h) => !h) })
  const stage = (
    <section
      ref={ref}
      className="lab-stage"
      aria-label={label}
      data-lab-stage=""
      data-chrome-hidden={hidden ? "" : undefined}
      style={width ? ({ "--lab-width": `${width}px` } as CSSProperties) : undefined}
    >
      <div className="lab-canvas">
        <div className="lab-subject">
          {bar && <div className="lab-bar">{bar}</div>}
          <div data-lab-root="">{children}</div>
        </div>
        {overlay}
      </div>
      {tray && (
        <div className="lab-tray" role="toolbar" aria-label="Lab controls">
          {tray}
        </div>
      )}
    </section>
  )
  return standalone ? <main className="lab-page">{stage}</main> : stage
}

export function CaseBar({ label, onPrev, onNext, noun = "scenario" }: { label: string; onPrev: () => void; onNext: () => void; noun?: string }) {
  return (
    <>
      <span className="lab-label" aria-live="polite">
        {label}
      </span>
      <span className="lab-steps">
        <button type="button" className="lab-round" aria-label={`Previous ${noun}`} onClick={onPrev}>
          <Icon d="m15 18-6-6 6-6" />
        </button>
        <button type="button" className="lab-round" aria-label={`Next ${noun}`} onClick={onNext}>
          <Icon d="m9 18 6-6-6-6" />
        </button>
      </span>
    </>
  )
}

export type SegOption<T extends string> = { value: T; label: ReactNode; disabled?: boolean }

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  square = false,
}: {
  label: string
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
  square?: boolean
}) {
  return (
    <div className="lab-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="lab-seg-btn"
          data-square={square ? "" : undefined}
          aria-pressed={o.value === value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export type View = "before" | "after"
export const VIEWS = ["before", "after"] as const

/** Before renders the untouched snapshot, After the real component. Disabled until the first fix lands. */
export function BeforeAfter({ value, onChange, disabled = false }: { value: View; onChange: (v: View) => void; disabled?: boolean }) {
  return (
    <Segmented
      label="Before or after"
      value={value}
      onChange={onChange}
      options={[
        {
          value: "before",
          label: (
            <>
              <Icon d={["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"]} />
              Before
            </>
          ),
          disabled,
        },
        {
          value: "after",
          label: (
            <>
              <Icon d={["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"]} />
              After
            </>
          ),
          disabled,
        },
      ]}
    />
  )
}

export function Icon({ d }: { d: string | string[] }) {
  return (
    <svg
      className="lab-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(Array.isArray(d) ? d : [d]).map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  )
}
