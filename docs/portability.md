# Portability Architecture

## Canonical Core

- `skills/*/SKILL.md` defines reusable workflows.
- `agents/*.md` defines reusable reviewer/verifier roles.
- `lib/pza-runtime.js` owns shared runtime behavior: config, model selection,
  session files, diff hashes, review markers, plan-review prompt assembly,
  custom plan reviewer invocation, and Ollama invocation.

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
