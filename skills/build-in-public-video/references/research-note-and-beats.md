# Research note and beat sheet templates

## Research note

Save as `research/YYYY-MM-DD-<slug>.md` before anything else.

```markdown
# <topic>

## Spark
<URL>. What it actually said, quoted, not paraphrased.

## First-hand material
Only what the creator built, ran, broke or measured.
- <item>. Source: <post file, log, commit, recording, date>

## Verified externally
- <fact>. Source: <link>. Checked: <YYYY-MM-DD>. Label: documented | reviewer report

## Can't claim
Adjacent things the creator has not done, stated plainly so they never drift in.
- <thing>
```

If "First-hand material" is empty, stop and write this instead:

```text
Not yours yet: <what the creator would have to build, run or measure first>.
```

## Comparison table (comparison videos only)

| Claim | Label | Source and date |
|---|---|---|
| <feature A exists> | documented | <docs link>, checked <date> |
| <tool B felt slower> | reviewer report | <reviewer>, <link>; qualitative, not a benchmark |
| <feature A was missing in the app> | first-hand | <date>, <version> |
| <B probably suits solo builders better> | inference | reasoning from the rows above |

## Beat sheet

```markdown
Shape: <shape> | Target: <length> | Promise: <one sentence>

0:00 Cold open: <the receipt or self-own on screen; what is visible>
0:15 <chapter title>: <what happens on screen>
     Command: `<exact command>`
     Result: [NUMBER] <unit>
<m:ss> <chapter title>: ...
<m:ss> The turn: <what broke, cost more, or did not work>
<m:ss> <chapter title>: <the fix or the workaround>
<m:ss> Landing: <self-own, or a real question specific enough to answer>

Unchosen titles: <four titles>
Thumbnail: <3 words>
Description, first two lines: <stands alone as a post>
```

## Pre-flight

- [ ] Every fact about the creator traces to "First-hand material" or the fact sheet.
- [ ] Nothing from "Can't claim" appears in titles, beats or description.
- [ ] Every comparison claim carries a label.
- [ ] There is a turn (or this is a milestone).
- [ ] The landing is not a summary or a subscribe ask.
- [ ] Live numbers are `[NUMBER]`.
- [ ] No part re-cuts or restates someone else's video.
- [ ] No em dashes, "not X, it's Y" reveals or banned title patterns.
