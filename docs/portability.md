# Portability Architecture

## Canonical Core

- `skills/*/SKILL.md` defines reusable workflows.
- `agents/*.md` defines reusable reviewer/verifier roles. Canonical agent names
  are provider-agnostic: `structural-completeness-reviewer`,
  `code-quality-reviewer`, `plan-verifier`, and `adversarial-reviewer`.
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

- Codex: install canonical skills into `~/.codex/skills/` and agents into
  `~/.codex/agents/`.
- OpenCode: mirror commands into `.opencode/commands/` and agents into
  `.opencode/agents/`.
- Pi: load canonical skills directly; use `.pi/prompts/` only for command aliases.
- Claude Code: keep `.claude-plugin/` as compatibility packaging.

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

Optional proof checks are separate from reviewer backends. Snyk lives under
`checks.snyk`, is disabled by default, and should run only on trusted worktrees
because the Snyk CLI may execute package-manager code while collecting
dependency data.

## Plan Verification

`/areyousure` can verify file-backed plans or conversation-backed plans. When a
plan only exists in chat, the workflow treats the conversation as the source of
truth and only materializes temporary `/tmp` files when needed for bounded local
context collection. Native verification checks paths, imports, manifests,
lockfiles, and checked-in guidance, and reports remote documentation freshness
claims as unverifiable when local evidence cannot prove them.

After native verification, `/areyousure` can run configured non-native reviewer
backends from `/pza-settings` as plan-review second opinions through
`run-reviewer plan <provider> <model>`, subject to second-opinion policy.
`native-only` skips those lanes, `ask` requires explicit sandbox/privacy
approval, and `strict` requires enabled external plan lanes to pass. Native plan
verification still runs inside the active harness through `plan-verifier`, or
through equivalent direct read-only checks when subagents are unavailable. It
must not call `run-reviewer plan native`; that runtime path is blocked by
design. Optional custom external plan reviewers use `plan-review-prompt` plus
`run-plan-reviewer <name>`.

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
- `redact-context` is the shared stdin/stdout redaction helper.

Adapters should call these helpers rather than duplicating diff assembly,
settings reads, or secret redaction logic.
