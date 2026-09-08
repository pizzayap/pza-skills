# Advanced Experiential Site Cloning

Use this workflow for sites whose identity depends on runtime graphics or substantial temporal behavior: canvas, WebGL/WebGPU, 3D, custom shaders, smooth-scroll choreography, substantial timelines, scroll scrubbing, pointer/drag physics, image sequences, or cinematic transitions. An ordinary nested overflow container or a minor CSS hover transition alone does not require experiential mode. Source-inspection sections apply to document-only work; production, lifecycle tests, and local comparison apply only when implementation is requested.

The goal is behavioral and perceptual fidelity, not recovery of the source code. Do not assume the original library merely because an effect resembles it.

## Resolve The Actual Source

Award galleries and inspiration directories are provenance, not necessarily the clone target.

1. Record the Awwwards, FWA, mesh3d, or other listing URL.
2. Follow the listing's canonical external “visit site” link in a separate browser tab.
3. Confirm the final URL after redirects and use it as the source URL.
4. Keep screenshots and observations from the listing separate from evidence collected on the target.
5. Do not treat a gallery's preview image or iframe as proof of the target's live behavior.

## Detect The Runtime Architecture

Probe the rendered page before choosing an implementation technique. Record evidence and confidence for:

- canvas count, CSS size, backing-buffer size, DPR ratio, stacking, positioning, opacity, and pointer-event ownership
- WebGL/WebGPU, Canvas 2D, SVG, DOM, video, iframe, and mixed-layer composition
- actual scroll owner: window, nested overflow element, horizontal container, or custom smooth scroller
- runtime hints from DOM classes/data attributes, asset names, script URLs, and observable behavior
- loaded GLB/glTF models, Draco decoders, KTX/KTX2/Basis textures, HDR/EXR environments, GLSL/WGSL or `.vert`/`.frag` shader files, WASM, videos, audio, and numbered image sequences
- fixed or sticky stages, pin spacers, transformed scroll containers, and full-viewport overlays
- mobile-specific markup, assets, or canvas fallbacks

Global variables such as `window.THREE`, `window.gsap`, `window.ScrollTrigger`, or `window.Lenis` are weak signals: modern bundles often hide them. A false global check does not mean the technology or behavior is absent. Likewise, `document.getAnimations()` does not reveal requestAnimationFrame, GSAP, shader, or WebGL animation.

Do not call `canvas.getContext()` merely to identify a source canvas; asking for a different context type can fail or create state. Infer from existing evidence unless the browser exposes a non-invasive inspector.

## Inspect Fresh Entry And Preloader

Do not begin the experiential audit at the settled hero. Many sites make loading, renderer warm-up, and the loader-to-hero transition part of their identity.

Capture the entry sequence in a fresh tab or isolated browser context when available. Set the verification viewport before navigation when the browser supports that order. Prefer a short recording or tightly bounded sequence of screenshots from navigation start; waiting for `networkidle`, `load`, or a stable DOM before the first capture can erase the evidence being sought.

Inspect at least these conditions:

- **First visit:** use a new isolated context when supported. A fresh tab may share cookies, storage, cache, and service workers; if isolation is unavailable, record those conditions as unknown rather than claiming a cold visit. Do not erase unrelated user browsing data.
- **Warm reload:** reload in the same context after assets, storage, and service worker state are present.
- **Return path:** back/forward or same-site navigation when the experience visibly distinguishes it.
- **Responsive entry:** representative desktop and mobile viewports when loader composition or timing differs.
- **Reduced motion and low capability:** observe the actual path when the browser exposes emulation; otherwise document it as unverified and infer cautiously from code/classes only when inspection is authorized.

Build a named timeline:

| Phase | Start/end evidence | Visual layers and properties | Progress/readiness signal | Input/scroll/focus state | Timing/ease | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| `first-paint` | [...] | [...] | [...] | [...] | [...] | [...] |
| `loader-enter` | [...] | [...] | [...] | [...] | [...] | [...] |
| `loading` | [...] | [...] | [...] | [...] | [...] | [...] |
| `loader-exit` | [...] | [...] | [...] | [...] | [...] | [...] |
| `hero-settle` | [...] | [...] | [...] | [...] | [...] | [...] |

Determine:

- whether the preloader is DOM/CSS/SVG, canvas/WebGL, Rive/Lottie, video, image sequence, or mixed layers
- whether a displayed percentage measures real asset progress, eases toward a target, is time-based, or is purely decorative; never describe decorative progress as network truth
- what releases the loader: DOM/content readiness, window load, fonts, images, video readiness, models/textures, shader compilation, a minimum display time, or a coordinated set of promises
- enter/exit animation properties, masks/clips, transforms, opacity, typography, logo treatment, direction, duration, easing, stagger, and sound
- whether the loader owns the viewport, hides underlying content, locks body/custom scrolling, captures pointer/keyboard input, traps or moves focus, or sets `aria-busy`/live status
- how the loader exit and hero intro overlap, share elements, match cuts, reveal the canvas, or transfer motion/visual focus
- whether replay is gated by cookie, session/local storage, service worker/cache state, route type, or navigation history
- what happens on failed or slow assets and whether a timeout or degraded route reveals usable content

If the loader disappears too quickly to inspect, repeat in a fresh task-scoped context and use browser recording, immediate screenshots, or supported network/CPU throttling. Do not modify source scripts, inject blocking code, or misrepresent an artificially paused frame as natural timing.

An after-load DOM/performance probe can corroborate ready state, navigation timings, loader remnants, body overflow, and resource completion, but it cannot reconstruct missed visual frames. Preserve visual evidence from the actual transition.

## Capture A Temporal Storyboard

A single full-page screenshot is insufficient. Capture repeatable viewport frames that explain how the experience changes.

At minimum inspect:

- the named fresh-entry/preloader timeline above
- settled hero before input
- early, middle, late, and terminal progress through the real scroll surface
- the same section while scrolling backward
- representative pointer positions or hover targets when pointer motion is important
- one meaningful click, drag, menu, modal, or scene transition when safe and relevant
- desktop and mobile layouts
- reduced-motion behavior when available

For time-driven shaders, capture several frames at the same scroll and pointer state. Differences between those frames isolate time-based motion. For scroll-driven work, capture at approximate normalized progress values and record the actual scroll owner, scroll offset, section, direction, and viewport with each frame.

If motion appears frozen or inconsistent, repeat the capture with the browser tab foregrounded or visible when the host permits it. Browsers may throttle animation frames in background tabs and hidden iframes; record the capture condition instead of misclassifying a throttled experience as static.

Avoid a long opaque recording. Prefer a small storyboard of named keyframes another agent can reproduce.

## Build The Experience Model

Describe the experience in layers.

### Render layers

For each layer, record:

- DOM, SVG, Canvas 2D, WebGL/WebGPU, image sequence, or video
- viewport-fixed, section-local, sticky, or document-flow placement
- z-order, alpha/compositing, masks, clips, and blend relationship
- input ownership and whether the layer blocks page controls
- resize and mobile behavior

### Scene and camera

When 3D is likely, specify what can be observed or reasonably inferred:

- orthographic or perspective feel
- camera position, target, field of view, parallax, dolly, orbit, or rail movement
- object hierarchy and major transforms
- lighting direction, softness, environment reflections, shadows, and tone/color treatment
- geometry source: primitives, instancing, particles, lines, loaded models, text geometry, or planes
- material family: unlit, standard/PBR, matcap, transmissive, toon, custom shader, or mixed

Do not invent exact scene-graph values when only the rendered result is observable. Describe geometry, relationships, and ranges with confidence labels.

### Shader and post-processing

Describe the visible role of the effect before deciding how to implement it:

- vertex displacement, noise, curl, morphing, billboarding, or particle motion
- fragment color mapping, gradients, texture mixing, reveal masks, refraction, or dissolve
- likely uniform inputs: time, scroll progress, pointer, velocity, resolution, DPR, texture, hover, transition progress
- post-processing such as bloom, depth of field, chromatic aberration, grain, vignette, blur, trails, or feedback
- color space, transparency, blending, and render-pass ordering where they affect the result

Prefer the smallest shader and pass graph that reproduces the visible result. Do not add generic bloom, noise, or distortion simply because the source is an award site.

### Scroll and timeline choreography

Map observable progress into named phases rather than scattered delays:

| Phase | Trigger/range | Pinned layer | DOM changes | Scene/camera changes | Ease/scrub | Reverse behavior |
| --- | --- | --- | --- | --- | --- | --- |
| `hero-intro` | [...] | [...] | [...] | [...] | [...] | [...] |

Determine whether the behavior is discrete, scrubbed 1:1, scrubbed with catch-up, snapped, horizontally mapped, or driven by a custom scroller. Identify pinned sections and distinguish a translated scroller from native window scrolling.

If implementing with GSAP:

- use one labeled timeline for coordinated phases rather than unrelated delayed tweens
- put ScrollTrigger on the top-level tween or timeline, not on nested child tweens
- use `scrub` for scroll-linked progress and `toggleActions` for discrete entry/exit behavior
- model a custom scroll owner explicitly; keep ScrollTrigger synchronized with it
- use linear progress for fake horizontal container movement
- refresh after fonts, images, models, or layout changes affect measurements
- kill timelines, triggers, and listeners during teardown

## Interaction And Motion Signature

For each important motion, record:

- trigger and frequency
- purpose: spatial continuity, state, explanation, feedback, or atmosphere
- affected layer and property
- delay, duration, easing or spring feel
- enter and exit asymmetry
- transform origin or camera pivot
- interruptibility and reverse behavior
- pointer/touch/keyboard differences
- reduced-motion substitute

Apply the craft principles from Emil Kowalski's design-engineering approach: reverse-engineer why an interaction feels right, inspect unseen states, match motion to the site's personality, and review difficult transitions slowly or frame by frame. Do not blindly apply UI defaults to cinematic work. Sub-300ms UI guidance fits frequently used controls, while a rare explanatory or atmospheric sequence may intentionally be much longer.

If `$emil-design-eng` is available, use it as a companion during implementation and polish review. Source measurements still outrank its defaults.

## Choose The Reproduction Technique

Choose based on observed behavior and the destination repository:

- CSS transitions or WAAPI for predetermined DOM transforms, opacity, clips, and simple state changes
- GSAP timelines for multi-step DOM/scene choreography
- ScrollTrigger for measured pinning, scrub, snapping, or horizontal progress
- Three.js, React Three Fiber, OGL, or the repository's existing renderer for genuine 3D, particles, custom materials, and post-processing
- a purpose-built shader only when the effect depends on per-vertex or per-pixel behavior
- Canvas 2D, SVG, CSS, or video when they can faithfully reproduce the role with materially lower complexity and the user accepts the tradeoff

Do not flatten a core interactive scene into a background image and call it cloned. Do not introduce both Three.js and another 3D abstraction without a concrete need.

Likewise, do not replace authored portraits, illustrations, rendered scenes, or cinematic media with quick procedural circles, boxes, generic particles, arbitrary gradients, or glow blobs merely because canvas/WebGL is available. Use the observed or generated visual asset as the layer input, and reserve procedural rendering for behavior that the source evidence actually supports.

Keep the render loop separate from scroll and interaction state. Let scroll/pointer logic update normalized state or uniforms; let the render loop consume that state. Use frame timestamps or delta time so motion is not refresh-rate dependent.

## Performance And Lifecycle Contract

The clone must define:

- a truthful entry readiness model, minimum-display behavior if observed, warm-load replay rule, and loader-to-hero handoff
- an asset-error/timeout path that removes the overlay and restores content, scroll, input, and focus
- a reduced-motion/instant path that settles final geometry and still runs all readiness, cleanup, and focus-handoff callbacks
- canvas resize behavior and drawing-buffer/DPR policy; cap or adapt resolution for heavy scenes
- lazy loading and a truthful loading state for models, textures, and shader compilation
- mobile and low-capability quality tiers
- off-screen and hidden-tab pause behavior
- disposal of geometries, materials, textures, render targets, controls, listeners, timelines, and animation frames
- context-loss and restoration behavior for essential WebGL content
- avoidance of per-frame allocations and layout reads
- transform/opacity preference for DOM animation, with targeted `will-change`
- a non-motion or lower-motion path that preserves content and navigation

Test performance on more than the development machine when the result will ship publicly. A desktop screenshot does not establish mobile viability.

## EXPERIENCE.md Contract

Create this file in experiential mode:

In website mode, key experience sections and storyboards by template/variant and route ID from `ROUTES.md`. Share common renderer and lifecycle rules, but document route-specific scenes, transitions, and teardown. Do not overwrite one route's evidence with another's or infer every route's behavior from the homepage.

```markdown
# EXPERIENCE.md: [Source site]

## Provenance

- Gallery/listing URL: [URL or not applicable]
- Canonical source URL: [final URL]
- Capture date: [date]
- Viewports and device assumptions: [...]

## Architecture Detection

| Signal | Evidence | Conclusion | Confidence |
| --- | --- | --- | --- |
| Canvas | [...] | [...] | [...] |
| Scroll owner | [...] | [...] | [...] |
| Runtime/assets | [...] | [...] | [...] |

## Entry And Preloader Timeline

| Phase | Trigger/readiness | Visual state | Blocking/focus | Timing/ease | Hero handoff | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `first-paint` | [...] | [...] | [...] | [...] | [...] | [...] |
| `loader-enter` | [...] | [...] | [...] | [...] | [...] | [...] |
| `loading` | [...] | [...] | [...] | [...] | [...] | [...] |
| `loader-exit` | [...] | [...] | [...] | [...] | [...] | [...] |
| `hero-settle` | [...] | [...] | [...] | [...] | [...] | [...] |

### Entry State Matrix

| Condition | Loader shown/replayed | Differences | Verified/inferred |
| --- | --- | --- | --- |
| First visit | [...] | [...] | [...] |
| Warm reload | [...] | [...] | [...] |
| Mobile | [...] | [...] | [...] |
| Reduced motion | [...] | [...] | [...] |
| Asset failure/timeout | [...] | [...] | [...] |

## Render-Layer Stack

| Layer | Technology | Placement | Composition | Input ownership |
| --- | --- | --- | --- | --- |

## Scene And Camera

[Observable geometry, camera, lighting, materials, and relationships.]

## Shader And Post-Processing Model

[Visible effects, probable inputs/uniforms, pass ordering, and confidence.]

## Asset Pipeline

| Role | Original URL / analysis file | Media findings | Editable master | Runtime format/loading | Reuse or provider | Replacement/validation |
| --- | --- | --- | --- | --- | --- | --- |

## Scroll And Timeline Map

| Phase | Progress/trigger | DOM | Scene/camera | Timing/ease | Reverse |
| --- | --- | --- | --- | --- | --- |

## Interaction Map

| Input | Mapping | Damping/clamp | Visual response | Touch/reduced-motion behavior |
| --- | --- | --- | --- | --- |

## Responsive Quality Tiers

[Desktop, mobile, touch, reduced-motion, and low-capability behavior.]

## Performance And Lifecycle

[DPR, frame loop, lazy loading, pause rules, cleanup, disposal, and context recovery.]

## Implementation Architecture

[Chosen libraries, modules, state boundaries, render-loop ownership, and dependency order.]

## Verification Storyboard

| Keyframe/state | Source evidence | Local evidence | Result/gap |
| --- | --- | --- | --- |

## Uncertainties And Intentional Deviations

- [...]
```

## Verification Gate

For document-only work, verify the source model, storyboard, and uncertainties; report unsupported captures explicitly. For implementation, apply [Fidelity verification](fidelity-verification.md) and check the applicable items below using the recorded evidence limitations. Do not inject failures into the source page merely to discover its internal readiness logic.

Before claiming implementation completion:

- reproduce and compare first-visit and warm-load entry timelines from navigation start through settled hero
- verify loader exit and cleanup under normal, reduced-motion/instant, and asset failure/timeout paths
- reproduce the named storyboard states at matching viewport and progress
- test forward and reverse traversal, resize, pointer/touch behavior, and repeated entry
- inspect console and shader compilation errors
- verify navigation and content without WebGL or with reduced motion
- verify no orphaned animation loops, listeners, GSAP triggers, or GPU resources remain after teardown
- distinguish measured parity, perceptual approximation, and intentional deviation
- for replacement media, satisfy the [Generated asset pipeline acceptance gate](generated-asset-pipeline.md#acceptance-gate)

Pixel similarity at one frame is only one part of fidelity. The clone must also match choreography, input response, responsive degradation, and stability.
