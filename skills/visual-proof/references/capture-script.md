# Capture script

A starting point for `run.mjs`. It uses Playwright, which drives a real browser from a script. If the project already has a browser harness or a preview tool, use that instead and keep the same rules: fixed viewports, confirmed sizes, settled states, dated file names.

Install once: `npm i -D playwright && npx playwright install chromium`.

Run: `node docs/verification/<id>/run.mjs <url> <id> before` (then `after`).

```js
// run.mjs: capture each state at each viewport, after motion settles.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [url, id, phase = 'before'] = process.argv.slice(2);
const dir = `docs/verification/${id}`;
const date = new Date().toISOString().slice(0, 10);
const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

// Each state is a name plus the steps that reach it from a fresh load.
const states = [
  { name: 'default', go: async () => {} },
  { name: 'open', go: async (page) => page.getByRole('button', { name: 'Filters' }).click() },
  // Add: hover, focus, empty, loading, error, long-content. See checks.md.
];

async function settle(page) {
  // Wait until no finite animation is still running (infinite spinners are ignored).
  await page.waitForFunction(
    () => document.getAnimations().every(
      (a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity,
    ),
    null,
    { timeout: 5000 },
  );
}

mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();

for (const scheme of ['light', 'dark']) {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, colorScheme: scheme });
    const page = await context.newPage();
    for (const state of states) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await state.go(page);
      await settle(page);

      // Prove the viewport is real and record sideways overflow.
      const m = await page.evaluate(() => ({
        w: innerWidth,
        h: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      if (m.w !== vp.width) throw new Error(`Viewport is ${m.w}, expected ${vp.width}`);

      const file = `${dir}/${date}-${phase}-${vp.width}x${vp.height}-${scheme}-${state.name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(file, `scrollWidth=${m.scrollWidth}`, m.scrollWidth > m.w ? 'OVERFLOW' : 'ok');
    }
    await context.close();
  }
}
await browser.close();
```

What each part proves:

- The `innerWidth` check proves the capture used the size it claims. With `deviceScaleFactor: 1`, the image width equals the viewport width.
- `settle()` proves the capture is not mid-transition.
- The `OVERFLOW` line proves or disproves sideways scrolling without reading the image.
- Running `before` and `after` with the same script proves the two captures are comparable.

## Recording motion

Add `recordVideo: { dir, size: vp }` to `browser.newContext(...)`. The video is saved when the context closes. Trigger the interaction 2 or 3 times so the recording shows repeat and interruption, then name the file `<date>-<phase>-<WxH>-<state>.webm`.

For reduced motion, create a second context with `reducedMotion: 'reduce'` and record the same steps. Movement should drop; fades and color changes may stay.

Give motion feedback by timestamp, one issue per line:

```text
00:02 Panel slides from the right but the trigger is on the left.
00:04 Heading clips while the panel opens. Keep the layout, fix the clip.
```
