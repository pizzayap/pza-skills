# Source Evidence Checklist

Read before collecting source evidence. Scale capture depth to the requested page and its material behavior; implementation-only asset production is conditional. Follow the active browser documentation rather than assuming recordings, navigation hooks, emulation, downloads, or evaluation are supported.

In website mode, use [Website coverage](website-coverage.md) to establish the route/control inventory, then apply this checklist to each distinct template and material variant. Reuse shared shell evidence with recorded exceptions; one homepage capture cannot establish every template's design.

Entry observation comes before settled overview captures. Set viewport and start capture before navigation only when the surface permits that order. If tab creation navigates immediately or returns after load, record which entry phases were missed; do not reconstruct them from a settled screenshot.

In parallel mode each evidence agent needs a separate task-scoped tab/context and an exclusive evidence directory. Restore temporary overrides even on failure. Never clear unrelated browser state.

Collect the following, stopping when evidence supports the requested contract:

1. **Fresh entry and loading sequence**
   - Begin observing at navigation start in a fresh tab or isolated page context. Do not wait for the page to settle before taking the first evidence.
   - When the browser permits it, set the target viewport before navigation and capture a short recording or a bounded sequence of frames covering first paint, preloader entry/progress, preloader exit, hero reveal, and settled hero.
   - Attempt one first-visit load in a task-isolated context and one warm reload in that same context. If isolation or early capture is unavailable, label the actual storage/cache conditions as unknown and do not claim a verified cold visit. Record observed replay differences by navigation, viewport, and reduced-motion state. Treat cookies, storage, and cache as possible causes until supported by permitted evidence; do not dump their contents. Do not clear unrelated user browser data merely to simulate a cold visit.
   - Determine the loader technology and layers: DOM/CSS/SVG, canvas/WebGL, Rive/Lottie, video, image sequence, or mixed. Record progress text/graphics, whether progress is real or decorative, readiness dependencies, duration/easing, scroll lock, pointer/keyboard blocking, focus behavior, `aria-busy`/live-region behavior, and the exact handoff into the hero.
   - Inspect desktop, representative mobile, and reduced-motion/low-capability behavior when the environment exposes those states. Record loader absence only when the entry window was actually observed; otherwise record that the entry sequence was missed or unverified.

2. **Rendered overview**
   - Capture a full-page screenshot at the normal desktop viewport.
   - If implementation or responsive analysis is requested, also inspect a representative mobile viewport, normally `390x844`, and a desktop viewport near `1440x900`.
   - Reset temporary viewport overrides before finishing.
   - Capture a closer viewport screenshot when a full-page image makes important details unreadable.
   - If the browser returns only an inline screenshot, use it as session evidence; do not invent a local file path in `DESIGN.md`.

3. **Structure and content hierarchy**
   - Read the current DOM/accessibility snapshot for landmarks, section order, headings, navigation, CTAs, cards, forms, footer, labels, and accessibility names.
   - Record each link/button's actual destination or effect, including expanded desktop/mobile menus and JavaScript-driven navigation. Distinguish routes from anchors, dialogs, tabs, downloads, external links, and consequential actions. In website mode feed newly discovered destinations into the route inventory before declaring discovery complete.
   - Determine whether the scroll owner is `window`, a nested overflow container, or a custom smooth-scrolling surface before trying to traverse the page.
   - Move through the real scroll surface to trigger relevant lazy-loaded sections, then refresh the evidence snapshot. A full-page screenshot is not a substitute for viewport captures of scroll-linked canvas states.
   - Record copy patterns and hierarchy without reproducing large amounts of third-party copy.

4. **Rendered styles**
   - Use read-only browser evaluation when available to inspect root CSS custom properties, loaded font families, and computed styles for representative elements.
   - Sample the body, headings, primary and secondary buttons, navigation, cards, inputs, key sections, and footer.
   - Collect useful values: color, background, font family, font size, weight, line height, letter spacing, width constraints, spacing, gap, border, radius, shadow, opacity, positioning, transitions, and animation names/durations.
   - Stylesheets may be cross-origin and unreadable. Fall back to computed styles and visible evidence; never bypass browser restrictions.

5. **Assets**
   - Prefer the browser's observed page-asset inventory when available. Inventory images, inline SVGs, fonts, stylesheets, video, audio, models, compressed textures, environment maps, WASM, and image sequences after lazy content is visible.
   - Treat formats such as GLB, glTF, Draco, KTX/KTX2, HDR/EXR, basis textures, and numbered image frames as architecture evidence even when the browser classifies them as `other`.
   - Before replacing a material image/video, download its publicly accessible source file into the page-specific evidence folder using tools allowed by the active host. For document-only analysis, archive only media needed to support a conclusion. Public accessibility does not override browser or download restrictions; document limitations and use permitted captures when saving is unavailable. Preserve the exact file as analysis evidence, record its final URL and checksum, and never execute downloaded page content.
   - For responsive images, capture the file actually rendered at each verification viewport and any materially different source variant. For videos, capture the poster plus representative frames and media metadata.
   - Bundle only the subset needed for analysis or an authorized implementation. Keep analysis-only source media separate from final clone assets and never bundle scripts by default.
   - Preserve each asset's original URL and whether it was observed, bundled, blocked, or replaced.
   - Do not imply that third-party logos, images, fonts, trademarks, or copy belong to the user. Use newly created high-fidelity replacements when reuse is not authorized. A neutral labeled placeholder is acceptable only during scaffolding and must not survive final visual verification.

   When implementation needs replacement media, follow the [Generated asset pipeline](generated-asset-pipeline.md) for source analysis, provider selection, sequential generation, media validation, and the no-stand-in-art gate. Apply its reuse/rebuild/generate decision before coding assets.

6. **Interaction and motion**
   - Inspect safe, reversible states such as hover, keyboard focus, open navigation, tabs, accordions, carousels, and dialogs when they materially affect the design.
   - Do not submit forms, sign in, make purchases, send messages, or trigger other consequential actions merely to inspect a design.
   - Record reduced-motion behavior when observable. Label motion that is inferred from a static state.
   - For continuous or scroll-linked experiences, capture a temporal storyboard at repeatable load, scroll, pointer, and open/closed states. One screenshot cannot establish animation behavior.

For every important conclusion, classify it as `observed`, `measured`, or `inferred`, and include confidence when ambiguity matters. Exact-looking values must come from computed styles or another measurable source; visual estimates must be labeled as approximations.
