  // Start: re-layout on resize, image and font load, follow #n in the URL, render the first view.
  let frameId = 0
  const schedule = () => { cancelAnimationFrame(frameId); frameId = requestAnimationFrame(layout) }
  addEventListener("resize", schedule)
  addEventListener("hashchange", () => go(Math.max(0, Math.min(views.length - 1, parseInt(location.hash.slice(1), 10) || 0))))
  if (document.fonts?.ready) document.fonts.ready.then(schedule)
  render(Math.max(0, Math.min(views.length - 1, parseInt(location.hash.slice(1), 10) || 0)))
