---
name: arewedone
description: >-
  Run when the user says "are we done", "review my changes", or "check
  completeness", or after implementing features, refactoring code, or making
  significant modifications. Launches structural completeness review, code
  quality review, AND Ollama code review in parallel, synthesizes findings,
  then runs proof commands (tests, build, lint, type checks) before declaring done.
user-invocable: true
---

# Session Changes Context

Session-tracked files (this session only):
!`cat "/tmp/claude-session-${CLAUDE_SESSION_ID}-files.json" 2>/dev/null | node -e "JSON.parse(require('fs').readFileSync(0,'utf8')).forEach(f=>console.log(f))" || { echo "(no session tracking - showing git status)"; git status --short; }`

Changed files summary (session-scoped):
!`if [ -f "/tmp/claude-session-${CLAUDE_SESSION_ID}-files.json" ]; then FILES=$(cat "/tmp/claude-session-${CLAUDE_SESSION_ID}-files.json" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).join(' '))"); git diff --stat -- $FILES 2>/dev/null || echo "No git diff available"; else git diff --stat; fi`

Ollama available:
!`which ollama >/dev/null 2>&1 && echo "yes" || echo "no"`

Ollama model:
!`cat ~/.claude/pza-ollama-model 2>/dev/null || echo "kimi-k2.6:cloud"`

# Workflow

## 1. Launch All Three Reviews in Parallel

Launch **all three** review agents simultaneously in a single message with three Agent tool calls:

### Agent A: Structural Completeness Review (`structural-completeness-reviewer`)

Provide context about what files changed (shown above). This agent verifies:
- Changes are fully integrated across all layers
- Old code is properly removed (no orphaned functions/imports)
- No technical debt introduced
- Structural integrity maintained

### Agent B: Code Quality Review (`code-quality-reviewer`)

Provide context about what files changed (shown above). This agent reviews code quality across four dimensions:
- Correctness — bugs, logic errors, edge cases, error paths
- Security — injection, XSS, auth issues, secrets exposure
- Architecture — pattern consistency, coupling, module boundaries
- Performance — N+1 queries, unbounded loops, async misuse, re-renders

This agent applies confidence scoring (0-100) and only reports findings with confidence >= 80 to minimize false positives.

### Agent C: Ollama Code Review (general-purpose agent)

Launch a **general-purpose** agent that runs an Ollama-powered code review against the current git state. Include the Ollama model name from the session context above in the agent prompt.

The agent's prompt should instruct it to:

1. **Check Ollama availability**:
   ```bash
   which ollama >/dev/null 2>&1 && echo "available" || echo "not_available"
   ```
   If not available, report "Ollama review skipped — Ollama is not installed." and stop.

2. **Determine review scope** by checking for uncommitted changes:
   ```bash
   git diff --cached --quiet 2>/dev/null; echo "staged=$?"
   git diff --quiet 2>/dev/null; echo "unstaged=$?"
   [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ] && echo "untracked=yes" || echo "untracked=no"
   ```

3. **If uncommitted changes exist** (staged or unstaged non-zero exit, or untracked=yes), gather the diff and run the review.

   **Diff gathering** — truncate to prevent overwhelming the model:
   ```bash
   DIFF=$(
     { git diff 2>/dev/null; git diff --cached 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null | while read f; do file "$f" 2>/dev/null | grep -q 'text' && echo "=== NEW FILE: $f ===" && head -c 10000 "$f" 2>/dev/null; done; } | head -c 80000
   )
   DIFF_BYTES=$(printf '%s' "$DIFF" | wc -c | tr -d ' ')
   TRUNC_NOTE=""
   [ "$DIFF_BYTES" -ge 79000 ] && TRUNC_NOTE="(Note: diff was truncated to ~80KB. Focus on what is shown.)"
   ```

   **Run the review** — use `Bash(timeout: 300000)` (5 minutes) for the ollama command:
   ```bash
   ollama launch claude --model <ollama-model> --yes -- -p "$(cat <<'EOFPROMPT'
   You are a code reviewer. Review the following uncommitted changes for bugs, security issues, code quality problems, and anti-patterns. Provide a verdict (approve/needs-attention) and list findings with severity (critical/warning/suggestion), file path, and description.
   EOFPROMPT
   )
   $TRUNC_NOTE

   $DIFF"
   ```

4. **If no uncommitted changes** (clean working tree), check for a previous commit:
   ```bash
   git rev-parse HEAD~1 2>/dev/null && echo "has_prev=yes" || echo "has_prev=no"
   ```
   - If `has_prev=yes`: also verify the diff is non-empty:
     ```bash
     git diff --quiet HEAD~1 HEAD 2>/dev/null; echo "diff_exit=$?"
     ```
     - If `diff_exit=1` (has changes): run the review against the last commit:
       ```bash
       DIFF=$(git diff HEAD~1 HEAD 2>/dev/null | head -c 80000)
       DIFF_BYTES=$(printf '%s' "$DIFF" | wc -c | tr -d ' ')
       TRUNC_NOTE=""
       [ "$DIFF_BYTES" -ge 79000 ] && TRUNC_NOTE="(Note: diff was truncated to ~80KB. Focus on what is shown.)"
       ```
       Then run (with `Bash(timeout: 300000)`):
       ```bash
       ollama launch claude --model <ollama-model> --yes -- -p "$(cat <<'EOFPROMPT'
       You are a code reviewer. Review the following committed changes (HEAD~1..HEAD) for bugs, security issues, code quality problems, and anti-patterns. Provide a verdict (approve/needs-attention) and list findings with severity (critical/warning/suggestion), file path, and description.
       EOFPROMPT
       )
       $TRUNC_NOTE

       $DIFF"
       ```
     - If `diff_exit=0` (empty diff — e.g. merge commit with no changes): report "Ollama review skipped — last commit has no diff."
   - If `has_prev=no` (single-commit repo, orphan branch, or shallow clone): report "Ollama review skipped — clean working tree with no parent commit to review against."

5. Return the full review output verbatim — verdict, findings, summary, and all details.
6. Do NOT fix any issues or apply patches — review only.
7. If Ollama is not installed or the command fails, report that the Ollama review was skipped and include the error message.

**IMPORTANT**: All three agents MUST be launched in the same message (parallel Agent tool calls). Do NOT run them sequentially. Wait for all three to complete before proceeding.

## 2. Converge: Synthesize All Three Reviews

After **all three** agents return, synthesize their results into a single unified report:

1. **Summary table** with pass/fail for each review dimension:
   | Review | Source | Verdict |
   |--------|--------|---------|
   | Structural completeness | Agent A | pass/fail |
   | Code quality | Agent B | pass/fail |
   | Ollama review | Agent C | approve/needs-attention/skipped |

2. **Cross-review agreement** — highlight any issues flagged by **multiple** reviewers first (highest confidence findings)

3. **Issues list** — deduplicate overlapping findings across all three reviews, categorize by severity (critical > warning > suggestion)

4. **Source label** — tag each issue as [structural], [quality], or [ollama] so the user knows which review caught it. Issues found by multiple reviewers get multiple tags.

If no issues are found from any review, report a clean bill of health and proceed to Step 4 (Proof).

**If an agent fails or returns an error:** Still synthesize results from the remaining agents. Mark the failed agent's verdict as "skipped" in the summary table and note the error. Two out of three successful reviews still provide useful signal. If all three fail, report the errors and proceed to Step 4 (Proof) — proof commands are especially valuable when reviews couldn't complete.

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
Execute fixes for every issue found, then proceed to Step 4 (Proof).

### Fix high risk only
1. Execute fixes for all **critical** and **warning** issues.
2. Write all **suggestion**-level issues to `REVIEW-BACKLOG.md` in the project root. Format:

```markdown
# Review Backlog

_Generated by /arewedone on YYYY-MM-DD_

## Deferred Suggestions

| # | Issue | Source | File | Notes |
|---|-------|--------|------|-------|
| 1 | [description] | [structural\|quality\|ollama] | `path/to/file` | [any extra context] |
```

If `REVIEW-BACKLOG.md` already exists, **append** a new dated section rather than overwriting.

Then proceed to Step 4 (Proof).

### Skip
Write **all** issues (critical, warning, and suggestion) to `REVIEW-BACKLOG.md` using the same format above, then proceed to Step 4 (Proof).

## 4. Proof: Run Verification Commands

Before declaring work complete, run the project's proof commands (tests, build, lint, type checker) and verify they pass. Never claim completion without evidence.

### 4a. Detect Proof Commands

Run this detection script in a single Bash call:

```bash
# Detect package manager
PM="npm"
[ -f "yarn.lock" ] && PM="yarn"
[ -f "pnpm-lock.yaml" ] && PM="pnpm"
{ [ -f "bun.lockb" ] || [ -f "bun.lock" ]; } && PM="bun"

# Tier 1: package.json scripts (broad matching for common aliases)
if [ -f "package.json" ]; then
  node -e "
    const s = require('./package.json').scripts || {};
    const w = require('./package.json').workspaces;
    if (w) console.log('monorepo:true');
    const patterns = [
      { cat: 'typecheck', keys: ['typecheck','type-check','tsc','check:types','check-types'] },
      { cat: 'lint', keys: ['lint','eslint','lint:check'] },
      { cat: 'build', keys: ['build'] },
      { cat: 'test', keys: ['test','test:unit','test:all'] }
    ];
    patterns.forEach(p => {
      const found = p.keys.find(k => s[k]);
      if (found) console.log('pkg:' + p.cat + ':' + found);
    });
  " 2>/dev/null
fi

# Tier 2: Config files for other ecosystems
[ -f "Cargo.toml" ] && echo "rust:detected"
[ -f "go.mod" ] && echo "go:detected"
{ [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "setup.cfg" ]; } && echo "python:detected"
[ -f "Makefile" ] || [ -f "GNUmakefile" ] && echo "make:detected"
[ -f "deno.json" ] || [ -f "deno.jsonc" ] && echo "deno:detected"

echo "pm:$PM"
```

Build the proof command list from detection results:

**Node.js** (package.json found): Use `<pm> run <script>` for each detected script. Order: typecheck > lint > build > test. If `build` script's value contains `tsc` and a separate typecheck script was already detected, skip the duplicate typecheck implicit in build.

**Rust** (Cargo.toml): `cargo check`, `cargo clippy -- -D warnings` (if clippy installed), `cargo test`

**Go** (go.mod): `go vet ./...`, `go test ./...`

**Python** (pyproject.toml or setup.py/setup.cfg): Check configured tools via `grep -Eo 'tool\.(pytest|ruff|mypy)' pyproject.toml` and run only those: `python -m pytest`, `ruff check .`, `mypy .`. For legacy projects with `setup.py`/`setup.cfg` but no `pyproject.toml`, check if `pytest`/`ruff`/`mypy` are on PATH and run them if found.

**Makefile**: Determine which file exists (`MF=Makefile; [ -f "$MF" ] || MF=GNUmakefile`), then `grep -o '^[a-zA-Z_-]*:' "$MF" | tr -d ':'` and run only targets matching check/test/lint if they exist

**Deno**: `deno lint`, `deno test`. For `deno check`, pass explicit entry point files (e.g., `deno check main.ts`) — running without arguments may fail or check unexpected files. Detect entry points from `deno.json` `tasks` or `compilerOptions` fields, or skip `deno check` if no entry point is obvious.

**Monorepo detected** (root package.json has `workspaces`): Tell the user "Monorepo detected — only root-level scripts are checked. Root scripts may delegate to workspace tooling (Turborepo, Nx, etc.) which is fine, but workspace-specific scripts are not auto-detected. Enter additional commands manually if needed." Still run any detected root-level scripts, then fall through to the AskUserQuestion below to offer adding workspace-specific commands.

**If nothing detected** — use **AskUserQuestion**:

```yaml
question: "No proof commands detected. What verification commands should I run?"
options:
  - label: "Enter commands"
    description: "I'll provide the commands to run (one per line)"
  - label: "Skip proof verification"
    description: "No verification commands — declare done without proof (not recommended)"
```

If "Enter commands": ask the user for commands (one per line), parse by newlines, then **display the parsed command list back to the user for confirmation** before executing any of them. This prevents accidental execution of malformed or destructive commands. If "Skip proof verification": report "Work complete but unverified by automated checks." and stop.

### 4b. Run Proof Commands

Run each detected command sequentially in order using `Bash(timeout: 300000)` (5 minutes per command). Capture exit code and output for each. If output exceeds 80 lines, keep only the last 80 lines (`tail -80`).

If a command times out (5 minutes), record the result as TIMEOUT (not FAIL or PASS).

### 4c. Report Results

Present results as a summary table:

| # | Command | Exit Code | Result |
|---|---------|-----------|--------|
| 1 | `<command>` | 0 | PASS |
| 2 | `<command>` | 1 | FAIL |
| 3 | `<command>` | — | TIMEOUT |

**If all commands pass:**

> All N proof commands passed. Work is verified complete.

The workflow is complete.

**If any command failed or timed out**, show failure details — for each failed command, show the last 50 lines of output:

#### `<command>` (exit code N)
```
[last 50 lines of output]
```

Then present options based on what Step 3 choice was made.

If user previously chose **"Skip"** in Step 3 (they already declined code fixes):

```yaml
question: "Proof commands failed. How should we proceed?"
options:
  - label: "Fix proof failures only"
    description: "Fix only the proof command failures (tests/build/lint), not the review findings you already skipped"
  - label: "Declare done with caveats"
    description: "Acknowledge failures and stop (not recommended)"
```

Otherwise (user chose "Fix all" or "Fix high risk only" in Step 3, or no issues were found):

```yaml
question: "Proof commands failed. How should we proceed?"
options:
  - label: "Fix failures"
    description: "Analyze and fix the failures, then re-run all proof commands"
  - label: "Declare done with caveats"
    description: "Acknowledge failures and stop (not recommended)"
```

**Fix failures**: Analyze the failure output, apply fixes, then re-run ALL proof commands from 4b (not just the failed ones — fixes can introduce new failures). Track fix attempts in your response — after 3 fix-and-verify cycles, if commands still fail, report remaining failures and stop without declaring done:

> After 3 fix attempts, N proof command(s) still failing. Human intervention needed.

**Declare done with caveats**:

> Work declared complete with N failing proof command(s):
> - `<command>`: [one-line summary of failure]

The workflow is complete (with caveats noted).
