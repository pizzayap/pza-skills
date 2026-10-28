# Lenses

There are two sets. **Craft** (1 to 8) explains how the design looks and why that reads well. **Behaviour** (9 to 15) explains what a person thinks and does in front of it, and why that helps or hurts what the design is for. Walk craft first, then behaviour. A good report mixes both: the strongest points usually connect the two, such as a visual choice that changes what someone does.

Each lens lists what to look at, the principle that makes it work, and how to measure it. When the design's own system sets a value on purpose, the system wins. Explain the choice instead of flagging it.

# Craft

## 1. Hierarchy

| Look at | Works when | Measure |
| --- | --- | --- |
| Reading order | The eye lands on the most important thing first, then the next | Rank elements by size × weight × contrast; compare with what the design is for |
| Size jumps | Levels differ enough to read as different (usually 1.25× or more) | Ratio of adjacent font sizes |
| Emphasis budget | One primary action per view; bold and color are used sparingly | Count filled buttons, accent colors and bold runs |

## 2. Typography

| Look at | Works when | Measure |
| --- | --- | --- |
| Scale | Sizes come from one scale with a steady ratio | List every size; compute ratios between steps |
| Line length | Body text runs 45 to 75 characters | Characters per line on the widest paragraph |
| Line height | About 1.4 to 1.6 for body, 1.1 to 1.3 for headings | `line-height` ÷ `font-size` |
| Tracking | Large headings are tightened slightly; small caps and labels are opened up | `letter-spacing` |
| Pairing | At most two families, each with a clear job | `font-family` per level |
| Wrapping | Headings break evenly; paragraphs avoid one-word last lines | Look at the captured lines |

## 3. Layout and spacing

| Look at | Works when | Measure |
| --- | --- | --- |
| Spacing step | Gaps and padding sit on one step, often 4px or 8px | List gaps; check they divide by the step |
| Proximity | Space inside a group is smaller than space between groups | Ratio of between-group to within-group gap (1.5× or more reads clearly) |
| Alignment | Text, icons and controls share edges and baselines | Compare `left` edges and baselines of stacked elements |
| Grid | Columns and gutters repeat | Column widths and gutters across sections |
| Density | Whitespace matches the job, generous for marketing, tighter for tools | Content area ÷ total area, judged against the purpose |

## 4. Color and contrast

| Look at | Works when | Measure |
| --- | --- | --- |
| Roles | Each color has one job (text, muted text, surface, line, accent, status) | Map every color to a role |
| Restraint | The accent marks only what matters | Count accent uses per view |
| Contrast | Body text 4.5:1 or more; large text and controls 3:1 or more | Contrast ratio against the actual background |
| Meaning | Status pairs color with an icon or word | Check each status element |

## 5. Consistency

| Look at | Works when | Measure |
| --- | --- | --- |
| Repetition | Like things look alike: one radius, one border, one icon style per level | Compare siblings |
| Concentric radius | Inner radius = outer radius minus the inset | Radii and padding of nested boxes |
| Elevation | Shadows and borders follow one light direction and a few levels | List shadows |

## 6. Content and writing

| Look at | Works when | Measure |
| --- | --- | --- |
| Labels | Buttons say what happens | Quote them |
| Scannability | Headings and first words carry the meaning | Read only headings and first words |
| Tone | One voice and one case style | Quote examples |

## 7. Interaction and motion

| Look at | Works when | Measure |
| --- | --- | --- |
| Feedback | Every action answers within about 100ms | Hover, press and focus states |
| Purpose | Motion explains a change (where it came from, what replaced what) | What moves and why |
| Timing | UI transitions run 150 to 300ms with an ease-out or a spring without overshoot | `transition`, `animation`, `document.getAnimations()` |
| Restraint | Reduced motion is respected | `prefers-reduced-motion` rules |

For motion, record the properties that change, their start and end values, the duration and easing, and what triggers them. These fill the report's motion timeline.

## 8. Accessibility

| Look at | Works when | Measure |
| --- | --- | --- |
| Hit areas | Controls are at least 24 × 24px, or 44 × 44px for touch | Bounding boxes |
| Focus | A visible focus ring with 3:1 contrast | Tab through |
| Structure | Real headings, lists and buttons | Element names in the DOM |

# Behaviour

Start by writing down who is looking and what they came to do (the `audience` line). Then read the design as that person, top to bottom, and note what they would think at each step. Every behaviour point still needs a visible element and countable evidence. The principle explains the effect; it is never the evidence.

Effects are hypotheses. Say "likely", "makes it easier to" or "asks the visitor to", never a conversion number, unless the user supplied real data. Name only well-known principles, and don't stretch one to fit.

## 9. Value and clarity

| Look at | Works when | Measure |
| --- | --- | --- |
| Five-second read | Someone can say what this is, who it's for and what to do next after five seconds | Quote the headline and subtitle; list the nouns that name the product |
| Specificity | The promise names concrete things, not categories ("border beams and thinking orbs", not "next-gen UI") | Count concrete nouns in the headline and subtitle |
| Message match | The page's own words agree (headline, nav, title tag, buttons) | Quote each; note clearer wording used elsewhere on the page |

## 10. Choice and cognitive load

| Look at | Works when | Measure |
| --- | --- | --- |
| Hick's law | Few options at each decision, with one clearly first | Count actions in the first view |
| Choice overload | Plans, filters and menus are grouped or defaulted | Count options per group |
| Recognition over recall | Options are visible and labelled, not hidden behind hover or icons alone | Count unlabelled controls |

## 11. Trust and proof

| Look at | Works when | Measure |
| --- | --- | --- |
| Social proof | Evidence that others use it sits near the claim or decision it supports | Count logos, users, reviews and stars; note the distance to the main action |
| Authority | Known names, credentials or press back the claim | Quote them |
| Specific numbers | Precise figures read as measured; round ones read as marketing | Quote the number |
| Transparency | Price, limits and what happens next are visible before commitment | Is pricing one click away? Is the commitment stated? |

## 12. Motivation and persuasion

| Look at | Works when | Measure |
| --- | --- | --- |
| Anchoring | The first number seen frames the rest (price tiers, savings) | Order of prices |
| Default effect | The recommended choice is preselected or visually first | Which option is styled as primary |
| Loss aversion and scarcity | Used honestly: real limits, real deadlines | Quote the claim; is it verifiable? |
| Reciprocity | Something useful is given before anything is asked | What is free before signup |
| Curiosity gap | The design shows enough to make the next click tempting | What is teased and how to see more |

## 13. Friction and commitment

| Look at | Works when | Measure |
| --- | --- | --- |
| Low-commitment entry | A small first step exists before the big ask (browse, try, preview) | List entry actions and what each costs the visitor |
| Effort | Fields, steps and decisions before value are as few as possible | Count them |
| Foot in the door | Early steps are easy and lead to bigger ones | Order of asks |

## 14. Attention and guidance

| Look at | Works when | Measure |
| --- | --- | --- |
| Von Restorff | The one thing that should stand out is the only thing that differs | Count elements sharing the accent |
| Visual cues | Layout, lines and gaze lead to the action | What points at the main action |
| Serial position | The most important items sit first or last in lists | Position of key items |

## 15. Feedback and expectation

| Look at | Works when | Measure |
| --- | --- | --- |
| Affordance | Clickable things look clickable before hover | Compare rest and hover states |
| Goal gradient | Progress is visible, and it speeds people up near the end | Steps shown, progress indicators |
| Labour illusion | Visible work makes waits feel worth it | Loading and processing states |
| Peak-end | The best moment and the last moment are designed | What happens right after the main action |

# Writing points

- **Thought:** for behaviour points, one short first-person line for what the visitor thinks at that moment, under 90 characters: "Is anyone actually using this?" Write it as a visitor would say it, not as a designer.
- **Strength:** `<element> <does what> (<evidence>), so <effect on the reader>.` Example: "Feature rows sit 12px apart inside a group and 32px between groups (2.7×), so the list reads as three clusters, not ten lines."
- **Improvement:** `<element> <problem> (<evidence>). <why it matters>. Fix: <change, from → to>.` Example: "Plan description is #b0b0b0 on white (2.1:1). Many readers can't read it in daylight. Fix: #6b6b6b (5.3:1)."
- **Behaviour point:** `<element> <does what> (<evidence>), so the visitor <likely effect>.` Example: "10,658,250 installs sits above the headline, so the claim arrives already backed by numbers."
- **Principle tags:** use short names. Craft: Hierarchy, Type scale, Rhythm, Proximity, Alignment, Contrast, Restraint, Consistency, Accessibility. Behaviour: Clarity, Hick's law, Social proof, Authority, Anchoring, Default effect, Curiosity gap, Reciprocity, Commitment, Von Restorff, Affordance, Goal gradient, Peak-end.

## Measuring a live page

Run in the page through the browser tool. Collect styles for the elements you discuss:

```js
const pick = (sel) => {
  const el = document.querySelector(sel)
  const s = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  return {
    sel, font: `${s.fontSize} / ${s.lineHeight} · ${s.fontWeight} · ${s.fontFamily.split(",")[0]}`,
    letterSpacing: s.letterSpacing, color: s.color, background: s.backgroundColor,
    padding: s.padding, gap: s.gap, radius: s.borderRadius,
    rect: { x: r.left, y: r.top, w: r.width, h: r.height },
  }
}
```

Every distinct font size and color on the page, to read the system:

```js
const counts = (prop) => {
  const m = new Map()
  for (const el of document.querySelectorAll("body *")) {
    if (!el.getClientRects().length) continue
    const v = getComputedStyle(el)[prop]
    m.set(v, (m.get(v) || 0) + 1)
  }
  return [...m].sort((a, b) => b[1] - a[1])
}
counts("fontSize"); counts("color"); counts("backgroundColor")
```

Running animations, for the motion section:

```js
document.getAnimations().map((a) => ({
  target: a.effect?.target?.tagName,
  keyframes: a.effect?.getKeyframes(),
  timing: a.effect?.getComputedTiming(),
}))
```

Converting a box into a report region is covered in [report-data.md](report-data.md#regions).
