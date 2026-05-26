---
name: areyousure
description: >-
  Run when the user says "are you sure", "are you sure about the plan",
  "double-check the plan", "verify plan", "deep check the plan", or "validate
  the plan". Re-validates the current implementation plan against the local
  codebase and repo guidance, flags claims that need outside evidence as
  unverifiable, then applies or returns corrections.
user-invocable: true
argument-hint: '[--report-only]'
---

# Are You Sure

Plan verification gate. This public workflow is local-only: it inspects the
resolved plan against repository files, checked-in guidance, and local project
metadata. Claims that local evidence cannot prove are reported as unverifiable.

Arguments: `$ARGUMENTS`

## Workflow

### 1. Resolve Plan Content

Resolve exactly one plan and label it with `planSource`:

1. Explicit user-supplied path or pasted content.
2. Current harness authoritative plan file, when exposed.
3. Latest complete plan in the current conversation, preferring a
   `<proposed_plan>...</proposed_plan>` block.
4. Relevant repo plan-like markdown file.

Use `planSource=conversation-backed` for conversation plans and
`planSource=file-backed` for file plans. If no plan is available, ask the user
for a plan path or pasted plan content.

For file-backed plans, read the plan file. For conversation-backed plans,
materialize a temporary file under `/tmp` only if a local helper needs a file
path. Never write conversation-backed plans into the repository.

### 2. Collect Local Context

If a shell runner is available, gather bounded local context with:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" collect-plan-context "$PLAN_FILE" "$PLAN_SOURCE" --max-bytes 20000
```

For conversation-backed plans, pass `-` only when the harness can provide stdin
without shell interpolation:

```bash
printf '%s' "$PLAN_CONTENT" | node "$HOME/.pza-skills/lib/pza-runtime.js" collect-plan-context - "$PLAN_SOURCE" --max-bytes 20000
```

Do not use command substitution to embed plan content in shell arguments.

### 3. Run Native Verifier

Run `plan-verifier` with `mode=native` when available.

Use the resolved plan plus a short project-conventions excerpt from `AGENTS.md`
or `CLAUDE.md`. If the plan came from a file and may contain secrets, prefer the
output of `collect-plan-context` rather than pasting the raw file.

Verification scope:

- Confirm paths, imports, commands, config names, and repo conventions against
  local files.
- Check local manifests and lockfiles for dependency names and installed
  versions.
- Mark claims that need evidence outside the local repository `UNVERIFIABLE`
  when local evidence cannot prove them.
- Do not install packages, access the network, or send plan contents outside
  this public skill workflow.

### 4. Merge Findings

Merge verifier reports:

- Critical, Warning, Info, Unverifiable, and Verified Correct items.
- Deduplicate by affected claim and correction.
- Local-file findings are high confidence when tied to exact paths or command
  output.
- Claims that require outside evidence are unverifiable, not failed.

### 5. Apply or Return Corrections

For file-backed plans, ask before editing the plan file. After approved edits,
append verification notes with date, plan source, local evidence checked,
confidence, and findings applied.

For conversation-backed plans, do not edit files. Return a complete replacement
plan when corrections are accepted, followed by verification notes.

If the user asks only for the report, show the merged report and do not rewrite
or edit anything.
