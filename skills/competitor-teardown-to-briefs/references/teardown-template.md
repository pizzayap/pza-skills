# Teardown template

One file per competitor, for example `docs/teardowns/<competitor>-<date>.md`.

```markdown
# Teardown: <competitor>

**Reviewed:** <date>
**Evidence:** live page <url> | screenshots supplied by the user
**Could not see:** <logged-in areas, paid tiers, mobile app>

## Funnel snapshot
<One line: hero CTA, free first use, paid tier for X, referral loop>

## Positioning to keep
<What the product does differently and must not give up to match them>

## Section by section
| Section | What they do | Product today | Brief |
| --- | --- | --- | --- |
| <section> | <observation> | <file, route or None> | <brief file, skip: reason, or already match> |

## Already matched (no new brief)
- <feature>: <where it lives in the product>

## Suggestions
### Marketing trust
1. **<name>**. Inspiration: <what they do>. Adaptation: <the product's version, in its voice, mapped to a real feature>.
### Product UX
### Growth
### SEO
### Deferred
- **<name>**: excluded by the PRD because <reason>; gets a "Deferred, do not build" brief.

## Skipped
| Idea | Reason |
| --- | --- |
| <idea> | out of scope / already matched / conflicts with positioning / rejected by the user |

## Order
1. <prerequisite>
2. <highest-trust or highest-impact item>
3. <growth loop>

## Copy guardrails
- <banned words and claims from the copy guide that apply to every brief>
- No invented social proof, testimonials or metrics.
```
