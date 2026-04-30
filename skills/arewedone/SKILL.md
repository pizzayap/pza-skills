---
name: arewedone
description: >-
  Run when the user says "are we done", "review my changes", or "check
  completeness", or after implementing features, refactoring code, or making
  significant modifications. Launches structural completeness review, code
  standards review, AND Codex code review in parallel, then synthesizes findings.
user-invocable: true
---

# Session Changes Context

Session-tracked files (this session only):
!`cat "/tmp/claude-session-${CLAUDE_SESSION_ID}-files.json" 2>/dev/null | node -e "JSON.parse(require('fs').readFileSync(0,'utf8')).forEach(f=>console.log(f))" || { echo "(no session tracking - showing git status)"; git status --short; }`

Changed files summary (session-scoped):
!`if [ -f "/tmp/claude-session-${CLAUDE_SESSION_ID}-files.json" ]; then FILES=$(cat "/tmp/claude-session-${CLAUDE_SESSION_ID}-files.json" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).join(' '))"); git diff --stat -- $FILES 2>/dev/null || echo "No git diff available"; else git diff --stat; fi`

Codex companion script:
!`ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1`

# Workflow

## 1. Launch All Three Reviews in Parallel

Launch **all three** review agents simultaneously in a single message with three Agent tool calls:

### Agent A: Structural Completeness Review (`structural-completeness-reviewer`)

Provide context about what files changed (shown above). This agent verifies:
- Changes are fully integrated across all layers
- Old code is properly removed (no orphaned functions/imports)
- No technical debt introduced
- Structural integrity maintained

### Agent B: Code Standards Review (`superpowers:code-reviewer`)

Provide context about what files changed (shown above). This agent verifies:
- Code follows project conventions from CLAUDE.md
- Implementation aligns with the original plan (if one exists)
- No style violations, anti-patterns, or best-practice issues
- Code quality meets project standards

### Agent C: Codex Code Review (general-purpose agent)

Launch a **general-purpose** agent that runs the Codex code review against the current git state. Include the companion script path from the session context above in the agent prompt.

The agent's prompt should instruct it to:

1. **Determine review scope** by checking for uncommitted changes:
   ```bash
   git diff --cached --quiet 2>/dev/null; echo "staged=$?"
   git diff --quiet 2>/dev/null; echo "unstaged=$?"
   [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ] && echo "untracked=yes" || echo "untracked=no"
   ```

2. **If uncommitted changes exist** (staged or unstaged non-zero exit, or untracked=yes), run:
   ```bash
   node "<companion-script-path>" review --wait --scope auto
   ```

3. **If no uncommitted changes** (clean working tree), check for a previous commit:
   ```bash
   git rev-parse HEAD~1 2>/dev/null && echo "has_prev=yes" || echo "has_prev=no"
   ```
   - If `has_prev=yes`: also verify the diff is non-empty:
     ```bash
     git diff --quiet HEAD~1 HEAD 2>/dev/null; echo "diff_exit=$?"
     ```
     - If `diff_exit=1` (has changes): run the review against the last commit. Agent C always uses `--wait` since it must block until the result is available for synthesis:
       ```bash
       node "<companion-script-path>" review --wait --base HEAD~1
       ```
     - If `diff_exit=0` (empty diff — e.g. merge commit with no changes): report "Codex review skipped — last commit has no diff."
   - If `has_prev=no` (single-commit repo, orphan branch, or shallow clone): report "Codex review skipped — clean working tree with no parent commit to review against."

4. Return the full review output verbatim — verdict, findings, summary, and all details.
5. Do NOT fix any issues or apply patches — review only.
6. If the script is not found, Codex is not authenticated, or the command fails, report that the Codex review was skipped and include the error message.

**IMPORTANT**: All three agents MUST be launched in the same message (parallel Agent tool calls). Do NOT run them sequentially. Wait for all three to complete before proceeding.

## 2. Converge: Synthesize All Three Reviews

After **all three** agents return, synthesize their results into a single unified report:

1. **Summary table** with pass/fail for each review dimension:
   | Review | Source | Verdict |
   |--------|--------|---------|
   | Structural completeness | Agent A | pass/fail |
   | Code standards | Agent B | pass/fail |
   | Codex review | Agent C | approve/needs-attention/skipped |

2. **Cross-review agreement** — highlight any issues flagged by **multiple** reviewers first (highest confidence findings)

3. **Issues list** — deduplicate overlapping findings across all three reviews, categorize by severity (critical > warning > suggestion)

4. **Source label** — tag each issue as [structural], [code-review], or [codex] so the user knows which review caught it. Issues found by multiple reviewers get multiple tags.

If no issues are found from any review, report a clean bill of health and stop — the workflow is complete.

**If an agent fails or returns an error:** Still synthesize results from the remaining agents. Mark the failed agent's verdict as "skipped" in the summary table and note the error. Two out of three successful reviews still provide useful signal. If all three fail, report the errors and stop. In particular, if Agent B fails because the superpowers plugin is not installed, continue with Agents A and C and mark the code-standards verdict as "skipped".

## 3. Conquer: Fix Issues

When presenting the unified report in step 2, categorize every finding into one of these severity tiers:
- **Critical** — bugs, security issues, broken integrations, missing wiring
- **Warning** — code quality problems, convention violations, anti-patterns
- **Suggestion** — style nits, minor improvements, optional enhancements

"High risk" = critical + warning. "Low risk" = suggestion.

If issues were found, use **AskUserQuestion** to let the user choose a fix strategy:

```yaml
question: "How should we handle the issues?"
options:
  - label: "Fix all"
    description: "Fix every issue across all severity levels"
  - label: "Fix high risk only"
    description: "Fix critical + warning issues; defer suggestions to a backlog doc"
  - label: "Skip"
    description: "No fixes — record everything to a backlog doc for later"
```

### Fix all
Execute fixes for every issue found. The workflow is complete.

### Fix high risk only
1. Execute fixes for all **critical** and **warning** issues.
2. Write all **suggestion**-level issues to `REVIEW-BACKLOG.md` in the project root. Format:

```markdown
# Review Backlog

_Generated by /arewedone on YYYY-MM-DD_

## Deferred Suggestions

| # | Issue | Source | File | Notes |
|---|-------|--------|------|-------|
| 1 | [description] | [structural\|code-review\|codex] | `path/to/file` | [any extra context] |
```

If `REVIEW-BACKLOG.md` already exists, **append** a new dated section rather than overwriting.

### Skip
Write **all** issues (critical, warning, and suggestion) to `REVIEW-BACKLOG.md` using the same format above, then stop.
