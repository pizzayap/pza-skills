# pza-skills

A Claude Code plugin with personal productivity skills for code review, plan verification, and session tracking.

## Skills

### `/arewedone`

Multi-reviewer completeness check. Launches three review agents in parallel — structural completeness, code standards, and Codex (GPT) code review — then synthesizes findings into a unified report with deduplication and severity tiers.

**Triggers:** "are we done", "review my changes", "check completeness"

**Requires:** [openai-codex](https://github.com/openai/codex-plugin-cc) plugin (for Codex review), [superpowers](https://github.com/anthropics/claude-code-plugins) plugin (for code standards review)

### `/codex-review`

Runs a Codex code review with smart scope detection. Reviews uncommitted changes when the working tree is dirty; falls back to reviewing the last commit (`HEAD~1..HEAD`) when clean — instead of doing nothing.

**Triggers:** `/codex-review`, `/codex-review --wait`, `/codex-review --background`

**Requires:** [openai-codex](https://github.com/openai/codex-plugin-cc) plugin

### `/hook-worthy`

Session auditor that analyzes your conversation for recurring mistakes, convention violations, or dangerous patterns worth enforcing as Claude Code hooks. Applies a strict filter (recurrence, automation feasibility, signal-to-noise) to avoid noisy hooks, then generates copy-paste-ready hook configurations.

**Triggers:** "check for hooks", "find hook-worthy patterns", "what should be a hook"

### `/verify-plan`

Dual-engine plan verification. Launches both a Claude agent (using Context7, DeepWiki, and web search) and a Codex/GPT agent in parallel to independently verify technical decisions in your implementation plan against current documentation. Merges findings with confidence scores and agreement rates.

**Triggers:** "verify plan", "deep check the plan", "validate the plan"

**Flags:** `--claude-only`, `--codex-only`

**Requires:** [openai-codex](https://github.com/openai/codex-plugin-cc) plugin (for dual verification)

## Agents

### `structural-completeness-reviewer`

Reviews code changes for structural integrity and codebase hygiene. Checks for dead code, orphaned imports, incomplete multi-layer changes, development artifacts, and dependency hygiene. Used by `/arewedone` as Agent A.

### `plan-verifier`

Verifies implementation plans against current documentation using Context7 (library APIs), DeepWiki (GitHub repo docs), and web search. Returns a structured findings report with exact corrections. Used by `/verify-plan` as Agent 1.

### `codex-plan-verifier`

Forwards implementation plans to Codex (GPT) for independent technical review. Returns a structured verification report. Used by `/verify-plan` as Agent 2.

## Hook

### `track-session-files`

A `PostToolUse` hook that tracks every file modified by `Write` or `Edit` during a session. Writes a JSON manifest to `/tmp/claude-session-<id>-files.json`. Used by `/arewedone` to scope reviews to session-relevant changes instead of the entire repo.

## Installation

Add to your `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "pza-skills": {
      "source": {
        "source": "github",
        "repo": "pizzayap/pza-skills"
      }
    }
  },
  "enabledPlugins": {
    "pza-skills@pza-skills": true
  }
}
```

## Dependencies

Some skills depend on other plugins being installed:

| Skill | Required Plugin | Optional Plugin |
|---|---|---|
| `/arewedone` | — | openai-codex, superpowers |
| `/codex-review` | openai-codex | — |
| `/hook-worthy` | — | — |
| `/verify-plan` | — | openai-codex |

Skills gracefully degrade when optional dependencies are missing — the Codex review portion is skipped and the remaining reviewers still run.

## License

MIT
