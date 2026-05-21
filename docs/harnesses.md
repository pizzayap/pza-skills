# Harness Setup

PZA-skills is a portable Agent Skills package. The canonical workflows live in
`skills/*/SKILL.md`; harness-specific files are thin adapters.

Runtime settings are stored in `~/.pza-skills/` on each user's machine. That
directory is local-only and should never be committed into a shared skill repo.

## Codex

Install skills by copying or symlinking each skill directory into:

```sh
~/.codex/skills/
```

Install agents by copying or symlinking `agents/*.md` into:

```sh
~/.codex/agents/
```

Codex translation notes:

- Claude-style `AskUserQuestion` means Codex `request_user_input` when available, or a concise direct question when it is not.
- Claude-style `Task(...)` means Codex subagent/collaboration tools such as `spawn_agent`; omit inline model selection unless Codex exposes it.
- `AGENTS.md` is the primary project instruction file. `CLAUDE.md` is compatibility-only.

## OpenCode

Project adapters live in:

```sh
.opencode/commands/
.opencode/agents/
```

Command filenames become slash commands, so `.opencode/commands/arewedone.md`
provides `/arewedone`. Agent files mirror canonical `agents/*.md` with OpenCode
frontmatter such as `mode: subagent` and read-only reviewer permissions.

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

## Claude Code Compatibility

The `.claude-plugin/` manifest and `hooks/hooks.json` remain for existing Claude
Code installs. Hook behavior is compatibility-scoped: only Claude-style hook
payloads are implemented until other harness payloads are verified.
