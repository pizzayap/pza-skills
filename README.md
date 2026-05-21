# PZA-skills

[![skills.sh](https://skills.sh/b/pizzayap/pza-skills)](https://skills.sh/pizzayap/pza-skills)

Portable Agent Skills for code review, plan verification, hook auditing, and session tracking across Codex, OpenCode, Pi, and Claude Code compatibility installs.

The canonical workflows live in `skills/*/SKILL.md` and `agents/*.md`. Harness-specific files are thin adapters; they should not fork the core workflow logic. Shared runtime behavior lives in `lib/pza-runtime.js`.

## Installation

Install all skills from skills.sh:

```bash
npx skills add pizzayap/pza-skills
```

Install a single skill:

```bash
npx skills add pizzayap/pza-skills --skill arewedone
npx skills add pizzayap/pza-skills --skill areyousure
npx skills add pizzayap/pza-skills --skill external-ai-review
npx skills add pizzayap/pza-skills --skill ollama-review
npx skills add pizzayap/pza-skills --skill ollama-setup
npx skills add pizzayap/pza-skills --skill pza-settings
npx skills add pizzayap/pza-skills --skill hook-worthy
```

Optional integrations are detected at runtime. Install [Ollama](https://ollama.com) for `/ollama-review` and Ollama-backed reviewers; install the [Codex CLI](https://github.com/openai/codex) for Codex-backed reviewers. `/external-ai-review` can use local OpenCode, Kilo Code, Cursor Agent, or Antigravity CLIs when they expose scriptable review commands. Use `/pza-settings` after installation to toggle Codex, Ollama, and adversarial review integrations.

For harness-specific setup details, see [docs/harnesses.md](docs/harnesses.md).

## Skills

### `/arewedone`

Multi-reviewer completeness check. Launches structural completeness, code quality, optional Ollama code review, optional Codex code review, and optional adversarial security reviewers, then synthesizes findings and runs proof commands.

**Triggers:** "are we done", "review my changes", "check completeness"

**Optional:** [Ollama](https://ollama.com), [Codex](https://github.com/openai/codex) (toggleable via `/pza-settings`)

### `/ollama-review`

Runs an Ollama-powered code review with smart scope detection. Reviews uncommitted changes when the working tree is dirty; falls back to reviewing the last commit (`HEAD~1..HEAD`) when clean.

**Triggers:** `/ollama-review`, `/ollama-review --wait`, `/ollama-review --background`

**Requires:** [Ollama](https://ollama.com)

### `/external-ai-review`

Runs a review-only second pass through one locally installed external AI CLI. Auto mode checks OpenCode first, then Kilo Code, Cursor Agent, and Antigravity; missing or unauthenticated CLIs are reported and skipped.

**Usage:**

```bash
/external-ai-review
/external-ai-review --tool opencode --model openai/gpt-5.3-codex
/external-ai-review --tool cursor --scope staged
/external-ai-review --scope pr --base origin/main
```

**Optional:** OpenCode (`opencode run`), Kilo Code (`kilo run`), Cursor Agent (`cursor-agent -p --output-format text`), Antigravity (`agy`, only when local help confirms a non-interactive prompt-file/stdin command).

### `/ollama-setup`

Configures the Ollama model used by `/ollama-review`, `/areyousure`, and `/arewedone`. The selected model is saved to `~/.pza-skills/ollama-model`.

**Usage:** `/ollama-setup` or `/ollama-setup glm-5.1:cloud`

### `/pza-settings`

Toggles Codex, Ollama, and adversarial review integrations. Settings are saved to `~/.pza-skills/settings.json`; legacy `~/.claude` and `~/.Codex` settings are read as migration fallbacks.

**Usage:** `/pza-settings codex off`, `/pza-settings ollama on`, `/pza-settings adversarial off`

### `/hook-worthy`

Audits the current session for recurring mistakes, convention violations, or dangerous patterns worth enforcing as harness hooks. Claude Code hooks are the implemented compatibility target; other harness hooks are documented only after stable payloads are verified.

### `/areyousure`

Multi-engine plan verification. Verifies either a plan file or the latest conversation-backed plan, then launches native, optional Ollama CLI, optional Codex CLI, and configured custom CLI verifiers to re-check the plan against the codebase and current stable APIs.

**Flags:** `--native-only`, `--ollama-only`, `--codex-only`, `--cli-only`, `--no-cli`, `--custom-only`; `--claude-only` remains a deprecated alias for `--native-only`.

**Custom plan reviewers:** add local-only reviewers to `~/.pza-skills/plan-reviewers.json`:

```json
{
  "reviewers": [
    {
      "name": "my-reviewer",
      "command": ["my-reviewer-cli", "review-plan", "--stdin"],
      "enabled": true
    }
  ]
}
```

Custom reviewer commands receive the full plan-review prompt on stdin and should return markdown/prose with Critical, Warning, Info, and Verified Correct sections.
The runtime keeps command arrays private; skill context only shows reviewer names and enabled status.

## Agents

- `structural-completeness-reviewer` — codebase hygiene, dead code, integration completeness, dependency/config completeness.
- `code-quality-reviewer` — correctness, security, architecture, and performance with confidence scoring.
- `plan-verifier` — native plan verifier using local code and available documentation/search tools.
- `ollama-plan-verifier` — forwards plans to Ollama for independent technical review.
- `codex-plan-verifier` — forwards plans to Codex CLI for independent technical review.
- `codex-code-reviewer` — forwards current git state to Codex CLI for code review.
- `ollama-adversarial-reviewer` — runs security-focused adversarial review via Ollama.
- `codex-adversarial-reviewer` — runs security-focused adversarial review via Codex CLI.

## Runtime State

New writes use harness-neutral paths:

- `~/.pza-skills/settings.json`
- `~/.pza-skills/ollama-model`
- `~/.pza-skills/plan-reviewers.json`
- `/tmp/pza-skills-session-<id>-files.json`
- `/tmp/pza-skills-session-<id>-reviewed.json`

`~/.pza-skills/` is machine-local user state. Never commit personal settings or model choices into this repository. Legacy Claude/Codex paths are read only as migration fallbacks where needed.

## Harness Adapters

See [docs/harnesses.md](docs/harnesses.md) and [docs/portability.md](docs/portability.md).

- Codex: install canonical skills into `~/.codex/skills/` and agents into `~/.codex/agents/`.
- OpenCode: project wrappers live in `.opencode/commands/` and `.opencode/agents/`.
- Pi: load canonical `SKILL.md` directories directly; optional slash aliases live in `.pi/prompts/`.
- Claude Code: `.claude-plugin/` and `hooks/hooks.json` remain as compatibility packaging.

## Dependencies

| Skill | Required | Optional |
|---|---|---|
| `/arewedone` | — | Ollama, Codex |
| `/ollama-review` | Ollama | — |
| `/external-ai-review` | — | OpenCode, Kilo Code, Cursor Agent, Antigravity CLI |
| `/ollama-setup` | Ollama | — |
| `/pza-settings` | — | Codex, Ollama |
| `/hook-worthy` | — | — |
| `/areyousure` | — | Ollama, Codex, custom CLI reviewers, Exa MCP |

Skills gracefully degrade when optional dependencies are missing.

## License

MIT
