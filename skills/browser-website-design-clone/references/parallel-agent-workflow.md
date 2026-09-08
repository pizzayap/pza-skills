# Parallel Agent Workflow

Use this mode only when subagents are available and authorized and there is independent evidence, asset, UI, motion, or renderer work. Follow active host delegation rules. Otherwise continue in one agent with the applicable evidence, contract, and verification artifacts; do not create empty coordination files or claim an independent review.

Parallelism is a scheduling technique, not proof of fidelity. The main agent owns scope, contracts, integration, and the final claim.

## Main-Agent Responsibilities

Only the main agent may:

- choose or change the canonical target URL and requested website/page scope
- publish or revise `DESIGN.md`, `EXPERIENCE.md`, the website `ROUTES.md` inventory, and the acceptance scorecard
- assign, transfer, or revoke write ownership
- edit shared entry points, dependency manifests, lockfiles, global tokens, routing, and integration wiring unless another sole owner is explicitly recorded
- resolve contradictory evidence or overlapping implementation proposals
- decide whether the integrated clone passes final verification

The main agent should keep raw observations outside its conversation context. Specialists persist their evidence and return short handoffs containing paths, conclusions, checks, and blockers. The main agent loads raw captures only when resolving a contradiction or material mismatch.

## Persistent Coordination Files

In `.design-reference/<site-page>/`, create:

```text
WORKSTREAMS.md
evidence/
  visual-layout/
  motion-entry/
  assets-media/
handoffs/
verification/
VERIFICATION.md
```

Create only the subdirectories actually needed. The main agent is the sole writer of `WORKSTREAMS.md`. The currently assigned independent verifier is the sole writer of `VERIFICATION.md` for its active verification wave. All other specialists write only inside their assigned evidence, asset, implementation, or handoff paths.

In website mode the main agent also owns `ROUTES.md`. Evidence agents return proposed route/family additions in their own handoffs; verifiers report route/control results in `VERIFICATION.md`. The main agent merges these into the inventory. Use template and route IDs to keep capture paths distinct, and record sole owners for shared shells, template modules, route data, and router wiring.

Use this table in `WORKSTREAMS.md`:

| ID | Responsibility | Exclusive write paths | Shared or forbidden paths | Inputs | Exit evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `E1` | Example: layout and responsive evidence | `evidence/visual-layout/**` | application code, other evidence folders | target URL, viewports, state list | report plus captures | active |

Paths must not overlap. Do not assign a parent directory to one agent and a child of that directory to another. Account for formatters, code generators, and build tools that may rewrite files outside the apparent source path.

## Wave 0: Frame The Work

Before spawning specialists, the main agent:

1. Resolves the canonical source and website/page scope; in website mode starts the discovery queue and required navigation inventory from [Website coverage](website-coverage.md).
2. Inspects the repository, existing conventions, dirty files, public interfaces, and available browser/media capabilities.
3. Sets initial target viewports, candidate template families, and observable states, including fresh entry, warm reload, settled hero, important scroll positions, menus, hover/focus, mobile, and reduced motion.
4. Creates `WORKSTREAMS.md` with non-overlapping ownership.
5. Names the shared files that only the main agent may change.

Spawn no more agents than there are concrete independent workstreams. A useful complex-site evidence wave may include:

- visual structure, typography, responsive layout, and component-state evidence
- preloader, motion, scroll, pointer, and interaction evidence
- asset, image, video, font, model, texture, and shader dependency inventory

Each browser specialist uses a separate task-scoped tab or isolated browser context. Never coordinate by taking turns in one mutable page.

## Agent Assignment Contract

Every delegated task must state:

```text
Goal:
Source URL and states:
Scope mode, assigned route IDs, and template/variant IDs:
Inputs and contract files:
Exclusive write ownership:
Files and directories that must not be edited:
Required evidence or implementation output:
Checks the agent must run:
Conditions for handing work back:
```

Also tell every implementation specialist that other agents are working in the same workspace. It must inspect files immediately before patching, preserve unrelated changes, avoid broad formatting, never revert another owner's work, and request an integration handoff for anything outside its ownership.

An agent's final handoff should be compact:

```text
Completed:
Files written:
Evidence or checks:
Interfaces and assumptions:
Integration required from main:
Remaining mismatches or blockers:
```

## Wave 1: Parallel Source Evidence

Evidence agents may run concurrently because their browser contexts and output paths are separate. They must report facts as `observed`, `measured`, or `inferred` and include the exact viewport and page state.

The main agent then performs an evidence barrier:

- confirms each assigned template/variant has entry and settled evidence or an explicit capture limitation
- resolves inconsistent dimensions, colors, type, asset roles, timelines, or scroll ownership
- rejects conclusions based only on a screenshot when DOM, motion, or runtime evidence is required
- merges newly discovered routes and controls, resolves family groupings, and records remaining candidates or coverage limits in `ROUTES.md` for website mode
- publishes `DESIGN.md` and, for experiential sites, `EXPERIENCE.md`
- freezes the finite required route set, repeated-content samples and source-site continuations, component contracts, route-to-template/data mappings, shared navigation, asset filenames, public selectors/interfaces, integration seams, and per-template verification states

Resolve contradictory source evidence before dependent implementation. Record missing evidence and its impact in the contract; proceed with independent work that does not rely on the unknown state. A documented gap does not count as verified fidelity.

Content-only links do not automatically expand a worker's route assignment. Report new layouts, material behaviors, or missed mandatory destinations to the main agent for an inventory revision; existing required routes cannot be downgraded to continuations to clear a worker's backlog.

## Wave 2: Parallel Implementation

Choose modules that can be built behind stable interfaces. Typical ownership can be divided among:

- semantic page structure and ordinary components
- layout, tokens, typography, and responsive styling
- source-media analysis and sequential replacement-asset production
- preloader, GSAP timelines, scroll choreography, and interaction state
- Three.js/WebGL scene, shaders, post-processing, and capability fallbacks

These labels are examples, not a required agent count. Combine tightly coupled work instead of splitting agents across the same files.

For a website, independent template/variant modules can be separate workstreams. Content-only URLs reuse their template owner and distinct route data; do not create one agent per article or product. Shared shells and routing keep one declared owner. Hand newly discovered template needs back to the main agent before expanding a worker's assignment.

Before sequential asset production needs browser acceptance, the main agent integrates a runnable preview with the consuming layout and stable asset slots. Use neutral labeled placeholders during scaffolding. Integrate completed consumers incrementally; do not wait for final asset handoffs to create the page that asset acceptance requires. Serialize changes to shared preview wiring through its declared owner.

Implementation rules:

- one agent owns a file for the entire active wave
- one agent owns each generated asset from source analysis through acceptance
- replacement assets are still generated and accepted one by one, even when asset work runs alongside code work
- no parallel dependency installation, lockfile editing, route wiring, whole-project formatting, or global token changes
- specialists implement against the frozen contracts and report proposed contract changes to the main agent
- specialists run focused checks for their owned module but do not claim integrated browser fidelity
- use follow-up work with the existing owner for corrections instead of creating a competing agent

If ownership must transfer, the main agent first marks the previous owner inactive, records the handoff and current file state in `WORKSTREAMS.md`, and only then assigns a new owner.

## Wave 3: Main-Agent Integration

After all implementation handoffs, the main agent:

1. Reviews changed files and checks that paths match ownership.
2. Resolves imports, shared entry points, routing, dependency changes, and public interfaces.
3. Removes temporary placeholders and development-only instrumentation.
4. Runs repository-level static, type, build, and lint checks.
5. Starts the local site and checks the required route set and shared navigation before independent visual verification; a homepage smoke check is insufficient for website mode.

Static checks, successful compilation, and agent completion messages do not establish visual fidelity.

## Wave 4: Independent Verification And Repair

Assign a fresh specialist that did not implement the reviewed area. Verification is read-only with respect to application code; it may write only its assigned captures, measurements, and handoff report.

The verifier compares source and local pages using the same:

- viewport dimensions, device scale assumptions, and scroll owner
- first-visit and warm-entry phases
- normalized animation or scroll progress
- pointer, hover, focus, open/closed, and reduced-motion states
- visible asset crop, media time, camera pose, and WebGL quality tier

Use side-by-side captures, overlays, geometric measurements, and image-difference tooling when available. Automated pixel similarity alone is not authoritative for video, particles, procedural noise, antialiasing, font rasterization, or time-dependent shaders.

The verifier writes `VERIFICATION.md` with:

- source and local URLs plus capture conditions
- links to matched evidence pairs
- route/control coverage results, unresolved discovery candidates, and required-route gaps in website mode
- weighted fidelity and category scores for every distinct template/variant in website mode, or the requested page in page mode
- critical failures
- ranked mismatches with evidence, likely owner, and acceptance condition
- browser/runtime errors and performance observations
- static checks, browser checks, and asset validation reported separately

The main agent sends each mismatch back to its existing owner and integrates completed fixes. Follow the shared verification reference for affected rechecks and the evidence-backed stopping boundary. Do not lower the acceptance threshold or leave multiple agents editing the same fix area.

## Fidelity Scorecard

Use [Fidelity verification](fidelity-verification.md) for the shared scorecard, calculation, evidence requirements, critical failures, and repair stopping boundary. These rules apply to single-agent and parallel implementations alike. Document-only work ends after the evidence and contract handoff; skip implementation and local verification waves.
