---
name: ollama-review
description: >-
  Run an Ollama-powered code review with smart fallback. Reviews uncommitted changes
  when dirty; falls back to HEAD~1..HEAD when clean. Supports --wait, --background,
  and --adversarial for security-focused review. Returns structured JSON when possible.
user-invocable: true
argument-hint: '[--wait|--background] [--adversarial]'
---

# Ollama Review with Fallback

Ollama available:
!`which ollama >/dev/null 2>&1 && echo "yes" || echo "no"`

Ollama model:
!`node ./lib/pza-runtime.js get-model 2>/dev/null || echo "kimi-k2.6:cloud"`

Arguments:
`$ARGUMENTS`

## Core Constraint

- This is a **review-only** command. Do not fix issues, apply patches, or suggest you are about to make changes.
- Your only job is to run the review and return the output (formatted if structured JSON, verbatim otherwise).
- The actual review is performed by an Ollama model (shown above). The active harness only determines scope, runs the command, and formats the result.

## Pre-check

If the Ollama availability check above shows "no", tell the user:

> "Ollama is not installed. Install it from https://ollama.com and run `/ollama-setup` to configure."

**Stop here** — do not attempt further steps without Ollama installed.

## Step 0 — Parse Arguments

Check `$ARGUMENTS` for flags (they are orthogonal and can be combined):

- **Review mode:** If arguments contain `--adversarial`, use the adversarial review prompt. Otherwise, use the standard review prompt.
- **Execution mode:** If arguments contain `--wait`, run foreground. If `--background`, run background. Otherwise, estimate and ask (Step 2).

## Step 1 — Determine Review Scope and Gather Diff

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

Use **working-tree** scope. Gather the diff with budget-aware assembly (skips binary/generated files, processes per-file with 80KB budget):

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

# Untracked text files (up to 20KB reserved)
UNTRACKED_BUDGET=20000
UNTRACKED_USED=0
UNTRACKED_SKIPPED=""
UNTRACKED_HIT_LIMIT=false
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in *.lock|*.min.js|*.min.css|*.map|*.svg) continue ;; esac
  if file "$f" 2>/dev/null | grep -q 'text'; then
    FILE_SIZE=$(wc -c < "$f" 2>/dev/null | tr -d ' ')
    REMAINING=$((UNTRACKED_BUDGET - UNTRACKED_USED))
    if [ "$REMAINING" -le 0 ]; then
      UNTRACKED_SKIPPED="${UNTRACKED_SKIPPED}  (omitted) $f (${FILE_SIZE} bytes)
"
      UNTRACKED_HIT_LIMIT=true
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

### If working tree is clean (no uncommitted changes)

Check if there is a previous commit and whether it has a diff:

```bash
git rev-parse HEAD~1 2>/dev/null; echo "head1_exit=$?"
```

- If `head1_exit` is non-zero: there is no parent commit to diff against. Tell the user:

> "The working tree is clean and there is no parent commit to review against (single-commit repo, orphan branch, or shallow clone). Nothing to review."

**Stop here** — do not attempt further review modes.

- If `head1_exit=0`: check if the last commit has actual changes:

```bash
git diff --quiet HEAD~1 HEAD 2>/dev/null; echo "diff_exit=$?"
```

- If `diff_exit=1` (there IS a diff): gather with budget-aware assembly:

```bash
BUDGET=80000
USED=0
DIFF=""
SKIPPED=""

FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)
FILES=$(echo "$FILES" | sort -u | grep -Ev '\.(lock|min\.js|min\.css|map|svg|generated\.)' || true)

while IFS= read -r file; do
  [ -z "$file" ] && continue
  FILE_DIFF=$(git diff HEAD~1 HEAD -- "$file" 2>/dev/null)
  FILE_BYTES=$(printf '%s' "$FILE_DIFF" | wc -c | tr -d ' ')

  if [ "$FILE_BYTES" -eq 0 ]; then
    continue
  elif [ $((USED + FILE_BYTES)) -le $BUDGET ]; then
    DIFF="${DIFF}${FILE_DIFF}"
    USED=$((USED + FILE_BYTES))
  else
    STAT=$(git diff --stat HEAD~1 HEAD -- "$file" 2>/dev/null)
    SKIPPED="${SKIPPED}  (summarized) ${STAT}
"
  fi
done <<EOF
$FILES
EOF

TRUNC_NOTE=""
[ -n "$SKIPPED" ] && TRUNC_NOTE="(Note: some files exceeded the context budget and were summarized.)
${SKIPPED}"
```

- If `diff_exit=0` (empty diff — e.g. merge commit with no changes): tell the user:

> "The working tree is clean and the last commit has no diff (e.g. an empty merge commit). Nothing to review."

**Stop here.**

## Step 1.5 — Select Review Prompt

Based on the `--adversarial` flag from Step 0, use one of these two prompts when invoking Ollama in Step 2.

### Standard Review Prompt

```
You are a senior code reviewer. Review the following code changes.

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
```

### Adversarial Review Prompt

```
You are a security auditor performing an adversarial review. Assume an attacker is looking for ways to exploit this code.

FOCUS AREAS:
- Attack surfaces: what can an attacker reach? Inputs, APIs, file paths, environment variables
- Failure modes: what happens on network failure, disk full, malformed input, concurrent access?
- Trust boundary violations: does user input flow to privileged operations without sanitization?
- DoS vectors: unbounded allocations, regex backtracking, missing rate limits, expensive operations
- Dependency risks: new dependencies with known CVEs, excessive permissions, typosquatting

SEVERITY LEVELS (mapped to standard taxonomy for compatibility):
- critical: exploitable attack path with proven impact
- warning: theoretical risk requiring specific conditions
- suggestion: defense-in-depth hardening, not currently exploitable

RULES:
- Focus ONLY on security and reliability, not code quality or style
- Do NOT report more than 10 findings
- Respond with ONLY a JSON object, no markdown fences, no text before or after

JSON FORMAT:
{"verdict":"approve or needs-attention","summary":"1-2 sentence security assessment","findings":[{"severity":"critical or warning or suggestion","title":"short title","file":"path/to/file","description":"the vulnerability or risk","context":"relevant code snippet if helpful","recommendation":"mitigation or fix"}]}

If no security issues found, return: {"verdict":"approve","summary":"No security issues found.","findings":[]}
```

## Step 2 — Execution Mode

Determine how to run the review based on the user's arguments:

### Build the Ollama command

Using the selected prompt from Step 1.5 and the diff from Step 1, construct the command:

```bash
PROMPT_FILE=$(mktemp -t pza-ollama-review.XXXXXX)
cat > "$PROMPT_FILE" <<'PZA_OLLAMA_PROMPT'
<selected prompt from Step 1.5>
PZA_OLLAMA_PROMPT
printf '\n%s\n\n%s\n' "$TRUNC_NOTE" "$DIFF" >> "$PROMPT_FILE"
cat "$PROMPT_FILE" | node ./lib/pza-runtime.js ollama-run <ollama-model>
EXIT_CODE=$?
rm -f "$PROMPT_FILE"
exit $EXIT_CODE
```

### If arguments include `--wait`

Run the review command in the **foreground** with the active harness shell tool and a 5 minute timeout. Do not ask the user.

### If arguments include `--background`

Run the review command in the **background** using the active harness background shell mode. Do not ask the user. After launching, tell the user:

> "Ollama review started in the background. You'll be notified when it completes."

### Otherwise (no explicit mode)

Estimate the review size before asking:

- For working-tree review: check `git status --short --untracked-files=all`, `git diff --shortstat --cached`, and `git diff --shortstat`
- For branch review (last-commit fallback): use `git diff --shortstat HEAD~1...HEAD`
- Treat untracked files or directories as reviewable work even when `git diff --shortstat` is empty
- Only conclude there is nothing to review when the relevant working-tree status is empty or the explicit branch diff is empty
- Recommend **waiting** only when the review is clearly tiny (1-2 files, no broader directory-sized change)
- In every other case, recommend **background**
- When in doubt, run the review instead of declaring there is nothing to review

Then use the active harness's user-input tool exactly once with two options, putting the recommended option first and suffixing its label with `(Recommended)`:

```yaml
question: "How should we run the Ollama review?"
options:
  - label: "Wait for results"
    description: "Run the review in the foreground and wait for completion"
  - label: "Run in background (Recommended)"
    description: "Launch the review in the background; you'll be notified when it completes"
```

If the user chooses "Wait for results", run the command in the foreground.
If the user chooses "Run in background", run with the active harness background shell mode.

## Step 3 — Return Results

### Foreground flow

Run the Ollama review command. Capture its stdout as `$RESULT`.

**Attempt structured output parsing:**

Step 3a — Extract JSON from output (models often wrap in markdown fences or add preamble):

```bash
EXTRACTED=$(echo "$RESULT" | sed 's/^```json//;s/^```//' | node -e "
  const input = require('fs').readFileSync('/dev/stdin','utf8');
  const start = input.indexOf('{');
  if (start === -1) process.exit(1);
  for (let end = input.lastIndexOf('}'); end > start; end = input.lastIndexOf('}', end - 1)) {
    try { JSON.parse(input.slice(start, end + 1)); process.stdout.write(input.slice(start, end + 1)); process.exit(0); } catch {}
  }
  process.exit(1);
" 2>/dev/null)
```

Step 3b — Validate structure:

```bash
VALID=$(echo "$EXTRACTED" | node -e "
  const j = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const ok = (j.verdict === 'approve' || j.verdict === 'needs-attention')
    && Array.isArray(j.findings);
  process.exit(ok ? 0 : 1);
" 2>/dev/null && echo "yes" || echo "no")
```

**If `VALID=yes` (structured output):**

Parse the JSON and render as a formatted report:

1. **Header:** Verdict emoji (approve = checkmark, needs-attention = warning) + summary
2. **Findings table** sorted by severity (critical first):

| Severity | File | Title | Description |
|----------|------|-------|-------------|
| critical | path/to/file | Title | What's wrong |
| warning | ... | ... | ... |

3. **Recommendations** as bullet list (for findings that include one)
4. If `--adversarial` was used, prefix the header with "Security Review" instead of "Code Review"

**If `VALID=no` (unstructured output):**

Return the raw `$RESULT` **verbatim**, exactly as-is. Do not paraphrase, summarize, or add commentary.

**In both cases:** Do not fix any issues mentioned in the review output.

### Background flow

- Launch the command with the active harness background shell mode.
- After launching, tell the user: "Ollama review started in the background. You'll be notified when it completes."
- When the background job completes and you present results, apply the same structured output parsing from the foreground flow above.

## Step 4 — Review Marker

After the review completes (foreground or background), write a marker file so other tools can detect that a review was run this session:

```bash
node ./lib/pza-runtime.js mark-reviewed ollama-review
```
