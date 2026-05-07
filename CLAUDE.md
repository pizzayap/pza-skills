# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Claude Code plugin (`PZA-skills`) that provides personal skills for code review, plan verification, hook auditing, and session tracking. It uses multi-agent architectures with parallel execution and intelligent result merging.

## Architecture

```
.claude-plugin/plugin.json   — Plugin manifest (name, version, registration)
skills/*/SKILL.md            — Skill definitions (markdown with frontmatter)
agents/*.md                  — Agent definitions (markdown with frontmatter + tools)
hooks/hooks.json             — Hook event bindings
hooks/scripts/*.js           — Hook implementation scripts
```

**Skills** orchestrate work by spawning **agents** in parallel and merging their results. The `/arewedone` skill launches 3 agents simultaneously, synthesizes findings, then runs proof commands (tests, build, lint) before declaring done; `/areyousure` launches 2 with different AI backends (Claude + Ollama) and merges by confidence scoring.

`/arewedone` review agents have strictly non-overlapping scopes: `structural-completeness-reviewer` (codebase hygiene — dead code, dev artifacts, dependency/config completeness) vs `code-quality-reviewer` (correctness, security, architecture, performance with confidence scoring). The Ollama agent provides an independent third opinion.

**Hooks** run automatically on tool events. The `track-session-files` hook fires on every Write/Edit to maintain a JSON manifest of modified files at `/tmp/claude-session-<id>-files.json`, which `/arewedone` uses to scope reviews. The `review-reminder` hook fires on Stop to nudge the user if files were modified but no review was run (checks for the review marker file).

## Key Conventions

- Ollama invocation pattern: `ollama launch claude --model <model> --yes -- -p "prompt"`. The `--yes` flag is required for headless use. The `--` separates ollama flags from Claude Code flags. `-p` is Claude Code's print mode.
- When interpolating git diffs into `-p` arguments, use heredoc (`cat <<'EOFPROMPT'...EOFPROMPT`) to avoid shell metacharacter injection from diff content.
- Use `grep -o` not `grep -oP` — the `-P` (Perl regex) flag is not supported by macOS stock BSD grep. BRE alternation (`\|`) also fails on macOS BSD grep; use `grep -Eo` with ERE alternation (`|`) instead.
- Agent model is declared in frontmatter (`model: opus`, `model: haiku`). Use `opus` for complex analysis, `haiku` for lightweight forwarding.
- Agent color tags in frontmatter control status line display during parallel execution.
- Assigned agent colors: `red` (structural-completeness-reviewer), `yellow` (code-quality-reviewer), `cyan` (plan-verifier), `green` (ollama-plan-verifier). New agents must use a unique color.
- Skills declare `triggers:` for natural language activation and `arguments:` for flag-based invocation.
- Optional external dependencies (Ollama) are handled with graceful fallback — skills detect availability via `which ollama` and adjust scope rather than failing. Users run `/ollama-setup` to configure their model; config is stored at `~/.claude/pza-ollama-model`.
- Plugin agents (`agents/*.md`) are dispatched by the skill runtime, not via the `Agent` tool's `subagent_type`. To simulate a plugin agent's work outside a skill, use `general-purpose` agent type with equivalent instructions.
- In detection scripts using `[ -f "A" ] || [ -f "B" ] && echo "found"`, POSIX left-associative precedence makes this correct, but for clarity prefer `{ [ -f "A" ] || [ -f "B" ]; } && echo "found"`.
- Hook scripts validate `session_id` to prevent path traversal before writing to `/tmp/`.
- `/ollama-review` supports `--adversarial` for security-focused review (attack surfaces, failure modes, trust boundaries). Flags are orthogonal: `--adversarial --background` is valid.
- Ollama review requests structured JSON output (verdict + findings array). Structured output is best-effort — if the model returns non-JSON, the raw text is returned verbatim. Use `node -e` (not `jq`) for JSON extraction and validation, since `jq` is not a project dependency.
- Review marker files: `/ollama-review` and `/arewedone` write `/tmp/claude-session-<id>-reviewed.json` on completion. The `review-reminder` Stop hook checks for this marker's absence alongside the session files manifest.
- Diff assembly uses budget-aware per-file processing (80KB budget) with generated/binary file exclusion (`*.lock`, `*.min.js`, `*.min.css`, `*.map`, `*.svg`). Files exceeding the remaining budget get a `--stat` summary instead of full diff.
- When generating `--stat` fallbacks for over-budget files, include both `git diff --stat -- "$file"` and `git diff --cached --stat -- "$file"` — staged-only changes have empty `git diff --stat`.
- Shell loop variable scoping: `cmd | while read` runs in a subshell — variable mutations are lost. Use heredoc-fed loops (`while read; do ... done <<EOF`) to keep mutations in the parent shell.
- Use `while IFS= read -r file` not `for file in $FILES` when iterating filenames — `for` splits on spaces in paths.
- Hook scripts use `execFileSync("git", [...])` (not `execSync`) to avoid shell injection. The `child_process` require is `const { execFileSync } = require("child_process")`.
- Hook output protocol: `{"continue": true, "systemMessage": "..."}` — the field is `systemMessage`, not `message`. The `continue` field must always be present.
- Review marker includes a `diffHash` (SHA-256 of diff + cached + untracked). The Stop hook recomputes and compares to detect post-review changes. The `track-session-files` hook deletes the marker on every Write/Edit to invalidate stale reviews.
- JSON extraction from LLM output: use iterative `JSON.parse` (try progressively shorter substrings from first `{` to each `}` from the end) — regex `/\{[\s\S]*\}/` over-matches when values contain braces.

## Testing & Validation

No build step or test suite. Validate changes by:
1. Installing locally: `claude plugins add /Users/pizzayap/Projects/pza-skills`
2. Running skills in a Claude Code session and checking agent dispatch + result merging
3. For hooks: trigger a Write/Edit and verify `/tmp/claude-session-*-files.json` updates
4. For review marker: run `/ollama-review` or `/arewedone` and verify `/tmp/claude-session-*-reviewed.json` exists
5. For structured output: run `/ollama-review --wait` and check if JSON parsing succeeds (or fallback triggers cleanly)

## Plugin Manifest

Skills and agents are auto-discovered from `skills/*/SKILL.md` and `agents/*.md`. Top-level plugin metadata (name, version, keywords) and the explicit `skills` directory listing live in `.claude-plugin/plugin.json`.

## External Config

- `~/.claude/pza-ollama-model` — User's chosen Ollama model (written by `/ollama-setup`, read by all Ollama-powered skills). Fallback default: `kimi-k2.6:cloud`.
