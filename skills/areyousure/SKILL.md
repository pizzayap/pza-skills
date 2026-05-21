---
name: areyousure
description: >-
  Run when the user says "are you sure", "are you sure about the plan",
  "double-check the plan", "verify plan", "deep check the plan", or "validate
  the plan". Re-validates the current implementation plan against the codebase
  and current stable APIs by launching native and CLI-backed verifiers, then
  merges findings with confidence scores and applies or returns corrections.
user-invocable: true
argument-hint: '[--native-only|--claude-only|--ollama-only|--codex-only|--cli-only|--no-cli|--custom-only]'
---

# Session Context

Recent plan-like markdown files (best effort only):
!`{ find . -maxdepth 4 -type f \\( -path './.opencode/plans/*.md' -o -iname '*plan*.md' -o -iname 'PLAN.md' \\) 2>/dev/null; ls -t ~/.codex/plans/*.md ~/.Codex/plans/*.md ~/.claude/plans/*.md 2>/dev/null; } | head -10`

Project instructions:
!`{ test -f ./AGENTS.md && echo "AGENTS.md - $(wc -l < ./AGENTS.md) lines"; test -f ./CLAUDE.md && echo "CLAUDE.md compatibility - $(wc -l < ./CLAUDE.md) lines"; } || true`

Ollama enabled:
!`node ./lib/pza-runtime.js get-setting ollama 2>/dev/null || echo "yes"`

Ollama available:
!`which ollama >/dev/null 2>&1 && echo "yes" || echo "no"`

Ollama model:
!`node ./lib/pza-runtime.js get-model 2>/dev/null || echo "kimi-k2.6:cloud"`

Codex enabled:
!`node ./lib/pza-runtime.js get-setting codex 2>/dev/null || echo "yes"`

Codex CLI available:
!`which codex >/dev/null 2>&1 && echo "yes" || echo "no"`

Custom plan reviewers:
!`node ./lib/pza-runtime.js plan-reviewers 2>/dev/null || echo '{"reviewers":[]}'`

Working directory:
!`pwd`

Arguments:
$ARGUMENTS

# Workflow

## Step 1 - Resolve Plan Content

Resolve a single plan and label it with `planSource`:

1. **Explicit path/content** - If the user supplied a plan path or pasted plan content, use that.
2. **Harness authoritative plan file** - Use current harness metadata when exposed. In OpenCode, prefer `.opencode/plans/*.md` when present because plan mode may store the working plan there.
3. **Current conversation** - If no harness plan file is available and a plan exists in the current chat, use the latest complete plan. Prefer the latest `<proposed_plan>...</proposed_plan>` block. If no tag exists, use the latest assistant message that is clearly an implementation plan.
4. **Project/repo plan file** - Use the most relevant recent plan-like markdown file from the list shown above.
5. **Legacy fallback** - Use the most recently modified file under `~/.claude/plans/` only when no conversation, Codex, OpenCode, or project plan is available.

Set:
- `planSource=conversation-backed` when the plan comes from the current chat.
- `planSource=file-backed` when the plan comes from a path.
- `planPath=<path>` only for file-backed plans.
- `planContent=<full plan text>` for all plans.

**Early exit guard:** If no plan path or plan content is found, stop immediately and ask the user to provide a plan path or paste the plan content.

Once the plan is resolved:
- If file-backed, read the plan file in full.
- If conversation-backed, do not invent a plan file as the source of truth. Only materialize a temporary copy under `/tmp` if a CLI verifier needs stdin.
- If `./AGENTS.md` exists, read it for project conventions. If absent, read `./CLAUDE.md` as a compatibility fallback. If the file is longer than 200 lines, read only the first 200 lines for context.

## Step 2 - Select Verifiers

Check Arguments from Session Context. Explicit flags override `pza-settings.json`.

Verifier types:
- **Native verifier** - `plan-verifier`, always available unless `--cli-only`, `--ollama-only`, `--codex-only`, or `--custom-only` is used.
- **Ollama CLI verifier** - run when Ollama is enabled and `which ollama` succeeds, or when `--ollama-only` is explicit.
- **Codex CLI verifier** - run when Codex is enabled and `which codex` succeeds, or when `--codex-only` is explicit.
- **Custom CLI verifiers** - enabled reviewers from `~/.pza-skills/plan-reviewers.json`, run by default and with `--cli-only`/`--custom-only`.

Flag behavior:
- `--native-only` or deprecated `--claude-only`: native verifier only.
- `--ollama-only`: Ollama CLI verifier only.
- `--codex-only`: Codex CLI verifier only.
- `--custom-only`: custom CLI verifiers only.
- `--cli-only`: Ollama CLI + Codex CLI + custom CLI verifiers, no native verifier.
- `--no-cli`: native verifier only.
- Default: native verifier + all enabled and available CLI verifiers.

If a named verifier agent is not callable in the active harness, do not skip the corresponding CLI verifier. If a shell/tool runner is available, run the CLI lane directly from this workflow. If no shell/tool runner is available, report that CLI verifier as `skipped - shell unavailable` and continue with native verification.

If Ollama is enabled but not installed, report `Ollama skipped - not installed`. If explicit `--ollama-only` was requested, stop after reporting the skip.

If Codex is enabled but not installed, report `Codex skipped - not installed`. If Codex returns an authentication error, report `Codex skipped - not authenticated`.

After applying flags and availability checks, if zero verifiers are selected, stop with a clear message:

> Plan verification skipped - no selected verifiers are available.

For explicit `--ollama-only`, `--codex-only`, `--custom-only`, or `--cli-only`, do not silently fall back to native verification unless the user asks for a fallback. Report which requested verifier class was unavailable.

## Step 2.1 - Prepare CLI Prompt

CLI verifiers receive the same plan-review prompt. For file-backed plans, use `planPath` directly. For conversation-backed plans, materialize `planContent` to a temporary file under `/tmp` only for the duration of CLI review.

Rules for temporary plan files:
- Never write conversation-backed plans into the repo.
- Prefer a harness file-write primitive for `/tmp` when available.
- If the harness can pass `planContent` directly to a process on stdin without shell interpolation, the runtime also accepts `-` as the plan file: `node ./lib/pza-runtime.js plan-review-prompt - "$PLAN_SOURCE"`.
- If the plan cannot be materialized safely, skip CLI verifiers with `skipped - unable to materialize conversation plan safely`.
- Clean up all temporary plan and prompt files.

Each CLI verifier command must build the prompt and run the verifier in the same shell call. Do not create `PROMPT_FILE` in one shell call and consume it in a later shell call.

Build the CLI prompt with the runtime helper instead of hand-assembling prompt text in shell:

```bash
PROMPT_FILE=$(mktemp -t pza-plan-review-prompt.XXXXXX)
trap 'rm -f "$PROMPT_FILE"' EXIT
node ./lib/pza-runtime.js plan-review-prompt "$PLAN_FILE" "$PLAN_SOURCE" > "$PROMPT_FILE"
```

Use `PLAN_SOURCE` as `conversation-backed`, `file-backed`, or a more specific label such as `conversation-backed:codex`.

## Step 2.2 - Run CLI Verifiers

Run all eligible CLI verifiers in parallel when the active harness supports parallel tool calls; otherwise run them sequentially.

**Ollama CLI:**

```bash
PROMPT_FILE=$(mktemp -t pza-plan-ollama.XXXXXX)
trap 'rm -f "$PROMPT_FILE"' EXIT
node ./lib/pza-runtime.js plan-review-prompt "$PLAN_FILE" "$PLAN_SOURCE" > "$PROMPT_FILE"
cat "$PROMPT_FILE" | node ./lib/pza-runtime.js ollama-run <ollama-model>
```

Replace `<ollama-model>` with the model from Session Context.

**Codex CLI:**

```bash
PROMPT_FILE=$(mktemp -t pza-plan-codex.XXXXXX)
trap 'rm -f "$PROMPT_FILE"' EXIT
node ./lib/pza-runtime.js plan-review-prompt "$PLAN_FILE" "$PLAN_SOURCE" > "$PROMPT_FILE"
cat "$PROMPT_FILE" | codex exec -
```

Use `codex exec`, not `codex review`, because plan verification uses a custom prompt and does not review only a git diff.

**Custom CLI reviewers:**

List configured reviewers with:

```bash
node ./lib/pza-runtime.js plan-reviewers
```

For each enabled reviewer:

```bash
PROMPT_FILE=$(mktemp -t pza-plan-custom.XXXXXX)
trap 'rm -f "$PROMPT_FILE"' EXIT
node ./lib/pza-runtime.js plan-review-prompt "$PLAN_FILE" "$PLAN_SOURCE" > "$PROMPT_FILE"
cat "$PROMPT_FILE" | node ./lib/pza-runtime.js run-plan-reviewer "<reviewer-name>"
```

The runtime executes custom commands as argv arrays from `~/.pza-skills/plan-reviewers.json`; do not convert custom commands to shell strings.

## Step 2.3 - Launch Native Verifier

Launch the native verifier if selected.

If the active harness exposes the plugin agent named `plan-verifier`, launch it. Otherwise use the closest read-only subagent/delegation tool available, or perform the native verification inline.

Prompt:

```text
You are verifying this implementation plan against current documentation.

Working directory: [pwd from session context above]
Plan source: [planSource]

Plan content:
[paste planContent here]

Project conventions (AGENTS.md or compatibility excerpt):
[paste AGENTS.md content here, or CLAUDE.md compatibility content if AGENTS.md is absent]

Return a structured verification report. Do NOT modify any files.
```

Tell the user which verifiers are launching, for example: "Launching plan verification with native, Ollama CLI, Codex CLI, and 1 custom reviewer..."

## Step 3 - Merge Findings

Once all selected verifiers return, merge their reports. Skip merge only when exactly one verifier ran.

1. Extract Critical, Warning, Info, Unverifiable, and Verified Correct items from each verifier.
2. Deduplicate findings by the affected claim and correction.
3. Mark findings reported by multiple verifiers as HIGH confidence.
4. Mark findings reported by one verifier as MEDIUM confidence with a source label.
5. If reviewers disagree on the same claim, include both perspectives with LOW confidence.
6. Calculate agreement rate as overlapping findings divided by total unique findings.

Include skipped verifiers separately from findings so missing tools are visible but do not reduce plan confidence.

## Step 4 - Present Findings

Display a summary table using only verifiers that were selected:

| Severity | Count | Source Breakdown |
|----------|-------|------------------|
| Critical | N | Native: X, Ollama: Y, Codex: Z, Custom: W, Multiple: V |
| Warning | N | Native: X, Ollama: Y, Codex: Z, Custom: W, Multiple: V |
| Info | N | Native: X, Ollama: Y, Codex: Z, Custom: W, Multiple: V |
| Verified Correct | N | - |
| Unverifiable | N | - |

Then show:
- **Agreement rate:** X/Y findings overlapped
- **Skipped verifiers:** list tool, reason, and whether the user explicitly requested it
- **Overall confidence:** HIGH/MEDIUM/LOW
- **Summary:** one short paragraph

If zero Critical + Warning findings: tell the user the plan looks solid, show the Verified Correct list, and stop.

## Step 5 - User Choice

Use the active harness's user-input tool when available. If not available, ask a concise direct question.

For file-backed plans:

```yaml
question: "How should we update the plan with these findings?"
options:
  - label: "Apply all corrections"
    description: "Update the plan with all Critical, Warning, and Info corrections"
  - label: "Apply critical + warning only"
    description: "Update plan with high-severity items; append Info findings as notes"
  - label: "Show full report only"
    description: "Display the complete verification report without modifying the plan"
```

For conversation-backed plans:

```yaml
question: "How should we handle these findings?"
options:
  - label: "Return corrected replacement plan"
    description: "Rewrite the conversation plan with all accepted corrections"
  - label: "Return critical + warning replacement"
    description: "Rewrite only high-severity corrections and list Info findings below"
  - label: "Show full report only"
    description: "Display the complete verification report without rewriting the plan"
```

## Step 6 - Apply or Return Corrections

### File-backed plans

Edit the plan file using the merged "Suggested Plan Updates" section. Each update should specify:
- The plan section to edit
- The exact current text to replace
- The corrected replacement text

After edits, append:

```markdown
## Verification Notes

**Verified:** [date]
**Plan source:** file-backed
**Confidence:** [HIGH/MEDIUM/LOW]
**Tools:** [native, Ollama CLI, Codex CLI, custom reviewer names actually run]
**Agreement rate:** X/Y findings overlapped
**Summary:** [one sentence]
**Findings applied:** [Critical: N, Warning: N, Info: N if applied]
```

For "Apply critical + warning only", append `## Info Findings (Deferred)` with the info-level items.

### Conversation-backed plans

Do not edit files. Return a complete replacement plan in the response, followed by:

```markdown
## Verification Notes

**Verified:** [date]
**Plan source:** conversation-backed
**Confidence:** [HIGH/MEDIUM/LOW]
**Tools:** [native, Ollama CLI, Codex CLI, custom reviewer names actually run]
**Agreement rate:** X/Y findings overlapped
**Summary:** [one sentence]
**Findings applied:** [Critical: N, Warning: N, Info: N if applied]
```

For "Return critical + warning replacement", include `## Info Findings (Deferred)` after the replacement plan.

### Show full report only

Display the complete verifier reports and merged report. Do not modify files and do not rewrite the conversation plan.
