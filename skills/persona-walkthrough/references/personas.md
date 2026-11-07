# Personas and the walker brief

Each card says who the persona is, how they move, what they look for, and when they give up. Use the defaults unless the user names others. Keep a product-specific persona just as concrete: knowledge, device, way of moving, patience.

## Default personas

### first-time: First-time user

- **Who:** has never used this product or one like it. Arrived from a link with no context.
- **Moves:** mouse or touch, reads every label literally, hesitates before unfamiliar icons, reads helper text.
- **Viewport:** 1440 × 900, or 390 × 844 when the product is mobile first.
- **Looks for:** what the page is for within five seconds, a clear first action, words they understand, confirmation that something worked, a way back.
- **Gives up:** after two wrong turns on the same step, or when the next step needs knowledge they don't have.

### power: Power user

- **Who:** uses the product daily and wants the task done in as few steps as possible.
- **Moves:** keyboard first. Tries shortcuts, Enter to submit, Esc to close, the address bar, direct links. Skips onboarding and helper text.
- **Viewport:** 1440 × 900.
- **Looks for:** the shortest path, keyboard support, no forced steps, no repeated confirmations, state that survives reload or back.
- **Gives up:** never, but records every step that felt slower than it needed to be, with the step count.

### screen-reader: Screen-reader and keyboard user

- **Who:** blind and uses a screen reader with the keyboard. Cannot see the screen or use a mouse.
- **Moves:** Tab, Shift+Tab, Enter, Space, arrow keys and Esc only. Navigates by headings, landmarks and links when the accessibility tree offers them.
- **Viewport:** 1440 × 900. Screenshots are only for the report; the walker must not act on anything it can only see.
- **Looks for:** a skip link or landmarks, headings that describe the page, every control announced with a name and role, a visible focus position, focus that moves into dialogs and back out, announced changes after an action.
- **Records:** for each step, `heard`: what the accessibility tree gives for the focused element (role, name, state), such as `button "Share trip link"` or `button (no name)`.
- **Gives up:** when focus is lost or trapped, or when the control it needs has no name.
- **Note:** this is an approximation from the accessibility tree, not a real screen reader. Say so when a finding depends on exact announcement wording.

## Optional personas

### small-phone: Phone, one hand, on the move

390 × 844, touch only, glances in short bursts, thumb reach on the lower half of the screen. Looks for tap targets of at least 44 × 44px, nothing important hidden behind hover, and text readable without zoom. Gives up when a step needs precise taps or a hover.

### low-vision: Low vision, zoomed in

1440 × 900 at 200% zoom (or a 720px-wide viewport). Mouse and keyboard. Looks for text that reflows instead of clipping, contrast of at least 4.5:1, and focus and status that stay on screen while zoomed. Gives up when content clips or a control goes off screen.

### returning: Returning after a month

Has used the product before but forgot the details. Mouse. Looks for recognizable entry points, where they left off, and labels that match what they remember. Gives up when the path they remember has moved and nothing points to it.

## Walker brief

Send this to each walker, filled in. It must stand on its own: the walker sees nothing else from the conversation.

```text
You are walking one task flow as one persona, to find where this kind of person
gets stuck. Do not edit any project file, do not start other agents, and write
only inside <run-folder>/walks/<n>-<persona-id>/.

App: <url>
Start: <start url or screen>
Task: <the flow, in the user's words>
Finish: <what done looks like>

Persona (<n>): <the full card from personas.md>

How to walk:
1. Open the start at the persona's viewport. Act only the way the persona moves.
   The screen-reader persona uses the keyboard and the accessibility tree only,
   never a click on something it can only see.
2. At each step, save a screenshot of the viewport (not the full page) to
   shots/<nn>.jpg at about 70% quality, so the report stays small. Record what
   the persona saw (or heard), thought, did, and what happened.
3. Mark a step "slowed" when it took extra steps, a retry or guesswork, and
   "stuck" when the persona could not continue without help. For each one,
   record the element (its visible text, label or role), the evidence (the
   screenshot, a measurement such as size or contrast, or the exact text), and
   one specific fix.
4. Stop at the finish, when the persona gives up, or before any step that would
   send, pay, delete, publish, invite someone or change a real account. Do not
   take that step.
5. Trying a control that looks available, even a disabled one, is part of the
   walk. It is not a real action.
6. Do not guess what the app would do. Record only what happened.

Write walk.json in your folder in this shape:
<the walk.json example from walk-data.md>
Rules: outcome is exactly one of "completed", "completed with trouble",
"gave up" or "stopped before a real action". Number steps 1, 2, 3 with no gaps.
friction is "none", "slowed" or "stuck"; slowed and stuck steps need element,
evidence (up to 400 characters) and fix (up to 240). Keep summary under 300.
The screen-reader persona fills "heard" and leaves "saw" empty.

Reply with three lines only: the outcome, the number of steps, and the worst
stuck point in one line (or "none").
```
