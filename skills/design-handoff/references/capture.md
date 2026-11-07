# Capture

[capture.mjs](../scripts/capture.mjs) opens the running prototype in headless Chrome, reaches each planned screen and state, waits for motion to settle, and saves one image per shot plus `manifest.json`. The deck and the video read images by shot `id` from that manifest.

```bash
node <skill-dir>/scripts/capture.mjs handoff/<date>/shots.json            # every shot
node <skill-dir>/scripts/capture.mjs handoff/<date>/shots.json --only a,b # redo some
```

## shots.json

```json
{
  "baseUrl": "http://localhost:5173",
  "out": "shots",
  "viewports": { "tablet": { "width": 834, "height": 1112, "scale": 2 } },
  "defaults": { "viewport": "desktop", "reducedMotion": true, "colorScheme": "light", "wait": 300 },
  "shots": [
    { "id": "inbox", "title": "Inbox", "path": "/inbox", "measure": { "list": "[data-testid=list]", "compose": "text=Compose" } },
    { "id": "inbox-phone", "path": "/inbox", "viewport": "phone" },
    { "id": "inbox-loading", "path": "/inbox", "mock": [{ "url": "**/api/messages*", "hold": true }] },
    { "id": "inbox-empty", "path": "/inbox", "mock": [{ "url": "**/api/messages*", "json": [] }] },
    { "id": "inbox-error", "path": "/inbox", "mock": [{ "url": "**/api/messages*", "status": 500, "json": { "error": "Server error" } }] },
    { "id": "compose-open", "path": "/inbox", "steps": [{ "click": "text=Compose" }, { "waitFor": "[role=dialog]" }], "clip": "[role=dialog]" }
  ]
}
```

- `id`: lowercase letters, digits and hyphens, starting with a letter or digit, such as `inbox-empty`. The deck and the video refer to shots by this id.
- `viewport`: `desktop` (1440 × 900) and `phone` (390 × 844 at 2×) are built in. Add others under `viewports`, or give an object such as `{ "width": 320, "height": 700, "scale": 2 }`. The script fails a shot if the page's width does not match.
- `steps`, run in order after the page loads: `click`, `hover`, `fill` (`[selector, text]`), `press` (a key), `waitFor` (a selector), `scroll` (`[x, y]`), `wait` (milliseconds) and `shot` (save an extra image now, named by its value). Selectors are Playwright selectors: CSS, `text=…` or `role=button[name="Save"]`. `text=The arrival` matches the first element that contains those words anywhere, in any case; for a control, prefer its role and name, such as `role=radio[name=/The arrival/]`, or `text="The arrival"` for an exact match.
  - A click or hover waits up to 10 seconds for the element to be visible, enabled and not covered. Add `"force": true` to the step for an element that is covered on purpose or looks inactive but still responds, such as a button under a floating bar. A click that does nothing is a finding: record it rather than forcing it.
  - After each step the page settles for `wait` milliseconds plus running animations. Add `"settle": 800` to a step that starts a longer transition, and a longer one, such as `"settle": 3000`, when the change itself takes more than about 2 seconds to appear.
  - Every `click` and `press` must change the page: the DOM, the URL, a form value, the scroll position or, on a page with a canvas, its pixels, within about 2 seconds. Otherwise the shot fails with what the click landed on, so a capture never claims a state it did not reach. Add `"changes": false` to a step that is meant to change nothing.
  - When a step is meant to reach a specific state, also say which: `"expect": "input[value=arrival]:checked"` fails the shot unless that selector matches after the step. A change somewhere on the page is not proof that the right thing changed; `expect` is.
- `mock`: answers matching requests instead of the server. `hold: true` never answers, so a loading state holds still. `status` with `json` or `body` fakes a response. `abort: true` fails it like a dropped connection. Captures that use it are marked `mocked` in the manifest; give such states status `mock` in the deck.
- `script`: JavaScript run in the page before the capture. Use it only to change text for a content edge case, such as a 90-character name. Captures that use it are marked `injected`. Say so in the note, and never use it to build UI the code does not have.
- `measure`: named selectors whose boxes are saved as `regions` in percent of the image. Use them for note pins in the deck and `focus` boxes in the video instead of guessing positions.
- `clip`: capture one element (with `clipPad` pixels around it). `fullPage: true` captures the full scroll height.
- `format`: `jpeg` (default, keeps the deck small) or `png`.

## Reaching states

Use the shallowest route that the prototype supports, in this order:

1. **The URL.** Query parameters, routes or hash states the prototype already reads (`?m=4`, `/orders/empty`).
2. **The interface.** Clicks, typing and keys, the way a person would get there. Presenter keys and debug toggles count.
3. **A lab page.** Pages made by `state-machine` or `edge-case` under `/lab/`, if they exist.
4. **Mocked requests.** For data fetched over the network: hold it for loading, return `[]` for empty, return a 500 for error.

If none of these reaches a state, the prototype does not have it. Record it with status `missing` in the deck. Do not add a branch to the code to get a picture.

Prototypes that keep their data in local files usually have no loading or error state at all. That is a real finding for engineers: list those states as `missing` with a one-line note.

## Walkthrough captures

For a video `walk` scene, capture a click path as one shot with `shot` steps between the clicks:

```json
{ "id": "walk-share", "path": "/home", "steps": [
  { "shot": "walk-1" }, { "click": "text=SK 238" },
  { "shot": "walk-2" }, { "click": "text=Share" }
] }
```

This saves `walk-1`, `walk-2` and the final `walk-share`. Each click's box is saved in the manifest under `clicks`, in percent of the viewport, with `after` naming the `shot` step taken just before the click (the image the cursor moves over). Copy those boxes into the walk steps' `click` fields so the cursor lands on the real target.

## What the script reports

- `ok <id>` with notes: `mocked`, `injected`, `scrolls sideways` (the page is wider than the viewport), or the number of page errors.
- `same a = b`: two captures are identical. One state is probably not reached, or the screen does not change between them. Find out which before writing the deck.
- `FAIL <id>`: the selector, the page or the viewport check failed. Fix the shot and rerun with `--only`.

Images are saved at the size of the viewport multiplied by its scale. Desktop shots at 1× keep the deck small; phone shots at 2× stay sharp.
