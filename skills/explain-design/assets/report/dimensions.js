  // Dimension lines with arrowheads and extension ticks, in image percent.
  function drawDimensions() {
    const dims = list(view.dimensions)
    if (!img || !dims.length || filter === "improve") return
    const d = draw.getBoundingClientRect()
    const f = frame.getBoundingClientRect()
    const pt = (p) => [f.left - d.left + (num(list(p)[0]) / 100) * f.width, f.top - d.top + (num(list(p)[1]) / 100) * f.height]
    const g = s("g", { class: "dims" })
    for (const dim of dims) {
      const [x1, y1] = pt(dim.from), [x2, y2] = pt(dim.to)
      const len = Math.hypot(x2 - x1, y2 - y1)
      if (len < 4) continue
      const ux = (x2 - x1) / len, uy = (y2 - y1) / len
      const nx = -uy, ny = ux
      const head = Math.min(5, len / 3)
      const arrow = (x, y, dir) =>
        `M${x + dir * ux * head + nx * head * 0.45} ${y + dir * uy * head + ny * head * 0.45}L${x} ${y}L${x + dir * ux * head - nx * head * 0.45} ${y + dir * uy * head - ny * head * 0.45}`
      g.append(
        s("path", { class: "ext", d: `M${x1 + nx * 5} ${y1 + ny * 5}L${x1 - nx * 5} ${y1 - ny * 5}M${x2 + nx * 5} ${y2 + ny * 5}L${x2 - nx * 5} ${y2 - ny * 5}` }),
        s("path", { class: "dim", d: `M${x1} ${y1}L${x2} ${y2}${arrow(x1, y1, 1)}${arrow(x2, y2, -1)}` }),
      )
      const vertical = Math.abs(uy) > Math.abs(ux)
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      const label = s("text", {
        class: "dim-label",
        x: vertical ? mx - 7 : mx,
        y: vertical ? my : my - 6,
        "text-anchor": "middle",
        "dominant-baseline": vertical ? "central" : "auto",
        transform: vertical ? `rotate(-90 ${mx - 7} ${my})` : null,
      })
      label.textContent = String(dim.label ?? "")
      g.append(label)
    }
    lines.append(g)
  }

