  // Controls: footer legend, filter, spec toggle, section stepper, keyboard and title block.
  // Foot
  const legendIcon = (kind) => {
    if (kind === "dim") {
      const svg = s("svg", { width: 26, height: 10, viewBox: "0 0 26 10" })
      svg.append(s("path", { d: "M1 0v10M25 0v10M1 5h24M1 5l4-2.5M1 5l4 2.5M25 5l-4-2.5M25 5l-4 2.5", fill: "none", stroke: "currentColor", "stroke-width": 1 }))
      return svg
    }
    return mark({ kind, key: kind === "works" ? "1" : "A" })
  }
  const seg = h("div", { class: "seg caps", role: "group", "aria-label": "Show" })
  let filter = "all"
  for (const [value, label] of [["all", "All"], ["works", "Good design"], ["improve", "Can be improved"]]) {
    seg.append(h("button", {
      type: "button",
      "aria-pressed": value === "all" ? "true" : "false",
      onclick: (event) => {
        filter = value
        for (const b of seg.children) b.setAttribute("aria-pressed", b === event.currentTarget ? "true" : "false")
        layout()
      },
    }, label))
  }
  const toggleSpec = (open = !sheet.hasAttribute("data-spec-open")) => {
    sheet.setAttribute("data-spec-anim", "")
    if (open) sheet.setAttribute("data-spec-open", "")
    else sheet.removeAttribute("data-spec-open")
    specBtn.setAttribute("aria-pressed", open ? "true" : "false")
  }
  const specBtn = h("span", { class: "seg caps spec-btn" },
    h("button", { type: "button", "aria-pressed": "false", "aria-controls": "spec", onclick: () => toggleSpec() }, "Spec  S"))

  // Section stepper: ← and → move between the overview and each section.
  const stepLabel = h("span", { class: "sh-step-label" })
  const stepper = views.length > 1 ? h("div", { class: "sh-steps caps" },
    h("button", { type: "button", class: "sh-step", "aria-label": "Previous section", onclick: () => go(current - 1) }, "←"),
    stepLabel,
    h("button", { type: "button", class: "sh-step", "aria-label": "Next section", onclick: () => go(current + 1) }, "→"),
  ) : null
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea")) return
    if (e.key === "s" || e.key === "S") toggleSpec()
    if (e.key === "Escape") toggleSpec(false)
    if (views.length > 1 && e.key === "ArrowRight") { e.preventDefault(); go(current + 1) }
    if (views.length > 1 && e.key === "ArrowLeft") { e.preventDefault(); go(current - 1) }
  })
  const cell = (label, value) => value ? h("div", {}, h("span", { class: "caps" }, label), h("span", {}, value)) : null
  const href = safeHref(source.href)
  const countWorks = h("span", {}), countImprove = h("span", {})
  const dimLegend = h("span", {}, legendIcon("dim"), "Measured")
  sheet.append(h("footer", { class: "sh-foot" },
    h("div", { class: "sh-legend caps" },
      stepper,
      h("span", {}, legendIcon("works"), countWorks),
      h("span", {}, legendIcon("improve"), countImprove),
      dimLegend,
      seg,
      spec.children.length ? specBtn : null,
    ),
    h("div", { class: "tb" },
      cell("Source", source.label ? (href ? h("a", { href, target: "_blank", rel: "noopener noreferrer" }, source.label) : source.label) : null),
      cell("View", source.viewport),
      cell("Method", source.measured === false ? "≈ Estimated" : "Measured"),
      cell("Date", source.date),
    ),
  ))

