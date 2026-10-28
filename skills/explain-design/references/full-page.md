# Whole page

Use this when the subject is a whole page rather than one screen of it: "review the whole homepage", "the full landing page", or `--page`. The report becomes a walk through the page. An overview shows every section as a thumbnail with the page-level points around it, then one sheet per section, with the full page as a minimap on the left and ← → to step through.

## Capture

1. **Load everything.** Open the page at 1440 × 900 (or 390 × 844 for a mobile-first page). Scroll to the bottom in steps of about 600px, pausing 250ms each, then back to the top. This runs lazy images and scroll-triggered reveals before anything is captured.
2. **Find the sections.** Take the page's top-level blocks in order and keep the ones that are a real chapter: a heading, a change of background or a distinct job (hero, proof, pricing, form, footer). Merge slivers under about 200px into their neighbour. Aim for 4 to 10 sections.
3. **Capture the full page once,** at its full scroll height, then crop one image per section from it at full width. Sections are short and wide, so don't crop them tighter; the sheet fits them.
4. **Make the minimap:** the full capture scaled to 360px wide.
5. **Measure per section.** Collect computed styles and boxes for every element you will discuss, in page coordinates (`getBoundingClientRect()` plus `scrollY`).

```js
// Run in the page after step 1. Lists candidate sections in page coordinates.
(() => {
  let root = document.querySelector("main") || document.body
  // Descend through single-child wrappers to the level where the sections are siblings.
  for (let i = 0; i < 6; i++) {
    const kids = [...root.children].filter((k) => k.getBoundingClientRect().height > 40)
    if (kids.length === 1) root = kids[0]
    else break
  }
  const blocks = [...document.querySelectorAll("header, footer"), ...root.children]
  return [...new Set(blocks)]
    .map((el) => {
      const r = el.getBoundingClientRect()
      return {
        y: Math.round(r.top + scrollY),
        h: Math.round(r.height),
        heading: (el.querySelector("h1, h2, h3")?.innerText || el.innerText || "").trim().slice(0, 60),
        background: getComputedStyle(el).backgroundColor,
      }
    })
    .filter((b) => b.h > 40)
    .sort((a, b) => a.y - b.y)
})()
```

Check the list against the full capture. A section built from absolutely positioned layers, or a sticky header, may need its box set by hand.

## What to say

- **Page-level points go in the overview.** Things only visible across sections: the order of the argument, how many times and where the main action repeats, how color or rhythm marks chapters, what the page never proves. Each pins to the one section that shows it best, by number. Keep it to 2 to 5 points.
- **Section points stay local.** Each section gets 0 to 8 points of its own, pinned to regions on that section's image. A section with nothing worth saying gets a one-line summary and no points.
- **Read it in order, as the visitor.** What does this section answer, and what question does it leave for the next one? Behaviour points carry most of a whole-page review.
- **Total across the report:** about 12 to 30 points. More is a checklist dump.

## Regions in a section

Convert each element's page box against its section's box, not the page:

```js
// box: the element's page box; sec: { y, h } of its section; page width W (1440).
const region = (box, sec, W = 1440) => {
  const pct = (v, total) => Math.round((v / total) * 1000) / 10
  return [pct(box.x, W), pct(box.y - sec.y, sec.h), pct(box.w, W), pct(box.h, sec.h)]
}
```

`range` for each section is `[sec.y / pageHeight * 100, (sec.y + sec.h) / pageHeight * 100]`. The data shape is in [report-data.md](report-data.md#whole-page).
