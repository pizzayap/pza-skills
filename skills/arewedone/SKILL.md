---
name: arewedone
description: >-
  Run when the user says "are we done", "review my changes", or "check
  completeness", or after implementing features, refactoring code, or making
  significant modifications. Launches structural completeness review, code
  quality review, and configured CLI-backed AI reviews in parallel, synthesizes
  findings, then runs proof commands (tests, build, lint, type checks) before
  declaring done.
user-invocable: true
argument-hint: '[--adversarial] [--no-adversarial]'
---

# Session Changes Context

Session-tracked files (this session only):
!`node ./lib/pza-runtime.js session-files 2>/dev/null || { echo "(no session tracking - showing git status)"; git status --short; }`

Changed files summary (session-scoped):
!`node ./lib/pza-runtime.js session-stat 2>/dev/null || git diff --stat`

Reviewer backend settings:
!`node ./lib/pza-runtime.js reviewer-settings 2>/dev/null || echo '{"reviewers":[]}'`

Ollama enabled:
!`node ./lib/pza-runtime.js get-reviewer-enabled ollama 2>/dev/null || node ./lib/pza-runtime.js get-setting ollama 2>/dev/null || echo "yes"`

Ollama available:
!`command -v ollama >/dev/null 2>&1 && echo "yes" || echo "no"`

Ollama model:
!`node ./lib/pza-runtime.js get-reviewer-model ollama 2>/dev/null || node ./lib/pza-runtime.js get-model 2>/dev/null || echo "kimi-k2.6:cloud"`

Codex enabled:
!`node ./lib/pza-runtime.js get-reviewer-enabled codex 2>/dev/null || node ./lib/pza-runtime.js get-setting codex 2>/dev/null || echo "yes"`

Codex CLI available:
!`command -v codex >/dev/null 2>&1 && echo "yes" || echo "no"`

Adversarial enabled:
!`node ./lib/pza-runtime.js get-setting adversarial 2>/dev/null || echo "yes"`

Arguments:
`$ARGUMENTS`

# Workflow

## 0. Parse Arguments

Check the Arguments from session context above. If arguments are present:

- `--adversarial` → force adversarial agents ON for this run (overrides the adversarial toggle only; per-tool ollama/codex toggles still apply)
- `--no-adversarial` → force adversarial agents OFF for this run

These flags affect only adversarial reviewers. Structural, quality, and standard CLI reviewers are unaffected.

## 1. Launch Reviews in Parallel

Launch review agents simultaneously in a single message with parallel Agent tool calls where the active harness supports it. Agents A and B always launch. Optional CLI-backed reviewers launch from `/pza-settings` reviewer backend settings:

- Agent C (Ollama) launches only if Ollama is enabled and installed.
- Agent D (Codex) launches only if Codex is enabled and installed.
- Additional external CLI review lanes launch only when enabled and installed: OpenCode (`opencode`), Kilo Code (`kilo`), Cursor Agent (`cursor-agent`), and Antigravity (`agy`) when `agy --help` confirms a safe non-interactive prompt/stdin mode.
- Agents E and F (adversarial) launch based on adversarial flag/settings logic from Step 0.

Every CLI-backed review is review-only. Do not pass approval-skipping flags such as `--dangerously-skip-permissions`, `--auto`, `--force`, or equivalent. Compare `node ./lib/pza-runtime.js diff-hash` before and after each external CLI run. If the hash changes, report that the reviewer modified the worktree and stop for user direction; do not auto-revert.

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
   command -v ollama >/dev/null 2>&1 && echo "available" || echo "not_available"
   ```
   If not available, report "Ollama review skipped — Ollama is not installed." and stop.

2. **Determine review scope** by checking for uncommitted changes:
   ```bash
   git diff --cached --quiet 2>/dev/null; echo "staged=$?"
   git diff --quiet 2>/dev/null; echo "unstaged=$?"
   [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ] && echo "untracked=yes" || echo "untracked=no"
   ```

3. **If uncommitted changes exist** (staged or unstaged non-zero exit, or untracked=yes), gather the diff with budget-aware assembly:

   ```bash
   BUDGET=80000
   USED=0
   DIFF=""
   SKIPPED=""

   FILES=$(git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null)
   FILES=$(echo "$FILES" | sort -u | grep -Ev '\.(lock|min\.js|min\.css|map|svg|generated\.)' || true)

   while IFS= read -r file; do
     [ -z "$file" ] && continue
     FILE_DIFF=$(git diff -- "$file" 2>/dev/null; git diff --cached -- "$file" 2>/dev/null)
     FILE_BYTES=$(printf '%s' "$FILE_DIFF" | wc -c | tr -d ' ')
     if [ "$FILE_BYTES" -eq 0 ]; then
       continue
     elif [ $((USED + FILE_BYTES)) -le $BUDGET ]; then
       DIFF="${DIFF}${FILE_DIFF}"
       USED=$((USED + FILE_BYTES))
     else
       STAT=$(git diff --stat -- "$file" 2>/dev/null; git diff --cached --stat -- "$file" 2>/dev/null)
       SKIPPED="${SKIPPED}  (summarized) ${STAT}
"
     fi
   done <<EOF
$FILES
EOF

   UNTRACKED_BUDGET=20000
   UNTRACKED_USED=0
   UNTRACKED_SKIPPED=""
   while IFS= read -r f; do
     [ -z "$f" ] && continue
     case "$f" in *.lock|*.min.js|*.min.css|*.map|*.svg) continue ;; esac
     if file "$f" 2>/dev/null | grep -q 'text'; then
       FILE_SIZE=$(wc -c < "$f" 2>/dev/null | tr -d ' ')
       REMAINING=$((UNTRACKED_BUDGET - UNTRACKED_USED))
       if [ "$REMAINING" -le 0 ]; then
         UNTRACKED_SKIPPED="${UNTRACKED_SKIPPED}  (omitted) $f (${FILE_SIZE} bytes)
"
         continue
       fi
       CONTENT=$(head -c "$REMAINING" "$f" 2>/dev/null)
       CONTENT_BYTES=$(printf '%s' "$CONTENT" | wc -c | tr -d ' ')
       if [ "$CONTENT_BYTES" -gt 0 ]; then
         TRUNCATED=""
         [ "$CONTENT_BYTES" -lt "$FILE_SIZE" ] && TRUNCATED=" (truncated: ${CONTENT_BYTES}/${FILE_SIZE} bytes)"
         DIFF="${DIFF}
=== NEW FILE: $f ===${TRUNCATED}
${CONTENT}"
         UNTRACKED_USED=$((UNTRACKED_USED + CONTENT_BYTES))
       fi
     fi
   done <<EOF
$(git ls-files --others --exclude-standard 2>/dev/null)
EOF

   TRUNC_NOTE=""
   [ -n "$SKIPPED" ] && TRUNC_NOTE="(Note: some tracked files exceeded the context budget and were summarized.)
${SKIPPED}"
   [ -n "$UNTRACKED_SKIPPED" ] && TRUNC_NOTE="${TRUNC_NOTE}(Note: some untracked files were omitted due to budget limits.)
${UNTRACKED_SKIPPED}"
   ```

   **Run the review** — use the active harness shell tool with a 5 minute timeout for the ollama command with the enhanced structured prompt:
   ```bash
   PROMPT_FILE=$(mktemp -t pza-ollama-review.XXXXXX)
   cat > "$PROMPT_FILE" <<'PZA_OLLAMA_PROMPT'
You are a senior code reviewer. Review the following uncommitted changes.

REVIEW DIMENSIONS:
- Correctness: logic errors, off-by-one, null/undefined paths, unhandled error cases, state management bugs
- Security: injection (SQL/command/XSS), auth bypass, secrets in code, missing input validation
- Architecture: pattern inconsistency, tight coupling, module boundary violations
- Performance: N+1 queries, unbounded operations, async misuse, missing pagination

SEVERITY LEVELS:
- critical: will cause bugs or security holes in production
- warning: likely problems or significant maintainability issues
- suggestion: improvement opportunities, not blocking

RULES:
- Do NOT flag style or formatting issues
- Do NOT report more than 10 findings
- Respond with ONLY a JSON object, no markdown fences, no text before or after

JSON FORMAT:
{"verdict":"approve or needs-attention","summary":"1-2 sentence summary","findings":[{"severity":"critical or warning or suggestion","title":"short title","file":"path/to/file","description":"what is wrong and why","context":"relevant code snippet if helpful","recommendation":"how to fix it"}]}

If no issues found, return: {"verdict":"approve","summary":"No issues found.","findings":[]}
PZA_OLLAMA_PROMPT
   printf '\n%s\n\n%s\n' "$TRUNC_NOTE" "$DIFF" >> "$PROMPT_FILE"
   OLLAMA_MODEL=$(node ./lib/pza-runtime.js get-reviewer-model ollama 2>/dev/null || node ./lib/pza-runtime.js get-model)
   cat "$PROMPT_FILE" | node ./lib/pza-runtime.js ollama-run "$OLLAMA_MODEL"
   EXIT_CODE=$?
   rm -f "$PROMPT_FILE"
   exit $EXIT_CODE
   ```

4. **If no uncommitted changes** (clean working tree), check for a previous commit:
   ```bash
   git rev-parse HEAD~1 2>/dev/null && echo "has_prev=yes" || echo "has_prev=no"
   ```
   - If `has_prev=yes`: also verify the diff is non-empty:
     ```bash
     git diff --quiet HEAD~1 HEAD 2>/dev/null; echo "diff_exit=$?"
     ```
     - If `diff_exit=1` (has changes): gather with the same budget-aware assembly as step 3 but using `git diff HEAD~1 HEAD` variants. Run the review with the same enhanced structured prompt, changing "uncommitted changes" to "committed changes (HEAD~1..HEAD)".
     - If `diff_exit=0` (empty diff — e.g. merge commit with no changes): report "Ollama review skipped — last commit has no diff."
   - If `has_prev=no` (single-commit repo, orphan branch, or shallow clone): report "Ollama review skipped — clean working tree with no parent commit to review against."

5. Return the full review output verbatim — verdict, findings, summary, and all details.
6. Do NOT fix any issues or apply patches — review only.
7. If Ollama is not installed or the command fails, report that the Ollama review was skipped and include the error message.

### Agent D: Codex Code Review (`codex-code-reviewer`)

**Condition:** Launch this agent ONLY if the session context above shows BOTH "Codex enabled: yes" AND "Codex CLI available: yes". If either is "no", skip this agent entirely.

Launch the `codex-code-reviewer` agent. Its prompt should simply be:

> "Run a Codex code review against the current git state. Return the full output."

This agent handles Codex detection, scope selection, invocation, and error reporting internally. It returns prose/markdown output (not structured JSON).

### Additional External CLI Code Reviews

For each enabled and installed reviewer backend from `/pza-settings`, launch a general-purpose review-only agent unless a dedicated plugin agent exists. These reviewers should all inspect the same current git state and return prose/markdown output.

Supported command shapes:

```bash
opencode run [--model provider/model] --file "$PROMPT_FILE" "Review the attached context only. Do not modify files."
kilo run [--model provider/model] --file "$PROMPT_FILE" "Review the attached context only. Do not modify files."
cursor-agent -p --output-format text [--model model] "Review the context file at $PROMPT_FILE only. Do not modify files."
```

For Antigravity, run `agy --help` first. Only use it if the local help text documents a non-interactive prompt, file, or stdin form. Otherwise report:

> Antigravity review skipped — installed but unsupported for automated review.

The prompt file should contain the same review-only instructions and gathered diff context used by the Ollama review. Use the model configured in `node ./lib/pza-runtime.js get-reviewer-model <reviewer>` when non-empty. If a reviewer is enabled but missing, report `<Tool> review skipped — not installed`. If it returns an auth/login error, report `<Tool> review skipped — not authenticated`.

### Agent E: Ollama Adversarial Review (`ollama-adversarial-reviewer`)

**Condition:** Evaluate in order:
1. If `--no-adversarial` flag was passed in Step 0 → skip this agent entirely
2. If `--adversarial` flag was passed in Step 0 → launch if BOTH "Ollama available: yes" AND "Ollama enabled: yes" (overrides only the adversarial toggle, not the per-tool toggle)
3. Otherwise → launch ONLY if ALL three: "Ollama available: yes" AND "Ollama enabled: yes" AND "Adversarial enabled: yes"

If none of the launch conditions are met, skip this agent entirely.

Launch the `ollama-adversarial-reviewer` agent. Its prompt should include:

> "Run an adversarial security review against the current git state using Ollama model `<model>`. Return the full output."

Replace `<model>` with the Ollama model name from the session context above. This agent handles Ollama detection, diff assembly, adversarial prompt invocation, and error reporting internally. It may return structured JSON or prose.

### Agent F: Codex Adversarial Review (`codex-adversarial-reviewer`)

**Condition:** Evaluate in order:
1. If `--no-adversarial` flag was passed in Step 0 → skip this agent entirely
2. If `--adversarial` flag was passed in Step 0 → launch if BOTH "Codex CLI available: yes" AND "Codex enabled: yes" (overrides only the adversarial toggle, not the per-tool toggle)
3. Otherwise → launch ONLY if ALL three: "Codex CLI available: yes" AND "Codex enabled: yes" AND "Adversarial enabled: yes"

If none of the launch conditions are met, skip this agent entirely.

Launch the `codex-adversarial-reviewer` agent. Its prompt should simply be:

> "Run an adversarial security review against the current git state. Return the full output."

This agent handles Codex detection, diff assembly, adversarial prompt invocation, and error reporting internally. It returns prose/markdown output (not structured JSON).

**IMPORTANT**: All launched agents MUST be in the same message (parallel Agent tool calls). Do NOT run them sequentially. Wait for all agents to complete before proceeding.

## 2. Converge: Synthesize All Reviews

After **all** launched agents return, synthesize their results into a single unified report. The actual number of reviewers varies depending on which optional reviewer backends are enabled and available.

### 2a. Parse Agent C's output (dual-format handling) — skip if Agent C was not launched

Agent C's Ollama review may return structured JSON or unstructured prose. Attempt to parse it using the same extraction logic as `/ollama-review`:

```bash
# Extract: find first valid JSON object from Agent C's output
EXTRACTED=$(echo "$AGENT_C_OUTPUT" | sed 's/^```json//;s/^```//' | node -e "
  const input = require('fs').readFileSync('/dev/stdin','utf8');
  const start = input.indexOf('{');
  if (start === -1) process.exit(1);
  for (let end = input.lastIndexOf('}'); end > start; end = input.lastIndexOf('}', end - 1)) {
    try { JSON.parse(input.slice(start, end + 1)); process.stdout.write(input.slice(start, end + 1)); process.exit(0); } catch {}
  }
  process.exit(1);
" 2>/dev/null)

# Validate: check verdict and findings array
VALID=$(echo "$EXTRACTED" | node -e "
  const j = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const ok = (j.verdict === 'approve' || j.verdict === 'needs-attention')
    && Array.isArray(j.findings);
  process.exit(ok ? 0 : 1);
" 2>/dev/null && echo "yes" || echo "no")
```

1. **If `VALID=yes` (structured):** extract findings directly — each has `severity`, `title`, `file`, `description`
2. **If `VALID=no` (unstructured):** treat Agent C's output as prose and interpret it the same way you interpret Agent A and Agent B's reports

Agents A and B always return prose. Agents C and E (Ollama) may return JSON. Agents D and F (Codex) always return prose.

### 2a-2. Parse Agent E's output (dual-format handling) — skip if Agent E was not launched

Agent E's adversarial Ollama review uses the same JSON output format as Agent C. Apply the identical extraction and validation logic shown above for Agent C. If valid JSON, extract findings directly. If prose, interpret semantically.

### 2a-3. Parse Agent F's output — skip if Agent F was not launched

Agent F (Codex adversarial) always returns prose. No JSON extraction needed — interpret it the same way as Agent D's output.

### 2b. Build unified report

1. **Summary table** with pass/fail for each launched review:
   | Review | Source | Verdict |
   |--------|--------|---------|
   | Structural completeness | Agent A | pass/fail |
   | Code quality | Agent B | pass/fail |
   | Ollama review | Agent C | approve/needs-attention/skipped |
   | Codex review | Agent D | approve/needs-attention/skipped |
   | OpenCode review | External CLI | approve/needs-attention/skipped |
   | Kilo Code review | External CLI | approve/needs-attention/skipped |
   | Cursor Agent review | External CLI | approve/needs-attention/skipped |
   | Antigravity review | External CLI | approve/needs-attention/skipped |
   | Ollama adversarial | Agent E | approve/needs-attention/skipped |
   | Codex adversarial | Agent F | approve/needs-attention/skipped |

   Only include rows for agents that were launched. If an optional agent was not launched (disabled or unavailable), omit its row entirely.

2. **Cross-review agreement** — highlight any issues flagged by **multiple** reviewers first (highest confidence). Findings flagged by >=2 reviewers = HIGH confidence; single-source findings = MEDIUM confidence. When Agents C or E returned structured JSON, match by `file + title + severity` for deduplication. When prose (Agents A, B, D, F, external CLI reviewers, or C/E fallback), match by semantic similarity (same file + similar description). If Agent B's security dimension and Agent E or F flag the same issue, this is especially high confidence (independent security-focused corroboration). Note: cross-format dedup (JSON vs prose, or different review framings) is inherently fuzzy — err on the side of reporting both if uncertain whether two findings are the same issue.

3. **Issues list** — deduplicate overlapping findings across all launched reviews, categorize by severity (critical > warning > suggestion)

4. **Source label** — tag each issue as [structural], [quality], [ollama], [codex], [opencode], [kilo], [cursor], [antigravity], [ollama-security], or [codex-security] so the user knows which review caught it. Issues found by multiple reviewers get multiple tags.

If no issues are found from any review, report a clean bill of health and proceed to Step 4 (Proof).

**If an agent fails or returns an error:** Still synthesize results from the remaining agents. Mark the failed agent's verdict as "skipped" in the summary table and note the error. Any combination of 2+ successful reviews still provides useful signal. If all agents fail, report the errors and proceed to Step 4 (Proof) — proof commands are especially valuable when reviews couldn't complete.

## 3. Conquer: Fix Issues

When presenting the unified report in step 2, categorize every finding into one of these severity tiers:
- **Critical** — bugs, security issues, broken integrations, missing wiring
- **Warning** — code quality problems, convention violations, anti-patterns
- **Suggestion** — style nits, minor improvements, optional enhancements

"High risk" = critical + warning. "Low risk" = suggestion.

If issues were found, use the active harness's user-input tool to let the user choose a fix strategy:

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
| 1 | [description] | [structural\|quality\|ollama\|codex\|ollama-security\|codex-security] | `path/to/file` | [any extra context] |
```

If `REVIEW-BACKLOG.md` already exists, **append** a new dated section rather than overwriting.

Then proceed to Step 4 (Proof).

### Skip
Write **all** issues (critical, warning, and suggestion) to `REVIEW-BACKLOG.md` using the same format above, then proceed to Step 4 (Proof).

## 4. Proof: Run Verification Commands

Before declaring work complete, run the project's proof commands (tests, build, lint, type checker) and verify they pass. Never claim completion without evidence.

### 4a. Detect Proof Commands

Run this detection script in a single shell call:

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
{ [ -f "Makefile" ] || [ -f "GNUmakefile" ]; } && echo "make:detected"
{ [ -f "deno.json" ] || [ -f "deno.jsonc" ]; } && echo "deno:detected"

echo "pm:$PM"
```

Build the proof command list from detection results:

**Node.js** (package.json found): Use `<pm> run <script>` for each detected script. Order: typecheck > lint > build > test. If `build` script's value contains `tsc` and a separate typecheck script was already detected, skip the duplicate typecheck implicit in build.

**Rust** (Cargo.toml): `cargo check`, `cargo clippy -- -D warnings` (if clippy installed), `cargo test`

**Go** (go.mod): `go vet ./...`, `go test ./...`

**Python** (pyproject.toml or setup.py/setup.cfg): Check configured tools via `grep -Eo 'tool\.(pytest|ruff|mypy)' pyproject.toml` and run only those: `python -m pytest`, `ruff check .`, `mypy .`. For legacy projects with `setup.py`/`setup.cfg` but no `pyproject.toml`, check if `pytest`/`ruff`/`mypy` are on PATH and run them if found.

**Makefile**: Determine which file exists (`MF=Makefile; [ -f "$MF" ] || MF=GNUmakefile`), then `grep -Eo '^[a-zA-Z_-]+:' "$MF" | tr -d ':'` and run only targets matching check/test/lint if they exist

**Deno**: `deno lint`, `deno test`. For `deno check`, pass explicit entry point files (e.g., `deno check main.ts`) — running without arguments may fail or check unexpected files. Detect entry points from `deno.json` `tasks` or `compilerOptions` fields, or skip `deno check` if no entry point is obvious.

**Monorepo detected** (root package.json has `workspaces`): Tell the user "Monorepo detected — only root-level scripts are checked. Root scripts may delegate to workspace tooling (Turborepo, Nx, etc.) which is fine, but workspace-specific scripts are not auto-detected. Enter additional commands manually if needed." Still run any detected root-level scripts, then use the active harness's user-input tool to offer adding workspace-specific commands.

**If nothing detected** — use the active harness's user-input tool:

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

Run each detected command sequentially in order using the active harness shell tool with a 5 minute timeout per command. Capture exit code and output for each. If output exceeds 80 lines, keep only the last 80 lines (`tail -80`).

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

## 5. Review Marker

After the workflow completes (regardless of outcome), write a marker file so other tools can detect that a review was run this session:

```bash
node ./lib/pza-runtime.js mark-reviewed arewedone
```
