# Portability Architecture

## Canonical Core

- `skills/*/SKILL.md` defines reusable workflows.
- `agents/*.md` defines reusable reviewer/verifier roles.
- `lib/pza-runtime.js` owns shared runtime behavior: config, reviewer backend
  model selection, session files, diff hashes, review markers, plan-review
  prompt assembly, custom plan reviewer invocation, and Ollama invocation.

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

- `~/.pza-skills/settings.json`
- `~/.pza-skills/ollama-model`
- `~/.pza-skills/plan-reviewers.json`
- `/tmp/pza-skills-session-<id>-files.json`
- `/tmp/pza-skills-session-<id>-reviewed.json`

`~/.pza-skills/` is local user state, not package data. Do not commit personal
settings or model choices to the repository.

Legacy Claude/Codex locations are read only as migration fallbacks.

`settings.json` is the canonical setup state for reviewer backends:

```json
{
  "codex": true,
  "ollama": true,
  "adversarial": true,
  "nativeModel": "codex:gpt-5.5",
  "reviewers": {
    "native": { "enabled": true, "model": "codex:gpt-5.5" },
    "ollama": { "enabled": true, "model": "kimi-k2.6:cloud" },
    "codex": { "enabled": true, "model": "gpt-5.3-codex" },
    "opencode": { "enabled": false, "model": "" },
    "kilo": { "enabled": false, "model": "" },
    "cursor": { "enabled": false, "model": "" },
    "antigravity": { "enabled": false, "model": "" }
  },
  "adversarialReviewers": [
    { "id": "cursor-sonnet", "provider": "cursor", "model": "anthropic/claude-sonnet-4.5", "enabled": true },
    { "id": "codex-gpt55", "provider": "codex", "model": "gpt-5.5", "enabled": true }
  ]
}
```

The top-level `codex` and `ollama` booleans remain for backward compatibility.
`~/.pza-skills/ollama-model` is mirrored when the Ollama reviewer model is set
through `/pza-settings`.

`adversarialReviewers` is optional. When absent, `/arewedone` preserves legacy
Ollama/Codex adversarial behavior from the normal reviewer settings. When it is
present, even as an empty array, it is the explicit source of truth for
adversarial lanes. Adversarial lanes are independent from normal reviewer
enablement, so a user can keep normal Cursor review disabled while enabling a
Cursor adversarial lane.

`/pza-settings` may launch `node ./lib/pza-runtime.js settings-ui` as a visual
companion. The server binds only to localhost, requires a random URL token, and
writes the same `~/.pza-skills/` files as the terminal commands. If a harness
cannot run or expose a local server, use `/pza-settings --status` and direct
CLI arguments instead.

## Plan Reviewers

`/areyousure` can verify file-backed plans or conversation-backed plans. When a
plan only exists in chat, the workflow treats the conversation as the source of
truth and only materializes temporary `/tmp` files for CLI reviewers.

Custom plan reviewers are configured locally in
`~/.pza-skills/plan-reviewers.json`:

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

Runtime helpers execute custom reviewer commands as argv arrays and pass the
review prompt on stdin. Adapters must not turn these commands into shell strings.
The `plan-reviewers` status command redacts command arrays and exposes only
non-sensitive metadata for skill context.
