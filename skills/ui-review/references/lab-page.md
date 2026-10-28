# Lab page spec

The lab page is a throwaway dev page that holds one component and a small control tray. The tray is a tool, not part of the design. Build it to this spec and leave it alone.

## The kit

Copy [lab-kit.tsx](../assets/lab-kit/lab-kit.tsx) and [lab-kit.css](../assets/lab-kit/lab-kit.css) into the lab folder unchanged and build the page from `LabStage`, `CaseBar`, `BeforeAfter` and `Segmented`. The callout layer is [callouts.tsx](../assets/lab-kit/callouts.tsx) with [callouts.css](../assets/lab-kit/callouts.css). Do not restyle the kit or rebuild it by hand: a hand-built tray drifts from this look on every run. The kit is React 18+ with no other dependencies. On another stack, port it and keep the values below.

## Layout

- A `#fafafa` page with a white stage centred on it: 1px `#e8e8e8` border, 28px radius, 8px padding.
- The component sits in the middle of the stage at its production width (`width` on `LabStage`), with 64px of space above and below.
- The tray is an inset box at the bottom of the stage: `#fafafa`, 1px `#e8e8e8` border on all sides, 20px radius, 16px padding, controls centred.
- An optional label pill at the top left of the component ("Default", "Long text") and round prev and next buttons at the top right, 40px each, aligned to the component's edges.
- Only the chrome sets a font: the system stack (`system-ui, -apple-system, "Segoe UI", sans-serif`) at 15px, in neutral greys. The component inherits the app's own font, so it renders as it does in the product. The chrome must never be mistaken for the design.

## Controls

| Control | Look | URL param |
| --- | --- | --- |
| Scenario stepper | Label pill plus `‹` `›` round buttons | `?case=<slug>` |
| Before / After | Two-segment pill with icons: `↺ Before` and `↻ After`. Active segment `#f2f2f2` fill and 1px inner border | `?view=before` or `?view=after` |
| Variant picker | Segmented pill `1 2 3`, 40px square segments | `?v=1` |

The URL is the source of truth, so every view is a shareable link that survives reload.

## Keys

| Key | Action |
| --- | --- |
| `←` / `→` | Previous or next scenario or variant, wrapping at the ends |
| `1` to `9` | Jump to that variant |
| `B` / `A` | Before or After |
| `H` | Hide or show the tray, for clean screenshots |

Shortcuts only fire on bare key presses outside text entry: skip the event when Ctrl, Cmd, Alt or Shift is held, when another handler already handled it, or when focus is in a form field or an editable region.

## Accessibility

- The tray is a `<div role="toolbar" aria-label="Lab controls">`.
- Segments are `<button type="button" aria-pressed>`, with visible focus rings.
- Prev and next buttons carry `aria-label="Previous scenario"` and `aria-label="Next scenario"`.
- Switching is instant and keeps the scroll position.

## Screenshots

Capture the whole stage, never the bare component: `deviceScaleFactor: 2`, clipped to `[data-lab-stage]` with 48px of the page around it. Press `H` first only when the image must show the component alone.

## The before snapshot

When the page offers Before and After, take the snapshot before the first edit:

1. Copy the component file into the lab folder as `before/<Component>.tsx` (or the project's extension).
2. Rewrite its relative imports to the project's path alias so it still resolves.
3. Never edit the snapshot again. "Before" renders the snapshot, and "After" renders the real component.
4. If the component spans several files, snapshot only the files you will change.

## Where the page lives

Put everything in one folder: the page, fixtures, the tray and any snapshot.

| Stack | Page location | Dev-only guard |
| --- | --- | --- |
| Next.js App Router | `app/lab/<skill>/<component>/page.tsx` (no `_` prefix, which makes a folder private and unroutable) | `if (process.env.NODE_ENV === "production") notFound()` |
| Next.js Pages Router | `pages/lab/<skill>/<component>.tsx` | The same check |
| Vite + React Router | `src/lab/<skill>/<component>/` plus one route entry | Register the route only when `import.meta.env.DEV` |
| SvelteKit | `src/routes/lab/<skill>/<component>/+page.svelte` | `dev` from `$app/environment`, else `error(404)` |
| Astro | `src/pages/lab/<skill>/<component>.astro` | Redirect to 404 when `import.meta.env.PROD` |
| Plain HTML | `lab/<skill>/<component>.html` | Not linked; delete before deploy |

In frameworks that split server and client code, make the page client code (`"use client"` in Next.js). Otherwise mock data passed across that split may not arrive, and the page renders blank with no error. If the project already has a sandbox (Storybook, Ladle, a playground route), ask whether to use it instead.
