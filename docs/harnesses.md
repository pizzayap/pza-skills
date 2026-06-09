# Harness Setup

PZA-skills is a portable Agent Skills package. The canonical workflows live in
`skills/*/SKILL.md`; harness-specific files are thin adapters.

Runtime settings are stored in `~/.pza-skills/` on each user's machine. That
directory is local-only and should never be committed into a shared skill repo.
After installing skills in any harness, run `/pza-settings` to record the native
model label, toggle optional reviewer CLIs, choose backend-specific model names,
and choose which reviewer backends also run `/arewedone` adversarial security
review.

Canonical agents are provider-agnostic: `structural-completeness-reviewer`,
`code-quality-reviewer`, `standards-compliance-reviewer`,
`spec-compliance-reviewer`, `plan-verifier`, and `adversarial-reviewer`.

Installed skills collect settings and review context only at invocation time
through `~/.pza-skills/lib/pza-runtime.js`. Harness adapters should not add
load-time command injection for status, plans, diffs, or local config files.

Install the shared helper runtime once per machine before using the skills from
other project directories:

```sh
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

When the package updates, refresh both installed surfaces. The plugin or skills
installer updates harness-visible skill markdown and adapters; the runtime
commands update the machine-local settings UI and reviewer helper:

```sh
set -eu
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

If the local skills CLI supports `update`, `npx skills@latest update` is
equivalent for the first step.

These commands assume a POSIX shell environment such as macOS, Linux, or WSL2.

By default `/pza-settings` starts a localhost-only visual settings companion
when the harness can run a local server. Open the printed tokenized URL, make
changes, then click **Save and Stop Server**. Terminal-only harnesses can use
`/pza-settings --status` plus direct `/pza-settings <reviewer> ...` arguments.
Optional Snyk checks are off by default and should be enabled only for trusted
worktrees because the Snyk CLI may execute package-manager code while scanning.
Second-opinion mode defaults to `ask`: native review runs locally, and external
AI reviewer CLIs require explicit approval before bounded repo context crosses a
sandbox or privacy boundary. Use `native-only` for locked-down sessions and
`strict` when external reviewer lanes are mandatory.

## Codex

Install the Codex plugin from the repository marketplace:

```sh
codex plugin marketplace add https://github.com/pizzayap/pza-skills
codex plugin add pza-skills --marketplace pza-skills
```

Install PZA agents with the repo script until Codex plugin agent discovery is
verified for this package:

```sh
set -eu
pkg="${PZA_SKILLS_PACKAGE:-$HOME/.pza-skills/package}"
git -C "$pkg" diff --quiet -- agents || { echo "$pkg has local agent changes" >&2; exit 1; }
git -C "$pkg" diff --cached --quiet -- agents || { echo "$pkg has staged agent changes" >&2; exit 1; }
"$pkg/scripts/install-codex-agents.sh"
```

The script copies the six provider-agnostic PZA agent roles into
`~/.codex/agents/` and writes read-only `.toml` configs beside them. Restart
Codex or start a fresh session after running it so the roles are loaded.

The Codex marketplace bundle intentionally omits `hooks/hooks.json`. PZA's
current hook payloads are Claude-compatibility payloads only; do not expose them
to Codex until Codex hook payload compatibility is verified.

Codex translation notes:

- Claude-style `AskUserQuestion` means Codex `request_user_input` when available, or a concise direct question when it is not.
- Post-audit user-input prompts in `/arewedone`, `/areyousure`, and both `-plain` skills are separate from second-opinion `ask` mode. Second-opinion `ask` approval-gates external reviewer CLIs only; post-audit prompts run after the final report (and after proof commands in `/arewedone*`) to choose fix, defer, or report-only next steps.
- Claude-style `Task(...)` means Codex subagent/collaboration tools such as `spawn_agent`; omit inline model selection unless Codex exposes it.
- Native `/arewedone` and `/areyousure` lanes are subagent-first when Codex
  exposes read-only subagent tools. If the PZA roles are unavailable, the final
  report must show `blocked: read-only subagent unavailable` in
  `Lane Execution`; do not emulate reviewer lanes in the main agent or a
  background terminal.
- Reviewer subagents must not request escalated sandbox permissions or run proof
  commands. If tests, builds, compilers, or regression scripts need approval,
  the parent `/arewedone` flow should run them so the approval prompt is visible
  in the main conversation.
- Native `/areyousure` verification is local-first, then uses Context7,
  DeepWiki, Exa, or equivalent web tools when Codex exposes them to the active
  verifier. Query online tools only with public identifiers and claim-focused
  questions; report unavailable MCP/web lanes in `Lane Execution` rather than
  adding tool arrays to `skill-status areyousure`.
- `AGENTS.md` is the primary project instruction file. `CLAUDE.md` is compatibility-only.
- Codex Plan Mode plans may exist only in the conversation. `/areyousure` should verify that conversation-backed plan read-only, and only write temporary `/tmp` files when bounded local context collection needs a materialized plan.
- Codex sandboxes can block nested `codex`, `agy`, and other external reviewer CLIs because they need user-state writes, localhost binding, or provider access. In second-opinion `ask` mode, `/arewedone` and `/areyousure` should request approval for the exact `run-reviewer` command and report skipped/blocked lanes if approval is denied.
- Some reviewer CLIs do not expose a stdin-safe prompt transport. For those providers, PZA forwards only bounded, redacted context, but the local CLI process may still receive that context as a prompt argument visible to same-machine process-list observers. Treat non-native reviewer lanes as trusted-machine operations.
- `strict` removes PZA's approval gate, but it does not override Codex or provider restrictions. If a full-access session still blocks a lane, use the exact `PZA reviewer result: blocked - <reason>` suffix to distinguish sandbox denial, missing authentication, and unsupported CLI safe mode.
- If a reviewer reports `worktree changed during review`, the runtime should also print `PZA worktree-change details` so the user does not need to manually run git status commands to identify changed paths.

## OpenCode

Project adapters live in:

```sh
.opencode/commands/
.opencode/agents/
```

Command filenames become slash commands, so `.opencode/commands/arewedone.md`
provides `/arewedone`. Agent files mirror canonical `agents/*.md` with OpenCode
frontmatter such as `mode: subagent` and read-only reviewer permissions.

OpenCode plan mode may use `.opencode/plans/*.md`. `/areyousure` should prefer
that file when present, then fall back to conversation-visible plan content.
When OpenCode exposes web or MCP documentation tools to the native verifier,
`/areyousure` should use them only for bounded public claim checks.

## Pi

Pi can load the canonical skills directly. Use any supported skill location:

```sh
.pi/skills/
.agents/skills/
~/.pi/agent/skills/
~/.agents/skills/
```

Pi also exposes loaded skills as `/skill:name`. The optional `.pi/prompts/*.md`
files are only for slash-command parity with the existing command names.

Core Pi has no built-in plan mode. If a Pi extension places a plan in the editor
or conversation, `/areyousure` should treat that visible content as a
conversation-backed plan unless the user provides a file path. If Pi exposes
online documentation or web-search tools, the native verifier may use them for
public claim checks without forwarding raw private plan or source content.

## Claude Code Compatibility

Install the Claude Code plugin from the repository marketplace:

```sh
claude plugin marketplace add https://github.com/pizzayap/pza-skills
claude plugin install pza-skills@pza-skills
```

Claude discovers `hooks/hooks.json`; hook scripts stay in `hooks/scripts/`. Hook
behavior is compatibility-scoped: only Claude-style hook payloads are
implemented until other harness payloads are verified.

Confirm hook config loading with `claude plugin details pza-skills`; the
component inventory should list `Hooks (2)` for `PostToolUse` and `Stop`. To
verify hook execution, trigger a Write/Edit in a Claude Code compatibility
session and check that `/tmp/pza-skills-session-*-files.json` updates.
