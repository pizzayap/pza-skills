# Video

[make-video.mjs](../scripts/make-video.mjs) turns the `video` part of `handoff.json` into a 1920 × 1080 MP4. Every frame is a function of time in one HTML page, [video-template.html](../assets/video-template.html), which headless Chrome captures frame by frame for ffmpeg. Changing one caption or one duration changes only that part.

The video is the team update a designer would otherwise record as a screen walkthrough: what changed, why, what it looks like, and what we need. It is not a launch ad and it has no avatar.

## The arc

45 to 90 seconds, 6 to 10 scenes. Put the decision you need in the first half as well as at the end, because many viewers stop early.

| Beat | Scene | Job |
| --- | --- | --- |
| 1 | `title` | What this is and who it's from |
| 2 | `statement` | The problem or goal in one sentence |
| 3–5 | `screen`, `walk`, `compare` | The work, shown in the real prototype |
| 6 | `states` | The states it covers |
| 7 | `list` | What's open and what we need from whom |
| 8 | `end` | Where the details are and who to ask |

## Scenes

Every scene takes `say`: the caption, at most 150 characters, one idea. Scenes size themselves to their caption at about 2.6 words per second plus time to look. Set `duration` (seconds) to override. `**word**` puts one word in the accent color in `headline`, `text`, `sub`, `title` and list items.

| Type | Fields | Shows |
| --- | --- | --- |
| `title` | `headline` (70), `sub` (120), `meta` | Big title, subtitle and a meta line such as "Design update · Sam Lee · 10 Nov 2026" |
| `statement` | `text` (110), `sub` | One large sentence |
| `screen` | `image`, `url`, `focus`, `zoom` | A capture in a plain window, pushing in slowly. With `focus` `[x, y, w, h]` (percent of the image, from the capture's `regions`) it pushes toward that box and outlines it. The zoom stops before the box would leave the frame, so a large box gets a small push |
| `walk` | `url`, `steps[]` with `image`, `click`, `say`, `url` | A click path: the cursor moves to each `click` box (from the manifest's `clicks`), presses, and the next capture follows. Each step has its own caption, and its own `url` for the window bar when the click changes the route |
| `compare` | `before`, `after`, `beforeLabel`, `afterLabel`, `url` | Two captures with a wipe from one to the other, labeled in the bottom corners |
| `states` | `title` (50), `items[]` with `image`, `label` | Up to 8 captures in a grid, lit one at a time. An item without `image` shows a dashed "Not in the prototype yet" box |
| `list` | `title`, `items` (up to 4 strings) | Numbered points that appear one by one |
| `end` | `headline`, `sub`, `meta` | Same layout as `title` |

Top-level fields: `scenes`, `output` (file name without `.mp4`), `accent` (one hex color, default a plain blue; pick the product's primary color if it reads on off-white) and `captions: false` to hide burned-in captions when you supply your own.

```json
"video": {
  "output": "inbox-bulk-actions",
  "accent": "#2f6fed",
  "scenes": [
    { "type": "title", "headline": "Bulk actions in the inbox", "sub": "Archive or move many messages at once", "meta": "Design update · Sam Lee · 10 Nov 2026", "say": "Here's the bulk actions prototype, and two decisions we need." },
    { "type": "statement", "text": "Cleaning up 200 messages takes **200 clicks** today.", "say": "Cleaning up a full inbox takes one click per message today." },
    { "type": "walk", "url": "inbox.app/inbox", "steps": [
      { "image": "walk-1", "click": [2.1, 18.4, 1.6, 2.5], "say": "Tick one message and a selection bar replaces the toolbar." },
      { "image": "walk-2", "click": [40.2, 8.9, 6.1, 3.8], "say": "Shift-click selects a range; Archive clears them all." },
      { "image": "walk-archive", "say": "The list closes the gap in one move." }
    ] },
    { "type": "states", "title": "Every list state", "items": [{ "image": "inbox", "label": "Typical" }, { "image": "inbox-empty", "label": "Empty" }, { "label": "Failed to load" }], "say": "Empty and loading are reached with test data. Failed to load is not in the prototype yet." },
    { "type": "list", "title": "We need from you", "items": ["Confirm above 50 messages?", "Error state for the list"], "say": "Two things are open. Both need an answer this week." },
    { "type": "end", "headline": "Questions to Sam", "sub": "The developer deck has every state and value.", "say": "The deck has the details. Reply in the thread." }
  ]
}
```

## Writing the captions

- Speak to the team: "Home shows both flights", not "Experience a whole new way to travel".
- One idea per caption, one sentence when you can. Say the decision you need plainly: "We need a yes on X by Friday."
- Name the real objects in the product. No "AI-generated" labels, no superlatives, no "Introducing".

## Sound

- Default: no audio track. Captions carry the story.
- `--voice [name]` reads each caption with macOS `say` (default voice Samantha) and stretches scenes to fit. It is scratch quality. Use it to check timing, not for the final cut.
- `--audio file` uses the designer's own recorded voice-over. Add music only if the user asks for it. Record against `captions.srt` or the scene start times that `--sheet-only` prints, then pin `duration`s if the read runs slower.

## Check, then render

```bash
node <skill-dir>/scripts/make-video.mjs handoff/<date>/handoff.json --sheet-only      # 3 stills per scene
node <skill-dir>/scripts/make-video.mjs handoff/<date>/handoff.json --sheet-scene 3   # 12 stills inside scene 3
node <skill-dir>/scripts/make-video.mjs handoff/<date>/handoff.json                   # render
```

Look at the sheet for clipped or overlapping text, focus boxes off their element, a cursor that misses its target, empty frames, and captions that cover what the scene is about. Then render and pull a few frames from the MP4 itself (`ffmpeg -i video.mp4 -vf fps=0.2 frame-%02d.png`) and look at them. The script warns when the total is outside 45 to 90 seconds.

A 64-second video rendered at 1080p in about 30 seconds in testing; slower machines take longer. Outputs, all in `handoff/<date>/video/`: `<output>.mp4`, `video.html` (a live preview: space pauses, arrows step), `captions.srt` and `sheet.png`.
