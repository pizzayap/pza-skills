# Lab page spec

The lab page is a throwaway dev page that holds one component and a small control tray. The tray is a tool, not part of the design. Build it to this spec and leave it alone.

## Layout

- A white stage (`#ffffff`, 1px `#e8e8e8` border, 24px radius) centered on a `#fafafa` page, with the component in the middle at its production width.
- A tray pinned to the bottom of the stage: `#fafafa` background, 1px `#e8e8e8` top border, 16px radius, 16px padding. Controls sit centered in it.
- An optional label pill top left of the component ("Default", "Long text") and round prev/next buttons top right, 40px each.
- The tray uses the system font stack (`system-ui, -apple-system, "Segoe UI", sans-serif`) at 15px, neutral greys only, and no project tokens, fonts or theme. It must never be mistaken for the design.

## Controls

| Control | Look | URL param |
| --- | --- | --- |
| Scenario stepper | Label pill plus `‹` `›` round buttons | `?case=<slug>` |
| Before / After | Two-segment pill with icons: `↺ Before` and `↻ After`. Active segment `#f0f0f0` fill and 1px inner border | `?view=before` or `?view=after` |
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
