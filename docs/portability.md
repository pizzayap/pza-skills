# Portability Architecture

## Canonical Core

- `skills/*/SKILL.md` defines reusable workflows.
- `agents/*.md` defines reusable reviewer/verifier roles. Canonical agent names
  are provider-agnostic: `structural-completeness-reviewer`,
  `code-quality-reviewer`, `standards-compliance-reviewer`,
  `spec-compliance-reviewer`, `plan-verifier`, and `adversarial-reviewer`.
- `lib/pza-runtime.js` owns shared runtime behavior: config, reviewer backend
  model selection, session files, diff hashes, review markers, plan-review
  prompt assembly, redacted context collection, custom plan reviewer
  invocation, hook proposal validation, and Ollama invocation.
- Installed skills invoke the runtime through
  `~/.pza-skills/lib/pza-runtime.js`, not `./lib/pza-runtime.js`, so target
  project repositories do not need to vendor package helper files.

## Harness Adapters

Adapters should be thin and disposable. They may translate command names,
frontmatter, or tool names, but they should not fork workflow logic.

- Codex: install the repository as a Codex plugin through `.agents/plugins/marketplace.json`.
  The marketplace entry points to `plugins/pza-skills/`, a mirrored bundle that
  is validated against canonical `skills/`, `agents/`, runtime, and script
  content.
  Run `scripts/install-codex-agents.sh` to install the six PZA agent roles into
  `~/.codex/agents/` with read-only configs until plugin agent discovery is
  verified.
- OpenCode: mirror commands into `.opencode/commands/` and agents into
  `.opencode/agents/`.
- Pi: load canonical skills directly; use `.pi/prompts/` only for command aliases.
- Claude Code: keep `.claude-plugin/` and `hooks/hooks.json` as
  compatibility packaging. `claude plugin details pza-skills` should list
  `Hooks (2)` for `PostToolUse` and `Stop`.

## Runtime State

New writes use:

- `~/.pza-skills/lib/pza-runtime.js`
- `~/.pza-skills/settings.json`
- `~/.pza-skills/ollama-model`
- `/tmp/pza-skills-session-<id>-files.json`
- `/tmp/pza-skills-session-<id>-reviewed.json`

`~/.pza-skills/` contains local user state plus the installed helper runtime.
Do not commit personal settings or model choices to the repository.

Runtime installation commands assume a POSIX shell environment such as macOS,
Linux, or WSL2.

Bootstrap or refresh the installed runtime with:

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

Codex users who want native subagent lanes should also run:

```sh
set -eu
pkg="${PZA_SKILLS_PACKAGE:-$HOME/.pza-skills/package}"
git -C "$pkg" diff --quiet -- agents || { echo "$pkg has local agent changes" >&2; exit 1; }
git -C "$pkg" diff --cached --quiet -- agents || { echo "$pkg has staged agent changes" >&2; exit 1; }
"$pkg/scripts/install-codex-agents.sh"
```

Legacy Claude/Codex locations are read only as migration fallbacks.

`settings.json` is the canonical setup state for reviewer backends:

```json
{
  "codex": true,
  "ollama": true,
  "adversarial": true,
  "secondOpinionMode": "ask",
  "nativeModel": "",
  "reviewers": {
    "native": { "enabled": true, "model": "" },
    "ollama": { "enabled": true, "model": "" },
    "codex": { "enabled": true, "model": "" },
    "opencode": { "enabled": false, "model": "" },
    "kilo": { "enabled": false, "model": "" },
    "cursor": { "enabled": false, "model": "" },
    "antigravity": { "enabled": false, "model": "" }
  },
  "adversarialReviewers": [
    { "id": "native-adversarial", "provider": "native", "model": "", "enabled": true },
    { "id": "cursor-review", "provider": "cursor", "model": "", "enabled": true },
    { "id": "codex-review", "provider": "codex", "model": "", "enabled": true }
  ],
  "checks": {
    "snyk": { "enabled": false, "severityThreshold": "high" }
  }
}
```

The top-level `codex` and `ollama` booleans remain for backward compatibility.
`~/.pza-skills/ollama-model` is mirrored when the Ollama reviewer model is set
through `/pza-settings`.

`secondOpinionMode` controls how `/arewedone` and `/areyousure` handle external
AI reviewer lanes:

- `ask`: default Codex-safe mode. Native review runs locally; external AI
  reviewers are approval-gated before bounded repo context is sent to a CLI.
- `native-only`: skip external AI reviewer lanes.
- `strict`: require enabled external AI reviewer lanes; blocked, denied, or
  failed lanes keep `/arewedone` or `/areyousure` incomplete.

Reviewer models default to blank/unset instead of a PZA-selected model. For
CLIs that have their own default model, blank means use that provider default;
Ollama requires an explicit configured model.

`adversarialReviewers` is optional. When absent, `/arewedone` preserves legacy
Ollama/Codex adversarial behavior from the normal reviewer settings. When it is
present, even as an empty array, it is the explicit source of truth for
adversarial lanes. The settings UI edits the common one-lane-per-reviewer case
through an **Adversarial** column in the reviewer table, including `native`.
Native adversarial review stays local to the active harness; non-native lanes
run through configured reviewer CLIs. Direct lane commands remain available for
advanced provider/model lane setups.

`/pza-settings` may launch `node "$HOME/.pza-skills/lib/pza-runtime.js" settings-ui` as a visual
companion. The server binds only to localhost, requires a random URL token, and
writes the same `~/.pza-skills/` files as the terminal commands. If a harness
cannot run or expose a local server, use `/pza-settings --status` and direct
CLI arguments instead.

If `~/.pza-skills/lib/pza-runtime.js` is missing, install or refresh the runtime
with the bootstrap commands above before using `/pza-settings`.

Optional proof checks are separate from reviewer backends. Snyk lives under
`checks.snyk`, is disabled by default, and should run only on trusted worktrees
because the Snyk CLI may execute package-manager code while collecting
dependency data.

## Plan Verification

`/areyousure` can verify file-backed plans or conversation-backed plans. When a
plan only exists in chat, the workflow treats the conversation as the source of
truth and only materializes temporary `/tmp` files when needed for bounded local
context collection. Native verification checks paths, imports, manifests,
lockfiles, and checked-in guidance first. It then attempts bounded online
evidence checks when Context7, DeepWiki, Exa, or equivalent web tools are
available in the active harness. Context7 is for public library/framework/SDK,
API, CLI, and cloud-service docs; DeepWiki is for public GitHub repository
claims when an `owner/repo` is identifiable; Exa or web search is for public
changelogs, deprecations, migration notes, release docs, and current
implementation guidance not covered by the other tools. Online queries must be
claim-focused and use only public identifiers; never send raw private plans,
private source, secrets, diffs, proprietary details, or unredacted local context
to MCP/web tools. Missing online tools are reported in `Lane Execution` as
skipped or unavailable, not as failed verification.

After native verification, `/areyousure` can run configured non-native reviewer
backends from `/pza-settings` as plan-review second opinions through
`run-reviewer plan <provider> <model>`, subject to second-opinion policy.
`native-only` skips those lanes, `ask` requires explicit sandbox/privacy
approval, and `strict` requires enabled external plan lanes to pass. Native plan
verification is subagent-first and runs through `plan-verifier` when read-only
subagent tools are available. If the harness has no read-only subagent facility
or the PZA role is unavailable, native verification is marked blocked in
`Lane Execution` instead of being emulated in the main agent or a background
terminal. Native verification must not call `run-reviewer plan native`; that
runtime path is blocked by design. Optional custom external plan reviewers use
`plan-review-prompt` plus `run-plan-reviewer <name>`. External reviewers are
asked to use web search when available, cite source URLs or documentation
references, and state when they had no web access. PZA cannot force provider web
access.

`/arewedone` follows the same transport split: native structural completeness,
native code quality, native standards compliance, native spec compliance, and
native adversarial lanes are subagent-first when a read-only subagent lane is
available and blocked otherwise; non-native reviewer and adversarial lanes run
through configured reviewer CLIs as external second opinions. Standards and spec
lanes are local-only; missing standards or spec sources are visible skipped
lanes rather than external reviewer failures.

Both `/arewedone` and `/areyousure` must adjudicate reviewer output before final
reporting. Final finding statuses are `CONFIRMED`, `FALSE_POSITIVE`,
`UNVERIFIABLE`, `DUPLICATE`, and `OUT_OF_SCOPE`. Adjudication is bounded to the
top 20 concrete findings and must not execute commands suggested by reviewer
output. For `/areyousure`, online evidence can confirm public API, version,
documentation, deprecation, and migration claims only when it matches the local
package/version or the plan's stated target.

For provider CLIs without stdin-safe prompt transport, `run-reviewer` may pass
bounded, redacted context as a prompt argument. This avoids shell interpolation
because runtime execution uses argv arrays, but it can still expose that
redacted context to same-machine process-list observers. Use non-native reviewer
lanes only on trusted machines.

## Context Handling

Public skill markdown should not use load-time command injection for context
collection. Skills gather runtime state only when invoked:

- `skill-status <skill>` returns reviewer/config/CLI status.
- `collect-review-context --summary|--redacted-diff` returns bounded review
  context for `/arewedone`.
- `second-opinion-policy` and `set-second-opinion-mode <ask|native-only|strict>`
  expose and update external AI reviewer policy.
- `run-reviewer <code|plan|adversarial> <provider> <model>` runs configured
  reviewer backends through argv arrays, emits `PZA reviewer result:
  passed|blocked|failed`, and guards against worktree mutation.
- `run-plan-reviewer <name>` runs optional custom external plan reviewers.
  Native `/areyousure` verification does not use `run-reviewer plan native`.
- `run-check snyk` runs the optional trusted-worktree dependency check and emits
  `PZA check result: passed|blocked|failed|skipped`.
- `collect-plan-context <plan-file|-> <source>` returns bounded plan context for
  `/areyousure`.
- Context7, DeepWiki, Exa, or equivalent web tools are used directly by the
  active harness when exposed to the native `plan-verifier`; their availability
  is reported in `Lane Execution`, not through `skill-status areyousure`.
- `redact-context` is the shared stdin/stdout redaction helper.

Adapters should call these helpers rather than duplicating diff assembly,
settings reads, or secret redaction logic.
