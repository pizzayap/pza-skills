# Handoff data

`handoff.json` holds everything the deck says. [build-deck.mjs](../scripts/build-deck.mjs) checks it, embeds the captures and writes `deck.html` from [deck-template.html](../assets/deck-template.html). Every string renders as text, and `` `code` `` in any prose field renders in a mono font. Leave out any section you have nothing real for; the deck skips it.

## The deck it builds

1. Cover: project, what changed, designer, date, branch, prototype URL, design rules file.
2. What's built: built, not built yet, how to run it.
3. Screens: a grid of every screen, then one slide per screen with numbered pins, notes and "Done when" checks.
4. Every state: a coverage table (groups by kind), then the captures for each group.
5. Edge cases: capture, scenario, what happens, result.
6. Tokens: colors, then type, spacing, radii and motion.
7. Components, interactions and motion, what's mocked, what's left.
8. Open questions, each with a recommendation and who decides.
9. Where things are: the files an engineer opens first.

Keys in the deck: ← → to move, G for all slides, click a capture to enlarge it, P to print or save as PDF.

## Shape

```json
{
  "project": {
    "name": "Inbox",
    "title": "Bulk actions for the inbox",
    "summary": "Select many messages at once and archive, mark read or move them.",
    "author": "Sam Lee",
    "date": "10 Nov 2026",
    "branch": "bulk-actions",
    "url": "http://localhost:5173/inbox",
    "designDoc": "DESIGN.md",
    "repo": "inbox-prototype",
    "run": ["npm install", "npm run dev"]
  },
  "built": ["Select with checkboxes or Shift-click", "Archive, Mark read and Move for the selection"],
  "notBuilt": ["Undo after archive", "Keyboard shortcuts"],
  "screens": [
    {
      "title": "Inbox with a selection",
      "route": "/inbox",
      "shot": "inbox-selected",
      "summary": "A bar replaces the toolbar while anything is selected.",
      "notes": [{ "text": "The bar counts the selection and offers three actions.", "region": [0, 8.2, 100, 6.1] }],
      "done": ["Shift-click selects a range", "Esc clears the selection"]
    }
  ],
  "states": [
    {
      "group": "Message list",
      "source": "src/routes/inbox/MessageList.tsx",
      "states": [
        { "name": "Typical", "kind": "default", "shot": "inbox", "status": "built" },
        { "name": "Loading", "kind": "loading", "shot": "inbox-loading", "status": "mock", "note": "Request held open in the capture." },
        { "name": "No messages", "kind": "empty", "shot": "inbox-empty", "status": "mock", "note": "Empty list returned by a mocked request." },
        { "name": "Failed to load", "kind": "error", "status": "missing", "note": "The list shows nothing when the request fails." }
      ]
    }
  ],
  "edgeCases": [
    { "scenario": "A 120-character subject", "shot": "edge-long-subject", "result": "handled", "note": "Test text injected. Clamps to one line with an ellipsis." }
  ],
  "tokens": {
    "source": "DESIGN.md",
    "colors": [{ "name": "--color-accent", "value": "#2f6fed", "use": "Primary buttons" }],
    "type": [{ "name": "Body", "size": 15, "weight": 400, "lineHeight": "22px" }],
    "spacing": [{ "name": "--space-2", "value": "8px" }],
    "radii": [{ "name": "--radius-md", "value": "8px" }],
    "motion": [{ "name": "Bar in", "value": "200ms", "use": "ease-out" }],
    "notes": ["Every gap is a multiple of 4."]
  },
  "components": [{ "name": "SelectionBar", "status": "new", "file": "src/components/SelectionBar.tsx", "note": "Replaces Toolbar while selecting" }],
  "interactions": [{ "trigger": "Select the first message", "result": "Selection bar slides down over the toolbar", "timing": "200 ms ease-out" }],
  "mocks": [{ "what": "Messages", "where": "src/data/messages.ts", "replaceWith": "GET /api/messages" }],
  "left": [{ "item": "Error state for the list", "detail": "No design yet", "blocking": true }],
  "questions": [{ "question": "Should Archive ask for confirmation above 50 messages?", "recommendation": "No; offer Undo for 10 seconds instead", "owner": "Design" }],
  "files": [{ "path": "src/components/SelectionBar.tsx", "note": "The new bar" }],
  "video": { "scenes": [] }
}
```

## Fields and limits

The build fails on a broken rule and prints a `warn:` line for a gap. Fix both.

- `project.name` (60 characters) and `project.summary` (280) are required. `title` is at most 90.
- `screens[]`: at least one. `title` at most 60, `summary` at most 220. `shot` is a capture id from the manifest, or an image path relative to `handoff.json`. Up to 5 `notes`, each at most 120 characters, with an optional `region` `[x, y, w, h]` in percent of the image, taken from the capture's `regions`. Up to 4 `done` checks of at most 90 characters: observable results an engineer can test. The summary, notes and checks together fit about 760 characters beside the capture; the build fails above that.
- `states[]`: groups by screen or component, with the file the states come from in `source`. Each state has `name`, `kind` and `status`:
  - `kind` is a short word. Use `default`, `empty`, `loading`, `error` and `partial` for data, and the product's own words for the rest, such as `warning`, `success`, `locked` or `offline`. Each kind becomes a column in the coverage table, so use at most eight kinds; the build fails above that. Put related states under one kind, such as every trip moment as `moment`. Groups past eight are split across slides.
  - `status`: `built` (reached in the prototype), `mock` (reached only with mocked requests or injected content), `missing` (no branch in the code) or `na` (not needed; say why in `note`).
  - Every group needs `empty`, `loading` and `error` rows, or the build warns.
  - `name` is at most 28 characters and `note` at most 100.
- `edgeCases[]`: `result` is `handled`, `breaks` or `untested`.
- `tokens`: only the tokens the built screens use, at most 16 colors. Name the file in `source`. A color's `value` is the resolved color the swatch shows, such as `#2f6fed`. When the file defines it as an alias (`var(--blue-600)`), follow the alias to its value and put the alias in `use`: "Primary buttons · = `--blue-600`". Other values are copied as written in the file.
- `components[].status`: `new`, `changed` or `existing`.
- `left[]`: everything not done. `blocking: true` means it must be settled before engineering can finish.
- `questions[]`: `question` at most 160 characters, phrased so the owner can answer it in one line. Always give a `recommendation` and an `owner` (a role or a name).
- `video`: the storyboard. It is not shown in the deck; see [video.md](video.md).

## Writing the copy

- Write what the screen does and what the engineer must build: "The ticket opens the Flight screen", not "A delightful entry point".
- One idea per note. Numbers and file paths beat adjectives.
- "Done when" lines are checks someone can run: "Esc clears the selection", not "Works well".
- Say what is fake: mocked data, fixed clocks, hard-coded people. Engineers need this list more than any other.
- Never label anything "AI-generated" and never use eyebrow labels over titles.
