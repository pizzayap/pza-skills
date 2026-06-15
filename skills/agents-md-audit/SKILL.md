---
name: agent-docs-audit
description: >-
  Audit AGENTS.md, CLAUDE.md, and nested agent guidance files for quality,
  staleness, duplication, and AGENTS/CLAUDE mirror drift. Use when the user asks
  to audit, check, review, improve, or validate agent instruction files, project
  memory, agent docs, AGENTS.md, or CLAUDE.md without immediately editing them.
user-invocable: true
argument-hint: '[path] [--root-only|--all]'
---

# Agent Docs Audit

Read-only audit for project guidance files. Do not edit files.

Arguments:
`$ARGUMENTS`

## Workflow

### 1. Discover Scope

Resolve the audit target from `$ARGUMENTS`:

- No argument: audit root `AGENTS.md` and root `CLAUDE.md` when present, plus nested `*/AGENTS.md` and `*/CLAUDE.md` files that are inside the repo.
- Path argument: audit that file or directory only.
- `--root-only`: audit only root `AGENTS.md` and root `CLAUDE.md`.
- `--all`: include nested repo guidance files. Only mention global `~/.claude/CLAUDE.md` as a separate personal-default file when it exists; do not score it as project guidance unless the user explicitly asks.

At invocation time, use read-only discovery commands when a shell runner is
available:

```bash
pwd
git status --short --branch
find . \( -type d \( -name .git -o -name node_modules -o -name .next -o -name .turbo \) -prune \) -o \( -name AGENTS.md -o -name CLAUDE.md \) -print
```

Prefer `AGENTS.md` as the canonical cross-harness file. Treat `CLAUDE.md` as a Claude Code compatibility mirror when both root files exist.

### 2. Inspect Evidence

For each guidance claim, check the repo rather than trusting prose:

- Commands: inspect manifests such as `package.json`, `bunfig.toml`, `Makefile`, `pyproject.toml`, `Cargo.toml`, `go.mod`, and scripts under `scripts/`.
- Architecture: compare documented paths with `rg --files`, `find`, and existing adapters.
- Skills and agents: verify `skills/*/SKILL.md`, `agents/*.md`, `.opencode/`, `.pi/`, `.claude-plugin/`, and README lists.
- Harness notes: verify Codex/OpenCode/Pi/Claude claims against repo docs before reporting them as current.

Use read-only commands. Do not run expensive installs, writes, migrations, formatters, or tests unless the user explicitly asks.

### 3. Score Quality

Score each project guidance file out of 100:

| Criterion | Points | What to Check |
|---|---:|---|
| Commands/workflows | 20 | Essential commands are present, current, and contextualized. |
| Architecture clarity | 20 | Key directories, adapters, entry points, and data flow are accurate. |
| Non-obvious patterns | 15 | Gotchas, safety rules, and recurring project-specific mistakes are captured. |
| Conciseness | 15 | Dense, useful guidance without generic filler or obvious code summaries. |
| Currency | 15 | Paths, tools, manifests, and package capabilities match repo state. |
| Actionability | 15 | Instructions are concrete, executable, and scoped to real files/commands. |

Grades:

- A: 90-100
- B: 70-89
- C: 50-69
- D: 30-49
- F: 0-29

### 4. Check Mirror Drift

When root `AGENTS.md` and `CLAUDE.md` both exist:

- Identify intentional differences: Codex vs Claude wording, install commands, MCP command spelling, and Claude compatibility hook/plugin notes.
- Flag accidental drift: missing package capabilities, stale commands, contradictory safety rules, or one file listing a skill/adapter that the other omits without reason.
- Do not require byte-for-byte equality.

### 5. Report

Output:

```markdown
## Agent Docs Audit

### Summary
- Files audited: N
- Average score: N/100
- Files needing update: N
- Mirror status: current | drift found | not applicable

### File-by-File Assessment

#### ./AGENTS.md
**Score:** N/100 (Grade)

| Criterion | Score | Notes |
|---|---:|---|
| Commands/workflows | N/20 | ... |
| Architecture clarity | N/20 | ... |
| Non-obvious patterns | N/15 | ... |
| Conciseness | N/15 | ... |
| Currency | N/15 | ... |
| Actionability | N/15 | ... |

**Findings**
- Severity - evidence-backed issue and correction.

**Recommended updates**
- Specific high-value additions/removals.
```

Keep findings evidence-bound. Include exact paths and commands. If a claim cannot be verified cheaply, mark it as `Unverified` rather than treating it as wrong.

## Update Criteria

Recommend changes only when they would help future agents:

- Add discovered commands, workflows, setup requirements, or validation paths.
- Add repo-specific gotchas and safety rules that are likely to recur.
- Remove stale paths, outdated commands, duplicate text, or generic advice.
- Preserve useful project-specific instructions even when the file is messy.

Do not recommend adding generic best practices, obvious code summaries, one-off bug history, or verbose explanations.
