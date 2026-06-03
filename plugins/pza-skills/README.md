# PZA-skills

[![skills.sh](https://skills.sh/b/pizzayap/pza-skills)](https://skills.sh/pizzayap/pza-skills)

Portable Agent Skills for code review, plan verification, hook auditing, agent-guidance maintenance, and session tracking across Codex, OpenCode, Pi, and Claude Code compatibility installs.

The canonical workflows live in `skills/*/SKILL.md` and `agents/*.md`. Harness-specific files are thin adapters; they should not fork the core workflow logic. Shared runtime behavior lives in `lib/pza-runtime.js`, including settings, reviewer dispatch helpers, and bounded/redacted context collection.

## Installation

Codex plugin install from this repository:

```bash
codex plugin marketplace add https://github.com/pizzayap/pza-skills
codex plugin add pza-skills --marketplace pza-skills
```

Claude Code plugin install from this repository:

```bash
claude plugin marketplace add https://github.com/pizzayap/pza-skills
claude plugin install pza-skills@pza-skills
```

Install the shared runtime helper once per machine. This runtime stores
machine-local settings and runs the settings UI, reviewer dispatch helpers, and
bounded/redacted context collectors used by the installed skills:

```bash
set -eu
pkg="${PZA_SKILLS_PACKAGE:-$HOME/.pza-skills/package}"
repo="https://github.com/pizzayap/pza-skills.git"
mkdir -p "$(dirname "$pkg")"
if [ -e "$pkg" ] && [ ! -d "$pkg/.git" ]; then
  echo "$pkg exists but is not a git checkout" >&2
  exit 1
fi
if [ -d "$pkg/.git" ]; then
  origin=$(git -C "$pkg" remote get-url origin)
  case "$origin" in
    "$repo"|https://github.com/pizzayap/pza-skills|git@github.com:pizzayap/pza-skills.git) ;;
    *) echo "Unexpected pza-skills origin: $origin" >&2; exit 1 ;;
  esac
  upstream=$(git -C "$pkg" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
  case "$upstream" in
    origin/*) ;;
    *) echo "$pkg must track an origin/* upstream" >&2; exit 1 ;;
  esac
  git -c core.hooksPath=/dev/null -C "$pkg" fetch --prune origin
  git -c core.hooksPath=/dev/null -C "$pkg" merge --ff-only "$upstream"
  if [ "$(git -C "$pkg" rev-parse HEAD)" != "$(git -C "$pkg" rev-parse "$upstream")" ]; then
    echo "$pkg is not exactly at $upstream" >&2
    exit 1
  fi
  git -C "$pkg" diff --quiet -- scripts lib || { echo "$pkg has local runtime changes" >&2; exit 1; }
  git -C "$pkg" diff --cached --quiet -- scripts lib || { echo "$pkg has staged runtime changes" >&2; exit 1; }
else
  git -c core.hooksPath=/dev/null clone "$repo" "$pkg"
fi
"$pkg/scripts/install-runtime.sh"
```

For Codex subagent-first review, also install the PZA agent roles:

```bash
set -eu
pkg="${PZA_SKILLS_PACKAGE:-$HOME/.pza-skills/package}"
git -C "$pkg" diff --quiet -- agents || { echo "$pkg has local agent changes" >&2; exit 1; }
git -C "$pkg" diff --cached --quiet -- agents || { echo "$pkg has staged agent changes" >&2; exit 1; }
"$pkg/scripts/install-codex-agents.sh"
```

Restart Codex or start a fresh session after installing agents so the newly
installed roles are available to the harness.

The skills.sh install remains available as a lightweight fallback when a harness
only needs `SKILL.md` files:

```bash
npx skills add pizzayap/pza-skills
```

## Updating

Refresh the installed plugin and the machine-local runtime helper after package
updates, especially for `/pza-settings`, `/arewedone`, reviewer lanes, or
runtime changes:

```bash
set -eu
codex plugin marketplace upgrade pza-skills
codex plugin add pza-skills --marketplace pza-skills
claude plugin update pza-skills
pkg="${PZA_SKILLS_PACKAGE:-$HOME/.pza-skills/package}"
test -d "$pkg/.git"
origin=$(git -C "$pkg" remote get-url origin)
case "$origin" in
  https://github.com/pizzayap/pza-skills.git|https://github.com/pizzayap/pza-skills|git@github.com:pizzayap/pza-skills.git) ;;
  *) echo "Unexpected pza-skills origin: $origin" >&2; exit 1 ;;
esac
upstream=$(git -C "$pkg" rev-parse --abbrev-ref --symbolic-full-name '@{u}')
case "$upstream" in
  origin/*) ;;
  *) echo "$pkg must track an origin/* upstream" >&2; exit 1 ;;
esac
git -c core.hooksPath=/dev/null -C "$pkg" fetch --prune origin
git -c core.hooksPath=/dev/null -C "$pkg" merge --ff-only "$upstream"
if [ "$(git -C "$pkg" rev-parse HEAD)" != "$(git -C "$pkg" rev-parse "$upstream")" ]; then
  echo "$pkg is not exactly at $upstream" >&2
  exit 1
fi
git -C "$pkg" diff --quiet -- scripts lib || { echo "$pkg has local runtime changes" >&2; exit 1; }
git -C "$pkg" diff --cached --quiet -- scripts lib || { echo "$pkg has staged runtime changes" >&2; exit 1; }
git -C "$pkg" diff --quiet -- agents || { echo "$pkg has local agent changes" >&2; exit 1; }
git -C "$pkg" diff --cached --quiet -- agents || { echo "$pkg has staged agent changes" >&2; exit 1; }
"$pkg/scripts/install-runtime.sh"
"$pkg/scripts/install-codex-agents.sh"
```

If your skills CLI supports `update`, this is equivalent for the first step:

```bash
npx skills@latest update
```

For skills.sh-only installs, refresh harness-visible skill markdown with
`npx skills add pizzayap/pza-skills` or `npx skills@latest update`. The settings
UI and reviewer dispatch helpers run from `~/.pza-skills/lib/pza-runtime.js`, so
reinstall the runtime helper when runtime or UI behavior changes.

Install a single skill:

```bash
npx skills add pizzayap/pza-skills --skill arewedone
npx skills add pizzayap/pza-skills --skill arewedone-plain
npx skills add pizzayap/pza-skills --skill areyousure
npx skills add pizzayap/pza-skills --skill areyousure-plain
npx skills add pizzayap/pza-skills --skill agent-docs-audit
npx skills add pizzayap/pza-skills --skill agent-docs-revise
npx skills add pizzayap/pza-skills --skill pza-settings
npx skills add pizzayap/pza-skills --skill hook-worthy
npx skills add pizzayap/pza-skills --skill work-issue
```

Optional integrations are detected at runtime. Use `/pza-settings` after installation to open the local visual settings companion, record the native reviewer model label, toggle reviewer CLIs, choose exact models for Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity where installed, choose which reviewer rows also run adversarial security review, and opt in to trusted-worktree proof checks such as Snyk. `/areyousure` also attempts bounded online evidence through Context7, DeepWiki, Exa, or equivalent web tools when the active harness exposes them.

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

Subagent-first completeness check. Launches native structural completeness, code
quality, standards compliance, and spec compliance as local subagents when the
harness supports them. Configured adversarial lanes launch once per normalized
lane id from runtime status; native adversarial lanes run locally with bounded
redacted-diff context, while non-native adversarial lanes and CLI-backed
reviewers (Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, and Antigravity
where enabled) run only as external second opinions. It adjudicates findings,
then runs proof commands from the parent `/arewedone` flow. Native reviewer subagents are
review-only: they must not request escalated sandbox permissions or run tests,
builds, compilers, or regression scripts. If a reviewer hits that boundary, it
reports `blocked: requires parent-approved proof command` so the parent flow can
surface any required approval in the main conversation. External AI reviewers
are governed by the second-opinion mode: `ask` approval-gates them for
Codex-style sandboxes, `native-only` skips them, and `strict` requires them.
External reviewers and adversarial lanes receive context through
`collect-review-context`, which redacts likely secrets and caps total/per-file
bytes. Optional Snyk dependency scanning is separate from AI review and runs only
when configured or explicitly requested. Spec compliance can be directed with
`--spec <path-or-issue-ref>` or skipped with `--no-spec`; missing standards or
spec sources are reported as skipped lanes rather than failed completion.

**Triggers:** "are we done", "review my changes", "check completeness"

**Optional:** GitHub CLI (`gh`), [Ollama](https://ollama.com), [Codex](https://github.com/openai/codex), OpenCode, Kilo Code, Cursor Agent, Antigravity, Snyk (toggleable via `/pza-settings`; Snyk should only be run on trusted worktrees)

### `/arewedone-plain`

Plain completion review in one skill file. It checks changed work directly
against local repo evidence, embedded read-only review lanes, safe proof
commands, and safe public documentation checks, then reports in terse format. It
is independent of PZA reviewer settings, helper commands, hooks, runtime, local
config, other skills, external agent files, and delegated reviewer machinery.
When worker spawning is unavailable, it runs the same embedded lanes serially.

**Usage:** `/arewedone-plain`, `/arewedone-plain path/to/file`

### `/pza-settings`

Configures reviewer backends for `/arewedone` and `/areyousure`. With no arguments it launches a tokenized localhost settings UI. Use it to set the native harness/model label, choose second-opinion mode, toggle CLI reviewers, choose exact model names, tick which reviewers also run adversarial security review, and enable optional proof checks. Settings are saved to `~/.pza-skills/settings.json`; the Ollama model is also mirrored to `~/.pza-skills/ollama-model` for compatibility.

**Usage:** `/pza-settings`, `/pza-settings --status`, `/pza-settings second-opinion ask`, `/pza-settings second-opinion strict`, `/pza-settings native model <harness:model>`, `/pza-settings codex model <model>`, `/pza-settings ollama model <model>`, `/pza-settings opencode on`, `/pza-settings opencode model <provider/model>`, `/pza-settings snyk on`, `/pza-settings snyk severity-threshold high`, `/pza-settings adversarial off`, `/pza-settings adversarial add <provider> <model> <lane-id>`

The visual companion can also be run directly after installing the runtime:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" settings-ui
```

Supported reviewer backends:

Second-opinion modes:

| Mode | Meaning |
|---|---|
| `ask` | Default. Native review runs locally; external AI reviewer lanes require explicit approval before repo context leaves a sandbox. |
| `native-only` | Skip external AI reviewer lanes and run only native/local review plus proof commands. |
| `strict` | Require enabled external AI reviewer lanes; blocked, denied, or failed lanes keep strict review or plan verification incomplete. |

External reviewer blocking has two layers. `ask`, `native-only`, and `strict`
control PZA's review policy; they do not grant OS, harness, provider, or CLI
authentication permissions. If reviewers still report blocked after choosing
`strict` or enabling full-access permissions, inspect the exact runtime line:

```text
PZA reviewer result: blocked - <reason>
```

Common reasons are `sandbox or permission denied` for harness/provider
restrictions, `not authenticated` for CLI login issues, and Antigravity safe-mode
support failures when `agy --help` does not confirm the required non-interactive
mode.

For `worktree changed during review` failures, the runtime prints
`PZA worktree-change details` with tracked, staged, and untracked paths that
changed while the reviewer was running.

| Reviewer | CLI | State meaning |
|---|---|---|
| Native | active harness | `ready` when enabled |
| Ollama | `ollama` | `ready`, `disabled`, `missing`, or `blocked` when model/setup is unavailable |
| Codex | `codex` | `ready`, `disabled`, `missing`, or `blocked` if the run cannot execute/authenticate |
| OpenCode | `opencode` | `ready`, `disabled`, `missing`, or `blocked` |
| Kilo Code | `kilo` | `ready`, `disabled`, `missing`, or `blocked` |
| Cursor Agent | `cursor-agent` | `ready`, `disabled`, `missing`, or `blocked` |
| Antigravity | `agy` | `ready` only when local `agy --help` shows safe `--sandbox --print` support |

The visual settings UI has an **Adversarial** column in the reviewer table, including the Native row. Ticking a reviewer row writes the same `adversarialReviewers` config used by `/arewedone`. The native adversarial lane runs locally in the active harness; non-native lanes run through configured reviewer CLIs. Direct lane commands remain available for advanced cases, such as preserving a custom adversarial model while normal review is off:

```text
/pza-settings cursor off
/pza-settings adversarial add cursor <model> cursor-review
/pza-settings adversarial add codex <model> codex-review
```

Ollama is configured as a reviewer backend through `/pza-settings`; there are no separate Ollama-only setup or review skills.

Snyk is configured as an optional proof check, not as a reviewer backend. It runs `snyk test --severity-threshold=<level>` when enabled or when `/arewedone --snyk` is requested. It is off by default because the Snyk CLI may execute package-manager code while collecting dependency data.

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

Subagent-first native plus external plan verification. Verifies either a plan
file or the latest conversation-backed plan against repository files, checked-in
guidance, manifests, lockfiles, safe read-only local commands, and bounded
online evidence when Context7, DeepWiki, Exa, or equivalent web tools are
available. Native verification runs through the `plan-verifier` subagent when
available, with native verification marked blocked when no read-only subagent
facility exists; configured non-native `/pza-settings` reviewers then run as
plan-review second opinions through `run-reviewer plan`. Claims that local and
safely queried online evidence cannot prove are reported as unverifiable, and
reviewer findings are adjudicated before the final report.

**Flags:** `--report-only`

### `/areyousure-plain`

Plain plan verification in one skill file. It checks the resolved plan directly
against local repo evidence and safe public documentation checks, then reports
in terse format. It is independent of PZA reviewer settings, helper commands,
local config, other skills, and delegated review lanes.

**Usage:** `/areyousure-plain`, `/areyousure-plain path/to/plan.md`

## Agents

- `structural-completeness-reviewer` — codebase hygiene, dead code, integration completeness, dependency/config completeness.
- `code-quality-reviewer` — correctness, security, architecture, and performance review; also forwards bounded context to configured reviewer backends in backend mode.
- `standards-compliance-reviewer` — documented repo standards and convention compliance.
- `spec-compliance-reviewer` — issue, PRD, and requirement compliance for changed work.
- `plan-verifier` — verifies plans against local code, project guidance, manifests, lockfiles, and bounded online evidence when MCP/web tools are available.
- `adversarial-reviewer` — runs configured security-focused adversarial lanes with bounded, redacted review context.

## Runtime Helpers

Installed skills use runtime helpers at `~/.pza-skills/lib/pza-runtime.js`:

- `skill-status <skill>` — invocation-time reviewer/config/CLI status without exposing custom command arrays.
- `reviewer-settings` — configured reviewer backend table used by `/arewedone`, `/areyousure`, and `/pza-settings`.
- `plan-reviewers` — sanitized status for optional custom external plan reviewers without exposing command arrays.
- `collect-review-context --summary|--redacted-diff` — bounded review context for `/arewedone`.
- `collect-plan-context <plan-file|-> <source>` — bounded local plan context for `/areyousure`.
- `plan-review-prompt <plan-file|-> <source>` — bounded, redacted external plan-review prompt builder that asks reviewers to use web search when available and report web-access status.
- `redact-context` — stdin/stdout redaction helper for likely secrets and high-entropy tokens.
- `second-opinion-policy` / `set-second-opinion-mode <ask|native-only|strict>` — controls approval-gated external AI reviewer behavior.
- `run-reviewer <code|plan|adversarial> <provider> <model>` — provider-normalized backend review runner with diff-hash guard, automatic worktree-change diagnostics, and `PZA reviewer result: passed|blocked|failed` status output.
- `run-plan-reviewer <name>` — optional custom external plan-reviewer runner; native `/areyousure` still does not use `run-reviewer plan native`.
- `run-check snyk` — optional trusted-worktree dependency scan with `PZA check result: passed|blocked|failed|skipped` status output.
- `validate-hook-proposal` — JSON hook proposal validation for `/hook-worthy`.

Skill markdown does not use load-time command injection for context collection.

## Runtime State

New writes use harness-neutral paths:

- `~/.pza-skills/lib/pza-runtime.js`
- `~/.pza-skills/settings.json`
- `~/.pza-skills/ollama-model`
- `/tmp/pza-skills-session-<id>-files.json`
- `/tmp/pza-skills-session-<id>-reviewed.json`

`~/.pza-skills/` is machine-local user state. Never commit personal settings or model choices into this repository. Legacy Claude/Codex paths are read only as migration fallbacks where needed.

`settings.json` is the canonical reviewer-backend config. It stores `native`, `ollama`, `codex`, `opencode`, `kilo`, `cursor`, and `antigravity` enabled/model choices; top-level `codex` and `ollama` booleans remain for compatibility. Reviewer models default to blank/unset instead of a PZA-selected model; for CLIs that have their own default model, blank means use that provider default, while Ollama requires an explicit configured model. It may also store `adversarialReviewers`, an array of `{id, provider, model, enabled}` lanes used by `/arewedone`; the settings UI now edits the common one-lane-per-reviewer case through the reviewer table's **Adversarial** column, including `provider: "native"`. If `adversarialReviewers` is absent, `/arewedone` preserves legacy Ollama/Codex adversarial behavior; if it is an explicit empty array, no adversarial lanes run. Optional proof checks live under `checks`, for example `{ "checks": { "snyk": { "enabled": false, "severityThreshold": "high" } } }`.

## Harness Adapters

See [docs/harnesses.md](docs/harnesses.md) and [docs/portability.md](docs/portability.md).

- Codex: install the plugin through `.agents/plugins/marketplace.json`; run
  `scripts/install-codex-agents.sh` for PZA reviewer agent roles until Codex
  plugin agent discovery is verified for this package.
- OpenCode: project wrappers live in `.opencode/commands/` and `.opencode/agents/`.
- Pi: load canonical `SKILL.md` directories directly; optional slash aliases live in `.pi/prompts/`.
- Claude Code: `.claude-plugin/` and `hooks/hooks.json` provide compatibility packaging. The Codex marketplace bundle omits the hook config while still packaging `hooks/scripts/`.

## Dependencies

| Skill | Required | Optional |
|---|---|---|
| `/arewedone` | — | GitHub CLI (`gh`), Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, Antigravity, Snyk |
| `/arewedone-plain` | — | Context7, DeepWiki, Exa |
| `/pza-settings` | — | Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, Antigravity, Snyk |
| `/hook-worthy` | — | — |
| `/agent-docs-audit` | — | — |
| `/agent-docs-revise` | — | — |
| `/work-issue` | Git, GitHub CLI (`gh`) | — |
| `/areyousure` | — | Context7, DeepWiki, Exa, Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, Antigravity |
| `/areyousure-plain` | — | Context7, DeepWiki, Exa |

Skills gracefully degrade when optional dependencies are missing.

## License

MIT
