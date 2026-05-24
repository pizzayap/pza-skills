# Harness Setup

PZA-skills is a portable Agent Skills package. The canonical workflows live in
`skills/*/SKILL.md`; harness-specific files are thin adapters.

Runtime settings are stored in `~/.pza-skills/` on each user's machine. That
directory is local-only and should never be committed into a shared skill repo.
After installing skills in any harness, run `/pza-settings` to record the native
model label, toggle optional reviewer CLIs, choose backend-specific model names,
and configure `/arewedone` adversarial provider/model lanes.

Installed skills collect settings and review context only at invocation time
through `~/.pza-skills/lib/pza-runtime.js`. Harness adapters should not add
load-time command injection for status, plans, diffs, or local config files.

Install the shared helper runtime once per machine before using the skills from
other project directories:

```sh
npx skills add pizzayap/pza-skills
git clone https://github.com/pizzayap/pza-skills.git ~/.pza-skills/package
~/.pza-skills/package/scripts/install-runtime.sh
```

Re-run the `npx skills add` command whenever the package updates so installed
skill copies pick up new runtime invocation paths and workflow text. Also
refresh the runtime package before reinstalling the helper:

```sh
git -C ~/.pza-skills/package pull --ff-only
~/.pza-skills/package/scripts/install-runtime.sh
```

These commands assume a POSIX shell environment such as macOS, Linux, or WSL2.

By default `/pza-settings` starts a localhost-only visual settings companion
when the harness can run a local server. Open the printed tokenized URL, make
changes, then click **Save and Stop Server**. Terminal-only harnesses can use
`/pza-settings --status` plus direct `/pza-settings <reviewer> ...` arguments.

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
- Codex Plan Mode plans may exist only in the conversation. `/areyousure` should verify that conversation-backed plan read-only, and only write temporary `/tmp` files when invoking CLI reviewers.

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
conversation-backed plan unless the user provides a file path.

## Claude Code Compatibility

The `.claude-plugin/` manifest and `hooks/hooks.json` remain for existing Claude
Code installs. Hook behavior is compatibility-scoped: only Claude-style hook
payloads are implemented until other harness payloads are verified.
