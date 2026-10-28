# Milestone filing

Use this when a milestone must exist as tracker issues before any worker can
claim it. Filing is its own small task: create issues and update claim-order
docs. Do not implement any child in the same session.

## Shape

- One parent epic. It states the problem, acceptance sources (spec, design
  docs, decisions), the claim order, and explicit non-goals. The parent is
  never itself claimable.
- Two to five children, each one claimable unit. Give each the same body:
  `## Parent`, `## What to build`, `## Acceptance criteria`, `## Blocked by`,
  `## Explicit non-goals`.
- Order children so the first one builds the seam (interface, adapter, fakes)
  without UI, and later ones build on it.
- The last child is always "seam tests (gap-fill only)": audit the shipped
  children against their acceptance criteria and fill missing tests at the
  seams. No suite rebuild.
- Mark undecided product details as undecided. A child must not invent a
  business decision; the implementing PR records the chosen default.

## Wiring

- Link children to the parent with the tracker's native sub-issue feature, not
  only a mention in the body.
- Add native `blocked_by` edges between children. Check which ID form the API
  expects (database ID vs issue number vs node ID) and do not mix forms.
- Apply a ready label (`ready-for-agent` or `ready-for-human`) only to a child
  whose open `blocked_by` count is 0. At filing time that is usually just the
  first child.
- When a child closes, re-check its dependants and label the ones that reached
  0 blockers in the same change.

## Claim order in docs

- Keep the current frontier and claim order in the project guidance file and
  README. Update every place that states it, not just one paragraph.
- Advance the claim order in the same PR that closes a child.
- Workers claim only the first ready child in the documented order.

## Deliverable

Report the parent and child links, the dependency graph, which child is ready,
and the next claim. State that no child was implemented.
