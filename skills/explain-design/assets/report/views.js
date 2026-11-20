  // Views: renders one view (single design, overview or section) into the figure and callout columns.
  // Callouts and regions
  let nodes = new Map()
  let view = views[0]
  let current = 0
  const setFocus = (key) => {
    if (key) sheet.setAttribute("data-focus", "")
    else sheet.removeAttribute("data-focus")
    for (const [k, n] of nodes) {
      for (const el of [n.callout, n.region, n.lead]) {
        if (!el) continue
        if (k === key) el.setAttribute("data-active", "")
        else el.removeAttribute("data-active")
      }
    }
  }
  const hover = (key) => ({
    onmouseenter: () => setFocus(key),
    onmouseleave: () => setFocus(null),
    onfocus: () => setFocus(key),
    onblur: () => setFocus(null),
  })

  // Builds the figure, regions and callouts for one view.
  function render(index) {
    current = index
    view = views[index]
    setFocus(null)
    frame.replaceChildren()
    frame.className = "sh-frame"
    cols.left.replaceChildren()
    cols.right.replaceChildren()
    nodes = new Map()
    img = null
    board = null
    thumbs = []

    if (view.kind === "overview") {
      // Storyboard: every section in page order; overview points pin to a section.
      board = frame
      frame.className = "sh-frame sh-board"
      sections.forEach((sec, i) => {
        const t = sectionThumb(sec, i)
        thumbs.push(t)
        frame.append(t)
      })
    } else {
      const src = safeImage(view.image?.src)
      if (src) {
        img = h("img", { src, alt: view.image?.alt || view.title || data.title || "The design" })
        img.addEventListener("load", schedule, { once: true })
        frame.append(img)
      } else {
        frame.append(h("div", { class: "sh-empty caps" }, "No capture attached"))
      }
    }

    const fignum = view.kind === "section" ? `Fig. ${view.n}` : view.kind === "overview" ? "Fig. 0" : "Fig. 1"
    figcap.replaceChildren(
      h("span", { class: "caps" }, [fignum, view.kind === "single" ? source.kind : view.title, view.kind === "single" ? source.viewport : null].filter(Boolean).join(" · ")),
      ...(view.summary ? [h("span", { class: "sh-figsum" }, rich(view.summary))] : []),
    )

    for (const item of view.items) addPoint(item)

    const w = view.items.filter((i) => i.kind === "works").length
    countWorks.textContent = `Good design · ${w}`
    countImprove.textContent = `Can be improved · ${view.items.length - w}`
    dimLegend.style.display = list(view.dimensions).length ? "" : "none"
    seg.style.display = view.items.length && (img || board) ? "" : "none"
    if (stepper) stepLabel.textContent = `${pad2(index)} / ${pad2(views.length - 1)} · ${view.title || ""}`
    bands.forEach((b, i) => b && (i === index ? b.setAttribute("data-current", "") : b.removeAttribute("data-current")))
    if (views.length > 1) history.replaceState(null, "", index ? `#${index}` : location.pathname + location.search)
    layout()
  }

  // One storyboard thumbnail; overview points pin to it.
  function sectionThumb(sec, i) {
    const src = safeImage(sec.image?.src)
    const pic = src ? h("img", { src, alt: "" }) : null
    // A section wider than the thumb shows whole, letterboxed in its own bottom-edge color.
    pic?.addEventListener("load", () => {
      if (pic.naturalWidth / pic.naturalHeight <= 1.6) return
      pic.style.objectFit = "contain"
      pic.style.objectPosition = "center"
      try {
        const c = document.createElement("canvas")
        c.width = c.height = 1
        const ctx = c.getContext("2d")
        ctx.drawImage(pic, 0, pic.naturalHeight - 2, 1, 1, 0, 0, 1, 1)
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
        pic.parentElement.style.background = `rgb(${r}, ${g}, ${b})`
      } catch {}
    }, { once: true })
    return h("button", { type: "button", class: "sh-thumb", onclick: () => go(i + 1) },
      h("span", { class: "sh-thumb-img" }, pic),
      h("span", { class: "sh-thumb-cap caps" }, h("b", {}, pad2(i + 1)), " ", sec.title || ""),
    )
  }

  // One point: its callout, its region on the design (or its section's thumbnail), recorded in nodes.
  function addPoint(item) {
    const evidence = list(item.evidence)
    const change = item.change && (item.change.from || item.change.to) ? item.change : null
    const callout = h("article", { class: "co", "data-kind": item.kind, tabindex: 0, ...hover(item.key) },
      (item.impact || item.principle) && h("div", { class: "co-tags" },
        item.kind === "improve" && item.impact && h("span", { class: "caps co-tag", "data-impact": item.impact }, item.impact),
        item.principle && h("span", { class: "caps co-tag" }, item.principle),
      ),
      h("div", { class: "co-head" }, mark(item), h("h3", { class: "caps" }, item.title || "")),
      item.thought && h("p", { class: "co-thought" }, `“${item.thought}”`),
      item.why && h("p", { class: "co-why" }, rich(item.why)),
      item.kind === "improve" && item.fix && h("p", { class: "co-fix" }, h("span", { class: "caps" }, "Fix"), rich(item.fix)),
      change ? h("p", { class: "co-val" }, h("s", {}, change.from || "—"), " → ", h("b", {}, change.to || "—")) : null,
      evidence.length ? h("p", { class: "co-val" }, evidence.join("  ·  ")) : null,
    )
    let region = null
    let rect = null
    const r = list(item.region)
    if (img && r.length === 4) {
      const x = clamp(r[0], 0, 100), y = clamp(r[1], 0, 100)
      rect = r
      region = h("div", {
        class: "sh-region",
        style: { left: x + "%", top: y + "%", width: clamp(r[2], 0, 100 - x) + "%", height: clamp(r[3], 0, 100 - y) + "%" },
        ...hover(item.key),
        onclick: () => callout.focus(),
      }, mark(item))
      frame.append(region)
    }
    const thumb = board && Number.isInteger(item.section) ? thumbs[item.section - 1] : null
    nodes.set(item.key, { item, callout, region: region || thumb, rect, thumb })
  }

  function go(index) {
    if (index < 0 || index >= views.length || index === current) return
    render(index)
  }

