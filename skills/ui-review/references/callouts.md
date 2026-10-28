# Callout layer spec

Callouts pin each finding to the element it is about, the way a designer marks up a screenshot. Use [callouts.tsx](../assets/lab-kit/callouts.tsx) unchanged as the `overlay` of `LabStage`; it implements everything below.

## Look

- A card per finding: white, 1px `#e8e8e8` border, 16px radius, 16px by 18px padding, 280px wide, a soft shadow.
- Title at 15px, `#1a1a1a`, regular weight. Body at 14px, `#6b6b6b`, line height 1.5. System font stack, with no project tokens.
- A dashed leader line (`1px dashed #c4c4c4`) from the card's near edge to the target element, with a 6px `#9a9a9a` dot at each end. Route it with right-angle elbows.
- In After, a fixed finding gets a small ✓ before its title and the card fades to 60% opacity. An open finding stays at full opacity.

## Placement

1. Show at most 4 findings per view, 2 per side. When there are more, the tray gets a `1 2` page pill and the rest go on the next page. Order findings by severity so page 1 holds the worst.
2. Measure each target with `getBoundingClientRect()` relative to the canvas, corrected for any zoom or transform.
3. Put a callout on the side of the target's centre. If one side gets more than half, move the target nearest the middle to the other side.
4. In each column, sort by the target's top edge and push cards down so they never overlap (16px gap). A card starts level with its target.
5. Cards may hang past the stage edge but never past the window. When there is less than one card plus its 40px gap beside the component, show the findings as a numbered list below it, with matching numbered pins on the targets.
6. Grow the canvas above and below when a column runs past the component, measured from the component so it never grows on its own.
7. Recompute on resize and when switching Before, After or page.

## Targeting

- Target elements by a selector scoped to the rendered component (`[data-lab-root] h3`, `[data-lab-root] button[aria-label="Bookmark"]`). Never add attributes to the component itself.
- If a selector matches more than one element, target the first and say "and 3 more" in the body.

## Keys

`H` hides the tray and the callouts together, for a clean screenshot of the component alone.
