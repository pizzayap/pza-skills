  // Core: reads report-data, safe DOM and value helpers, and the list of views. Every piece shares one function scope, in template order.
  const root = document.documentElement
  const sheet = document.getElementById("sheet")
  let data = {}
  try {
    data = JSON.parse(document.getElementById("report-data").textContent || "{}")
  } catch (error) {
    sheet.textContent = "The report data is not valid JSON: " + error.message
    return
  }

  const SVG = "http://www.w3.org/2000/svg"

  // Builds an element. Strings always become text nodes, never HTML.
  const h = (tag, props, ...kids) => {
    const el = document.createElement(tag)
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue
      if (key === "class") el.className = value
      else if (key === "style") Object.assign(el.style, value)
      else if (key.startsWith("on")) el.addEventListener(key.slice(2), value)
      else el.setAttribute(key, value === true ? "" : String(value))
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false || kid === "") continue
      el.append(kid instanceof Node ? kid : String(kid))
    }
    return el
  }
  const s = (tag, attrs) => {
    const el = document.createElementNS(SVG, tag)
    for (const [key, value] of Object.entries(attrs || {})) if (value != null) el.setAttribute(key, String(value))
    return el
  }

  // Text with `code` spans.
  const rich = (text) =>
    String(text ?? "").split(/`([^`]+)`/).map((part, i) => (i % 2 ? h("code", {}, part) : part))

  const list = (value) => (Array.isArray(value) ? value : [])
  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback)
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, num(n)))
  const safeHref = (url) => (typeof url === "string" && /^https?:\/\//i.test(url) ? url : null)
  const safeImage = (src) =>
    typeof src === "string" && !/^\s*(javascript|vbscript):/i.test(src) && (!/^\s*data:/i.test(src) || /^\s*data:image\//i.test(src))
      ? src
      : null
  const safeColor = (value) =>
    typeof value === "string" &&
    /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([^;{}()]*\))$/i.test(value.trim())
      ? value.trim()
      : null

  const keyed = (v) => [
    ...list(v.works).map((item, i) => ({ ...item, kind: "works", key: String(i + 1) })),
    ...list(v.improve).map((item, i) => ({ ...item, kind: "improve", key: String.fromCharCode(65 + i) })),
  ]
  const source = data.source || {}
  if (data.title) document.title = data.title + " · Explain design"

  // Views: one sheet for a single design, or an overview plus one sheet per page section.
  const sections = list(data.sections)
  const views = sections.length
    ? [
        { kind: "overview", title: "Overview", summary: data.overview, items: keyed(data) },
        ...sections.map((sec, i) => ({ ...sec, kind: "section", n: i + 1, items: keyed(sec) })),
      ]
    : [{ kind: "single", image: data.image, dimensions: data.dimensions, items: keyed(data) }]
  const pad2 = (n) => String(n).padStart(2, "0")

  const mark = (item) => h("span", { class: "mark", "data-kind": item.kind, "aria-hidden": "true" }, item.key)

