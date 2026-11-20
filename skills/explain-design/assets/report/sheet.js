  // Sheet: builds the head, the drawing skeleton, the spec column and the minimap once.
  // Head
  sheet.append(h("header", { class: "sh-head" },
    h("div", {},
      h("p", { class: "caps sh-eyebrow" }, "Explain design"),
      h("h1", { class: "sh-title" }, data.title || "Untitled design"),
      safeHref(source.href) && h("a", { class: "sh-url", href: safeHref(source.href), target: "_blank", rel: "noopener noreferrer" }, source.href + " ↗"),
    ),
    (data.idea || data.summary || data.audience) && h("div", { class: "sh-notes" },
      h("p", { class: "caps" }, "Notes"),
      data.idea && h("p", { class: "sh-idea" }, rich(data.idea)),
      data.audience && h("p", { class: "sh-audience" }, h("span", { class: "caps" }, "Audience"), rich(data.audience)),
      data.summary && h("p", { class: "sh-summary" }, rich(data.summary)),
    ),
  ))

  // Drawing: the figure and callout columns are rebuilt for each view.
  const draw = h("section", { class: "sh-draw", "aria-label": "Annotated design" })
  const cols = { left: h("div", { class: "sh-col", "data-side": "left" }), right: h("div", { class: "sh-col", "data-side": "right" }) }
  const fig = h("figure", { class: "sh-fig" })
  const frame = h("div", { class: "sh-frame" })
  const figcap = h("figcaption", { class: "sh-figcap" })
  const lines = s("svg", { class: "sh-lines", "aria-hidden": "true" })
  fig.append(frame, figcap)
  draw.append(cols.left, fig, cols.right, lines)
  let img = null
  let board = null
  let thumbs = []

  // Spec column
  const system = data.system || {}
  const motion = list(data.motion)
  const spec = h("aside", { class: "sh-spec", id: "spec", "aria-label": "Specification" })
  const table = (head, rows) => h("table", {},
    h("thead", {}, h("tr", {}, head.map((label, i) => h("th", { class: i === head.length - 1 && head.length > 2 ? "num" : null }, label)))),
    h("tbody", {}, rows))
  if (list(system.type).length) {
    spec.append(h("section", { class: "sp" }, h("h2", { class: "caps" }, "Type"),
      table(["Role", "Size / LH", "Wt"], list(system.type).map((t) => h("tr", {},
        h("td", { class: "role" }, t.label || ""),
        h("td", {}, [t.size && `${t.size}`, t.lineHeight && `/ ${t.lineHeight}`].filter(Boolean).join(" ")),
        h("td", { class: "num" }, t.weight ?? ""),
      )))))
  }
  if (list(system.colors).length) {
    spec.append(h("section", { class: "sp" }, h("h2", { class: "caps" }, "Color"),
      table(["Value", "Role", "Contrast"], list(system.colors).map((c) => {
        const color = safeColor(c.value)
        return h("tr", {},
          h("td", {}, color ? h("span", { class: "sw", style: { background: color } }) : null, c.value || "?"),
          h("td", { class: "role" }, c.role || ""),
          h("td", { class: "num" }, c.contrast ? String(c.contrast).replace(/\s+on\s+.*/i, "") : "—"),
        )
      }))))
  }
  if (list(system.spacing).length) {
    spec.append(h("section", { class: "sp" }, h("h2", { class: "caps" }, "Spacing"),
      table(["Px", "Use"], list(system.spacing).map((sp) => h("tr", {},
        h("td", {}, String(sp.value ?? "")),
        h("td", { class: "role" }, rich(sp.use)),
      )))))
  }
  for (const m of motion) {
    const ticks = list(m.ticks).map(Number).filter(Number.isFinite)
    const total = Math.max(num(m.duration), ...ticks, 1)
    const states = list(m.states)
    spec.append(h("section", { class: "sp" }, h("h2", { class: "caps" }, "Motion"),
      h("div", { class: "mo" },
        h("div", { class: "mo-head" }, h("b", {}, m.title || "Motion"),
          h("span", {}, [m.trigger, m.duration && `${m.duration}ms`, m.easing].filter(Boolean).join(" · "))),
        list(m.tracks).map((track) => h("div", { class: "mo-track" },
          h("span", {}, track.label || ""),
          h("span", { class: "mo-bar" }, list(track.segments).map((seg) => {
            const a = clamp(seg[0], 0, total), b = clamp(seg[1], a, total)
            return h("i", { style: { left: (a / total) * 100 + "%", width: ((b - a) / total) * 100 + "%" } })
          })),
        )),
        ticks.length ? h("div", { class: "mo-ticks" }, ticks.map((t) => h("span", {}, `${t}`))) : null,
        states.length >= 2 ? table(["Prop", states[0].label || "From", states[states.length - 1].label || "To"],
          list(states[0].props).map((p, i) => h("tr", {},
            h("td", { class: "role" }, p[0]),
            h("td", {}, p[1]),
            h("td", { class: "num" }, list(states[states.length - 1].props)[i]?.[1] ?? ""),
          ))) : null,
        m.notes && h("p", { class: "role" }, rich(m.notes)),
      )))
  }
  if (list(system.notes).length) {
    spec.append(h("section", { class: "sp" }, h("h2", { class: "caps" }, "Notes"),
      h("ol", {}, list(system.notes).map((n) => h("li", {}, h("span", {}, rich(n)))))))
  }
  // Minimap: the whole page down the left, one band per section.
  const pageSrc = sections.length ? safeImage(data.page?.image?.src) : null
  const map = pageSrc ? h("nav", { class: "sh-map", "aria-label": "Page sections" }) : null
  const bands = []
  if (map) {
    const inner = h("div", { class: "sh-map-inner" }, h("img", { src: pageSrc, alt: "" }))
    sections.forEach((sec, i) => {
      const r = list(sec.range)
      if (r.length !== 2) return
      const a = clamp(r[0], 0, 100), b = clamp(r[1], a, 100)
      const band = h("button", {
        type: "button",
        class: "sh-band",
        title: `${pad2(i + 1)} ${sec.title || ""}`,
        "aria-label": `Section ${i + 1}: ${sec.title || ""}`,
        style: { top: a + "%", height: b - a + "%" },
        onclick: () => go(i + 1),
      }, h("span", { class: "sh-band-n" }, pad2(i + 1)))
      bands[i + 1] = band
      inner.append(band)
    })
    map.append(inner)
  }

  const body = h("div", { class: "sh-body" }, draw)
  if (map) { body.prepend(map); body.setAttribute("data-map", "") }
  if (spec.children.length) body.append(spec)
  else body.setAttribute("data-nospec", "")
  sheet.append(body)

