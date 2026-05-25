---
name: arewedone
description: >-
  Run when the user says "are we done", "review my changes", or "check
  completeness", or after implementing features, refactoring code, or making
  significant modifications. Launches structural completeness review, code
  quality review, and configured CLI-backed AI reviews, synthesizes findings,
  then runs proof commands before declaring done.
user-invocable: true
argument-hint: '[--adversarial] [--no-adversarial]'
---

# Are We Done

Completion gate for changed work. Collect context only at invocation time and
only through bounded runtime helpers. Do not use load-time markdown command
injection.

Arguments: `$ARGUMENTS`

## Workflow

### 0. Parse Arguments

- `--adversarial`: force the global adversarial master toggle on for this run only; explicit lane enablement still applies.
- `--no-adversarial`: skip all adversarial lanes for this run.

### 1. Collect Runtime Status

If a shell runner is available, gather status with:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" skill-status arewedone
node "$HOME/.pza-skills/lib/pza-runtime.js" collect-review-context --summary
```

Use this output to decide which reviewer lanes are enabled, installed, and ready.
If the shell runner is unavailable, continue with native review only, but mark
the overall result incomplete because strict CLI reviewer requirements could not
be inspected.

### 2. Launch Reviews

Launch independent reviewers in parallel when the active harness supports it;
otherwise run them sequentially.

- Structural completeness: use `structural-completeness-reviewer`.
- Native code quality: use `code-quality-reviewer` with `mode=native`.
- Backend code quality: use `code-quality-reviewer` with `mode=backend` for each enabled reviewer backend with `state=ready` from `skill-status`.
- Adversarial lanes: launch only lanes marked `effectiveEnabled=true`, unless `--no-adversarial` was passed.
- Enabled reviewer backends with `state=missing` or `state=blocked` are required
  but unavailable; report them as blocked and keep the overall completion result
  incomplete.

Give native agents the summary context from `collect-review-context --summary`.
They may inspect changed files directly, but must not broaden into unrelated
areas unless the change requires it.

Every backend review is review-only. Do not pass approval-skipping
flags such as `--dangerously-skip-permissions`, `--auto`, `--force`, or
equivalent. Backend review execution must go through `run-reviewer`, which
compares `diff-hash` before and after each run. If the hash changes, report
that the reviewer modified the worktree and stop for user direction.

### 3. Backend Reviewer Context

When a backend reviewer needs file context, build it with the runtime helper:

```bash
CONTEXT_FILE=$(mktemp -t pza-review-context.XXXXXX)
PROMPT_FILE=$(mktemp -t pza-review-prompt.XXXXXX)
trap 'rm -f "$CONTEXT_FILE" "$PROMPT_FILE"' EXIT
node "$HOME/.pza-skills/lib/pza-runtime.js" collect-review-context --redacted-diff --max-bytes 40000 --per-file-bytes 8192 > "$CONTEXT_FILE"
```

The helper redacts likely secrets, skips generated/binary paths, and enforces
total and per-file byte caps. Do not duplicate this context collection in the skill.

Backend code review uses the provider/model selected from `skill-status`:

```bash
cat > "$PROMPT_FILE" <<'PZA_REVIEW_PROMPT'
You are a senior code reviewer. Review the attached bounded, redacted git context.

Focus on:
- correctness bugs
- security or secret-handling risks
- portability regressions
- scanner-risky public skill or agent text
- missing validation for changed runtime behavior

Review only. Do not modify files. Report at most 10 findings. Do not quote large code blocks, config files, or token-like values.
PZA_REVIEW_PROMPT
printf '\n' >> "$PROMPT_FILE"
cat "$CONTEXT_FILE" >> "$PROMPT_FILE"
cat "$PROMPT_FILE" | node "$HOME/.pza-skills/lib/pza-runtime.js" run-reviewer code "$PROVIDER" "$MODEL"
```

`run-reviewer` emits `PZA reviewer result: passed|blocked|failed`. Treat
`blocked` and `failed` from an enabled reviewer as incomplete. Use `skipped`
only for disabled lanes or lanes excluded by explicit flags.

### 4. Adversarial Review Lanes

Launch `adversarial-reviewer` for configured lanes. It receives lane metadata
from `skill-status` and runs each enabled lane through `run-reviewer
adversarial`.

Each lane result must include stable metadata:

```text
=== PZA ADVERSARIAL LANE START ===
id: <lane-id>
provider: <provider>
model: <model>
status: approve|needs-attention|blocked|skipped|error
=== PZA ADVERSARIAL LANE OUTPUT ===
<concise reviewer result or skip/error reason>
=== PZA ADVERSARIAL LANE END ===
```

### 5. Synthesize Findings

Merge all launched reviews into one report:

- Deduplicate by file, claim, and recommended fix.
- Findings reported by two or more independent reviewers are high confidence.
- Findings reported by one reviewer are medium confidence.
- Security findings corroborated by a quality reviewer and an adversarial lane
  are highest priority.
- Keep skipped and blocked lanes visible, but do not count them as findings.
- A blocked enabled reviewer prevents declaring the strict review complete.

Only include short snippets when necessary to identify the issue. Do not echo
large code blocks, config files, tokens, or redacted values.

### 6. Fix or Defer

If reviewers found issues, ask the user how to proceed:

- Fix all.
- Fix critical and warning findings only.
- Skip fixes and record findings in `REVIEW-BACKLOG.md`.

For deferred findings, append a dated section to `REVIEW-BACKLOG.md` instead of
overwriting it.

### 7. Proof

Run relevant proof commands before declaring completion. Detect scripts and
ecosystem commands from manifests such as `package.json`, `Cargo.toml`,
`go.mod`, `pyproject.toml`, `Makefile`, or `deno.json`.

Default command order:

1. typecheck/check
2. lint
3. build
4. test

If no proof commands are discoverable, ask the user for commands or explicitly
report that the work is complete but unverified by automated checks.

### 8. Review Marker

After the workflow completes successfully with no blocked required reviewers,
write the review marker:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" mark-reviewed arewedone
```

Report changed files reviewed, findings fixed or deferred, proof commands run,
and any skipped or blocked reviewer lanes.
