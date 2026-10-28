---
name: edge-case
description: >-
  Stress-test one component by rendering it in every realistic worst case (long
  text, missing data, huge numbers, narrow containers, other languages) on a
  throwaway page with a scenario stepper, then fix what breaks and compare
  Before and After. Use when the user says "break this component", "test the
  edge cases", or "what happens with long names". Not for product states
  (state-machine) or a craft review (ui-review).
user-invocable: true
disable-model-invocation: true
argument-hint: '[component name or path]'
---

# Edge case

This skill does one thing: it feeds one component the worst content real use can throw at it, shows each scenario one at a time, and fixes what visibly breaks. It does not walk through product states such as loading or auth expired (that's `state-machine`), explore new designs (that's `design-variant`) or score typography and color (that's `ui-review`).

Design systems are usually drawn with perfect content: a three-word title, a two-digit count. This page shows what happens on the day a customer pastes a 90-character title.

## Stance

A finding is something you saw break on the page, not something you predict. "The title runs past the card's right edge in Long text" is a finding. "Spacing might feel tight" is not.

Two failure modes, and the first is worse:

1. **Fixing in the fixture.** Shortening the mock text until the card looks fine. The component did not get stronger, the test got weaker.
2. **Testing what cannot happen.** Feeding 10,000 avatars into a field that the API caps at 5. Noise buries the real breaks.

## Hard rules

1. **One component per run.** Ask which one if the request spans several.
2. **Only scenarios production can reach.** Read the props, the data types and any API limits first. Every scenario names what makes it possible ("titles are free text, max 255 characters").
3. **Never edit the component to make a scenario render.** Feed it from outside, through props, providers or a mocked request.
4. **Fixtures are realistic worst cases, not keyboard mashes.** Use a real-sounding long title, a real German compound word, a real 7-digit count. Never "aaaaaaa".
5. **Snapshot before the first fix.** "Before" must be the untouched component. See [lab-page.md](references/lab-page.md#the-before-snapshot).
6. **Fix in the component, and only with the user's yes.** List the breaks, recommend a fix for each, and wait for approval before editing.
7. **Fix the system when the system is the cause.** If the break comes from a shared token or primitive (a `Badge` with no `min-width: 0`), say so and fix it there, after flagging every other place that uses it.

## The sequence

### 1. Scope and read

Restate the component in one sentence: what it accepts, what it renders, where it lives. Read its props and the types behind them.

### 2. Pick the scenarios

Walk the axes below and keep only those the component actually varies on. The full catalog with ready-made fixtures is in [scenarios.md](references/scenarios.md).

| Axis | Keep when the component | Typical scenarios |
| --- | --- | --- |
| Text length | Renders user or API text | Empty, 1 character, long single word, long sentence, multi-line paragraph |
| Language | Ships in more than one locale or shows user names | German compounds, CJK, Arabic or Hebrew (right-to-left), emoji and accents |
| Numbers | Shows counts, money or dates | 0, 1, 999,999+, negative, many decimals, very old or future dates |
| Quantity | Renders a list, tags or avatars | 0 items, 1 item, maximum allowed, one more than fits |
| Missing data | Has optional fields | Each optional field absent, image fails to load, null avatar |
| Container | Can sit in different widths | Narrowest real slot, 320px mobile, widest real slot |
| Environment | Lives in a themed or zoomable app | Dark mode, 200% text zoom, reduced motion |

Write the list before building, plus one line on what you dropped:

```text
Default · Long text · Long single word · No description · 999,999 users · Narrow (280px) · Dark mode · 200% zoom
Dropped: Quantity (renders one item), Language (English-only product)
```

### 3. Build the page

Create `/lab/edge-case/<component>` per [lab-page.md](references/lab-page.md). One scenario on stage at a time, a label pill naming it, `‹` `›` to step, and a Before and After toggle that stays disabled until the first fix lands.

### 4. Look at every scenario

Open the page and step through each scenario. For each break, write what you saw, where, and in which scenario. Take a screenshot of each break if a browser tool is at hand.

**Gate:** if nothing broke, say so, hand over the page and stop. A component that survives is a valid result.

### 5. Propose fixes, then wait

Present one row per break and ask the user to approve:

| # | Scenario | What broke | Proposed fix |
| --- | --- | --- | --- |
| 1 | Long text | Title runs past the card edge and pushes the avatar out | `min-width: 0` on the text column, clamp the title to 1 line with an ellipsis and the full title in `title` |
| 2 | Long text | Footer metadata disappears below the card | Clamp the description to 2 lines so the footer keeps its place |

Load [fix-patterns.md](references/fix-patterns.md) for the standard fix for each kind of break.

### 6. Fix and compare

After approval, take the snapshot, apply the fixes to the real component, and enable Before and After. Step through every scenario again in After to confirm each fix and check that no other scenario got worse.

### 7. Clean up when asked

Delete the lab folder (including the snapshot) and any route line. Run the type check or build.

## Output

```text
Edge case: <component>
Page: http://<dev-url>/lab/edge-case/<component>
Scenarios: 8 · Broke: 3 · Fixed: 3 · System-level: 1 (Badge, used in 6 places)
Keys: ←/→ scenario · B/A before/after · H hide tray
Remove: delete <folder> (+ <route file> line <n>)
```

## Anti-patterns

- **The polite fixture.** "Long text" is 40 characters. The tell: the long-text scenario looks the same as Default.
- **The silent truncation.** Text gets cut with an ellipsis and there is no way to read the rest. The tell: `text-overflow: ellipsis` with no tooltip, title attribute or expand.
- **The local patch.** A `max-width: 180px` fixes this card and breaks the same component everywhere else. The tell: a magic number that only fits the lab's container.
- **The invisible after.** Fixes land but nobody steps through Before and After again. The tell: no After pass in the report.

Inspired by Jakub Krehel's `break` skill (MIT).
