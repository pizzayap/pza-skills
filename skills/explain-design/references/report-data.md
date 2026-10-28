# Report data

The report is [report-template.html](../assets/report-template.html) with one JSON block, `<script type="application/json" id="report-data">`. It renders as one landscape sheet that fits the screen. The design sits in the middle, every point is a callout beside it joined to its element by a leader line, and the type, color and spacing tables run down the right. The renderer inserts every string as text, so page content can't run as code. Inline `` `code` `` in any prose field renders as a small mono chip.

When the window is too small for the sheet (under 1080 × 600), or the callouts on one side don't fit, the report stacks into a scrolling page and shows numbered marks on the design instead of leader lines.

## Shape

Only `title`, `summary`, `works` and `improve` are required. Leave out anything you have nothing real for. The sheet hides empty parts.

```json
{
  "title": "Pro plan pricing card",
  "source": {
    "label": "example.com/pricing",
    "href": "https://example.com/pricing",
    "kind": "Live page",
    "viewport": "1440 × 900",
    "date": "2026-10-28",
    "measured": true
  },
  "idea": "One dark color, used only for the price and the action. Everything else steps back.",
  "audience": "Small-team leads comparing plans, deciding whether Pro is worth paying for.",
  "summary": "One or two sentences: what the design is for and how well it does it.",
  "image": { "alt": "Pricing card for the Pro plan" },
  "works": [
    {
      "title": "Price reads first",
      "region": [12, 18, 49, 9],
      "principle": "Hierarchy",
      "why": "A 2.9× jump over body text makes the price the first thing anyone reads.",
      "evidence": ["44px / 600", "body 15px"]
    },
    {
      "title": "Free trial lowers the ask",
      "region": [14, 78, 72, 9],
      "lens": "behaviour",
      "principle": "Commitment",
      "thought": "Do I have to pay right now?",
      "why": "The button offers a trial, not a purchase, so the first step costs the visitor nothing.",
      "evidence": ["Start free trial", "14 days"]
    }
  ],
  "improve": [
    {
      "title": "Description too faint",
      "region": [14, 30, 72, 8],
      "impact": "High",
      "why": "2.1:1 on white, below the 4.5:1 minimum, on the sentence that says who the plan is for.",
      "fix": "Use the `/ month` gray.",
      "change": { "from": "#b0b0b0 · 2.1:1", "to": "#6b6b6b · 5.3:1" }
    }
  ],
  "dimensions": [
    { "from": [6, 96], "to": [14, 96], "label": "32" }
  ],
  "system": {
    "type": [{ "label": "Price", "size": 44, "weight": 600, "lineHeight": "1.1" }],
    "colors": [{ "value": "#1a1a1a", "role": "Price, button", "contrast": "17.4:1" }],
    "spacing": [{ "value": 8, "use": "Price to `/ month`" }],
    "notes": ["Every gap is a multiple of 8."]
  },
  "motion": [
    {
      "title": "Card hover",
      "trigger": "Pointer enters",
      "duration": 200,
      "easing": "ease-out",
      "ticks": [0, 100, 200],
      "tracks": [{ "label": "lift", "segments": [[0, 200]] }],
      "states": [
        { "label": "rest", "props": [["translateY", "0"], ["shadow", "0 1px 2px"]] },
        { "label": "hover", "props": [["translateY", "-2px"], ["shadow", "0 8px 24px"]] }
      ]
    }
  ]
}
```

## Fields

- **Callout text is short.** `title` is at most 32 characters and renders in tracked capitals. `why` is at most 180 characters, one or two sentences. `build-report.mjs` rejects longer text, because long callouts can't sit beside the design.
- **At most 8 points in total**, so they fit around the design on one sheet.
- `audience`: one line on who is looking and what they came to do. It shows in the notes and frames every behaviour point.
- `lens`: `"craft"` (the default) or `"behaviour"`. Behaviour points explain what the visitor thinks and does.
- `thought`: for behaviour points, what the visitor thinks at that element, first person, at most 90 characters. It renders as a quote above the reason.
- `works[]`: 3 to 6 items, most important first, shown as "Good design". `principle` is a one- or two-word tag. `evidence` is two or three short values.
- `improve[]`: 0 to 5 items, highest impact first, shown as "Can be improved". `impact` is `High` (blocks reading or use), `Medium` (visibly breaks the design's own system) or `Low` (polish). `fix` is a short instruction. `change` gives the from → to value when the fix is a value.
- `side`: optional `"left"` or `"right"` on any point to override automatic placement. By default a point goes to the side its element is on, and the two sides are kept within one of each other.
- `source.measured`: `true` when values came from computed styles or Figma. `false` labels the sheet "≈ Estimated", and every estimated value should start with ≈.
- `image.src`: a path relative to the report, `https://`, or a `data:image/…` URI. `build-report.mjs --image` embeds the file for you.
- `dimensions[]`: optional measured distances drawn on the design as dimension lines with arrowheads. `from` and `to` are `[x, y]` in percent of the image, and `label` is the value, such as `"32"` or `"≈64"`. Use two to four of them for the measurements a strength or improvement depends on. Horizontal and vertical lines read best.
- `system.colors[].value`: hex, `rgb()`, `hsl()` or `oklch()`. Other formats show without a swatch.
- `motion[].ticks` and `segments` are in milliseconds from the trigger. A segment marks when that property is moving. The first and last `states` fill a from and to table.

## The capture

Crop the capture tightly to the subject, with a small margin of about 5% of its size. The sheet scales the image to fit the space between the callout columns, so empty page around a small component makes the component tiny. For a component, capture the element. For a page, capture the viewport, not the full scroll height, unless the report covers the whole page (below).

## Regions

`region` is `[x, y, width, height]` in percent of the captured image, from the top-left. `[0, 0, 100, 100]` pins the whole design. The leader line meets the region's outer edge on the callout's side, so tight boxes give clean lines.

When you capture a live page, convert the element's box against what the capture covers:

```js
// Element capture: area = the captured element's getBoundingClientRect()
// Viewport capture: area = { x: 0, y: 0, w: innerWidth, h: innerHeight }
const region = (el, area) => {
  const r = el.getBoundingClientRect()
  const pct = (v, total) => Math.round((v / total) * 1000) / 10
  return [pct(r.left - area.x, area.w), pct(r.top - area.y, area.h), pct(r.width, area.w), pct(r.height, area.h)]
}
```

For a screenshot, measure the element's pixel box in the image and divide by the image's width and height.

## Whole page

A report on a whole page adds `sections` and `page`. The top-level `works` and `improve` become the overview: each pins to a section by number with `section` instead of `region`. Each section is a view of its own with the same point fields as a single design. Capture steps are in [full-page.md](full-page.md).

```json
{
  "title": "Homeroom home",
  "source": { "href": "https://onhomeroom.com/", "kind": "Live page · full", "viewport": "1440 × 900", "date": "2026-10-28", "measured": true },
  "summary": "A playful pitch in eight chapters with one ask.",
  "overview": "Eight sections, one ask. Click a section or use ← → to walk the page.",
  "page": { "image": { "src": "view/mini.jpg" } },
  "works": [
    { "title": "One ask, everywhere", "section": 7, "lens": "behaviour", "principle": "Consistency", "why": "The waitlist is the only conversion: nav, hero and closing form, always in the same yellow.", "evidence": ["3 entry points"] }
  ],
  "improve": [],
  "sections": [
    {
      "title": "Hero",
      "range": [0, 16.35],
      "image": { "src": "view/s1.jpg", "alt": "Hero" },
      "summary": "The promise, acted out by three illustrated people.",
      "works": [{ "title": "Headline reads first", "region": [35.7, 26.5, 34.9, 15.5], "principle": "Hierarchy", "why": "56px serif, 2.8× the subtitle and the only serif on screen.", "evidence": ["56 / 61.6"] }],
      "improve": []
    }
  ]
}
```

- `sections[]`: in page order. `title` is at most 24 characters. `summary` is one line under the figure. `works` and `improve` are optional per section, at most 8 points between them, with `region` in percent of that section's image.
- `sections[].range`: `[top, bottom]` in percent of the full page height. It draws the section's band on the minimap. Without it the band is left out.
- `page.image`: the full page scaled to about 360px wide, shown as the minimap.
- `overview`: one line under the storyboard.
- Top-level `works` and `improve`: the overview, at most 8 points, each with `section` from 1 to the number of sections. A report needs at least one strength somewhere.
- The report opens on the overview. `#3` in the URL opens section 3.

