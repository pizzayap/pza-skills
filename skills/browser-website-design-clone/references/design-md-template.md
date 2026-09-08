# DESIGN.md Template

Use this structure as a compact build contract. Remove empty sections and adapt labels to the target rather than filling placeholders mechanically. Document-only work records source evidence and proposed build guidance; omit generated-asset and local-verification fields when no implementation was requested. Keep observed source behavior separate from proposed safety/accessibility improvements.

For website mode, keep shared rules here and use [Website coverage](website-coverage.md) for the route/control inventory. Repeat template-specific sections only for distinct families or material variants; link larger template contracts rather than duplicating shared tokens and navigation for every content URL.

````markdown
# DESIGN.md: [Source site or page]

## Source And Evidence

- Gallery/listing URL: [URL or not applicable]
- Source URL: [exact final target URL]
- Browser context: [isolated first visit / warm reload / storage and cache unknown]
- Capture date: [ISO date]
- Requested outcome: [design document / implementation]
- Scope mode: [website / explicitly requested page mode]
- Homepage and supplied seed: [observed URLs; page mode may have one URL]
- Target stack: [stack or not specified]
- States inspected: [first visit, warm reload, preloader phases, settled default, hover, open menu, etc.]
- Experiential mode: [not needed / see `EXPERIENCE.md`]

| Evidence | Viewport or scope | Location | Status |
| --- | --- | --- | --- |
| Full-page screenshot | [width x height] | [real local path or `session-only`] | [captured/blocked] |
| Fresh-entry storyboard | [cold/warm, desktop/mobile, reduced motion] | [`EXPERIENCE.md`, artifact, or `session-only`] | [captured/partial/no loader] |
| DOM/accessibility structure | [page/state] | [summary or artifact] | [captured/partial] |
| Computed styles | [sampled elements] | [summary or artifact] | [measured/partial] |
| Asset inventory | [loaded page state] | [manifest path] | [observed/bundled/partial] |
| Source media archive | [images/videos and responsive variants] | [analysis-only path] | [downloaded/blocked/partial] |
| Temporal storyboard | [scroll/input states] | [`EXPERIENCE.md` or session-only] | [captured/not needed/partial] |

## Design Summary

[Two or three paragraphs describing the visual language, hierarchy, density, and defining traits.]

## Website Coverage

[Website mode only; page mode records its explicit boundary and visible controls.]

- Route/control inventory: [actual `ROUTES.md` path]
- Frozen required routes: [scope revision, count, mandatory inclusion reasons, representative route/state samples; distinguish routes from template count]
- Distinct families and variants: [IDs, representative URLs, evidence, contract sections]
- Shared shell: [header/footer/navigation and route-specific exceptions]
- Route-to-template/data mapping: [inventory rows; distinct content identity per included URL]
- Local URL rules: [source-to-local origin/base path, query/hash state, redirects]
- Navigation and interaction contracts: [inventory; routes, menus, dialogs, anchors, forms]
- Source-site continuations: [excluded repeated-content boundary, exact source URLs, visible/accessibility departure labels; counted separately from required local routes]
- Discovery status: [remaining candidates, sampled collections, blocked routes, exclusions and reasons]

For implementation also record route/control verification counts and per-template
fidelity results in `VERIFICATION.md`. A homepage score does not cover other families.

## Entry And Loading Experience

- Preloader presence: [observed / absent / capture blocked]
- Replay rules: [first visit / every navigation / warm reload skipped / unknown]
- Layers and treatment: [DOM/SVG/canvas/WebGL/Rive/Lottie/video; typography, color, masks, motion]
- Readiness trigger: [fonts/images/video/models/shaders/window load/minimum time/inferred]
- Progress behavior: [real/decorative/indeterminate]
- Blocking behavior: [scroll, pointer, keyboard, focus, `aria-busy`]
- Loader-to-hero handoff: [...]
- Reduced-motion/low-capability path: [...]
- Failure/timeout behavior: [...]

Put detailed phase timings, visual keyframes, and the entry state matrix in `EXPERIENCE.md` when experiential mode applies.

## Design Tokens

### Colors

| Role | Value | Evidence | Confidence |
| --- | --- | --- | --- |
| Background | `#...` | [computed/observed/inferred] | [high/medium/low] |

### Typography

| Role | Family | Size / line height | Weight | Evidence |
| --- | --- | --- | --- | --- |
| Display | [...] | [...] | [...] | [measured/inferred] |

### Spacing And Geometry

- Spacing scale: [...]
- Content width: [...]
- Grid and gaps: [...]
- Section rhythm: [...]
- Radius: [...]
- Borders and dividers: [...]
- Shadows and elevation: [...]

## Template Structure: [Family / Variant ID]

1. [Navigation]
2. [Hero]
3. [Section]
4. [Footer]

Describe desktop and mobile composition, alignment, wrapping, stacking, and visibility changes. Name the representative route and shared shell. In website mode cover every family and material variant; content-only URLs share this structure through distinct data entries.

## Components

### [Component]

- Anatomy: [...]
- Visual rules: [...]
- States: [default, hover, focus, active, disabled, open]
- Responsive behavior: [...]
- Accessibility behavior: [...]

## Imagery And Iconography

- Image treatment: [...]
- Icon language: [...]
- Logo constraints: [...]
- Asset reuse status: [authorized / reference-only / replacements required]
- Stand-in art policy: [none in final / unresolved gaps]

| Source visual role | Evidence crop/state | Final technique | Why this is faithful | Acceptance check |
| --- | --- | --- | --- | --- |
| [...] | [...] | [authorized asset / built-in Imagegen PNG / generated motion media / measured SVG/CSS / Three.js] | [...] | [...] |

Use semantic DOM/CSS for exact text and card structure. Keep generated imagery as a separate layer unless the source explicitly uses text baked into an image.

- Replacement order: [ordered asset IDs; one-by-one]
- Source-media analysis: [local evidence directory and manifest]

## Motion And Interaction

- Transitions: [...]
- Entrances or scroll behavior: [...]
- Menus, accordions, carousels, dialogs: [...]
- Reduced-motion behavior: [...]

Mark every unmeasured timing or easing as inferred.

For WebGL, shader, 3D, custom-scroll, or substantial scroll-timeline behavior, keep this summary short and put the renderer, scene, uniforms, interaction mappings, and timeline phases in `EXPERIENCE.md`.

## Content Style

- Voice: [...]
- Heading pattern: [...]
- CTA pattern: [...]
- Copy density: [...]

## Agent Build Instructions

[Concrete instructions in dependency order. Name reusable tokens and components, responsive breakpoints or behaviors, asset substitutions, and the visual details that matter most.]

## Asset Provenance

| Asset or role | Original/final URL | Analysis file / SHA-256 | Local master | Runtime file | Reuse or provider status | Prompt / validation |
| --- | --- | --- | --- | --- | --- | --- |
| Hero image | [...] | [...] | [...] | [...] | [reference-only/authorized/provider name/replaced] | [...] |

- Asset ledger: [path or not needed]
- Generated still contract: [PNG master; opaque / genuine alpha]
- Generated motion contract: [video metadata / PNG sequence / not needed]
- Editable replacements: [what the user can adjust later]

## Uncertainties And Intentional Deviations

- [Unknown or blocked evidence]
- [Inferred value and why]
- [Implementation deviation and reason]

## Rerun Inputs

```yaml
workflow: browser-website-design-clone
scope_mode: [website / page]
source_url: [URL]
homepage_url: [URL or not applicable]
route_inventory: [recorded path or not applicable]
target_stack: [stack]
output: DESIGN.md
entry_capture: first_visit_and_warm_reload
viewports:
  - [desktop dimensions]
  - [mobile dimensions]
```
````

When a screenshot is available as a persistent local file, embed it near the top of `DESIGN.md` with a relative path. When it is session-only, say so in the evidence table and summarize the visual facts it supports.
