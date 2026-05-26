# AGENTS.md

This file provides guidance to Codex and other coding harnesses when working with code in this repository.

## Overview

This is a portable Agent Skills package (`PZA-skills`) that provides personal skills for code review, plan verification, hook auditing, agent-guidance maintenance, and session tracking. It uses multi-agent architectures with parallel execution and intelligent result merging.

## Architecture

```
.claude-plugin/plugin.json   — Claude Code compatibility manifest
lib/pza-runtime.js           — Shared runtime for config, session markers, diff hashes, bounded/redacted context, plan context collection, reviewer dispatch, hook proposal validation, and Ollama invocation
.opencode/*                  — OpenCode command/agent adapters
.pi/prompts/*                — Pi slash-command aliases
skills/*/SKILL.md            — Skill definitions (markdown with frontmatter)
agents/*.md                  — Agent definitions (markdown with frontmatter + tools)
hooks/hooks.json             — Hook event bindings
hooks/scripts/*.js           — Hook implementation scripts
```

**Skills** orchestrate work by spawning **agents** in parallel and merging their results. The `/arewedone` skill launches structural, quality, configured CLI-backed AI reviewers (Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity when enabled and available), and configured adversarial provider/model lanes, synthesizes findings, then runs proof commands (tests, build, lint) plus optional trusted-worktree checks such as Snyk before declaring done; `/areyousure` verifies file-backed or conversation-backed plans against local repo evidence and reports claims as unverifiable when local evidence cannot prove them. `/agent-docs-audit` and `/agent-docs-revise` maintain `AGENTS.md`/`CLAUDE.md` guidance with AGENTS-first semantics and approval-gated edits. `/arewedone` reviewer backend toggles, second-opinion mode, model choices, adversarial lanes, and optional checks are configured via `/pza-settings`.

`/arewedone` review agents have strictly non-overlapping native scopes: `structural-completeness-reviewer` (codebase hygiene — dead code, dev artifacts, dependency/config completeness) vs `code-quality-reviewer` (correctness, security, architecture, performance with confidence scoring). Configured backend reviewers also run through `code-quality-reviewer` in backend mode. Adversarial lanes provide security-focused review with attacker mindset across configured providers/models through the provider-agnostic `adversarial-reviewer`; their security scope intentionally overlaps with `code-quality-reviewer`'s security dimension, with overlap handled by dedup (corroborated findings get HIGH confidence).

**Hooks** run automatically on Claude Code compatibility tool events. The `track-session-files` hook fires on every Write/Edit to maintain a JSON manifest of modified files at `/tmp/pza-skills-session-<id>-files.json`, which `/arewedone` uses to scope reviews. The `review-reminder` hook fires on Stop to nudge the user if files were modified but no review was run (checks for the review marker file). Do not promise hook support for Codex/OpenCode/Pi until their hook payloads are verified.

## Key Conventions

- Ollama invocation pattern: prefer `node "$HOME/.pza-skills/lib/pza-runtime.js" ollama-run <model>` with prompt content on stdin. The runtime tries the current `ollama run` flow and keeps a fallback for older launch-style workflows.
- Plan-verification context pattern: use `node "$HOME/.pza-skills/lib/pza-runtime.js" collect-plan-context "$PLAN_FILE" "$PLAN_SOURCE" --max-bytes 20000` for bounded local plan context. Conversation-backed plans may be materialized only under `/tmp` when a local helper needs a file path; never write them into the repository.
- Review context pattern: public skill markdown must not use load-time command injection. At invocation time, use `node "$HOME/.pza-skills/lib/pza-runtime.js" skill-status <skill>`, `collect-review-context --summary|--redacted-diff`, `collect-plan-context`, and `redact-context` instead of duplicating settings reads, plan reads, or diff assembly in skill text. `collect-review-context` omits hidden untracked paths from forwarded reviewer context to avoid leaking local state, but must keep tracked dot-directory adapters such as `.opencode/` visible.
- When interpolating git diffs into `-p` arguments, use heredoc (`cat <<'EOFPROMPT'...EOFPROMPT`) to avoid shell metacharacter injection from diff content.
- When forwarding file content to CLI tools (e.g., `codex exec`), write the full prompt+content to a temp file and pipe via stdin (`cat "$FILE" | codex exec -`). Do NOT use `$(cat "$FILE")` inside double-quoted command arguments — this re-exposes content to shell expansion, defeating the temp-file safety pattern.
- When assembling prompt+diff temp files, write the static prompt via single-quoted heredoc, then append untrusted content (diffs, untracked file content) via `printf '%s' "$VAR" >> "$FILE"`. Never embed untrusted content inside a heredoc body — content containing the delimiter string on its own line closes the heredoc early, exposing subsequent lines to shell interpretation.
- Use BSD-compatible `grep` flags. The Perl-regex flag is not supported by macOS stock BSD grep. BRE alternation also fails on macOS BSD grep; use `grep -Eo` with ERE alternation instead.
- Agent color tags in frontmatter control status line display during parallel execution.
- Assigned agent colors: `red` (structural-completeness-reviewer), `yellow` (code-quality-reviewer), `cyan` (plan-verifier), `white` (adversarial-reviewer). New agents must use a unique color.
- Skills declare `triggers:` for natural language activation and `arguments:` for flag-based invocation.
- Optional external dependencies are handled with graceful fallback — skills detect availability via `command -v` and adjust scope rather than failing. Users run `/pza-settings` to set the native model label, set second-opinion mode (`ask`, `native-only`, or `strict`), toggle reviewer backends, choose exact CLI models, and configure adversarial provider/model lanes. With no arguments, `/pza-settings` may launch the localhost-only visual companion through `node "$HOME/.pza-skills/lib/pza-runtime.js" settings-ui`; it prints a tokenized URL and writes the same local config as the CLI commands. Config is stored at `~/.pza-skills/settings.json`; the Ollama model is mirrored to `~/.pza-skills/ollama-model` for compatibility. Legacy `~/.claude` and `~/.Codex` config is read as migration fallback only.
- After changing `lib/pza-runtime.js`, run `scripts/install-runtime.sh` before validating installed invocation. After changing public skill markdown, refresh only PZA-owned installed copies under `~/.agents/skills/<skill>/` when checking local invocation; leave unrelated installed skills untouched.
- Codex invocation pattern: public skill and agent text should call `run-reviewer`; inside the runtime, Codex uses `codex exec -` with a prompt file on stdin so PZA can provide bounded/redacted context. Avoid Codex's raw diff-review subcommand in skill forwarding paths because it bypasses runtime redaction.
- Prefer the `codex` CLI for Codex integrations. Do not depend on a harness-specific plugin cache path.
- Codex can be installed but unauthenticated. Agents check for auth errors and report enabled reviewer runs as `blocked — not authenticated` distinctly from `missing`.
- If sandbox approval for an external reviewer is denied because private workspace context would leave the machine, mark that enabled reviewer lane `blocked` or `skipped` according to second-opinion mode and continue with local review, proof commands, and static scans; do not declare strict review complete. Do not route around the denial.
- Do not conflate PZA second-opinion policy with harness sandbox/full-access settings. `strict` makes external reviewer lanes required and sets runtime `approvalRequired=false`, but nested CLIs can still be blocked by the harness, provider access, auth, or unsupported safe mode. Diagnose from the exact `PZA reviewer result: blocked - <reason>` suffix before changing reviewer settings.
- Codex CLI output is always prose/markdown (not structured JSON). Do not attempt JSON parsing on Codex output — only Ollama output may contain structured JSON.
- Plugin agents (`agents/*.md`) are dispatched by the skill runtime, not via the `Agent` tool's `subagent_type`. To simulate a plugin agent's work outside a skill, use `general-purpose` agent type with equivalent instructions.
- In detection scripts using `[ -f "A" ] || [ -f "B" ] && echo "found"`, POSIX left-associative precedence makes this correct, but for clarity prefer `{ [ -f "A" ] || [ -f "B" ]; } && echo "found"`.
- Hook scripts validate `session_id` to prevent path traversal before writing to `/tmp/`.
- Ollama review requests structured JSON output (verdict + findings array). Structured output is best-effort — if the model returns non-JSON, summarize the raw text. Use `node -e` (not `jq`) for JSON extraction and validation, since `jq` is not a project dependency.
- Review marker files: `/arewedone` writes `/tmp/pza-skills-session-<id>-reviewed.json` on completion. The `review-reminder` Stop hook also reads legacy Claude/Codex marker paths during migration.
- Backend review execution uses `run-reviewer <code|adversarial> <provider> <model>` with prompt content on stdin. The helper runs known providers through argv arrays, emits `PZA reviewer result: passed|blocked|failed`, distinguishes missing/auth/error states, and compares `diff-hash` before and after the run.
- Backend review context uses `collect-review-context --redacted-diff --max-bytes 40000 --per-file-bytes 8192` with generated/binary file exclusion and redaction. Do not duplicate that collection logic in skills or forwarding agents.
- Snyk is an optional proof check, not a reviewer backend. It is disabled by default, runs through `run-check snyk`, emits `PZA check result: passed|blocked|failed|skipped`, and should only be run on trusted worktrees because the Snyk CLI may execute package-manager code while collecting dependency data.
- Shell loop variable scoping: `cmd | while read` runs in a subshell — variable mutations are lost. Use heredoc-fed loops (`while read; do ... done <<EOF`) to keep mutations in the parent shell.
- Use `while IFS= read -r file` not `for file in $FILES` when iterating filenames — `for` splits on spaces in paths.
- Hook scripts use `execFileSync("git", [...])` (not `execSync`) to avoid shell injection. The `child_process` require is `const { execFileSync } = require("child_process")`.
- Hook output protocol: `{"continue": true, "systemMessage": "..."}` — the field is `systemMessage`, not `message`. The `continue` field must always be present.
- Review marker includes a `diffHash` (SHA-256 of diff + cached + untracked). The Stop hook recomputes and compares to detect post-review changes. The `track-session-files` hook deletes the marker on every Write/Edit to invalidate stale reviews.
- `run-reviewer` emits `PZA worktree-change details` when the before/after diff-hash guard fails; report those tracked, staged, and untracked path details instead of asking the user to run git status commands manually.
- JSON extraction from LLM output: use iterative `JSON.parse` (try progressively shorter substrings from first `{` to each `}` from the end) — regex `/\{[\s\S]*\}/` over-matches when values contain braces.
- The `plan-verifier` agent is local-only. It checks paths, imports, manifests, lockfiles, commands, and checked-in guidance. It does not access the network or send plan contents outside the local workflow; claims that need outside evidence are reported as unverifiable.
- `skill-status areyousure` must expose only local plan-discovery context, not reviewer, adversarial, or plan-reviewer configuration. Keep `scripts/validate-portability.sh` coverage for this boundary when changing runtime status output.

## Testing & Validation

No build step or test suite. Validate changes by:
1. For runtime, skill, adapter, or hook changes, run `scripts/validate-portability.sh`; it covers Node syntax, runtime defaults, settings UI, reviewer status scope, plan context helpers, redaction/context helpers, hook session tracking, adapter parity, load-time command injection, and scanner-risk static checks
2. Installing locally in the target harness; see `docs/harnesses.md`
3. Running skills in a Codex/OpenCode/Pi/Claude compatibility session and checking dispatch + result merging
4. For Claude compatibility hooks: trigger a Write/Edit and verify `/tmp/pza-skills-session-*-files.json` updates
5. For review marker: run `/arewedone` and verify `/tmp/pza-skills-session-*-reviewed.json` exists
6. For structured Ollama output: enable the Ollama reviewer through `/pza-settings`, run `/arewedone`, and check if JSON parsing succeeds (or fallback triggers cleanly)

- When adding or modifying agents/skills, update `README.md` to keep skill descriptions, agent listings, and the dependency table in sync.

## Plugin Manifest

Skills and agents are canonical in `skills/*/SKILL.md` and `agents/*.md`. Harness adapters live in `.opencode/`, `.pi/`, and `.claude-plugin/`.

## External Config

- `~/.pza-skills/ollama-model` — Compatibility mirror for the configured Ollama reviewer model. Fallback default: `kimi-k2.6:cloud`.
- `~/.pza-skills/settings.json` — Reviewer backend config and integration toggles. Shape includes `{"codex": true, "ollama": true, "adversarial": true, "secondOpinionMode": "ask", "nativeModel": "...", "reviewers": {"native": {"enabled": true, "model": "..."}, "ollama": {"enabled": true, "model": "..."}, "codex": {"enabled": true, "model": "..."}, "opencode": {"enabled": false, "model": "..."}, "kilo": {"enabled": false, "model": "..."}, "cursor": {"enabled": false, "model": "..."}, "antigravity": {"enabled": false, "model": "..."}}, "adversarialReviewers": [{"id": "cursor-sonnet", "provider": "cursor", "model": "anthropic/claude-sonnet-4.5", "enabled": true}], "checks": {"snyk": {"enabled": false, "severityThreshold": "high"}}}`. Written by `/pza-settings` and read by `/arewedone` at runtime. Missing file defaults to native/Ollama/Codex enabled, external CLIs disabled, second-opinion `ask`, adversarial enabled, and Snyk disabled. Missing `adversarialReviewers` preserves legacy Ollama/Codex adversarial behavior; an explicit empty array means no adversarial lanes. `/arewedone --adversarial` overrides only the global adversarial master toggle; `--no-adversarial` forces all adversarial lanes off.
