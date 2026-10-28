# Orchestrator templates

Four fixed formats. Fill the angle-bracket fields and keep the rest as written.

## State file

Save it where the user said (`--state <path>`), or next to the project's planning docs. Keep it compact: one row per unit, links instead of content.

```markdown
# Orchestrator state
Goal: <one line>   Updated: <date time tz>
Master: <session id>

## Queue (claim order)
| Unit | Status | Worker | Lane/resources | Evidence | Next |
| --- | --- | --- | --- | --- | --- |
| <unit> | ready / in flight / needs acceptance / accepted / blocked / deferred | <id> | <paths, device> | <links> | <one action> |

## Blockers (owner input needed)
- <unit>: <exact question> (asked <date>; do not re-ask)

## Next action
<one line>
```

## Worker brief

```text
Goal: Complete <unit> only. Do not start other units.
Done so far: <accepted units with commit SHAs or file paths>.
Current source: <branch @ SHA>.
Read first: <guidance file>, <spec or issue>, <closest finished example>.
Scope: you own <paths/resources>. Everything else is read-only.
You are not alone in the repo; preserve others' edits.
Acceptance: <checkable criteria, including real-app or device proof>.
Failure modes first: list them before implementing.
Stop when done or blocked. Report: status, evidence paths, commands run with
results, deviations from this brief, and anything left unverified.
```

## Decision request

```text
Decision needed: <unit>: <what>
Recommendation: <option> because <reason>.
Steps for you:
1. <exact action in the console or account>
2. <what to send back>
Until then: <what stays held>.
```

## Resume prompt

Emit this on any pause or stop so a new master can pick up cold.

```text
Resume as orchestrator for <goal>. Read <state file> first and reconcile it
with live sessions, branches and files before dispatching. Accepted: <n/total>
at <SHA>. In flight: <unit, worker id>. Blocked: <list>. Next: <unit>.
```
