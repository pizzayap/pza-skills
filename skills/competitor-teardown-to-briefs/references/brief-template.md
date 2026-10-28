# Brief template

One file per change. A brief must be buildable by someone who has not read
the teardown.

```markdown
# TODO: <change name>

**Status:** Backlog | Partial | Shipped | Deferred, do not build
**Priority:** <phase or P-level>
**App:** <packages or apps touched>
**Related:** <PRD, copy guide, prerequisite briefs>
**Inspired by:** <competitor page or section, date seen>

## Why (competitor context)
What they do and why it seems to work for them. One short paragraph.

## Current state
What the product has today, with file paths or routes. "None" if nothing.

## Goal
The outcome, in the product's voice and positioning.

## Approach
The smallest workable build. Name data sources, components and copy rules.

## Acceptance criteria
- [ ] <observable, testable result>
- [ ] Copy passes the project's banned-words check
- [ ] Empty, loading and failure states handled
- [ ] Mobile and accessibility checked

## Out of scope
What this brief will not do.

## Risks and dependencies
Prerequisites, privacy or security review, data thresholds.

## Open decisions
Questions the owner must answer before or during the build.
```

For a deferred brief, replace Approach with "Why it is deferred" and write
the criteria as "when revisited" so the reasoning survives.

## Weak and strong criteria

| Weak ❌ | Strong ✅ |
| --- | --- |
| Hero feels more trustworthy | Hero shows the live count of projects, hidden below 50 |
| Onboarding is improved | A new user reaches the first export in 3 steps or fewer |
| Works on mobile | No horizontal scroll at 360px; tap targets at least 44px |

## Backlog README

`docs/todos/README.md`:

```markdown
# Backlog

| Brief | Status | Summary |
| --- | --- | --- |
| [marketing-live-demo](marketing-live-demo.md) | Backlog | Working demo in the hero |

## Recommended order
1. <prerequisite brief>
2. <brief>

## Deferred
- [<brief>](<file>): <why it is deferred>

## Skipped
- <idea>: <reason>

Shipped briefs: [done/](done/README.md)
```
