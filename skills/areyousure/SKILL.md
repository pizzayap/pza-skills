---
name: areyousure
description: >-
  Run when the user says "are you sure", "are you sure about the plan",
  "double-check the plan", "verify plan", "deep check the plan", or "validate
  the plan". Re-validates the current implementation plan against the codebase
  and current stable APIs by launching native and configured CLI-backed
  verifiers, then merges findings with confidence scores and applies or returns
  corrections.
user-invocable: true
argument-hint: '[--native-only|--claude-only|--ollama-only|--codex-only|--opencode-only|--kilo-only|--cursor-only|--antigravity-only|--cli-only|--no-cli|--custom-only]'
---

# Are You Sure

Plan verification gate. Collect runtime status only when this skill is invoked,
and forward only bounded, redacted plan context to backend reviewers.

Arguments: `$ARGUMENTS`

## Workflow

### 1. Resolve Plan Content

Resolve exactly one plan and label it with `planSource`:

1. Explicit user-supplied path or pasted content.
2. Current harness authoritative plan file, when exposed.
3. Latest complete plan in the current conversation, preferring a
   `<proposed_plan>...</proposed_plan>` block.
4. Relevant repo plan-like markdown file.

Use `planSource=conversation-backed` for conversation plans and
`planSource=file-backed` for file plans. If no plan is available, ask the user
for a plan path or pasted plan content.

For file-backed plans, read the plan file. For conversation-backed plans,
materialize a temporary file under `/tmp` only if a CLI reviewer needs a file.
Never write conversation-backed plans into the repository.

### 2. Collect Runtime Status

If a shell runner is available, gather status with:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" skill-status areyousure
```

Use the returned reviewer settings, CLI availability, and custom reviewer list
to select verifiers. If shell execution is unavailable, run native verification
only, but mark the overall result incomplete unless the user explicitly selected
`--native-only` or `--no-cli`.

### 3. Select Verifiers

Explicit flags override settings:

- `--native-only` or deprecated `--claude-only`: native verifier only.
- `--ollama-only`, `--codex-only`, `--opencode-only`, `--kilo-only`,
  `--cursor-only`, `--antigravity-only`: only that CLI verifier class.
- `--custom-only`: custom CLI verifiers only.
- `--cli-only`: enabled CLI verifiers plus custom CLI verifiers, no native.
- `--no-cli`: native verifier only.
- Default: native verifier plus all enabled CLI/custom verifiers. Enabled CLI
  verifiers are required: if `skill-status` reports `state=missing` or
  `state=blocked`, report the verifier as blocked and the strict check as
  incomplete.

Do not silently fall back from an explicit `--*-only` request. Report why the
requested verifier was unavailable.

### 4. Prepare Bounded Reviewer Context

All CLI verifiers must use the runtime prompt builder:

```bash
PROMPT_FILE=$(mktemp -t pza-plan-review-prompt.XXXXXX)
trap 'rm -f "$PROMPT_FILE"' EXIT
node "$HOME/.pza-skills/lib/pza-runtime.js" plan-review-prompt "$PLAN_FILE" "$PLAN_SOURCE" > "$PROMPT_FILE"
```

`plan-review-prompt` redacts likely secrets and caps plan content at 20 KB
before forwarding it. To inspect the bounded context directly, use:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" collect-plan-context "$PLAN_FILE" "$PLAN_SOURCE" --max-bytes 20000
```

For conversation-backed plans, pass `-` only when the harness can provide stdin
without shell interpolation:

```bash
printf '%s' "$PLAN_CONTENT" | node "$HOME/.pza-skills/lib/pza-runtime.js" plan-review-prompt - "$PLAN_SOURCE"
```

Do not use command substitution to embed plan content in shell arguments.

### 5. Run CLI Verifiers

Run eligible backend verifiers in parallel when supported; otherwise run them
sequentially. All backend runs are review-only. Do not pass approval-skipping
flags. Backend runs must go through `run-reviewer`, which compares `diff-hash`
before and after each run; if the hash changes, stop and ask the user how to
proceed.

Backend verifier:

```bash
cat "$PROMPT_FILE" | node "$HOME/.pza-skills/lib/pza-runtime.js" run-reviewer plan "$PROVIDER" "$MODEL"
```

Custom plan reviewers stay on their local argv-array path:

```bash
cat "$PROMPT_FILE" | node "$HOME/.pza-skills/lib/pza-runtime.js" run-plan-reviewer "$CUSTOM_REVIEWER_NAME"
```

`run-reviewer` and `run-plan-reviewer` emit `PZA reviewer result:
passed|blocked|failed`. Treat `blocked` and `failed` from an enabled or
explicitly requested verifier as an incomplete strict check. Use `skipped` only
for disabled verifiers or verifiers excluded by an explicit flag.

### 6. Run Native Verifier

If selected, run `plan-verifier` with `mode=native` when available. For backend
verification, run the same agent with `mode=backend`, or perform the forwarding
inline with the `run-reviewer plan` helper when the harness cannot pass mode
metadata to agents.

Use the resolved plan plus a short project-conventions excerpt from `AGENTS.md`
or `CLAUDE.md`. If the plan came from a file and may contain secrets, prefer the
output of `collect-plan-context` rather than pasting the raw file.

### 7. Merge Findings

Merge verifier reports:

- Critical, Warning, Info, Unverifiable, and Verified Correct items.
- Deduplicate by affected claim and correction.
- Multiple-source findings are high confidence.
- Single-source findings are medium confidence.
- Disagreements are low confidence and should show both perspectives.

Also list skipped verifiers with the skip reason.
Also list blocked verifiers with the blocker or run-result reason. A blocked
enabled verifier is not a finding against the plan, but it prevents declaring
the strict verification complete.

### 8. Apply or Return Corrections

For file-backed plans, ask before editing the plan file. After approved edits,
append verification notes with date, plan source, tools run, confidence,
agreement rate, and findings applied.

For conversation-backed plans, do not edit files. Return a complete replacement
plan when corrections are accepted, followed by verification notes.

If the user asks only for the report, show the merged report and do not rewrite
or edit anything.
