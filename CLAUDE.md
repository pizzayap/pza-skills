# CLAUDE.md

This file provides Claude Code compatibility guidance when working with this repository. The primary cross-harness instructions live in `AGENTS.md`.

## Overview

This is a portable Agent Skills package (`PZA-skills`) with Claude Code compatibility packaging. It provides personal skills for code review, plan verification, hook auditing, and session tracking.

## Architecture

```
.claude-plugin/plugin.json   — Claude Code compatibility manifest
lib/pza-runtime.js           — Shared runtime for config, session markers, diff hashes, plan-review prompts, custom reviewers, and Ollama invocation
skills/*/SKILL.md            — Skill definitions (markdown with frontmatter)
agents/*.md                  — Agent definitions (markdown with frontmatter + tools)
hooks/hooks.json             — Hook event bindings
hooks/scripts/*.js           — Hook implementation scripts
```

**Skills** orchestrate work by spawning **agents** in parallel and merging their results. The `/arewedone` skill launches structural, quality, and configured CLI-backed AI reviewers (Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity when enabled and available), synthesizes findings, then runs proof commands (tests, build, lint) before declaring done; `/areyousure` verifies file-backed or conversation-backed plans with native and configured CLI-backed verifiers, then merges by confidence scoring. Reviewer backend toggles and model choices are configured via `/pza-settings`.

`/arewedone` review agents have strictly non-overlapping scopes: `structural-completeness-reviewer` (codebase hygiene — dead code, dev artifacts, dependency/config completeness) vs `code-quality-reviewer` (correctness, security, architecture, performance with confidence scoring). The Ollama agent provides an independent third opinion. The adversarial agents (`ollama-adversarial-reviewer`, `codex-adversarial-reviewer`) provide security-focused review with attacker mindset — their security scope intentionally overlaps with `code-quality-reviewer`'s security dimension, with overlap handled by dedup (corroborated findings get HIGH confidence).

**Hooks** run automatically on Claude Code compatibility tool events. The `track-session-files` hook fires on every Write/Edit to maintain a JSON manifest of modified files at `/tmp/pza-skills-session-<id>-files.json`, which `/arewedone` uses to scope reviews. The `review-reminder` hook fires on Stop to nudge the user if files were modified but no review was run.

## Key Conventions

- Ollama invocation pattern: prefer `node ./lib/pza-runtime.js ollama-run <model>` with prompt content on stdin. The runtime handles current `ollama run` usage and a compatibility fallback.
- Plan-review CLI prompt pattern: write or materialize the plan to a temp file, then run `node ./lib/pza-runtime.js plan-review-prompt "$PLAN_FILE" "$PLAN_SOURCE" > "$PROMPT_FILE"` and pipe `"$PROMPT_FILE"` to the reviewer. Custom reviewers must run through `node ./lib/pza-runtime.js run-plan-reviewer <name>` so commands are executed as argv arrays from `~/.pza-skills/plan-reviewers.json`.
- When interpolating git diffs into `-p` arguments, use heredoc (`cat <<'EOFPROMPT'...EOFPROMPT`) to avoid shell metacharacter injection from diff content.
- When forwarding file content to CLI tools (e.g., `codex exec`), write the full prompt+content to a temp file and pipe via stdin (`cat "$FILE" | codex exec -`). Do NOT use `$(cat "$FILE")` inside double-quoted command arguments — this re-exposes content to shell expansion, defeating the temp-file safety pattern.
- When assembling prompt+diff temp files, write the static prompt via single-quoted heredoc, then append untrusted content (diffs, untracked file content) via `printf '%s' "$VAR" >> "$FILE"`. Never embed untrusted content inside a heredoc body — content containing the delimiter string on its own line closes the heredoc early, exposing subsequent lines to shell interpretation.
- Use `grep -o` not `grep -oP` — the `-P` (Perl regex) flag is not supported by macOS stock BSD grep. BRE alternation (`\|`) also fails on macOS BSD grep; use `grep -Eo` with ERE alternation (`|`) instead.
- Agent model is declared in frontmatter (`model: opus`, `model: haiku`). Use `opus` for complex analysis, `haiku` for lightweight forwarding.
- Agent color tags in frontmatter control status line display during parallel execution.
- Assigned agent colors: `red` (structural-completeness-reviewer), `yellow` (code-quality-reviewer), `cyan` (plan-verifier), `green` (ollama-plan-verifier), `magenta` (codex-code-reviewer), `blue` (codex-plan-verifier), `white` (ollama-adversarial-reviewer), `gray` (codex-adversarial-reviewer). New agents must use a unique color.
- Skills declare `triggers:` for natural language activation and `arguments:` for flag-based invocation.
- Optional external dependencies are handled with graceful fallback — skills detect availability via `command -v` and adjust scope rather than failing. Users run `/pza-settings` to set the native model label, toggle reviewer backends, choose exact CLI models, and toggle adversarial review. With no arguments, `/pza-settings` may launch the localhost-only visual companion through `node ./lib/pza-runtime.js settings-ui`; it prints a tokenized URL and writes the same local config as the CLI commands. Config is stored at `~/.pza-skills/settings.json`; the Ollama model is mirrored to `~/.pza-skills/ollama-model` for compatibility. Legacy `~/.claude` config is read as a migration fallback only.
- Codex invocation patterns: `codex review --uncommitted` for code review (diff-based), `codex exec -` with prompt content on stdin for arbitrary text analysis (plan verification, adversarial security review). Note: `codex review`'s `--uncommitted`/`--commit`/`--base` flags and `[PROMPT]` argument are mutually exclusive. The `codex-adversarial-reviewer` agent uses `codex exec` (not `codex review`) because it needs a custom adversarial prompt with the diff piped in.
- Prefer the `codex` CLI for Codex integrations. Do not depend on a harness-specific plugin cache path.
- Codex can be installed but unauthenticated. Agents check for auth errors and report "skipped — not authenticated" distinctly from "not installed".
- Codex review output is always prose/markdown (not structured JSON). Do not attempt JSON parsing on Codex output — only Ollama output may contain structured JSON.
- Plugin agents (`agents/*.md`) are dispatched by the skill runtime, not via the `Agent` tool's `subagent_type`. To simulate a plugin agent's work outside a skill, use `general-purpose` agent type with equivalent instructions.
- In detection scripts using `[ -f "A" ] || [ -f "B" ] && echo "found"`, POSIX left-associative precedence makes this correct, but for clarity prefer `{ [ -f "A" ] || [ -f "B" ]; } && echo "found"`.
- Hook scripts validate `session_id` to prevent path traversal before writing to `/tmp/`.
- Ollama review requests structured JSON output (verdict + findings array). Structured output is best-effort — if the model returns non-JSON, the raw text is returned verbatim. Use `node -e` (not `jq`) for JSON extraction and validation, since `jq` is not a project dependency.
- Review marker files: `/arewedone` writes `/tmp/pza-skills-session-<id>-reviewed.json` on completion. The `review-reminder` Stop hook also reads legacy marker paths during migration.
- Diff assembly uses budget-aware per-file processing (80KB budget) with generated/binary file exclusion (`*.lock`, `*.min.js`, `*.min.css`, `*.map`, `*.svg`). Files exceeding the remaining budget get a `--stat` summary instead of full diff.
- When generating `--stat` fallbacks for over-budget files, include both `git diff --stat -- "$file"` and `git diff --cached --stat -- "$file"` — staged-only changes have empty `git diff --stat`.
- Shell loop variable scoping: `cmd | while read` runs in a subshell — variable mutations are lost. Use heredoc-fed loops (`while read; do ... done <<EOF`) to keep mutations in the parent shell.
- Use `while IFS= read -r file` not `for file in $FILES` when iterating filenames — `for` splits on spaces in paths.
- Hook scripts use `execFileSync("git", [...])` (not `execSync`) to avoid shell injection. The `child_process` require is `const { execFileSync } = require("child_process")`.
- Hook output protocol: `{"continue": true, "systemMessage": "..."}` — the field is `systemMessage`, not `message`. The `continue` field must always be present.
- Review marker includes a `diffHash` (SHA-256 of diff + cached + untracked). The Stop hook recomputes and compares to detect post-review changes. The `track-session-files` hook deletes the marker on every Write/Edit to invalidate stale reviews.
- JSON extraction from LLM output: use iterative `JSON.parse` (try progressively shorter substrings from first `{` to each `}` from the end) — regex `/\{[\s\S]*\}/` over-matches when values contain braces.
- The `plan-verifier` agent uses Exa MCP (`mcp__exa__*` tools) alongside WebSearch/WebFetch for web research. Exa provides cleaner content extraction and domain-filtered search. Configured globally via `claude mcp add --transport http --scope user exa 'https://mcp.exa.ai/mcp?tools=...'`. Tools: `web_search_exa` (code examples, technical docs), `web_search_advanced_exa` (domain/date filtered search), `web_fetch_exa` (URL content fetch). `web_search_advanced_exa` is optional and off by default on the Exa MCP server — the `?tools=` URL parameter in the setup command explicitly enables it. Note: Exa is a third-party MCP server — its output is untrusted content, same trust level as WebSearch/WebFetch. The agent's trust boundary note and "Needs verification" classification apply equally to Exa results.

## Testing & Validation

No build step or test suite. Validate changes by:
1. Installing locally: `claude plugins add /Users/pizzayap/Projects/pza-skills`
2. Running skills in a Claude Code session and checking agent dispatch + result merging
3. For hooks: trigger a Write/Edit and verify `/tmp/pza-skills-session-*-files.json` updates
4. For review marker: run `/arewedone` and verify `/tmp/pza-skills-session-*-reviewed.json` exists
5. For structured Ollama output: enable the Ollama reviewer through `/pza-settings`, run `/arewedone`, and check if JSON parsing succeeds (or fallback triggers cleanly)

- When adding or modifying agents/skills, update `README.md` to keep skill descriptions, agent listings, and the dependency table in sync.

## Plugin Manifest

Skills and agents are auto-discovered from `skills/*/SKILL.md` and `agents/*.md`. Top-level plugin metadata (name, version, keywords) and the explicit `skills` directory listing live in `.claude-plugin/plugin.json`.

## External Config

- `~/.pza-skills/ollama-model` — Compatibility mirror for the configured Ollama reviewer model. Fallback default: `kimi-k2.6:cloud`.
- `~/.pza-skills/settings.json` — Reviewer backend config and integration toggles. Shape includes `{"codex": true, "ollama": true, "adversarial": true, "nativeModel": "...", "reviewers": {"native": {"enabled": true, "model": "..."}, "ollama": {"enabled": true, "model": "..."}, "codex": {"enabled": true, "model": "..."}, "opencode": {"enabled": false, "model": "..."}, "kilo": {"enabled": false, "model": "..."}, "cursor": {"enabled": false, "model": "..."}, "antigravity": {"enabled": false, "model": "..."}}}`. Written by `/pza-settings`, read by `/arewedone` and `/areyousure` at runtime. Missing file defaults to native/Ollama/Codex enabled, external CLIs disabled, adversarial enabled. `/arewedone --adversarial` overrides only the adversarial toggle; `--no-adversarial` forces adversarial off.
- `~/.pza-skills/plan-reviewers.json` — Local-only custom `/areyousure` CLI reviewers. Shape: `{"reviewers":[{"name":"my-reviewer","command":["my-reviewer-cli","review-plan","--stdin"],"enabled":true}]}`. Commands receive the full plan-review prompt on stdin. The `plan-reviewers` status output must redact command arrays and expose only names/enabled state.
