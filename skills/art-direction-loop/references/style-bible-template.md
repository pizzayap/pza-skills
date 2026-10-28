# Style bible, sidecar and brief templates

Copy and adapt. Keep the bible in the project, for example
`docs/art/style-bible.md`, and concepts under `docs/art/concepts/<asset>/`.

## Style bible

```markdown
# <Project>: style bible

The single source of truth for how <project> looks. Every concept prompt is
built from it and every review checks against it. Concepts never ship.

## Look
Traits, not names. Brand or artist references may be listed here for humans
only, and never go into a prompt.
- Chunky, hand-built shapes with light chamfers, never soft pillows.
- Soft painted shading: broad gradients, not fine texture.
- Each asset owns one hue; everything else comes from the shared palette.

## Framing
The same framing for every concept, matching the production render view.
- 3/4 view from slightly above, whole asset in frame.
- Plain warm backdrop, soft contact shadow.

## Palette
Role, value, use. (Values stay here; prompts get plain colour words.)

## Buildable with the kit
The pieces the build pipeline can actually make.

## Looks
How assets evolve (for example 4 looks across levels), and each look's goal.

## Assets
### <Asset>
- Role, identity, hue, props.
- Look goals: decided <date>, or "decided in its first round".
- Per-look designs: mark undecided ideas as **proposal**.

## Budgets
Triangle, part, colour or file-size limits the brief checks against.

## Never
- Text, letters or numbers in the image.
- Thin weapons or parts that vanish at thumbnail size.

## Taste log
The human's verdicts, distilled into dated rules. The agent proposes
entries; they are added only when the human agrees.
- <date> · liked the visible winch and rope; keep mechanisms readable
- <date> · no symbols cut into walls; openings stay plain shapes
```

## Sidecar

One JSON file beside each PNG, same base name:

```json
{
  "asset": "archer",
  "look": 3,
  "slug": "crossbow-deck",
  "index": 2,
  "model": "<configured image model>",
  "quality": "low",
  "size": "1024x1024",
  "prompt": "<exact prompt sent>",
  "inputImages": ["docs/art/reference/look2-render.png"],
  "usage": {},
  "costUSD": 0.0,
  "createdAt": "YYYY-MM-DD",
  "review": null,
  "verdict": null,
  "verdictNote": null
}
```

- File names: `<date>-look<N>-<slug>-<index>.png`, slug lowercase
  `a-z0-9-`. Pick the next free index; never overwrite.
- `review` holds the agent's advice. `verdict` and `verdictNote` hold only
  the human's words.
- Use `look: 0` and a slug ending in `-sheet` for a look sheet. Sheets do not
  count toward the brief.
- Compute `costUSD` from the provider's reported usage and the project's
  price table. If usage is missing, write `null` and say so.

## Build brief

`docs/art/briefs/<asset>.md`:

1. **Concepts:** the approved file for each look.
2. **Kit pieces per look:** existing pieces by name, plus any new pieces
   described in the kit's own vocabulary.
3. **What changes at each look:** added, removed, reshaped, and what stays
   (hue, core outline).
4. **In-between levels:** reuse the look's build; say whether they get a
   small accent or nothing, as the bible decides. Mark any open question as
   a recommendation.
5. **Dials:** 8 to 15, as a table of name, range and group. Each must be
   visible in the concepts.
6. **Budget estimate per look:** per-piece sums against each limit.
7. **Pass or fail per look:** pass only if buildable with the kit (plus the
   listed new pieces) and within every budget. Say why a look failed.

Write only the brief. Do not edit the bible's verdicts, the sidecars or
production code.
