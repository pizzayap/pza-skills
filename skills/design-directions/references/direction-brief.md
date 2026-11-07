# Direction brief and file formats

## Run folder

```text
design-runs/directions-<screen>-<ddmmmyyyy>/
  run.json              the brief, the axis and the bets (orchestrator)
  system.md             tokens, type, components, real content (orchestrator)
  system-assets/        images and fonts the directions may copy, plus today's capture
  directions/
    1-today-sharpened/
      index.html        the direction, self-contained (subagent)
      direction.json    its bet and trade-off (subagent)
      assets/           local images or fonts it copied (optional)
    2-risk-first/
    3-timeline/
  board.html            built by scripts/build-board.mjs
```

## run.json

```json
{
  "title": "Trip page",
  "brief": "Help Maya see in two seconds whether tonight's Doha connection is at risk.",
  "audience": "Maya, flying SIN → DOH → PRG tonight, checking on her phone and laptop",
  "axis": "emphasis",
  "date": "2026-11-07",
  "mode": "subagents",
  "today": "system-assets/today-1440.png",
  "bets": [
    { "number": 1, "name": "Today, sharpened", "bet": "Keep the panel; the connection status moves to the top" },
    { "number": 2, "name": "Risk first", "bet": "One large verdict with the reason; details fold away" },
    { "number": 3, "name": "Timeline", "bet": "The whole night as one time strip; risk shows where it happens" }
  ]
}
```

`mode` is `subagents` or `one after another`. `today` is optional: a path, relative to the run folder, to a capture of the current screen.

## direction.json

```json
{
  "number": 2,
  "name": "Risk first",
  "bet": "One large verdict with the reason; details fold away.",
  "tradeoff": "Hides the flight details one tap deeper; frequent flyers lose the overview.",
  "steal": "The verdict sentence works in any direction.",
  "needs": "A new 'risk' color role; none exists in tokens.css.",
  "changes": [],
  "issues": []
}
```

Limits the board enforces: `name` up to 32 characters; `bet`, `tradeoff` and `steal` up to 200 characters each. `needs` is optional and lists anything the direction would add to the system. `changes` holds one line per iteration. `issues` holds problems the orchestrator found that are still open.

## Subagent brief

Send this to each subagent, with the angle brackets filled in. Keep it self-contained: the subagent sees nothing else from the conversation.

```text
You are building one design direction for a comparison board. Work only inside
<run-folder>/directions/<n>-<short-name>/. Do not edit any other file, do not read
the other folders under directions/, and do not start other agents.

Screen: <screen>
Goal: <one-sentence brief>
For: <audience>
Axis: <axis>
Your direction: <n> <name>: <bet>
The other directions (stay clearly different from these): <the other bets, one line each>

Read first: <run-folder>/system.md (tokens, type, components, real content).
Images and fonts you may copy into your folder's assets/: <run-folder>/system-assets/.

Make:
1. index.html: one self-contained page. Inline CSS and any small inline JS
   (tabs, toggles, hover). Local assets only, referenced as assets/<file>. No URLs
   that start with http, no CDNs, no frameworks, no build step. It must open
   offline by double click.
2. direction.json, with: number, name (up to 32 characters), bet, tradeoff,
   steal (each up to 200 characters), needs (optional), changes: [], issues: [].

Rules:
- Use the tokens in system.md as CSS custom properties. Add a value only if your
  bet needs it, and name it under "needs".
- Show the real content from system.md. Mark missing copy [needs copy]. Never
  invent metrics, names, reviews or facts.
- Desktop first at 1440 × 900. It must also work at 390px wide with no sideways
  scroll.
- Floor: text contrast at least 4.5:1 (large text and icons 3:1); every control
  has a label or accessible name, a visible focus style and a hit area of at
  least 24 × 24px; no meaning carried by color alone.
- No gradients, glows, purple or small uppercase labels above headings unless
  system.md says the product uses them. Never label anything as AI-generated.
- Make this direction as finished as you would want your favorite to be.

When done, reply with three lines only: the folder path, the bet in one line, and
the trade-off in one line.
```

For an iteration, send the same brief plus:

```text
Change request for direction <n>: <the user's words>. Change only what the request
needs, keep the rest, and add one line describing the change to "changes" in
direction.json.
```
