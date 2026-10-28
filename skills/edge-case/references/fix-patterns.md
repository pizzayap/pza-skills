# Fix patterns

These are the standard fixes for the breaks that show up most often. Use the project's existing utilities and tokens where they exist.

| Break | Cause | Fix |
| --- | --- | --- |
| Text pushes siblings out of a flex row | Flex children default to `min-width: auto` | `min-width: 0` on the text column, and `flex-shrink: 0` on icons and avatars |
| One line runs out of the container | No wrapping or truncation | Decide whether to wrap or truncate. To truncate one line, use `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
| Paragraph pushes the footer away | No line limit | `line-clamp: 2` (with the `-webkit-` prefixed fallback) and a fixed footer position |
| Truncated text can't be read | The clamp hides content | Show the full value in a tooltip, `title` attribute or expand control |
| Long URL or word breaks the layout | Nothing breaks inside one word | `overflow-wrap: anywhere` on user content |
| Orphan word on the last line of a heading | Default wrapping | `text-wrap: balance` on headings, `text-wrap: pretty` on body text |
| Number changes shift the layout | Proportional digits | `font-variant-numeric: tabular-nums` |
| Huge counts break a badge | Raw number | Format with the locale (`Intl.NumberFormat`, compact notation: "1.2M") |
| "1 users" | Plural rules not applied | `Intl.PluralRules` or the project's i18n plural helper |
| Empty field leaves a gap or stray separator | Unconditional markup | Render the element only when the value exists, and join separators from real items |
| Broken image icon | No fallback | An `onError` fallback to initials or a neutral placeholder, sized identically |
| Layout mirrors badly in RTL | Physical properties | Logical properties: `margin-inline-start`, `padding-inline`, `inset-inline-end` |
| Content clipped at 200% zoom | Fixed heights in px | `min-height` instead of `height`, and rem-based sizes |
