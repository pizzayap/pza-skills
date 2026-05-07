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

**Hooks** run automatically on tool events. The `track-session-files` hook fires on every Write/Edit to maintain a JSON manifest of modified files at `/tmp/claude-session-<id>-files.json`, which `/arewedone` uses to scope reviews.

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

## Testing & Validation

No build step or test suite. Validate changes by:
1. Installing locally: `claude plugins add /Users/pizzayap/Projects/pza-skills`
2. Running skills in a Claude Code session and checking agent dispatch + result merging
3. For hooks: trigger a Write/Edit and verify `/tmp/claude-session-*-files.json` updates

## Plugin Manifest

Skills and agents are auto-discovered from `skills/*/SKILL.md` and `agents/*.md`. Top-level plugin metadata (name, version, keywords) and the explicit `skills` directory listing live in `.claude-plugin/plugin.json`.

## External Config

- `~/.claude/pza-ollama-model` — User's chosen Ollama model (written by `/ollama-setup`, read by all Ollama-powered skills). Fallback default: `kimi-k2.6:cloud`.
