---
name: external-ai-review
description: >-
  Run when the user asks for an external AI review, second-pass AI review,
  OpenCode review, Kilo Code review, Cursor Agent review, or Antigravity review
  of staged, unstaged, working-tree, branch, or PR-style changes. Detects local
  external reviewer CLIs, runs one review-only CLI when available, and handles
  missing CLI/auth states gracefully.
user-invocable: true
argument-hint: '[--tool auto|opencode|kilo|cursor|antigravity] [--scope staged|unstaged|working-tree|branch|pr] [--model provider/model] [--base ref]'
---

# External AI Review

Working directory:
!`pwd`

Git status:
!`git status --short --branch 2>/dev/null || true`

OpenCode available:
!`command -v opencode >/dev/null 2>&1 && echo "yes" || echo "no"`

Kilo Code available:
!`command -v kilo >/dev/null 2>&1 && echo "yes" || echo "no"`

Cursor Agent available:
!`command -v cursor-agent >/dev/null 2>&1 && echo "yes" || echo "no"`

Antigravity CLI available:
!`command -v agy >/dev/null 2>&1 && echo "yes" || echo "no"`

Arguments:
`$ARGUMENTS`

## Core Rules

- This skill is review-only. Do not fix issues, apply patches, or approve edits.
- Run at most one external reviewer per invocation.
- Prefer OpenCode in auto mode, then Kilo Code, then Cursor Agent, then Antigravity.
- Never pass auto-approval or permission-bypass flags such as `--dangerously-skip-permissions`, `--auto`, Cursor `--force`, or similar.
- Build one review prompt artifact and pass that same artifact to the selected reviewer.
- Compare `node ./lib/pza-runtime.js diff-hash` before and after the CLI run. If it changes, warn the user that the external CLI modified files and do not mark the review as clean.

## Step 1 - Parse Arguments

Defaults:

- `tool=auto`
- `scope=working-tree`
- `base=` (auto-resolve for `branch`/`pr`)
- `model=` (use the selected CLI default)

Recognized flags:

- `--tool auto|opencode|kilo|cursor|antigravity`
- `--scope staged|unstaged|working-tree|branch|pr`
- `--model <provider/model>` for OpenCode and Kilo; Cursor accepts its own model names via the same flag.
- `--base <ref>` for `branch` and `pr`; if absent, try `origin/main`, then `main`.

If the user names a tool in natural language and no `--tool` flag is present, treat that as the tool selection.

## Step 2 - Detect Tools and Auth

Run this availability check first:

```bash
for tool in opencode kilo cursor-agent agy; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf '%s\t%s\n' "$tool" "$(command -v "$tool")"
  else
    printf '%s\tmissing\n' "$tool"
  fi
done
```

Then run only the relevant best-effort auth/status probe:

```bash
# OpenCode
opencode auth list 2>&1 || true

# Kilo Code
kilo auth list 2>&1 || true

# Cursor Agent
cursor-agent status 2>&1 || true

# Antigravity
agy --help 2>&1 || true
```

Treat these as advisory. If the status clearly says "not logged in", "not authenticated", "0 credentials", "unauthorized", "login required", or "API key" missing, report that the tool is skipped and continue to the next available tool in auto mode. If the status is ambiguous, try the review command and classify any failure from its output.

Selection behavior:

- Explicit `--tool`: if missing or clearly unauthenticated, report the exact reason and stop after listing available alternatives.
- `auto`: try tools in this order: OpenCode, Kilo Code, Cursor Agent, Antigravity. Skip missing or clearly unauthenticated tools and show the skipped reasons.
- If no tool can run, stop with a clear "External AI review skipped" message.

## Step 3 - Build One Review Artifact

Use one temp prompt file for every selected reviewer. Do not embed untrusted diff content inside a heredoc body. Write static prompt text with a single-quoted heredoc, then append generated diff text with `printf`.

Set these variables from Step 1 before running:

```bash
SCOPE="working-tree"
BASE=""
PROMPT_FILE=$(mktemp -t pza-external-ai-review.XXXXXX)
trap 'rm -f "$PROMPT_FILE"' EXIT
```

Gather the review context:

```bash
BUDGET=80000
UNTRACKED_BUDGET=20000
USED=0
UNTRACKED_USED=0
DIFF=""
SKIPPED=""
UNTRACKED_SKIPPED=""
SCOPE_LABEL="$SCOPE"

append_file_diff() {
  file="$1"
  shift
  FILE_DIFF=$("$@" 2>/dev/null || true)
  FILE_BYTES=$(printf '%s' "$FILE_DIFF" | wc -c | tr -d ' ')

  if [ "$FILE_BYTES" -eq 0 ]; then
    return
  elif [ $((USED + FILE_BYTES)) -le $BUDGET ]; then
    DIFF="${DIFF}${FILE_DIFF}
"
    USED=$((USED + FILE_BYTES))
  else
    SKIPPED="${SKIPPED}  (summarized) $file (${FILE_BYTES} bytes)
"
  fi
}

case "$SCOPE" in
  staged)
    FILES=$(git diff --cached --name-only 2>/dev/null | sort -u | grep -Ev '\.(lock|min\.js|min\.css|map|svg|generated\.)' || true)
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      append_file_diff "$file" git diff --cached -- "$file"
    done <<EOF
$FILES
EOF
    ;;

  unstaged)
    FILES=$(git diff --name-only 2>/dev/null | sort -u | grep -Ev '\.(lock|min\.js|min\.css|map|svg|generated\.)' || true)
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      append_file_diff "$file" git diff -- "$file"
    done <<EOF
$FILES
EOF
    ;;

  branch|pr)
    if [ -z "$BASE" ]; then
      if git rev-parse --verify origin/main >/dev/null 2>&1; then
        BASE="origin/main"
      elif git rev-parse --verify main >/dev/null 2>&1; then
        BASE="main"
      else
        echo "External AI review skipped - no --base provided and neither origin/main nor main exists."
        exit 0
      fi
    fi
    MERGE_BASE=$(git merge-base HEAD "$BASE" 2>/dev/null || true)
    if [ -z "$MERGE_BASE" ]; then
      echo "External AI review skipped - could not compute merge-base with $BASE."
      exit 0
    fi
    SCOPE_LABEL="$SCOPE ($MERGE_BASE..HEAD, base $BASE)"
    FILES=$(git diff --name-only "$MERGE_BASE" HEAD 2>/dev/null | sort -u | grep -Ev '\.(lock|min\.js|min\.css|map|svg|generated\.)' || true)
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      append_file_diff "$file" git diff "$MERGE_BASE" HEAD -- "$file"
    done <<EOF
$FILES
EOF
    ;;

  working-tree|*)
    FILES=$(git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null)
    FILES=$(printf '%s\n' "$FILES" | sort -u | grep -Ev '\.(lock|min\.js|min\.css|map|svg|generated\.)' || true)
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      FILE_DIFF=$(git diff -- "$file" 2>/dev/null; git diff --cached -- "$file" 2>/dev/null)
      FILE_BYTES=$(printf '%s' "$FILE_DIFF" | wc -c | tr -d ' ')
      if [ "$FILE_BYTES" -eq 0 ]; then
        continue
      elif [ $((USED + FILE_BYTES)) -le $BUDGET ]; then
        DIFF="${DIFF}${FILE_DIFF}
"
        USED=$((USED + FILE_BYTES))
      else
        STAT=$(git diff --stat -- "$file" 2>/dev/null; git diff --cached --stat -- "$file" 2>/dev/null)
        SKIPPED="${SKIPPED}  (summarized) ${STAT}
"
      fi
    done <<EOF
$FILES
EOF

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
    ;;
esac

if [ -z "$DIFF" ]; then
  echo "External AI review skipped - no reviewable changes for scope: $SCOPE_LABEL."
  exit 0
fi

TRUNC_NOTE=""
[ -n "$SKIPPED" ] && TRUNC_NOTE="Tracked files summarized due to context budget:
$SKIPPED"
[ -n "$UNTRACKED_SKIPPED" ] && TRUNC_NOTE="${TRUNC_NOTE}Untracked files omitted due to context budget:
$UNTRACKED_SKIPPED"
```

Write the prompt artifact:

```bash
cat > "$PROMPT_FILE" <<'PZA_EXTERNAL_AI_REVIEW_PROMPT'
You are a senior code reviewer performing a second-pass review.

This is review-only. Do not modify files. Do not run commands that write files. Do not auto-approve edits.

Focus on:
- Bugs and regressions
- Security issues and trust-boundary violations
- Missing tests or weak validation
- Risky migrations, dependency/config mistakes, and release blockers

Do not report style-only issues. Limit to the 10 highest-confidence findings.

For each finding include:
- Severity: critical, warning, or suggestion
- File/path if known
- What is wrong
- Why it matters
- Recommended fix
PZA_EXTERNAL_AI_REVIEW_PROMPT

if [ "$SCOPE" = "pr" ]; then
  cat >> "$PROMPT_FILE" <<'PZA_EXTERNAL_AI_PR_PROMPT'

PR-style review mode: prioritize merge blockers, production regressions, security risk, missing tests, migration risk, and backwards compatibility.
PZA_EXTERNAL_AI_PR_PROMPT
fi

printf '\nScope: %s\n\n%s\n\n%s\n' "$SCOPE_LABEL" "$TRUNC_NOTE" "$DIFF" >> "$PROMPT_FILE"
echo "$PROMPT_FILE"
```

## Step 4 - Run the Selected CLI

Save the pre-review hash:

```bash
BEFORE_HASH=$(node ./lib/pza-runtime.js diff-hash 2>/dev/null || echo unknown)
```

Use the command for the selected tool. Replace `<model>` only when the user provided `--model`.

### OpenCode

```bash
if [ -n "$MODEL" ]; then
  opencode run --model "$MODEL" --file "$PROMPT_FILE" "Review the attached context only. Return findings as markdown. Do not modify files."
else
  opencode run --file "$PROMPT_FILE" "Review the attached context only. Return findings as markdown. Do not modify files."
fi
```

### Kilo Code

```bash
if [ -n "$MODEL" ]; then
  kilo run --model "$MODEL" --file "$PROMPT_FILE" "Review the attached context only. Return findings as markdown. Do not modify files."
else
  kilo run --file "$PROMPT_FILE" "Review the attached context only. Return findings as markdown. Do not modify files."
fi
```

### Cursor Agent

```bash
if [ -n "$MODEL" ]; then
  cat "$PROMPT_FILE" | cursor-agent -p --output-format text --model "$MODEL"
else
  cat "$PROMPT_FILE" | cursor-agent -p --output-format text
fi
```

If `cursor-agent status` says "Not logged in" and `CURSOR_API_KEY` is not set, skip Cursor with:

> Cursor Agent review skipped - not authenticated. Run `cursor-agent login` or set `CURSOR_API_KEY`.

### Antigravity

Run:

```bash
AGY_HELP=$(agy --help 2>&1 || true)
printf '%s\n' "$AGY_HELP"
```

Only run Antigravity if help confirms a non-interactive prompt file, file attachment, or stdin form. Prefer file/stdin forms over embedding file contents in argv. Examples of acceptable forms if documented by the installed CLI:

```bash
agy --prompt-file "$PROMPT_FILE"
cat "$PROMPT_FILE" | agy -
agy run --file "$PROMPT_FILE" "Review the attached context only. Return findings as markdown. Do not modify files."
```

If help shows only an interactive TUI or an ambiguous `agy "prompt"` form without stdin/file support, report:

> Antigravity review skipped - `agy` is installed, but this version does not expose a confirmed non-interactive prompt-file/stdin review command.

## Step 5 - Classify Result

Return the selected CLI output verbatim except for clearly irrelevant terminal control noise. Do not summarize findings as your own unless the user asks.

Capture the selected CLI exit code as `REVIEW_EXIT`. If the command exits non-zero, inspect stdout/stderr:

- Auth patterns: `not logged in`, `not authenticated`, `login required`, `unauthorized`, `API key`, `no credentials`
- Missing tool patterns: `command not found`, `not found`

Report auth failures distinctly, for example:

> OpenCode review skipped - not authenticated. Run `opencode auth login`.

For other failures, include the command name, exit code, and error output. Stop after reporting a non-zero exit; do not write the review marker.

## Step 6 - Verify No File Changes and Mark Reviewed

Only run this step when `REVIEW_EXIT=0` and the external reviewer produced output. After a successful command:

```bash
AFTER_HASH=$(node ./lib/pza-runtime.js diff-hash 2>/dev/null || echo unknown)
if [ "$BEFORE_HASH" != "$AFTER_HASH" ]; then
  echo "External AI review completed, but the working diff changed during review. Do not mark as reviewed until the changes are inspected."
else
  node ./lib/pza-runtime.js mark-reviewed external-ai-review
fi
```

Then report:

- Selected tool
- Scope and base, if any
- Skipped tools and reasons
- Whether the review marker was written
