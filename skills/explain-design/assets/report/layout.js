  // Layout: chooses sheet or stack, sizes the figure, places callouts beside the design and draws their leader lines.
  const GAP = 12
  const fits = () => innerWidth >= 1080 && innerHeight >= 600

  // Runs after every render, filter change and resize. The steps run in this order.
  function layout() {
    const visible = [...nodes.values()].filter((n) => filter === "all" || n.item.kind === filter)
    for (const n of nodes.values()) n.callout.remove()
    lines.replaceChildren()
    for (const n of nodes.values()) {
      if (n.region && !n.thumb) n.region.style.display = visible.includes(n) ? "" : "none"
      n.lead = null
    }

    let stack = chooseMode()
    if (img) sizeImage(stack)
    if (board) fitBoard(stack)
    if (!stack && placeCallouts(visible)) stack = true
    if (stack) stackCallouts(visible)

    drawDimensions()
    if (spec.scrollHeight > spec.clientHeight + 1 && root.getAttribute("data-layout") === "sheet") spec.setAttribute("data-overflow", "")
    else spec.removeAttribute("data-overflow")
  }

  // Sheet or stack, and whether the spec column becomes a drawer. Returns true for stack.
  function chooseMode() {
    root.removeAttribute("data-overflow")
    const stack = !(img || board) || !fits()
    root.setAttribute("data-layout", stack ? "stack" : "sheet")
    // Landscape captures need the width, so the spec moves into a panel.
    const landscape = board ? true : img && img.naturalWidth > img.naturalHeight * 1.1
    sheet.removeAttribute("data-spec-anim")
    if (spec.children.length && landscape) sheet.setAttribute("data-spec", "drawer")
    else sheet.removeAttribute("data-spec")
    return stack
  }

  // Size the image to the space the figure has.
  function sizeImage(stack) {
    img.style.maxHeight = "none"
    img.style.maxWidth = "100%"
    if (!stack) {
      const cap = fig.querySelector("figcaption")
      img.style.maxHeight = Math.max(160, fig.clientHeight - cap.offsetHeight - 14) + "px"
    }
  }

  // Fit the storyboard grid to the figure: pick the column count with the largest thumbnails.
  function fitBoard(stack) {
    const n = thumbs.length, gap = 14, capH = 22, ratio = 10 / 16
    board.style.width = ""
    board.style.gridTemplateColumns = ""
    if (!stack && n) {
      const W = fig.clientWidth, H = fig.clientHeight - figcap.offsetHeight - 14
      let best = { c: 1, tw: 0 }
      for (let c = 1; c <= n; c++) {
        const rows = Math.ceil(n / c)
        const tw = Math.min((W - (c - 1) * gap) / c, ((H - (rows - 1) * gap) / rows - capH) / ratio)
        if (tw > best.tw) best = { c, tw }
      }
      board.style.gridTemplateColumns = `repeat(${best.c}, ${Math.floor(best.tw)}px)`
    }
    // Overview points pin to their section's thumbnail.
    const f = frame.getBoundingClientRect()
    for (const node of nodes.values()) {
      if (!node.thumb || !f.width) continue
      const t = node.thumb.querySelector(".sh-thumb-img").getBoundingClientRect()
      node.rect = [((t.left - f.left) / f.width) * 100, ((t.top - f.top) / f.height) * 100, (t.width / f.width) * 100, (t.height / f.height) * 100]
    }
  }

  // Sheet mode: each callout goes to a side, level with its target. Returns true when a side can't fit.
  function placeCallouts(visible) {
    const side = chooseSides(visible)
    const d = draw.getBoundingClientRect()
    const f = frame.getBoundingClientRect()
    const box = (n) => n.rect && {
      x: f.left - d.left + (n.rect[0] / 100) * f.width,
      y: f.top - d.top + (n.rect[1] / 100) * f.height,
      w: (n.rect[2] / 100) * f.width,
      h: (n.rect[3] / 100) * f.height,
    }
    let overflow = false
    for (const sd of ["left", "right"]) {
      if (placeSide(sd, visible.filter((n) => side.get(n) === sd), d, box)) overflow = true
    }
    return overflow
  }

  // Sides: by target position, then balanced; data may pin a side.
  function chooseSides(visible) {
    const placed = visible.filter((n) => n.rect)
    const side = new Map(placed.map((n) => [n, n.item.side === "left" || n.item.side === "right"
      ? n.item.side
      : n.rect[0] + n.rect[2] / 2 < 50 ? "left" : "right"]))
    const free = placed.filter((n) => !n.item.side)
    const count = (sd) => [...side.values()].filter((v) => v === sd).length
    const centre = (n) => Math.abs(n.rect[0] + n.rect[2] / 2 - 50)
    for (let guard = 0; guard < placed.length; guard++) {
      const heavy = count("left") > count("right") + 1 ? "left" : count("right") > count("left") + 1 ? "right" : null
      if (!heavy) break
      const move = free.filter((n) => side.get(n) === heavy).sort((a, b) => centre(a) - centre(b))[0]
      if (!move) break
      side.set(move, heavy === "left" ? "right" : "left")
    }
    // Unpinned points (no region) go on the shorter side.
    for (const n of visible.filter((v) => !v.rect)) side.set(n, count("left") <= count("right") ? "left" : "right")
    return side
  }

  // One column: callouts in target order, moved apart and kept inside the column. Returns true when it overflows.
  function placeSide(sd, members, d, box) {
    const col = cols[sd]
    const c = col.getBoundingClientRect()
    const group = members
      .map((n) => ({ n, b: box(n) }))
      .sort((a, b) => (a.b ? a.b.y + a.b.h / 2 : 1e9) - (b.b ? b.b.y + b.b.h / 2 : 1e9))
    for (const g of group) {
      g.n.callout.setAttribute("data-side", sd)
      col.append(g.n.callout)
      g.h = g.n.callout.offsetHeight
      // The leader meets the mark, below the tag; offsets are relative to the callout.
      const m = g.n.callout.querySelector(".mark")
      g.head = m.offsetTop + m.offsetHeight / 2
      g.top = g.b ? g.b.y + g.b.h / 2 - (c.top - d.top) - g.head : 0
    }
    // Push down to clear overlaps, then back up to stay inside the column.
    let floor = 0
    for (const g of group) { g.top = Math.max(g.top, floor); floor = g.top + g.h + GAP }
    let ceiling = col.clientHeight
    for (const g of [...group].reverse()) { g.top = Math.min(g.top, ceiling - g.h); ceiling = g.top - GAP }
    // When a side can't fit, record by how much (data-overflow="left:120"), then stack.
    let overflow = false
    if (group.length && group[0].top < 0) {
      overflow = true
      root.setAttribute("data-overflow", `${sd}:${Math.ceil(-group[0].top)}`)
    }
    for (const g of group) {
      g.n.callout.style.top = g.top + "px"
      if (g.b) drawLeader(sd, g, c, d)
    }
    return overflow
  }

  // Leader: a short shoulder off the label, then straight to the target's near edge.
  function drawLeader(sd, g, c, d) {
    const y0 = c.top - d.top + g.top + g.head
    const x0 = sd === "left" ? c.right - d.left + 6 : c.left - d.left - 6
    const x1 = sd === "left" ? x0 + 12 : x0 - 12
    const ax = sd === "left" ? g.b.x : g.b.x + g.b.w
    const ay = Math.min(Math.max(y0, g.b.y + Math.min(4, g.b.h / 2)), g.b.y + g.b.h - Math.min(4, g.b.h / 2))
    const lead = s("g", { class: "lead" })
    lead.append(
      s("path", { class: "leader", d: `M${x0} ${y0}H${x1}L${ax} ${ay}` }),
      s("circle", { class: "dot", cx: ax, cy: ay, r: 2.25 }),
    )
    lines.append(lead)
    g.n.lead = lead
  }

  // Stack mode: every visible callout in one column, numbered marks instead of leader lines.
  function stackCallouts(visible) {
    root.setAttribute("data-layout", "stack")
    lines.replaceChildren()
    if (img) img.style.maxHeight = "70vh"
    if (board) board.style.gridTemplateColumns = ""
    for (const n of visible) {
      n.callout.style.top = ""
      n.callout.removeAttribute("data-side")
      cols.left.append(n.callout)
    }
  }

