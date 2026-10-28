# Callout layer spec

Callouts pin each finding to the element it is about, the way a designer marks up a screenshot.

## Look

- A card per finding: white, 1px `#e8e8e8` border, 16px radius, 16px padding, max 340px wide, a soft shadow (`0 1px 2px rgba(0,0,0,0.04)`).
- Title at 15px, `#1a1a1a`, regular weight. Body at 14px, `#6b6b6b`, line height 1.5. System font stack, with no project tokens.
- A dashed leader line (`1px dashed #c4c4c4`) from the card's near edge to the target element, with a 6px `#9a9a9a` dot at each end. Route it with right-angle elbows.
- In After, a fixed finding gets a small ✓ before its title and the card fades to 60% opacity. An open finding stays at full opacity.

## Placement

1. Measure each target with `getBoundingClientRect()` relative to the stage.
2. Put a callout on the left when the target's center is left of the component's center, otherwise on the right.
3. In each column, sort callouts by the target's top edge, then push them down so they never overlap (16px gap).
4. Recompute on resize and when switching Before and After. Use a `ResizeObserver` on the component.
5. Leave at least 120px of free space on each side of the component. If the viewport is narrower than component width + 2 × 360px, stack callouts below the component as a numbered list, with matching numbered dots on the targets.

## Targeting

- Target elements by a selector scoped to the rendered component (`[data-lab-root] h3`, `[data-lab-root] button[aria-label="Bookmark"]`). Never add attributes to the component itself.
- If a selector matches more than one element, target the first and say "and 3 more" in the body.

## Keys

`H` hides the tray and the callouts together, for a clean screenshot of the component alone.
