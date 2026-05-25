# PZA-skills

[![skills.sh](https://skills.sh/b/pizzayap/pza-skills)](https://skills.sh/pizzayap/pza-skills)

Portable Agent Skills for code review, plan verification, hook auditing, agent-guidance maintenance, and session tracking across Codex, OpenCode, Pi, and Claude Code compatibility installs.

The canonical workflows live in `skills/*/SKILL.md` and `agents/*.md`. Harness-specific files are thin adapters; they should not fork the core workflow logic. Shared runtime behavior lives in `lib/pza-runtime.js`, including settings, reviewer dispatch helpers, and bounded/redacted context collection.

## Installation

Install all skills from skills.sh:

```bash
npx skills add pizzayap/pza-skills
```

Run the same command again to refresh an existing install after package updates.

Install the shared runtime helper once per machine:

```bash
git clone https://github.com/pizzayap/pza-skills.git ~/.pza-skills/package
~/.pza-skills/package/scripts/install-runtime.sh
```

Update the installed runtime after package changes:

```bash
git -C ~/.pza-skills/package pull --ff-only
~/.pza-skills/package/scripts/install-runtime.sh
```

Install a single skill:

```bash
npx skills add pizzayap/pza-skills --skill arewedone
npx skills add pizzayap/pza-skills --skill areyousure
npx skills add pizzayap/pza-skills --skill agent-docs-audit
npx skills add pizzayap/pza-skills --skill agent-docs-revise
npx skills add pizzayap/pza-skills --skill pza-settings
npx skills add pizzayap/pza-skills --skill hook-worthy
npx skills add pizzayap/pza-skills --skill work-issue
```

Optional integrations are detected at runtime. Use `/pza-settings` after installation to open the local visual settings companion, record the native reviewer model label, toggle reviewer CLIs, choose exact models for Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity where installed, and configure adversarial provider/model lanes.

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

Multi-reviewer completeness check. Launches structural completeness, code quality, configured CLI-backed reviewers (Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity where enabled), and optional adversarial security lanes, then synthesizes findings and runs proof commands. Enabled CLI reviewers are required; missing, blocked, or failed reviewer runs make the strict check incomplete. External reviewers receive context through `collect-review-context`, which redacts likely secrets and caps total/per-file bytes.

**Triggers:** "are we done", "review my changes", "check completeness"

**Optional:** [Ollama](https://ollama.com), [Codex](https://github.com/openai/codex), OpenCode, Kilo Code, Cursor Agent, Antigravity (toggleable via `/pza-settings`)

### `/pza-settings`

Configures reviewer backends for `/areyousure` and `/arewedone`. With no arguments it launches a tokenized localhost settings UI. Use it to set the native harness/model label, toggle CLI reviewers, choose exact model names, and add multiple adversarial review lanes with independent providers and models. Settings are saved to `~/.pza-skills/settings.json`; the Ollama model is also mirrored to `~/.pza-skills/ollama-model` for compatibility.

**Usage:** `/pza-settings`, `/pza-settings --status`, `/pza-settings native model codex:gpt-5.5`, `/pza-settings ollama model kimi-k2.6:cloud`, `/pza-settings opencode on`, `/pza-settings opencode model openai/gpt-5.3-codex`, `/pza-settings adversarial off`, `/pza-settings adversarial add cursor anthropic/claude-sonnet-4.5 cursor-sonnet`

The visual companion can also be run directly after installing the runtime:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" settings-ui
```

Supported reviewer backends:

| Reviewer | CLI | State meaning |
|---|---|---|
| Native | active harness | `ready` when enabled |
| Ollama | `ollama` | `ready`, `disabled`, `missing`, or `blocked` when model/setup is unavailable |
| Codex | `codex` | `ready`, `disabled`, `missing`, or `blocked` if the run cannot execute/authenticate |
| OpenCode | `opencode` | `ready`, `disabled`, `missing`, or `blocked` |
| Kilo Code | `kilo` | `ready`, `disabled`, `missing`, or `blocked` |
| Cursor Agent | `cursor-agent` | `ready`, `disabled`, `missing`, or `blocked` |
| Antigravity | `agy` | `ready` only when local `agy --help` shows safe `--sandbox --print` support |

Adversarial lanes are configured separately from normal reviewer toggles. For example, Cursor normal review can be off while a Cursor adversarial lane is on:

```text
/pza-settings cursor off
/pza-settings adversarial add cursor anthropic/claude-sonnet-4.5 cursor-sonnet
/pza-settings adversarial add codex gpt-5.5 codex-gpt55
```

Ollama is configured as a reviewer backend through `/pza-settings`; there are no separate Ollama-only setup or review skills.

### `/hook-worthy`

Audits the current session for recurring mistakes, convention violations, or dangerous patterns worth enforcing as harness hooks. Claude Code hooks are the implemented compatibility target; other harness hooks are documented only after stable payloads are verified. Command hooks require explicit user approval of the exact command, and hook JSON can be checked with `validate-hook-proposal`.

### `/agent-docs-audit`

Read-only quality audit for `AGENTS.md`, `CLAUDE.md`, and nested agent guidance files. It checks commands, architecture, project-specific gotchas, conciseness, current paths, actionability, and AGENTS/CLAUDE mirror drift against the live repository.

**Usage:** `/agent-docs-audit`, `/agent-docs-audit --root-only`, `/agent-docs-audit --all`, `/agent-docs-audit path/to/docs`

### `/agent-docs-revise`

Captures durable session learnings and current repo evidence, then proposes a full rewrite or focused diff for `AGENTS.md` before editing. When `CLAUDE.md` exists as a compatibility mirror, it updates that file after `AGENTS.md` with intentional Claude-specific differences.

**Usage:** `/agent-docs-revise`, `/agent-docs-revise --root-only`, `/agent-docs-revise --all`, `/agent-docs-revise path/to/docs`

### `/work-issue`

Works a GitHub issue from `#123`, `owner/repo#123`, an issue URL, or the next best open issue in the resolved repository. With no issue argument, it lists open issues, ranks AFK-ready candidates, chooses the clear top issue, and pauses for user choice when nothing is clearly ready. It resolves the repository, fetches issue context and blockers, implements only the accepted scope, runs relevant checks, commits, pushes, and opens a draft PR with correct issue-closing semantics.

**Usage:** `/work-issue`, `/work-issue --repo owner/repo`, `/work-issue #123`, `/work-issue owner/repo#123`, `/work-issue https://github.com/owner/repo/issues/123`

**Requires:** Git, [GitHub CLI](https://cli.github.com). Authentication is only required for private repositories and write actions such as creating PRs or closing issues.

### `/areyousure`

Multi-engine plan verification. Verifies either a plan file or the latest conversation-backed plan, then launches native, enabled CLI-backed verifiers (Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity), and configured custom CLI verifiers to re-check the plan against the codebase and current stable APIs. Enabled CLI verifiers are required; missing, blocked, or failed reviewer runs make the strict check incomplete. CLI plan prompts are produced by `plan-review-prompt`, which redacts likely secrets and caps forwarded plan content.

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

Custom reviewer commands receive the generated plan-review prompt on stdin and should return markdown/prose with Critical, Warning, Info, and Verified Correct sections.
The runtime keeps command arrays private; skill context only shows reviewer names and enabled status.

## Agents

- `structural-completeness-reviewer` — codebase hygiene, dead code, integration completeness, dependency/config completeness.
- `code-quality-reviewer` — correctness, security, architecture, and performance review; also forwards bounded context to configured reviewer backends in backend mode.
- `plan-verifier` — verifies plans against local code/current docs; also forwards bounded plan context to configured reviewer backends in backend mode.
- `adversarial-reviewer` — runs configured security-focused adversarial lanes with bounded, redacted review context.

## Runtime Helpers

Installed skills use runtime helpers at `~/.pza-skills/lib/pza-runtime.js`:

- `skill-status <skill>` — invocation-time reviewer/config/CLI status without exposing custom command arrays.
- `collect-review-context --summary|--redacted-diff` — bounded review context for `/arewedone`.
- `collect-plan-context <plan-file|-> <source>` — bounded plan context for `/areyousure`.
- `redact-context` — stdin/stdout redaction helper for likely secrets and high-entropy tokens.
- `run-reviewer <code|plan|adversarial> <provider> <model>` — provider-normalized backend review runner with diff-hash guard and `PZA reviewer result: passed|blocked|failed` status output.
- `run-plan-reviewer <name>` — argv-array custom plan reviewer runner with the same `PZA reviewer result: passed|blocked|failed` status output.
- `validate-hook-proposal` — JSON hook proposal validation for `/hook-worthy`.

Skill markdown does not use load-time command injection for context collection.

## Runtime State

New writes use harness-neutral paths:

- `~/.pza-skills/lib/pza-runtime.js`
- `~/.pza-skills/settings.json`
- `~/.pza-skills/ollama-model`
- `~/.pza-skills/plan-reviewers.json`
- `/tmp/pza-skills-session-<id>-files.json`
- `/tmp/pza-skills-session-<id>-reviewed.json`

`~/.pza-skills/` is machine-local user state. Never commit personal settings or model choices into this repository. Legacy Claude/Codex paths are read only as migration fallbacks where needed.

`settings.json` is the canonical reviewer-backend config. It stores `native`, `ollama`, `codex`, `opencode`, `kilo`, `cursor`, and `antigravity` enabled/model choices; top-level `codex` and `ollama` booleans remain for compatibility. It may also store `adversarialReviewers`, an array of `{id, provider, model, enabled}` lanes used by `/arewedone`. If `adversarialReviewers` is absent, `/arewedone` preserves legacy Ollama/Codex adversarial behavior; if it is an explicit empty array, no adversarial lanes run.

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
| `/agent-docs-audit` | — | — |
| `/agent-docs-revise` | — | — |
| `/work-issue` | Git, GitHub CLI (`gh`) | — |
| `/areyousure` | — | Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, Antigravity, custom CLI reviewers, Exa MCP |

Skills gracefully degrade when optional dependencies are missing.

## License

MIT
