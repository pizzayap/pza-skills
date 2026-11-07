# Video

[make-video.mjs](../scripts/make-video.mjs) turns the `video` part of `handoff.json` into a 1920 × 1080 MP4 with Remotion. The scenes are React components in [video/](../video/scenes.jsx): warm paper, ink type, one accent color, real captures in a plain browser window, a camera that pushes in on the part being discussed, and a cursor that clicks through flows. The script times every scene to its narration line, renders, and adds the voice.

The video is the team update a designer would otherwise give in a meeting. It tells a story in five acts, not a tour of screens. It is not a launch ad and it has no avatar.

## The story

| Act (`act`) | Shown as | Job | Typical scenes |
| --- | --- | --- | --- |
| — | `title` | Say what the product is and how far along this is ("a clickable prototype") | `title` |
| `problem` | The problem | Who has the problem, and what it costs them today. Introduce every person before naming them | 1–2 `statement` |
| `built` | What we built | The answer, in one capture | `reveal` |
| `how` | How it works | The key flow, then the states that matter, then the one clever detail | `walk`, `reveal`, `states`, `zoom`, `compare` |
| `left` | What's left | What is not done, with what blocks the build first | `checklist` |
| `ask` | What we need | Each decision said aloud, with who decides | `ask` |
| — | `end` | Who to ask and where the deck is | `end` |

The act bar across the top shows where the viewer is. Keep the acts in this order; the script warns when one is missing or out of order. Aim for 45 to 90 seconds and 8 to 12 scenes.

These came from a non-designer watching an early cut. Each one fixed a place where they got lost:

- **Say what it is first.** "This is a clickable prototype of Trext on the web, our trip tracker", not just the product name. Viewers who don't know it's a prototype read "what's left" as a contradiction.
- **Introduce people before using their names.** "Her mum, and Tomáš, who's picking her up", not "Mum and Tomáš".
- **Close the loop.** If the problem is someone else's, show their side solved, for example the page Mum opens.
- **In a walk, each caption names what the cursor clicks next.** "The flight has a Share button", then the cursor goes to Share.
- **Say every ask out loud**, with who decides and why it matters. Give a deadline only when the handoff data has one.
- **Plain words over design terms.** "What people see when data is missing, slow or failing" instead of "empty, loading and error states".
- **Pick states that look different.** A state that renders the same as another is a finding for the deck, not a beat for the video.
- **Cut screens that answer nothing.** Each scene answers one of: what is it, why, how does it work, what's left, what do you need.

## Scenes

Every scene has `act` (except `title` and `end`) and `say`: the narration and caption, at most 150 characters, one idea. A scene with several beats, steps or asks takes one `say` on each instead. `**word**` sets one phrase in the accent serif in `headline`, `text`, `sub` and `title`. Images are shot ids from the capture manifest.

| Type | Fields | Shows |
| --- | --- | --- |
| `title`, `end` | `headline` (70), `sub` (120), `meta` | Large title, a subtitle and a meta line such as "Design update · Sam Lee · 10 Nov 2026", or the deck path at the end |
| `statement` | `text` (110), `sub` | One large sentence, word by word |
| `reveal` | `image`, `url`, `headline` (60) | A headline, then the capture rises into a browser window and pushes in |
| `zoom` | `image`, `url`, `beats[]` with `focus`, `say`, optional `zoom` | One capture; for each beat the camera moves to the `focus` box (`[x, y, w, h]` in percent, from the capture's `regions`) and outlines it |
| `walk` | `url`, `steps[]` with `image`, `click`, `say`, optional `url` | A click path. On each step the cursor travels to `click` (from the manifest's `clicks`), clicks at the end of the line, and the next capture cuts in |
| `compare` | `before`, `after`, `beforeLabel`, `afterLabel`, `url` | Two windows side by side, then the eye moves to "after" |
| `states` | `title` (50), `items[]` with `image`, `label` (28), `status`, `url` | A list of states beside one large window that cuts from state to state. Up to 6. An item without `image` shows "Not in the prototype yet"; `status: "mock"` shows "With test data" |
| `checklist` | `title` (50), `items[]` with `text` (60), `detail` (80), `status` | Rows that appear one by one: `done` ✓, `open` ○, `blocking` ! with "Blocks build". Up to 5 |
| `ask` | `title` (50), `items[]` with `ask` (90), `who`, optional `by`, `say` | Up to 3 decisions as cards, each appearing as its line is spoken |

Top level: `scenes`, `output` (file name without `.mp4`), `accent` (one hex color, default a plain blue; use the product's primary color if it reads on off-white), `presenter` (a name tag on the cursor; leave it out unless the team knows the name) and `captions: false` to hide burned-in captions when you supply a captioned track.

```json
"video": {
  "output": "inbox-bulk-actions",
  "accent": "#2f6fed",
  "scenes": [
    { "type": "title", "headline": "Bulk actions", "sub": "A clickable prototype for the Inbox web app", "meta": "Design update · Sam Lee · 10 Nov 2026", "say": "Here's a clickable prototype of bulk actions for the inbox." },
    { "act": "problem", "type": "statement", "text": "Cleaning up a full inbox takes **one click per message**.", "say": "Today, support agents clear a full inbox one message at a time." },
    { "act": "built", "type": "reveal", "image": "inbox-selected", "url": "inbox.app/inbox", "headline": "Select many, act once", "say": "So now you can select many messages and act on them at once." },
    { "act": "how", "type": "walk", "url": "inbox.app/inbox", "steps": [
      { "image": "walk-1", "click": [2.1, 18.4, 1.6, 2.5], "say": "Tick a message, and a selection bar replaces the toolbar." },
      { "image": "walk-2", "click": [40.2, 8.9, 6.1, 3.8], "say": "The bar has Archive, Mark read and Move." },
      { "image": "walk-archive", "say": "Archive clears them all, and the list closes the gap." }
    ] },
    { "act": "how", "type": "states", "title": "Every list state", "items": [{ "image": "inbox", "label": "Typical" }, { "image": "inbox-empty", "label": "No messages", "status": "mock" }, { "label": "Failed to load", "status": "missing" }], "say": "Empty is shown with test data. Failed to load is not in the prototype yet." },
    { "act": "left", "type": "checklist", "title": "Left before engineering builds it", "items": [{ "text": "What people see when the list fails", "status": "blocking" }, { "text": "Undo after archive", "status": "open" }], "say": "One thing blocks the build: what people see when the list fails to load." },
    { "act": "ask", "type": "ask", "title": "Two decisions we need", "items": [
      { "ask": "Confirm before archiving over 50 messages?", "who": "Product", "say": "Product: should Archive ask first above 50 messages?" },
      { "ask": "Is Undo for 10 seconds enough?", "who": "Design", "say": "Design: is ten seconds of Undo enough?" }
    ] },
    { "type": "end", "headline": "Questions to Sam", "sub": "The developer deck has every state and value.", "meta": "Deck: handoff/2026-11-10/deck.html", "say": "The developer deck is attached. Reply in the thread with questions." }
  ]
}
```

## Voice

Ask the user which narration they want before rendering; the first time in a project, ask what they have (SKILL.md step 6) and save the choice in `handoff/voice.json`. Each option times the video to the voice, so scenes never cut off a sentence.

| `--voice` | What it is | Needs |
| --- | --- | --- |
| `record` | The designer reads the script; the video fits their recording | A microphone. Run `--script` first |
| `elevenlabs` | ElevenLabs text to speech | `ELEVENLABS_API_KEY`; optional `ELEVENLABS_VOICE_ID` or `--voice-id` |
| `fish` | Fish Audio text to speech | `FISH_API_KEY`; optional `FISH_VOICE_ID` or `--voice-id` (the id in a voice's fish.audio URL) |
| `local` | Kokoro-82M, a free open voice that runs on the computer (Apache-2.0) | `node <skill-dir>/scripts/setup.mjs --voice local` once: about 400 MB of packages and a 90 MB model |
| `none` (default) | Captions only | Nothing |

- **Keys** come from the environment or from a `.env` file the user creates in the project folder, with a line such as `FISH_API_KEY=...`. The script reads only those names, never prints them, and warns when `.env` is not in `.gitignore`. Never write a key into `handoff.json`, the deck, a command line you show, or a commit.
- **Privacy:** with `elevenlabs` or `fish`, the narration lines are sent to that company. Use them only when the user picked them.
- **Cost:** each line is cached in `video/voice/` by voice, model and text, so re-rendering after a visual fix does not pay again. Fish Audio's default here is its free model `s2.1-pro-free` (tested 2026-11-08); `--model s2.1-pro` uses the paid one. Fish says the free model is the same model as the paid one, with no uptime guarantee, free under a fair-use policy through 30 November 2026 at least, and that free requests may be used to train its models (checked 2026-11-08 at fish.audio/blog/s2-1-pro-free-api). Accounts get 5 requests at once; the script sends one at a time and retries a 429. ElevenLabs uses `eleven_multilingual_v2` by default. Without `--voice-id` it uses George if the account has him, or else the account's first voice. A `402` answer means the account has no credit for that model.
- **Kokoro voices:** `af_heart` (default), `af_bella`, `am_michael`, `bf_emma`, `bm_george`; pass one with `--voice-id`.

### Recording it yourself

```bash
node <skill-dir>/scripts/make-video.mjs handoff/<date>/handoff.json --script
```

This writes `video/script.md`: every line in order, with when it starts and how long it has. The designer reads each line once, in order, in one take, with a pause of about one second between lines, and saves the take as m4a, mp3 or wav. Then:

```bash
node <skill-dir>/scripts/make-video.mjs handoff/<date>/handoff.json --voice record --audio take.m4a
```

The script cuts the take at its longest pauses, gives each scene its line's real length, and warns when a line looks skipped or merged. If it finds too few pauses, it estimates the cuts from word counts and says so; ask for a new take with clearer pauses.

## Check, then render

```bash
node <skill-dir>/scripts/make-video.mjs handoff/<date>/handoff.json --sheet-only      # 3 stills per scene
node <skill-dir>/scripts/make-video.mjs handoff/<date>/handoff.json --sheet-scene 4   # 12 stills inside scene 4 (scenes count from 0, as the Scenes: line prints them)
node <skill-dir>/scripts/make-video.mjs handoff/<date>/handoff.json --voice local     # render
```

Look at `video/sheet.png` for clipped or overlapping text, focus boxes off their element, a cursor that misses its target, and captions that cover what the scene is about. The sheet is timed from word counts; a voice changes the timing a little. After rendering, pull frames from the MP4 (`ffmpeg -ss 30 -i video.mp4 -frames:v 1 f.png`) and look at them, and read `captions.srt` against the pictures. The script warns when the total is outside 45 to 90 seconds; shorten lines before cutting scenes.

Setup downloads Remotion's headless Chrome (about 170 MB) into the skill folder, where every render uses it; without setup, the first render downloads it there. After that, an 85-second video with the local voice took about 40 seconds on an Apple Silicon Mac in testing. Outputs, all in `handoff/<date>/video/`: `<output>.mp4`, `captions.srt`, `script.md`, `sheet.png`, `voice.m4a` when there is a voice, and the working folders `public/` (capture copies) and `voice/` (the line cache).
