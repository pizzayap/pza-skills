---
name: codex-review
description: >-
  Run a Codex code review with smart fallback. Reviews uncommitted changes when
  dirty; falls back to HEAD~1..HEAD when clean. Supports --wait and --background.
user-invocable: true
argument-hint: '[--wait|--background]'
---

# Codex Review with Fallback

Companion script path:
!`ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1`

Arguments:
`$ARGUMENTS`

## Core Constraint

- This is a **review-only** command. Do not fix issues, apply patches, or suggest you are about to make changes.
- Your only job is to run the review and return Codex's output verbatim.
- The actual review is performed by Codex (GPT model), not Claude. Claude only determines which scope to use.

## Pre-check

If the companion script path above resolves to nothing (empty output), tell the user:

> "Codex companion script not found. Is the openai-codex plugin installed? Run `/codex:setup` to configure it."

**Stop here** — do not attempt further steps without a valid companion script path.

## Step 1 — Determine Review Scope

Run these commands to assess the current git state:

```bash
# Check for staged changes (exit 1 = has staged changes)
git diff --cached --quiet 2>/dev/null; echo "staged_exit=$?"

# Check for unstaged changes (exit 1 = has unstaged changes)
git diff --quiet 2>/dev/null; echo "unstaged_exit=$?"

# Check for untracked files
if [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then echo "has_untracked=yes"; else echo "has_untracked=no"; fi
```

Evaluate the results:
- If `staged_exit=1`, `unstaged_exit=1`, or `has_untracked=yes` — the working tree is **dirty** (has uncommitted changes).
- Otherwise, the working tree is **clean**.

### If working tree is dirty (has uncommitted changes)

Use **working-tree** scope. The companion script will review all uncommitted changes.

```bash
node "<companion-script-path>" review --scope auto
```

### If working tree is clean (no uncommitted changes)

Check if there is a previous commit and whether it has a diff:

```bash
# Check if HEAD~1 exists (fails for single-commit, zero-commit, orphan branches, shallow clones)
git rev-parse HEAD~1 2>/dev/null; echo "head1_exit=$?"
```

- If `head1_exit` is non-zero: there is no parent commit to diff against. Tell the user:

> "The working tree is clean and there is no parent commit to review against (single-commit repo, orphan branch, or shallow clone). Nothing to review."

**Stop here** — do not attempt further review modes.

- If `head1_exit=0`: check if the last commit has actual changes:

```bash
git diff --quiet HEAD~1 HEAD 2>/dev/null; echo "diff_exit=$?"
```

- If `diff_exit=1` (there IS a diff): run the review against the last commit:

```bash
node "<companion-script-path>" review --base HEAD~1
```

- If `diff_exit=0` (empty diff — e.g. merge commit with no changes): tell the user:

> "The working tree is clean and the last commit has no diff (e.g. an empty merge commit). Nothing to review."

**Stop here.**

## Step 2 — Execution Mode

Determine how to run the review based on the user's arguments:

### If arguments include `--wait`

Run the review command in the **foreground**. Do not ask the user. Include `--wait` in the companion script arguments.

### If arguments include `--background`

Run the review command in the **background** using `Bash(run_in_background: true)`. Do not ask the user. Note: `--background` is a signal to the agent about execution mode — the companion script always runs reviews in foreground; background mode is achieved by Claude's Bash tool. After launching, tell the user:

> "Codex review started in the background. Check `/codex:status` for progress."

### Otherwise (no explicit mode)

Estimate the review size before asking:

- For working-tree review: check `git status --short --untracked-files=all`, `git diff --shortstat --cached`, and `git diff --shortstat`
- For branch review (last-commit fallback): use `git diff --shortstat HEAD~1...HEAD`
- Treat untracked files or directories as reviewable work even when `git diff --shortstat` is empty
- Only conclude there is nothing to review when the relevant working-tree status is empty or the explicit branch diff is empty
- Recommend **waiting** only when the review is clearly tiny (1-2 files, no broader directory-sized change)
- In every other case, recommend **background**
- When in doubt, run the review instead of declaring there is nothing to review

Then use **AskUserQuestion** exactly once with two options, putting the recommended option first and suffixing its label with `(Recommended)`:

```yaml
question: "How should we run the Codex review?"
options:
  - label: "Wait for results"
    description: "Run the review in the foreground and wait for completion"
  - label: "Run in background (Recommended)"
    description: "Launch the review in the background; check /codex:status for progress"
```

If the user chooses "Wait for results", run the command in the foreground.
If the user chooses "Run in background", run with `Bash(run_in_background: true)`.

## Step 3 — Return Results

### Foreground flow

- Run the companion script command determined in Step 1 (with appropriate flags from Step 2).
- Return the command stdout **verbatim**, exactly as-is.
- Do not paraphrase, summarize, or add commentary before or after it.
- Do not fix any issues mentioned in the review output.

### Background flow

- Launch the command with `Bash(run_in_background: true)`.
- After launching, tell the user: "Codex review started in the background. Check `/codex:status` for progress."
