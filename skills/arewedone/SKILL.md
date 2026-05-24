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

Use this output to decide which reviewer lanes are enabled and installed. If the
shell runner is unavailable, continue with native review only and state that CLI
reviewers were skipped because runtime status could not be collected.

### 2. Launch Reviews

Launch independent reviewers in parallel when the active harness supports it;
otherwise run them sequentially.

- Structural completeness: use `structural-completeness-reviewer`.
- Code quality: use `code-quality-reviewer`.
- Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity: launch only when enabled and installed in `skill-status`.
- Adversarial lanes: launch only lanes marked `effectiveEnabled=true`, unless `--no-adversarial` was passed.

Give native agents the summary context from `collect-review-context --summary`.
They may inspect changed files directly, but must not broaden into unrelated
areas unless the change requires it.

Every external CLI-backed review is review-only. Do not pass approval-skipping
flags such as `--dangerously-skip-permissions`, `--auto`, `--force`, or
equivalent. Compare `diff-hash` before and after each external CLI run. If the
hash changes, report that the reviewer modified the worktree and stop for user
direction.

### 3. External Reviewer Context

When a CLI reviewer needs file context, build it with the runtime helper:

```bash
CONTEXT_FILE=$(mktemp -t pza-review-context.XXXXXX)
trap 'rm -f "$CONTEXT_FILE"' EXIT
node "$HOME/.pza-skills/lib/pza-runtime.js" collect-review-context --redacted-diff --max-bytes 40000 --per-file-bytes 8192 > "$CONTEXT_FILE"
```

The helper redacts likely secrets, skips generated/binary paths, and enforces
total and per-file byte caps. Do not duplicate this context collection in the skill.

For Ollama:

```bash
BEFORE_HASH=$(node "$HOME/.pza-skills/lib/pza-runtime.js" diff-hash)
OLLAMA_MODEL=$(node "$HOME/.pza-skills/lib/pza-runtime.js" get-reviewer-model ollama 2>/dev/null || node "$HOME/.pza-skills/lib/pza-runtime.js" get-model)
cat "$CONTEXT_FILE" | node "$HOME/.pza-skills/lib/pza-runtime.js" ollama-run "$OLLAMA_MODEL"
AFTER_HASH=$(node "$HOME/.pza-skills/lib/pza-runtime.js" diff-hash)
test "$BEFORE_HASH" = "$AFTER_HASH"
```

For Codex code review, prefer the dedicated `codex-code-reviewer` agent. For
other configured CLIs, pass `"$CONTEXT_FILE"` using their file/stdin review-only
mode. If a CLI is missing, unauthenticated, or unsupported, report that lane as
skipped rather than failing the whole review.

### 4. Adversarial Review Lanes

Group adversarial lanes by provider. Launch one provider group per agent where a
dedicated agent exists:

- `ollama-adversarial-reviewer`
- `codex-adversarial-reviewer`

For OpenCode, Kilo Code, Cursor Agent, and Antigravity, use a read-only
general-purpose wrapper with the same `collect-review-context --redacted-diff`
context file. Antigravity may run only if local help documents a safe
non-interactive prompt, file, or stdin form.

Each lane result must include stable metadata:

```text
=== PZA ADVERSARIAL LANE START ===
id: <lane-id>
provider: <provider>
model: <model>
status: approve|needs-attention|skipped|error
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
- Keep skipped lanes visible, but do not count skips as findings.

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

After the workflow completes, write the review marker:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" mark-reviewed arewedone
```

Report changed files reviewed, findings fixed or deferred, proof commands run,
and any skipped reviewer lanes.
