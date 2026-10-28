---
name: design-variant
description: >-
  Build three genuinely different designs of one component behind a 1-2-3
  picker on a throwaway page, iterate on any of them by number, then promote the
  one the user picks into the real component. Use when the user says "give me 3
  options", "show me variants of this card", or "explore other layouts for X".
  Not for product states (state-machine), stress tests (edge-case) or a critique
  (ui-review).
user-invocable: true
disable-model-invocation: true
argument-hint: '[component name or path] [what to explore]'
---

# Design variant

This skill does one thing: it turns one component into three real, working alternatives so the designer can flip between them, push on any one, and pick. It does not render product states (that's `state-machine`), stress-test content (that's `edge-case`) or score finished UI (that's `ui-review`).

The agent builds the options. The designer picks. The agent never ranks the variants or chooses a winner on its own.

## Stance

Three variants that differ only in color are one variant. Each option must be a different answer to the same brief, so that choosing between them teaches the designer something.

Two failure modes, and the first is worse:

1. **Three tints of one idea.** Same layout, different accent color or radius. The picker becomes a slot machine.
2. **Three ideas that break the floor.** A variant looks striking but fails contrast or hides a control. A beautiful option the team can't ship wastes the comparison.

## Hard rules

1. **One component per run.** Ask which one if the request spans several.
2. **Pick one primary axis and spread the variants along it.** Choose from the table below. Secondary changes must follow from the axis, never vary on their own.
3. **Same content, same data, same component API.** Every variant takes the same props and renders the same information, so the comparison is fair and the winner drops in.
4. **Use the project's design system.** Variants are built from existing tokens, components and type scale. A variant that needs a new token says so in its note.
5. **Every variant clears the floor.** See the floor below. If a direction only works by breaking it, drop the direction and say why.
6. **Production stays untouched until the user picks.** Variants live in the lab folder. Only the chosen one is promoted.
7. **Iterate one variant at a time.** "Make 2 denser" changes variant 2 only.
8. **One folder, dev only.** The page, fixtures, variant files and tray live in one folder behind a dev-only guard, and production never imports from it. Removal is one delete plus any route registration line.

## Axes

| Axis | What changes | Example spread |
| --- | --- | --- |
| Structure | Grouping, order, columns, where metadata sits | 1: stacked, footer bar · 2: icon tile, inline meta · 3: split card, meta column |
| Density | Spacing and how much fits | 1: comfortable · 2: compact · 3: dense table-like row |
| Emphasis | What gets filled color and weight, what recedes | 1: title-led · 2: status-led · 3: metric-led |
| Type | Scale steps, weight contrast, line length | 1: one size, weight contrast · 2: large title · 3: small caps labels |
| Copy | Labels, tone, how much text | 1: full sentences · 2: terse labels · 3: icon plus count |

If the user names what to explore ("other layouts"), that sets the axis. Otherwise recommend one axis in one line and proceed.

## The floor

Identical for all three variants and never traded against the axis:

- Text contrast at least 4.5:1, large text and icons at least 3:1.
- Every control has an accessible name, a visible focus ring and a hit area of at least 24 by 24px (44px on touch-first products).
- No meaning carried by color alone.
- Nothing clips or overflows at 320px wide or at 200% zoom.
- Truncated text has a way to reach the full value.

## The sequence

### 1. Scope and brief

Restate the component and the goal in one sentence ("Issue card: make severity and impact easier to scan"). **Gate:** if the goal is unclear, ask one question with a recommended answer, then wait.

### 2. Declare the axis and the three positions

Write them before building:

```text
Axis: Structure
1 Stacked: title block, footer bar with severity, users, status
2 Icon tile: colored severity tile on the left, metadata inline under the text
3 Split: text left, metadata in its own right column
```

### 3. Build the page

Create `/lab/design-variant/<component>` per [lab-page.md](references/lab-page.md), from the copied lab kit. Each variant is its own file in the lab folder (`variant-1.tsx`, `variant-2.tsx`, `variant-3.tsx`), rendered on the same stage with the same fixture data. The tray holds the `1 2 3` picker. Variant 1 is the default.

If the component only makes sense in its page (a header, a sidebar), render the variants inside a copy of that page's layout instead of on the stage.

### 4. Check and hand over

Open each variant, check the floor, and hand over the link with one line per variant naming what it bets on. Then stop and wait.

### 5. Iterate on request

Apply each request to the named variant only. Keep a short change log per variant in the report. If the user asks for a fourth direction, add `4` to the picker rather than replacing one.

### 6. Promote the pick

When the user picks, apply the chosen variant to the real component, keeping its props and its callers unchanged. Run the type check or build, open the real page where the component lives, and confirm it renders the same as the lab. Then delete the lab folder and any route line.

## Output

```text
Design variant: <component>
Page: http://<dev-url>/lab/design-variant/<component>
Axis: Structure
1 Stacked: footer bar keeps metadata scannable in long lists
2 Icon tile: severity reads first; costs 48px of width
3 Split: metadata column aligns across rows; needs 560px or more
Keys: 1/2/3 or ←/→ variant · H hide tray
```

## Anti-patterns

- **The tint spread.** Three variants with the same layout and different colors. The tell: the diff between variants is only CSS color values.
- **The secret favorite.** The agent polishes one variant and leaves two rough. The tell: one file is twice as long as the others.
- **The forked API.** A variant adds a new prop so it can work. The tell: the winner can't be promoted without editing its callers.
- **The token drift.** A variant invents `#6b4eff` and `13.5px`. The tell: raw values where the system has tokens.

Inspired by Jakub Krehel's `variant` skill (MIT).
