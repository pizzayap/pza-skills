---
name: ui-review
description: >-
  Review one component's craft across UI, typography, layout, color, writing and
  accessibility, show each finding as a callout pinned to the exact element on a
  throwaway page, then apply approved fixes with a Before and After toggle. Use
  when the user says "review this component", "what's off about this card", or
  "polish this UI". Not for stress tests (edge-case), new designs
  (design-variant) or motion code (review-animations).
user-invocable: true
disable-model-invocation: true
argument-hint: '[component name or path] [--only typography,color,...]'
---

# UI review

This skill does one thing: it inspects one rendered component the way a senior designer would, points at each problem on the component itself, and fixes what the user approves. It does not feed it worst-case content (that's `edge-case`), invent alternatives (that's `design-variant`), walk product states (that's `state-machine`) or review animation code (that's `review-animations`).

## Stance

Default to flagging. Approval is earned. But every finding must point at one element, name a measurable problem and carry a concrete fix. "Feels a bit busy" is not a finding. "Description text is #b4b4b4 on white, 2.1:1, below the 4.5:1 minimum" is.

Two failure modes, and the first is worse:

1. **Reviewing code instead of pixels.** Reading the JSX and guessing. Contrast, wrapping and hit areas must be measured on the rendered component.
2. **Taste dressed as a rule.** Flagging a choice the design system made on purpose. Read the system first, then hold the component to it.

## Hard rules

1. **One component per run.** Ask which one if the request spans several.
2. **Measure on the rendered component.** Use computed styles and `getBoundingClientRect` in the browser, not values read from source.
3. **Hold it to the project's own system first,** then to the universal checks. A component that uses the system's tokens correctly is not wrong because another system would differ.
4. **Every finding has a target, a measurement and a fix.** Target is one element. Measurement is a number or a quote. Fix is a specific change.
5. **Six categories, in a fixed order.** UI, Typography, Layout, Color, Writing, Accessibility. Checks with values are in [checks.md](references/checks.md).
6. **At most 8 callouts on screen.** If there are more findings, show the 8 most severe and list the rest in the report.
7. **Fix only after a yes, in the real component, after a snapshot.** See [lab-page.md](references/lab-page.md#the-before-snapshot).
8. **One folder, dev only.** The page, fixtures, snapshot, callout layer and tray live in one folder behind a dev-only guard, and production never imports from it. Removal is one delete plus any route registration line.

## The sequence

### 1. Scope and read the system

Restate the component in one sentence. Find the design tokens, type scale, spacing scale and any design guidelines file the project has. Note them in one line each.

### 2. Build the page

Create `/lab/ui-review/<component>` per [lab-page.md](references/lab-page.md). Render the real component with realistic mock data, at its production width, on the stage. Add the callout layer described in [callouts.md](references/callouts.md). The Before and After toggle stays disabled until fixes land.

### 3. Inspect and measure

Walk the six categories in order against the rendered component. For each candidate finding, measure it. Drop anything you can't measure or point at.

**Gate:** if nothing survives, say "No findings" with the categories checked, hand over the page and stop.

### 4. Pin the callouts and report

Each finding becomes a callout: a short title (2 to 3 words) and one sentence, connected to its element with a dashed leader line. Then present the table:

| # | Category | Element | Problem | Fix | Severity |
| --- | --- | --- | --- | --- | --- |
| 1 | Color | Description | `#b4b4b4` on `#fff` is 2.1:1, below 4.5:1 | Use `--text-secondary` (`#6b6b6b`, 5.3:1) | High |
| 2 | Accessibility | Bookmark button | Hit area 16 by 16px, below 24 by 24px | 32px button with the 16px icon centered | High |
| 3 | Typography | Title | Last line holds one orphan word ("code") | `text-wrap: balance` | Low |
| 4 | UI | Footer bar | Inner radius 12px inside a 12px card with 4px inset | Inner radius 8px (outer 12 minus inset 4) | Medium |

Severity is High when it blocks someone from reading or using it, Medium when it visibly breaks the system, and Low when it is polish. Ask the user which rows to fix, recommending all High and Medium.

### 5. Fix and compare

Snapshot the component, apply the approved fixes to the real component, and enable Before and After. In After, each fixed callout shows a ✓ and stays pinned so the user can see what changed. Re-measure every fixed finding and confirm the number now passes.

### 6. Clean up when asked

Delete the lab folder (including the snapshot) and any route line. Run the type check or build.

## Output

```text
UI review: <component>
Page: http://<dev-url>/lab/ui-review/<component>
System: tokens in <file>, type scale 12/14/16/20, spacing 4px grid
Findings: 6 (High 2 · Medium 2 · Low 2) · Fixed: 4 · Open: 2
Keys: B/A before/after · H hide tray and callouts
Remove: delete <folder> (+ <route file> line <n>)
```

## Anti-patterns

- **The vibe finding.** "Could use more breathing room." The tell: no number and no element.
- **The source-code guess.** Contrast computed from a hex in the CSS file while a parent sets opacity 0.6. The tell: no computed-style measurement.
- **The callout storm.** 20 callouts cover the component. The tell: callouts overlap or the component is hard to see.
- **The system override.** The fix replaces a token with a raw value. The tell: `#6b6b6b` in the diff where `--text-secondary` exists.

Inspired by Jakub Krehel's `interface-review` skill (MIT).
