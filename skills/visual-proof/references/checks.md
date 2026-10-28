# States and sweep checks

Use this list when planning criteria (step 1) and writing the capture script (step 2). Skip a row only with a one-line reason in the report, for example "no error state: the form has no server call".

## States to capture

| State | How to reach it | Common failure |
| --- | --- | --- |
| Default | Fresh load | Layout shift after fonts or images load |
| Hover | `locator.hover()` (desktop only) | Hover style shows on touch after a tap |
| Focus | Press Tab until the element is focused | No visible focus ring |
| Pressed or active | `page.mouse.down()` on the element, capture, then `up()` | No press feedback |
| Open | Click the trigger for menus, panels, dialogs | Clipped heading, panel off screen at 390 |
| Empty | Route or mock with zero items | Blank area with no message or next step |
| Loading | Delay the request with `page.route` | Spinner jumps, layout collapses then expands |
| Error | Fail the request with `page.route` | Raw error text, no retry |
| Long content | Text 3x the longest realistic value | Overflow, broken wrapping, clipped buttons |
| Disabled | Set the condition that disables it | Looks clickable, or unreadable contrast |

## Sweep

Run each check at both viewports unless the row says otherwise.

| Check | How to prove it | Fails when |
| --- | --- | --- |
| Sideways overflow | `document.documentElement.scrollWidth` vs `innerWidth` | scrollWidth is larger |
| Text clipping | For headings and buttons: `el.scrollWidth > el.clientWidth` with no ellipsis intended | Any clipped label |
| Dark mode | Context with `colorScheme: 'dark'` | A light card, unreadable text, or an image with a white box |
| Keyboard focus | Tab through the screen | A focusable element shows no ring, or order jumps around visually |
| Tap targets (mobile) | Measure with `locator.boundingBox()` | Under 44x44 px for primary actions; under 24x24 px for anything (WCAG 2.2 AA minimum) |
| Safe areas (mobile) | Real device or simulator; in a browser, check fixed bars use `env(safe-area-inset-*)` | Content under the notch or home indicator |
| Reduced motion | Context with `reducedMotion: 'reduce'` | Movement still plays (fades may stay) |
| Contrast | Browser DevTools contrast checker on body text and buttons | Under 4.5:1 for body text, under 3:1 for large text and icons |

## Writing criteria from these

Turn a row into a criterion by naming the state, the viewport and the measurable result:

```text
C3 Primary button at 390x844 is at least 44x44 px.
C4 Error state at both viewports shows a message and a Retry button.
C5 With reduced motion, the panel appears without sliding.
```

A criterion that names no state, size or number ("feels right on mobile") is a note for the human, not a check.
