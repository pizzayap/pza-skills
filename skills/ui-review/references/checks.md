# Checks by category

Run these against the rendered component. When the project's own system sets a different value on purpose, the system wins. Note it instead of flagging it.

## UI

| Check | Pass |
| --- | --- |
| Concentric radius | Inner radius = outer radius minus the inset between them. A 12px card with a 4px inset holds an 8px inner element |
| Consistent radius | Siblings of the same kind share one radius |
| Borders and dividers | One border weight and color per level; no double borders where two boxes meet |
| Icon alignment | Icons optically centered with their label; one icon size per row |
| Icon style | One family and stroke weight across the component |
| Shadows | At most one elevation per level; shadows match the light direction used elsewhere |

## Typography

| Check | Pass |
| --- | --- |
| Scale | Every size comes from the type scale |
| Hierarchy | At most 3 visible text levels in one component |
| Headings wrap | `text-wrap: balance` on short headings so lines are even |
| Body wraps | `text-wrap: pretty` on paragraphs so the last line is not one orphan word |
| Line length | 45 to 75 characters for body text |
| Line height | About 1.4 to 1.6 for body text, 1.1 to 1.3 for headings |
| Numbers | `tabular-nums` where numbers change or align in columns |
| Truncation | Truncated text has a way to read the full value |

## Layout

| Check | Pass |
| --- | --- |
| Spacing scale | Every gap and padding is on the spacing scale (often a 4px grid) |
| Proximity | The space between related items is smaller than the space between groups |
| Alignment | Text, icons and controls share left edges and baselines |
| Padding balance | Optical padding looks even; horizontal padding is usually equal to or larger than vertical |
| Flex safety | Text columns in flex rows have `min-width: 0` |

## Color

| Check | Pass |
| --- | --- |
| Body text contrast | At least 4.5:1 against its actual background |
| Large text and UI parts | At least 3:1 (text 24px and up, or 18.66px bold and up; icons, borders of controls, focus rings) |
| Tokens | Colors come from tokens, not raw values |
| Meaning | Status uses color plus an icon or label, never color alone |
| Semantic use | Danger colors only on destructive or error states |
| Dark mode | Checked if the app has one; no pure black on pure white surfaces in dark |

## Writing

| Check | Pass |
| --- | --- |
| Case | One case style for labels and buttons (usually sentence case) |
| Labels | Buttons say what happens ("Delete project", not "OK") |
| Length | Titles fit in one or two lines with realistic content |
| Numbers | Plurals agree ("1 user"); large numbers are formatted for the locale |
| Errors | Each error says what happened and how to recover |
| Terms | One word per concept across the component |

## Accessibility

| Check | Pass |
| --- | --- |
| Hit area | At least 24 by 24px for any control (WCAG 2.2 minimum); 44 by 44px on touch-first products |
| Names | Icon-only buttons have an `aria-label` |
| Focus | Every interactive element shows a visible focus ring with at least 3:1 contrast |
| Keyboard | Every action reachable with Tab, Enter and Space, in visual order |
| Semantics | Headings, lists and buttons use the right elements, not styled divs |
| Zoom | Nothing clips or overlaps at 200% zoom or 320px wide |
| Motion | Any movement respects `prefers-reduced-motion` |
