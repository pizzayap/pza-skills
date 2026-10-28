# State switcher spec

The switcher is a tool, not part of the design. Build it to this spec and leave it alone.

## Look

- A dark neutral panel (`#1c1c1e` background, `#f5f5f7` text, `rgba(255,255,255,0.08)` active row) docked to the left of the component, 240px wide, 12px radius, 8px inner padding. A dark panel stays visibly separate from the component whether the app is in light or dark mode.
- System font stack (`system-ui, -apple-system, "Segoe UI", sans-serif`), 14px rows, 36px row height, 13px muted group headings with a small arrow icon.
- No project tokens, fonts, colors or theme switching. It looks the same on every project.
- Below 720px viewport width, the panel collapses into a native `<select>` above the component, with `<optgroup>` per group. Render both and toggle with a media or container query so the active state survives a resize.

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
