# State switcher spec

The switcher is a tool, not part of the design. Copy [state-lab.tsx](../assets/state-lab/state-lab.tsx) and [state-lab.css](../assets/state-lab/state-lab.css) into the lab folder unchanged and render the component through `StateLab`. Do not restyle it or rebuild it by hand. The kit is React 18+ with no other dependencies; on another stack, port it and keep the values below.

## Look

- A dark panel (`#262626`, `#f5f5f5` text, `rgba(255,255,255,0.12)` active row) to the left of the component, 264px wide, 18px radius, 8px padding, with a small notch pointing at the component. It stays visibly separate from the component in light and dark mode.
- System font stack (`system-ui, -apple-system, "Segoe UI", sans-serif`), 15px rows, 44px row height, 14px muted group headings with a small arrow icon.
- The component sits 40px to the right, vertically centred, at its production width, on a `#fafafa` page. Only the panel sets a font; the component keeps the app's own.
- No project tokens, fonts, colors or theme switching. It looks the same on every project.
- Below 720px viewport width, the panel collapses into a native `<select>` above the component, with `<optgroup>` per group. Render both and toggle with a media or container query so the active state survives a resize.

## Screenshots

Capture the panel and component together, never the component alone: `deviceScaleFactor: 2`, clipped to `[data-lab-stage]` with 48px around it.

## Behavior

- The URL is the source of truth: `?state=<slug>`. Every state is a shareable link and survives reload.
- The first state in the list is the default when no param is set.
- `↑`/`↓` and `←`/`→` step through every state in list order, across groups, wrapping at the ends.
- `H` hides and shows the switcher, for clean screenshots and recordings.
- Shortcuts only fire on bare key presses outside text entry: skip the event when Ctrl, Cmd, Alt or Shift is held, when another handler already handled it, or when focus is in a form field or an editable region, so the component under test stays usable.
- Switching is instant (no transition on the component) and keeps the page's scroll position.

## Accessibility

- `<nav aria-label="States">`, each group a `role="group"` labelled by its heading.
- Each state is a `<button type="button" aria-pressed>`. The active one scrolls into view inside the panel.
- Visible focus ring on every button.

## Where the page lives

Put everything in one folder: the page, a `fixtures` file and the switcher.

| Stack | Page location | Dev-only guard |
| --- | --- | --- |
| Next.js App Router | `app/lab/states/<component>/page.tsx` (do not prefix the folder with `_`, which makes it private and unroutable) | `if (process.env.NODE_ENV === "production") notFound()` |
| Next.js Pages Router | `pages/lab/states/<component>.tsx` | Same check in `getServerSideProps` or the component |
| Vite + React Router | `src/lab/states/<component>/` plus one route entry | Register the route only when `import.meta.env.DEV` |
| SvelteKit | `src/routes/lab/states/<component>/+page.svelte` | `import { dev } from "$app/environment"` and `error(404)` when not dev |
| Astro | `src/pages/lab/states/<component>.astro` | `if (import.meta.env.PROD) return Astro.redirect("/404")` |
| Plain HTML | `lab/states/<component>.html` | Not linked from the site; delete before deploy |

If the project already has a sandbox convention (Storybook, Ladle, a `playground` route), say so and ask whether to use it instead.
