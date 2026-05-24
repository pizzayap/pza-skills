---
name: agent-docs-revise
description: >-
  Revise AGENTS.md and CLAUDE.md from durable session learnings and current repo
  evidence. Use when the user asks to update, rewrite, refresh, revise, or
  capture learnings in agent instruction files, project memory, AGENTS.md, or
  CLAUDE.md.
user-invocable: true
argument-hint: '[path] [--root-only|--all]'
---

# Agent Docs Revise

Capture durable guidance and propose edits before writing. Do not edit until the user approves the proposed rewrite or diff.

Working directory:
!`pwd`

Git status:
!`git status --short --branch 2>/dev/null || true`

Guidance files:
!`find . \( -type d \( -name .git -o -name node_modules -o -name .next -o -name .turbo \) -prune \) -o \( -name AGENTS.md -o -name CLAUDE.md \) -print 2>/dev/null | head -50`

Arguments:
`$ARGUMENTS`

## Core Rules

- `AGENTS.md` is the canonical cross-harness guidance file.
- `CLAUDE.md` is a Claude Code compatibility mirror when present.
- Preserve existing project-specific guidance unless repo evidence proves it stale or duplicated.
- Full rewrites are allowed, but only after showing the proposed replacement and getting approval.
- Never put personal preferences, secrets, machine-local paths, or one-off fixes into shared guidance.
- Keep guidance concise. Every line should help a future agent avoid rediscovery or mistakes.

## Workflow

### 1. Resolve Target

Resolve the target from `$ARGUMENTS`:

- No argument: revise root `AGENTS.md`; also update root `CLAUDE.md` when it exists and appears mirror-like.
- Path argument: revise that file or directory scope.
- `--root-only`: revise only root guidance files.
- `--all`: include nested `*/AGENTS.md` and `*/CLAUDE.md` files when the durable learning is scope-specific.

If neither root `AGENTS.md` nor root `CLAUDE.md` exists, ask whether to create `AGENTS.md`. Do not create `CLAUDE.md` as the primary file in a Codex-first repo.

### 2. Gather Durable Learnings

Review the current session and repo state for guidance that would help future agents:

- Commands that were discovered, corrected, or proved useful.
- Testing, build, lint, release, or validation workflows that actually work.
- Non-obvious architecture, package boundaries, adapters, config locations, or runtime state.
- Safety rules caused by real project conventions or recurring mistakes.
- Mirror differences between `AGENTS.md` and `CLAUDE.md` that should be preserved or repaired.

Run a lightweight audit before drafting: read the current guidance files and verify high-risk claims against the repo with read-only commands.

### 3. Filter Hard

Add or keep:

- Project-specific commands and workflows.
- Repo-specific architecture and adapter conventions.
- Non-obvious gotchas, shell safety rules, and validation requirements.
- Current external config locations and compatibility rules.

Remove or avoid:

- Generic best practices.
- Obvious statements already clear from filenames or code.
- One-off bug fixes or session history.
- Long explanations when a short command or rule is enough.
- Unsupported claims about harness hooks or adapters.

### 4. Draft the Rewrite

For a full root rewrite, use only relevant sections:

- Overview
- Architecture
- Key Conventions
- Testing & Validation
- Plugin Manifest
- External Config
- Harness Notes or Compatibility Notes

For smaller updates, show a focused diff instead. In both cases, include:

- Target file.
- Proposed replacement or diff.
- Brief reason for each major change.
- Whether `CLAUDE.md` will be updated as a mirror.

Ask for approval before writing. If the active harness has a user-input tool, use it; otherwise ask a concise direct question.

### 5. Apply Approved Edits

After approval:

1. Edit the approved target file(s) only.
2. For the default root scope, edit `AGENTS.md` first; if root `CLAUDE.md` exists and is mirror-like, update it after `AGENTS.md`.
3. For a path-scoped request, do not redirect edits back to root `AGENTS.md` unless the user explicitly approved that target.
4. Keep intentional Claude differences limited to Claude Code wording, install commands, MCP command spelling, and compatibility-only hook/plugin notes.
5. Preserve unrelated local changes. If the working tree is dirty in the target files, inspect the diff and avoid overwriting user edits.

After editing, verify:

```bash
git diff -- AGENTS.md CLAUDE.md
```

For package repos like PZA-skills, also verify README and manifest lists if the guidance changes skill inventory, adapters, or install instructions.

## Output

After applying approved edits, summarize:

- Files changed.
- Durable guidance added, updated, or removed.
- Verification commands run.
- Any remaining drift or unverified claims.
