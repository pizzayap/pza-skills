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
npx skills add pizzayap/pza-skills --skill pza-settings
npx skills add pizzayap/pza-skills --skill hook-worthy
npx skills add pizzayap/pza-skills --skill work-issue
```

Optional integrations are detected at runtime. Use `/pza-settings` after installation to open the local visual settings companion, record the native reviewer model label, toggle reviewer CLIs, and choose exact models for Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity where installed.

Recommended first run after installation:

```text
/pza-settings
```

That command starts a localhost-only settings UI when the harness can run a local
server. Open the printed `http://127.0.0.1:.../?token=...` URL, choose enabled
reviewers and models, then click **Save and Stop Server**. For terminal-only
setup, use `/pza-settings --status` or the direct examples below.

For harness-specific setup details, see [docs/harnesses.md](docs/harnesses.md).

## Skills

### `/arewedone`

Multi-reviewer completeness check. Launches structural completeness, code quality, configured CLI-backed reviewers (Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity where enabled and available), and optional adversarial security reviewers, then synthesizes findings and runs proof commands.

**Triggers:** "are we done", "review my changes", "check completeness"

**Optional:** [Ollama](https://ollama.com), [Codex](https://github.com/openai/codex), OpenCode, Kilo Code, Cursor Agent, Antigravity (toggleable via `/pza-settings`)

### `/pza-settings`

Configures reviewer backends for `/areyousure` and `/arewedone`. With no arguments it launches a tokenized localhost settings UI. Use it to set the native harness/model label, toggle CLI reviewers, choose exact model names, and enable or disable adversarial review. Settings are saved to `~/.pza-skills/settings.json`; the Ollama model is also mirrored to `~/.pza-skills/ollama-model` for compatibility.

**Usage:** `/pza-settings`, `/pza-settings --status`, `/pza-settings native model codex:gpt-5.5`, `/pza-settings ollama model kimi-k2.6:cloud`, `/pza-settings opencode on`, `/pza-settings opencode model openai/gpt-5.3-codex`, `/pza-settings adversarial off`

The visual companion can also be run directly from this repository:

```bash
node ./lib/pza-runtime.js settings-ui
```

Supported reviewer backends:

| Reviewer | CLI | Model setting |
|---|---|---|
| Native | active harness | Manual label, because most harnesses do not expose it |
| Ollama | `ollama` | `node ./lib/pza-runtime.js ollama-run <model>` |
| Codex | `codex` | `codex exec --model <model>` and `codex review -c model=<model>` where supported |
| OpenCode | `opencode` | `opencode run --model provider/model` |
| Kilo Code | `kilo` | `kilo run --model provider/model` |
| Cursor Agent | `cursor-agent` | `cursor-agent -p --output-format text --model <model>` |
| Antigravity | `agy` | Only when local `agy --help` shows a safe non-interactive prompt or stdin mode |

Ollama is configured as a reviewer backend through `/pza-settings`; there are no separate Ollama-only setup or review skills.

### `/hook-worthy`

Audits the current session for recurring mistakes, convention violations, or dangerous patterns worth enforcing as harness hooks. Claude Code hooks are the implemented compatibility target; other harness hooks are documented only after stable payloads are verified.

### `/work-issue`

Works a GitHub issue from `#123`, `owner/repo#123`, an issue URL, or the next best open issue in the resolved repository. With no issue argument, it lists open issues, ranks AFK-ready candidates, chooses the clear top issue, and pauses for user choice when nothing is clearly ready. It resolves the repository, fetches issue context and blockers, implements only the accepted scope, runs relevant checks, commits, pushes, and opens a draft PR with correct issue-closing semantics.

**Usage:** `/work-issue`, `/work-issue --repo owner/repo`, `/work-issue #123`, `/work-issue owner/repo#123`, `/work-issue https://github.com/owner/repo/issues/123`

**Requires:** Git, [GitHub CLI](https://cli.github.com). Authentication is only required for private repositories and write actions such as creating PRs or closing issues.

### `/areyousure`

Multi-engine plan verification. Verifies either a plan file or the latest conversation-backed plan, then launches native, enabled CLI-backed verifiers (Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity where available), and configured custom CLI verifiers to re-check the plan against the codebase and current stable APIs.

**Flags:** `--native-only`, `--ollama-only`, `--codex-only`, `--opencode-only`, `--kilo-only`, `--cursor-only`, `--antigravity-only`, `--cli-only`, `--no-cli`, `--custom-only`; `--claude-only` remains a deprecated alias for `--native-only`.

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

`settings.json` is the canonical reviewer-backend config. It stores `native`, `ollama`, `codex`, `opencode`, `kilo`, `cursor`, and `antigravity` enabled/model choices; top-level `codex` and `ollama` booleans remain for compatibility.

## Harness Adapters

See [docs/harnesses.md](docs/harnesses.md) and [docs/portability.md](docs/portability.md).

- Codex: install canonical skills into `~/.codex/skills/` and agents into `~/.codex/agents/`.
- OpenCode: project wrappers live in `.opencode/commands/` and `.opencode/agents/`.
- Pi: load canonical `SKILL.md` directories directly; optional slash aliases live in `.pi/prompts/`.
- Claude Code: `.claude-plugin/` and `hooks/hooks.json` remain as compatibility packaging.

## Dependencies

| Skill | Required | Optional |
|---|---|---|
| `/arewedone` | — | Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, Antigravity |
| `/pza-settings` | — | Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, Antigravity |
| `/hook-worthy` | — | — |
| `/work-issue` | Git, GitHub CLI (`gh`) | — |
| `/areyousure` | — | Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, Antigravity, custom CLI reviewers, Exa MCP |

Skills gracefully degrade when optional dependencies are missing.

## License

MIT
