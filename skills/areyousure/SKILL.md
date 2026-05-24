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
and forward only bounded, redacted plan context to external reviewers.

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
to select verifiers. If shell execution is unavailable, run only native
verification and report CLI verifiers as skipped.

### 3. Select Verifiers

Explicit flags override settings:

- `--native-only` or deprecated `--claude-only`: native verifier only.
- `--ollama-only`, `--codex-only`, `--opencode-only`, `--kilo-only`,
  `--cursor-only`, `--antigravity-only`: only that CLI verifier class.
- `--custom-only`: custom CLI verifiers only.
- `--cli-only`: enabled CLI verifiers plus custom CLI verifiers, no native.
- `--no-cli`: native verifier only.
- Default: native verifier plus all enabled and installed CLI/custom verifiers.

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

Run eligible CLI verifiers in parallel when supported; otherwise run them
sequentially. All external CLI runs are review-only. Do not pass
approval-skipping flags. Compare `diff-hash` before and after each run; if the
hash changes, stop and ask the user how to proceed.

Ollama:

```bash
OLLAMA_MODEL=$(node "$HOME/.pza-skills/lib/pza-runtime.js" get-reviewer-model ollama 2>/dev/null || node "$HOME/.pza-skills/lib/pza-runtime.js" get-model)
cat "$PROMPT_FILE" | node "$HOME/.pza-skills/lib/pza-runtime.js" ollama-run "$OLLAMA_MODEL"
```

Codex:

```bash
BEFORE_HASH=$(node "$HOME/.pza-skills/lib/pza-runtime.js" diff-hash)
CODEX_MODEL=$(node "$HOME/.pza-skills/lib/pza-runtime.js" get-reviewer-model codex 2>/dev/null || true)
if [ -n "$CODEX_MODEL" ]; then
  cat "$PROMPT_FILE" | codex exec --model "$CODEX_MODEL" -
else
  cat "$PROMPT_FILE" | codex exec -
fi
AFTER_HASH=$(node "$HOME/.pza-skills/lib/pza-runtime.js" diff-hash)
test "$BEFORE_HASH" = "$AFTER_HASH"
```

OpenCode, Kilo Code, Cursor Agent, Antigravity, and custom reviewers follow the
same pattern: use `PROMPT_FILE`, run in review-only mode, and keep custom
reviewer commands inside `run-plan-reviewer` argv arrays.

### 6. Run Native Verifier

If selected, run the native `plan-verifier` agent when available. Otherwise
perform the verification inline.

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

### 8. Apply or Return Corrections

For file-backed plans, ask before editing the plan file. After approved edits,
append verification notes with date, plan source, tools run, confidence,
agreement rate, and findings applied.

For conversation-backed plans, do not edit files. Return a complete replacement
plan when corrections are accepted, followed by verification notes.

If the user asks only for the report, show the merged report and do not rewrite
or edit anything.
