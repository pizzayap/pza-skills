# Evidence template

Save as `docs/verification/issue-<N>/README.md` (or the repo's equivalent).
Write the failure modes section first and commit it before any test or fix.
Fill in results afterwards. Keep scripts that reproduce the run next to it.

```markdown
# Issue #<N>: <short title>

Base: `origin/main` at `<sha>`. These failure modes were written before any
run or fix. Results follow them.

## Already proven (not repeated here)

- <behavior> proven by #<M> in <link to its evidence>.

## Facts checked before writing these

- <config, API behavior, or doc fact>, checked on <date> via <source>.

## Failure modes

| ID | Failure | Expected behavior |
| --- | --- | --- |
| F1 | <what could go wrong> | <what must happen instead> |
| F2 | ... | ... |

## How to rerun

1. `<setup command>`
2. `<test command>`
3. Manual: <steps on device or browser>

## Results

| ID | Red (before fix) | Green (after fix) | Proof level | Artifact |
| --- | --- | --- | --- | --- |
| F1 | fail: <one line> | pass | local E2E | `logs/f1.txt` |
| F2 | fail: <one line> | pass | device | `screens/f2.png` |

## Not covered

- <what was not run, and why>
```

Rules for the artifact:

- Another person must be able to rerun it from the "How to rerun" steps alone.
- No secrets, tokens, real user data, or personal paths. Redact before saving.
- Keep large binaries (recordings, traces, app bundles) out of git if the repo
  has a place for them, and link to them instead.
- Add a new failure mode row when review finds one, and show its red run too.
