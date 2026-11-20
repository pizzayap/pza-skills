// Lab hooks: URL state and bare-key shortcuts for the lab chrome.
// Copy this file unchanged next to the chrome that imports it. It is a tool, not part of the design.
// React 18+, no other dependencies.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

/** Keeps one value in the URL query, so every view is a shareable link that survives reload. */
export function useUrlParam<T extends string>(name: string, values: readonly T[], fallback: T = values[0]) {
  const read = useCallback((): T => {
    const v = new URLSearchParams(window.location.search).get(name) as T | null
    return v !== null && values.includes(v) ? v : fallback
  }, [name, fallback, values.join("|")]) // eslint-disable-line react-hooks/exhaustive-deps
  const [value, setValue] = useState<T>(read)
  useEffect(() => {
    const onPop = () => setValue(read())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [read])
  const set = useCallback(
    (next: T) => {
      const url = new URL(window.location.href)
      if (next === fallback) url.searchParams.delete(name)
      else url.searchParams.set(name, next)
      window.history.replaceState(window.history.state, "", url)
      setValue(next)
    },
    [name, fallback],
  )
  return [value, set] as const
}

/** A URL value plus previous and next, wrapping at the ends. */
export function useStepper<T extends string>(name: string, values: readonly T[]) {
  const [value, set] = useUrlParam(name, values)
  const i = Math.max(0, values.indexOf(value))
  const prev = () => set(values[(i - 1 + values.length) % values.length])
  const next = () => set(values[(i + 1) % values.length])
  return { value, set, prev, next, index: i }
}

/**
 * Bare-key shortcuts. Skips modified keys, events another handler already handled,
 * and focus inside form fields or editable regions. With several stages on one page,
 * only the stage under the pointer or holding focus responds.
 */
export function useLabKeys(stage: RefObject<HTMLElement | null>, bindings: Record<string, () => void>) {
  const latest = useRef(bindings)
  latest.current = bindings
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
      const el = stage.current
      if (!el) return
      const several = document.querySelectorAll("[data-lab-stage]").length > 1
      if (several && !el.contains(document.activeElement) && !el.matches(":hover")) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const run = latest.current[key]
      if (!run) return
      e.preventDefault()
      run()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [stage])
}
