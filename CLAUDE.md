# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Claude Code plugin (`pza-skills`) that provides personal skills for code review, plan verification, hook auditing, and session tracking. It uses multi-agent architectures with parallel execution and intelligent result merging.

## Architecture

```
.claude-plugin/plugin.json   — Plugin manifest (name, version, registration)
skills/*/SKILL.md            — Skill definitions (markdown with frontmatter)
agents/*.md                  — Agent definitions (markdown with frontmatter + tools)
hooks/hooks.json             — Hook event bindings
hooks/scripts/*.js           — Hook implementation scripts
```

**Skills** orchestrate work by spawning **agents** in parallel and merging their results. The `/arewedone` skill launches 3 agents simultaneously; `/verify-plan` launches 2 with different AI backends (Claude + Ollama) and merges by confidence scoring.

**Hooks** run automatically on tool events. The `track-session-files` hook fires on every Write/Edit to maintain a JSON manifest of modified files at `/tmp/claude-session-<id>-files.json`, which `/arewedone` uses to scope reviews.

## Key Conventions

- Agent model is declared in frontmatter (`model: opus`, `model: haiku`). Use `opus` for complex analysis, `haiku` for lightweight forwarding.
- Agent color tags in frontmatter control status line display during parallel execution.
- Skills declare `triggers:` for natural language activation and `arguments:` for flag-based invocation.
- Optional external dependencies (Ollama, superpowers plugin) are handled with graceful fallback — skills detect availability via `which ollama` and adjust scope rather than failing. Users run `/ollama-setup` to configure their model; config is stored at `~/.claude/pza-ollama-model`.
- Hook scripts validate `session_id` to prevent path traversal before writing to `/tmp/`.

## Testing & Validation

No build step or test suite. Validate changes by:
1. Installing locally: `claude plugins add /Users/pizzayap/Projects/pza-skills`
2. Running skills in a Claude Code session and checking agent dispatch + result merging
3. For hooks: trigger a Write/Edit and verify `/tmp/claude-session-*-files.json` updates

## Plugin Manifest

Changes to skill/agent/hook registration must be reflected in `.claude-plugin/plugin.json`.
