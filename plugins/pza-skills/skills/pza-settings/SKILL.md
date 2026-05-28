---
name: pza-settings
description: >-
  Configure PZA-skills reviewer backends for code review and plan verification.
  Set the native reviewer model label, toggle Ollama, Codex, OpenCode, Kilo
  Code, Cursor Agent, Antigravity, and per-reviewer adversarial review,
  configure second-opinion review policy, configure optional proof checks,
  choose exact models for CLI reviewers, and launch the local visual settings
  companion.
user-invocable: true
argument-hint: '[--ui|--status] [second-opinion ask|native-only|strict] [native|ollama|codex|opencode|kilo|cursor|antigravity model <model>] [ollama|codex|opencode|kilo|cursor|antigravity on|off] [snyk on|off|severity-threshold <level>] [adversarial on|off|add <provider> <model> [id]|set <id> enabled|model <value>|remove <id>]'
---

# PZA Settings

Setup surface for reviewer backends used by `/arewedone` and `/areyousure`,
second-opinion policy, per-reviewer adversarial toggles, advanced adversarial
lanes, and optional proof checks. Read current settings only when the skill is invoked. Do not use
load-time markdown command injection.

Arguments: `$ARGUMENTS`

## Workflow

### 1. Collect Status

Before running runtime commands, check that
`$HOME/.pza-skills/lib/pza-runtime.js` exists. If it is missing, report that the
plugin or skill markdown is installed but the shared runtime is not, then tell
the user to bootstrap it:

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

For Codex subagent-first review, also install agent roles:

```bash
set -eu
pkg="${PZA_SKILLS_PACKAGE:-$HOME/.pza-skills/package}"
git -C "$pkg" diff --quiet -- agents || { echo "$pkg has local agent changes" >&2; exit 1; }
git -C "$pkg" diff --cached --quiet -- agents || { echo "$pkg has staged agent changes" >&2; exit 1; }
"$pkg/scripts/install-codex-agents.sh"
```

If a shell runner is available, gather current status with:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" skill-status pza-settings
```

This reports second-opinion policy, reviewer settings, adversarial toggles and lanes,
optional checks, and CLI availability without exposing custom reviewer command arrays. If shell execution is unavailable,
explain that settings cannot be inspected from this harness and ask the user to
run the runtime command locally.

### 2. Choose Interface

If no arguments were provided, or the user passed `--ui`, launch the local visual
settings companion:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" settings-ui
```

Report the printed localhost URL. The companion binds only to localhost, uses a
random URL token, and writes the same local config files as the CLI flow.

If the UI cannot start, or the user passed `--status`, display a status table
from `skill-status pza-settings` instead.

### 3. Parse Direct Arguments

Supported direct forms:

- `<reviewer> on`
- `<reviewer> off`
- `<reviewer> model <model>`
- `second-opinion ask`
- `second-opinion native-only`
- `second-opinion strict`
- `adversarial on`
- `adversarial off`
- `adversarial add <provider> <model> [id]`
- `adversarial set <id> enabled <on|off>`
- `adversarial set <id> model <model>`
- `adversarial remove <id>`
- `snyk on`
- `snyk off`
- `snyk severity-threshold <low|medium|high|critical>`
- `--status`
- `--ui`

Valid reviewers:

- `native`
- `ollama`
- `codex`
- `opencode`
- `kilo`
- `cursor`
- `antigravity`

Apply changes through the shared runtime:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer REVIEWER enabled on
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer REVIEWER enabled off
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer REVIEWER model MODEL
node "$HOME/.pza-skills/lib/pza-runtime.js" set-second-opinion-mode ask
node "$HOME/.pza-skills/lib/pza-runtime.js" set-second-opinion-mode native-only
node "$HOME/.pza-skills/lib/pza-runtime.js" set-second-opinion-mode strict
node "$HOME/.pza-skills/lib/pza-runtime.js" set-settings adversarial on
node "$HOME/.pza-skills/lib/pza-runtime.js" set-settings adversarial off
node "$HOME/.pza-skills/lib/pza-runtime.js" add-adversarial-reviewer PROVIDER MODEL [ID]
node "$HOME/.pza-skills/lib/pza-runtime.js" set-adversarial-reviewer ID enabled on
node "$HOME/.pza-skills/lib/pza-runtime.js" set-adversarial-reviewer ID enabled off
node "$HOME/.pza-skills/lib/pza-runtime.js" set-adversarial-reviewer ID model MODEL
node "$HOME/.pza-skills/lib/pza-runtime.js" remove-adversarial-reviewer ID
node "$HOME/.pza-skills/lib/pza-runtime.js" set-check snyk enabled on
node "$HOME/.pza-skills/lib/pza-runtime.js" set-check snyk enabled off
node "$HOME/.pza-skills/lib/pza-runtime.js" set-check snyk severity-threshold high
```

Examples:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer native model "codex:<model>"
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer codex model "<model>"
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer ollama model "<model>"
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer opencode enabled on
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer cursor enabled off
node "$HOME/.pza-skills/lib/pza-runtime.js" set-second-opinion-mode ask
node "$HOME/.pza-skills/lib/pza-runtime.js" set-check snyk enabled on
node "$HOME/.pza-skills/lib/pza-runtime.js" add-adversarial-reviewer cursor "<model>" cursor-review
```

After any update, display:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" reviewer-settings
node "$HOME/.pza-skills/lib/pza-runtime.js" second-opinion-policy
node "$HOME/.pza-skills/lib/pza-runtime.js" check-settings
node "$HOME/.pza-skills/lib/pza-runtime.js" adversarial-reviewer-settings
```

### 4. Display Status

Show one reviewer table:

Show the second-opinion mode before reviewer tables:

| Mode | Meaning |
|------|---------|
| `ask` | Default Codex-safe mode. Native review always runs; external AI reviewers run only after explicit sandbox/privacy approval. |
| `native-only` | Skip external AI reviewer lanes. Useful for locked-down Codex sessions. |
| `strict` | Require enabled external AI reviewer lanes. Blocked, denied, or failed lanes keep `/arewedone` or `/areyousure` incomplete. |

| Reviewer | Enabled | Adversarial | Installed | State | Model | Blocker/Notes |
|----------|---------|-------------|-----------|-------|-------|---------------|
| Native | yes/no | yes/no | yes | ready/disabled | configured label or blank/default | local active-harness adversarial lane |
| Ollama | yes/no | yes/no | yes/no | ready/disabled/missing/blocked | configured model | `/arewedone` and `/areyousure` plan reviews |
| Codex | yes/no | yes/no | yes/no | ready/disabled/missing/blocked | configured model or blank/default | `/arewedone` and `/areyousure` plan reviews |
| OpenCode | yes/no | yes/no | yes/no | ready/disabled/missing/blocked | configured model or blank/default | `/arewedone` and `/areyousure` plan reviews |
| Kilo Code | yes/no | yes/no | yes/no | ready/disabled/missing/blocked | configured model or blank/default | `/arewedone` and `/areyousure` plan reviews |
| Cursor Agent | yes/no | yes/no | yes/no | ready/disabled/missing/blocked | configured model or blank/default | `/arewedone` and `/areyousure` plan reviews |
| Antigravity | yes/no | yes/no | yes/no | ready/disabled/missing/blocked | configured model or blank/default | `/arewedone` and `/areyousure` plan reviews; only when safe non-interactive mode exists |

Show one adversarial lane table only for terminal/status output or advanced custom lanes:

| Lane ID | Provider | Enabled | Effective | Installed | State | Model | Blocker/Notes |
|---------|----------|---------|-----------|-----------|-------|-------|---------------|

Show one optional proof-check table:

| Check | Enabled | Installed | State | Severity | Blocker/Notes |
|-------|---------|-----------|-------|----------|---------------|
| Snyk | yes/no | yes/no | ready/disabled/missing | high by default | trusted-worktree dependency scan |

If a reviewer is enabled with `state=missing` or `state=blocked`, report it as a
strict-review blocker only when second-opinion mode is `strict`. In `ask` mode,
it is an approval-gated or unavailable second opinion; native review can still
complete.

If Snyk is enabled but missing, report it as an optional-check blocker. Snyk is
opt-in because it may execute package-manager code while collecting dependency
data; run it only on trusted worktrees.

### 5. Terminal Interactive Fallback

If the visual companion is not usable and the active harness exposes a
user-input tool, ask what to configure:

- Set native model label.
- Toggle reviewer CLIs.
- Set second-opinion mode.
- Set reviewer models.
- Toggle per-reviewer adversarial review.
- Configure advanced adversarial lanes.
- Toggle optional Snyk checks.
- No changes.

When asking for model names, ask for the exact model accepted by that CLI. Use
`default` only to mean leaving the field blank so the provider CLI can use its
own default where supported. Ollama requires an explicit model.

- Native: a local harness label such as `codex:<model>` or `claude:<model>`.
- Ollama: any model installed or available to the local Ollama CLI.
- Codex/OpenCode/Kilo/Cursor/Antigravity: any model accepted by that local CLI,
  or blank/default where the CLI supports its own default.

After updates, confirm that settings were saved to `~/.pza-skills/settings.json`
and that the Ollama compatibility model is kept at
`~/.pza-skills/ollama-model`.
