# pza-skills

A Claude Code plugin with personal productivity skills for code review, plan verification, and session tracking.

## Skills

### `/arewedone`

Multi-reviewer completeness check. Launches three review agents in parallel — structural completeness, code quality, and Ollama code review — then synthesizes findings into a unified report with deduplication and severity tiers.

**Triggers:** "are we done", "review my changes", "check completeness"

**Optional:** [Ollama](https://ollama.com) (for Ollama review)

### `/ollama-review`

Runs an Ollama-powered code review with smart scope detection. Reviews uncommitted changes when the working tree is dirty; falls back to reviewing the last commit (`HEAD~1..HEAD`) when clean — instead of doing nothing.

**Triggers:** `/ollama-review`, `/ollama-review --wait`, `/ollama-review --background`

**Requires:** [Ollama](https://ollama.com)

### `/ollama-setup`

Configure the Ollama model used by `/ollama-review`, `/areyousure`, and `/arewedone`. Fetches the latest cloud models from ollama.com dynamically, lets you pick one, tests it, and saves the choice. Run once to set up, or anytime to change models.

**Usage:** `/ollama-setup` (interactive) or `/ollama-setup glm-5.1:cloud` (direct)

**Requires:** [Ollama](https://ollama.com)

### `/hook-worthy`

Session auditor that analyzes your conversation for recurring mistakes, convention violations, or dangerous patterns worth enforcing as Claude Code hooks. Applies a strict filter (recurrence, automation feasibility, signal-to-noise) to avoid noisy hooks, then generates copy-paste-ready hook configurations.

**Triggers:** "check for hooks", "find hook-worthy patterns", "what should be a hook"

### `/areyousure`

Dual-engine plan verification. Launches both a Claude agent (using Context7, DeepWiki, and web search) and an Ollama agent in parallel to independently re-validate the plan against the codebase and current stable APIs. Merges findings with confidence scores and agreement rates.

**Triggers:** "are you sure", "are you sure about the plan", "double-check the plan", "verify plan", "deep check the plan", "validate the plan"

**Flags:** `--claude-only`, `--ollama-only`

**Optional:** [Ollama](https://ollama.com) (for dual verification; falls back to Claude-only if missing)

## Agents

### `structural-completeness-reviewer`

Reviews code changes for structural integrity and codebase hygiene. Checks for dead code, orphaned imports, incomplete multi-layer changes, development artifacts, and dependency hygiene. Used by `/arewedone` as Agent A.

### `code-quality-reviewer`

Reviews code changes for correctness, security, architecture, and performance. Uses confidence scoring (0-100) to filter out false positives — only findings with confidence >= 80 are reported. Used by `/arewedone` as Agent B.

### `plan-verifier`

Verifies implementation plans against current documentation using Context7 (library APIs), DeepWiki (GitHub repo docs), and web search. Returns a structured findings report with exact corrections. Used by `/areyousure` as Agent 1.

### `ollama-plan-verifier`

Forwards implementation plans to an Ollama model for independent technical review. Returns a structured verification report. Used by `/areyousure` as Agent 2.

## Hook

### `track-session-files`

A `PostToolUse` hook that tracks every file modified by `Write` or `Edit` during a session. Writes a JSON manifest to `/tmp/claude-session-<id>-files.json`. Used by `/arewedone` to scope reviews to session-relevant changes instead of the entire repo.

## Installation

### Via Claude Code plugin marketplace

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

### Via [skills.sh](https://skills.sh) / `npx skills`

```sh
npx skills add pizzayap/pza-skills
```

## Dependencies

Some skills depend on [Ollama](https://ollama.com) being installed (external CLI tool, not a Claude Code plugin):

| Skill | Required | Optional |
|---|---|---|
| `/arewedone` | — | Ollama |
| `/ollama-review` | Ollama | — |
| `/ollama-setup` | Ollama | — |
| `/hook-worthy` | — | — |
| `/areyousure` | — | Ollama |

Skills gracefully degrade when optional dependencies are missing — the Ollama review portion is skipped and the remaining reviewers still run.

## Model Configuration

Run `/ollama-setup` to choose your model. Default: `kimi-k2.6:cloud`. The choice is saved to `~/.claude/pza-ollama-model` and used by all Ollama-powered skills automatically.

## License

MIT
