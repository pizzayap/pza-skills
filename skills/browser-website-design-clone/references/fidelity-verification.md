# Fidelity Verification

Use for requested implementations in both single-agent and parallel modes. Document-only requests use the contract completion check in `SKILL.md`; they do not need local captures or a fidelity score.

## Check Route And Control Coverage

In website mode verify against the required set and discovery boundaries in
`ROUTES.md`; see [Website coverage](website-coverage.md). Reconcile the implemented
navigation with the frozen scope revision so mandatory routes and controls cannot
disappear from the denominator. Deeper repeated-content links use their recorded
local-or-continuation decision; they do not recursively expand the local set.
Blocked required routes and unexplored candidate families remain gaps. Page mode
tests the requested page and its controls within the explicit scope.

- Open every required route directly and through its included internal link or
  button where one exists. Confirm the local origin, path, meaningful query/hash
  state, intended template, and distinct content identity. A successful HTTP
  response or a router catch-all showing the homepage is insufficient.
- Refresh each required route, then exercise back/forward across its navigation
  transition. Check history, state, and observed scroll/focus behavior. Test the
  local serving/build setup's deep links; client-only navigation is not proof
  that direct loading works. Deployment remains separate unless requested.
- Check every inventoried included control, including desktop/mobile menus,
  cards, CTAs, dialogs, tabs, accordions, anchors, and filters. Match observed
  navigation and state changes, allowing only documented source-site continuations
  for excluded repeated content. Inspect external/contact/download wiring without
  sending messages, making purchases, or activating other consequential effects.
  Test backend effects only when separately requested and authorized.
- Check each source-site continuation against its evidence, exact absolute source
  destination, meaningful query/fragment state, and visible/accessibility departure
  label. Confirm that its target is neither mandatory nor an unresolved family.
  Record it as a checked continuation, never as a cloned route or an unexplained
  local coverage gap. A missing required route cannot pass by becoming external.
- For repeated content using one template, check every included URL's data and
  destination; perform detailed visual comparison on representative routes and
  material variants. Check route-specific exceptions separately.

Record local route, control, and continuation counts separately with per-item
results, plus template/variant coverage. Missing required routes, wrong
destinations/content, dead controls, and required coverage gaps are critical
failures regardless of visual scores. A limited backend
simulation must be identified as such; an unrequested real service is not a
required route test.

## Match The Evidence

Compare source and local pages at identical viewport dimensions and recorded device-scale assumptions. In website mode select source/local pairs for every distinct template and material variant, including shared navigation and route-specific exceptions. Match scroll owner/offset or normalized timeline progress, direction, pointer/focus/open states, media time, camera pose, and quality tier where applicable. Capture desktop and representative mobile views. Temporary viewport and emulation overrides must be restored.

Compare hierarchy, geometry, typography, color, component states, imagery, crops, responsive behavior, and accessibility. Use side-by-side captures, measurements, or overlays when available. Pixel differences alone cannot judge particles, video, antialiasing, or time-driven shaders.

For a material entry sequence, compare first-visit and warm-load timelines from navigation start through settled hero. State any capture limitations. Test an implemented loader on normal, reduced-motion/instant, warm reload, and asset failure/timeout paths; it must reveal content and restore scroll, input, and appropriate focus.

For experiential work also verify forward/reverse scroll, resize, pointer/touch behavior, repeated entry, frame stability, console/shader errors, capability fallback, context loss/restoration when applicable, and teardown of loops, listeners, triggers, and GPU resources. Perform disruptive fault injection only on the local implementation through supported test facilities. A static hero match does not establish runtime fidelity. Use the named storyboard and lifecycle contract in `EXPERIENCE.md`.

Run relevant repository static checks separately. Validate accepted generated PNG masters, alpha, provenance, runtime derivatives, and motion-media metadata using the asset pipeline. No temporary placeholder or generic stand-in art may pass.

## Record And Repair

Write `.design-reference/<site-page>/VERIFICATION.md` with source/local URLs, capture conditions, matched evidence pairs, category scores/calculation, critical failures, ranked mismatches and acceptance conditions, actual checks, and unresolved gaps. Website reports also identify the inventory revision, required route/control results, template/variant scores, discovery limits, and unresolved candidates. The single agent owns this report in single-agent mode. In parallel mode a fresh specialist who did not implement the reviewed area owns the report and assigned captures; application code remains read-only to that verifier.

Fix material mismatches, integrating through the declared owners. Recheck changed states and affected checks. Do not repeatedly rerun unchanged successful checks. Stop when the gate passes; if progress is blocked by an evidenced access, authorization, environment, asset, or reproducible technical limitation, report partial work with attempted remedies and a concrete next step. Never weaken the threshold to stop a repair loop.

## Fidelity Scorecard

Score integrated rendered pages, not isolated modules or a document-only deliverable. In website mode score each distinct template and material variant separately, including its shared shell. Each must meet the thresholds below; a site average cannot compensate for a failing template, unverified family, or missing route. In page mode score the requested page. Give each applicable category a `0-100` score based on matched source/local evidence:

`total = sum(category_score * category_weight) / sum(applicable_category_weights)`

Keep unrounded values for the threshold checks and display the calculation. A category with missing evidence is unverified, not inapplicable; do not remove its weight or award full marks. If required evidence is missing, report the score as unverified and the implementation as partial rather than calculating a passing total.

| Category | Weight | What is compared |
| --- | ---: | --- |
| Layout and responsive geometry | 25 | section order, anchors, grids, spacing, sizing, crops, breakpoints |
| Typography, color, and component finish | 15 | fonts, type scale, line breaks, palette, borders, radii, shadows, controls |
| Authored assets and media | 20 | imagery, transparency, composition, video treatment, models, textures, provenance |
| Entry, motion, and interaction | 20 | preloader, timing, easing, scroll, hover, focus, pointer, reduced motion |
| Advanced renderer and effects | 15 | camera, geometry, materials, shaders, lighting, post-processing, fallbacks |
| Content structure and functional behavior | 5 | hierarchy, labels, navigation, accessibility, state transitions |

When a category genuinely does not apply, normalize the remaining weights to `100` and record the calculation. Do not silently give full points for absent functionality.

Default acceptance requires:

- total score at least `80/100`
- no applicable category below `70/100`
- no critical failure
- in website mode, a passing required route/control coverage gate and no unresolved candidate layout family; report any discovery boundary explicitly
- live-browser evidence at desktop and representative mobile viewports
- temporal evidence for any material entry, animation, scroll, video, or renderer behavior

A `70-79` result is a useful partial clone, not completion. The numeric score is a documented visual-review rubric, not a claim of literal pixel identity. Do not publish a precise percentage when matched evidence was not collected.

Critical failures include a wrong source or route, iframe embedding, missing major section, generic stand-in art where authored media is required, trapped preloader, unusable mobile navigation, missing core interaction, failed WebGL/shader initialization, persistent console/runtime errors affecting the experience, or a static screenshot used in place of required interaction.

Only describe the result as `1:1` or pixel-perfect when same-viewport spatial and temporal comparisons support that stronger claim. Passing `80/100` means high-fidelity acceptance for this workflow, not exact identity.
