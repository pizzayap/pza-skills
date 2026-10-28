# Decision record

Use this for issues that ask "should we", "evaluate", "choose" or "spike". The deliverable is a record the team can act on later, not code.

Save as `docs/decisions/issue-<N>-<slug>.md`, or in the repo's ADR folder if it has one (an ADR, architecture decision record, is a short dated note of one decision and why).

```markdown
# <Decision title> (#<N>)

Status: adopt | defer | reject   Date: YYYY-MM-DD

## Question

<The question from the issue, in one or two sentences.>

## Evidence and its limits

- Measured: <what was actually run or observed, with links>
- Simulated: <what was only estimated or prototyped>
- Unknown: <what nobody checked yet>

## Options compared

| Option | Cost | Risk | Data handling | Notes |
| --- | --- | --- | --- | --- |
| <A> | ... | ... | ... | ... |
| <B> | ... | ... | ... | ... |

## Outcome

<Why this status, in a short paragraph.>

## Reopen when

- <Concrete trigger, e.g. "monthly volume passes 10k" or "vendor ships SSO">

## Not authorized by this record

- <Spend, deploys, new accounts, or vendor sign-ups this record does not approve>
```

Rules:

- Separate measured from simulated. A record that blurs them reads as stronger than it is.
- Every "Reopen when" line is checkable by someone who wasn't in the discussion.
- `defer` and `reject` are full outcomes. Close the issue after the record merges.
