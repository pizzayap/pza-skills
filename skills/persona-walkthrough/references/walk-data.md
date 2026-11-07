# Walk and report files

## Run folder

```text
design-runs/walkthrough-<flow>-<ddmmmyyyy>/
  report.json             flow, issues (orchestrator)
  walks/
    1-first-time/
      walk.json           the walk (walker)
      shots/01.jpg ...    one viewport screenshot per step (walker)
    2-power/
    3-screen-reader/
  report.html             built by scripts/build-report.mjs
```

## walk.json

```json
{
  "persona": "Screen-reader user",
  "who": "Blind, uses a screen reader with the keyboard",
  "moves": "Keyboard only",
  "viewport": "1440 × 900",
  "outcome": "gave up",
  "summary": "Reached the trip panel but could not find the share control by keyboard.",
  "steps": [
    {
      "n": 1,
      "shot": "shots/01.jpg",
      "heard": "link \"Skip to content\"",
      "saw": "",
      "thought": "Good, a skip link.",
      "did": "Pressed Tab",
      "result": "Focus moved to the skip link",
      "friction": "none"
    },
    {
      "n": 2,
      "shot": "shots/02.jpg",
      "heard": "button (no name)",
      "thought": "Three unnamed buttons in a row. I can't tell which one shares.",
      "did": "Tabbed through the panel header",
      "result": "No control announced as share",
      "friction": "stuck",
      "element": "Icon button at the top right of the trip panel",
      "evidence": "Accessibility tree: role button, empty name; the icon is an svg with no title",
      "fix": "Add aria-label=\"Share trip link\" and a visible tooltip on hover and focus"
    }
  ]
}
```

- `outcome`: `completed`, `completed with trouble`, `gave up` or `stopped before a real action`.
- `steps[].n` counts from 1 with no gaps. `friction` is `none`, `slowed` or `stuck`. Slowed and stuck steps need `element`, `evidence` and `fix`.
- `shot` is a path relative to the walk folder: a viewport capture, jpg at about 70% quality (png and webp also work, but make the report large). `heard` is for the screen-reader persona and leaves `saw` empty. Other personas use `saw` and leave `heard` out.

## report.json

```json
{
  "title": "Share tonight's trip with Mom",
  "goal": "From /home, get a link Mom can open on her phone.",
  "app": "Trext web app",
  "start": "http://127.0.0.1:5183/home",
  "date": "2026-11-07",
  "mode": "subagents",
  "notes": ["Copying the link was not tested: the demo disables it"],
  "issues": [
    {
      "title": "Share button has no name",
      "where": "Trip panel header, icon button at the top right",
      "personas": [1, 3],
      "severity": "Blocks",
      "evidence": "Announced as button with no name; the first-time user hovered three icons before finding it",
      "fix": "aria-label \"Share trip link\" plus a visible label at 1440px",
      "steps": ["1.3", "3.2"]
    }
  ]
}
```

- `severity`: `Blocks` (someone could not finish), `Slows` (extra steps, retries or guesses) or `Polish`.
- `personas` lists walk numbers. `steps` uses `<walk>.<step>`, such as `3.4`, and links to that step in the report.
- `notes`: optional lines on what was not walked or not verified, shown under the issues.
- Length limits the builder enforces: goal 200 characters, walk summary 300, evidence 400, fix 240, issue title 90.
- At most 10 issues, ordered by severity, then by how many personas hit them. Use an empty list when nobody got stuck.
