---
name: work-issue
description: >-
  Use when the user asks an agent to work a GitHub issue from an issue number,
  owner/repo issue reference, or GitHub issue URL. Guides issue intake, AFK
  readiness checks, scoped implementation, verification, commit/push, draft PR
  creation, and correct issue-closing semantics.
user-invocable: true
argument-hint: '[owner/repo#123|#123|issue-url] [--repo owner/repo] [--direct-to-main]'
---

# Work Issue

Working directory:
!`pwd`

Git status:
!`git status --short --branch 2>/dev/null || true`

GitHub CLI available:
!`command -v gh >/dev/null 2>&1 && echo "yes" || echo "no"`

Arguments:
`$ARGUMENTS`

## Core Rules

- Work only the referenced issue scope. Do not bundle opportunistic fixes.
- Do not overwrite unrelated local changes. If the working tree has unrelated edits, preserve them and pause before risky checkout, merge, format, or staging actions.
- Treat AFK readiness as a gate. Pause before implementation when the issue is ambiguous, lacks acceptance criteria, has `needs-info` or `ready-for-human`, is blocked by open issues, or appears to be a `to-issues` parent whose children are incomplete.
- Prefer a draft PR with a body containing `Closes #123` only when the work fully satisfies the issue. Use `Refs #123`, `Related to #123`, or `Part of #123` for partial work.
- Never close a parent issue created by `to-issues` unless all child issues are complete and this work truly satisfies the parent.

## Workflow

### 1. Resolve the Issue

Parse `$ARGUMENTS`:

- `#123` means issue `123` in the current repository.
- `owner/repo#123` sets repo and issue number.
- `https://github.com/owner/repo/issues/123` sets repo and issue number.
- `--repo owner/repo` overrides repository detection.
- `--direct-to-main` allows the direct-to-main flow only when the user explicitly asked for it.

If no explicit repo is present, derive `owner/repo` from `git remote -v`. Prefer `origin` and normalize both HTTPS and SSH GitHub remotes. If no GitHub repo can be resolved, pause and ask for `--repo owner/repo`.

Pre-checks:

```bash
gh auth status
git status --short --branch
```

If `gh` is missing or unauthenticated, stop with the exact setup blocker.

### 2. Fetch Issue Context

Fetch the issue, comments, labels, assignees, and linked closing PRs:

```bash
gh issue view "$NUMBER" -R "$REPO" \
  --json assignees,body,closedByPullRequestsReferences,comments,labels,number,state,stateReason,title,url
```

Fetch native dependency blockers:

```bash
OWNER=${REPO%/*}
NAME=${REPO#*/}
gh api "repos/$OWNER/$NAME/issues/$NUMBER/dependencies/blocked_by" \
  --jq '.[] | {number,title,state,url}'
```

If the dependency endpoint fails because the repo or token does not expose issue dependencies, record that and inspect the issue body/comments for blocker language instead. If any blocker is open, pause and report the blockers.

Also inspect body/comments for linked PRs, parent/child issue language, task lists, "blocked by", "depends on", and acceptance criteria.

### 3. Decide AFK Readiness

Pause before implementation if any of these are true:

- Labels include `needs-info` or `ready-for-human`.
- Issue state is not open.
- Open blockers or incomplete child issues exist.
- Acceptance criteria are absent, contradictory, or too broad for one focused change.
- The issue requests product/design decisions, credentials, deploy access, or external approval.
- Linked PRs already appear to implement the issue and need human review instead of duplicate work.

Before coding, state the intended scope in one short paragraph based on the acceptance criteria. Treat anything outside that scope as out of scope unless the user expands it.

### 4. Branch Safely

Use a branch named:

```text
codex/issue-123-short-slug
```

Create the slug from the issue title with lowercase alphanumerics and hyphens, trimmed to keep the branch readable.

Before switching or creating a branch:

- Check `git status --short`.
- Identify any existing local changes.
- Do not stash, discard, or overwrite user changes without explicit permission.
- If already on an appropriate issue branch, continue there after confirming it tracks the same issue.

### 5. Implement and Verify

Implement only the accepted issue scope. Prefer existing repo patterns and minimal changes.

Run checks based on touched files and available repo scripts. Inspect manifests such as `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Makefile`, and local docs to choose relevant tests, type checks, lint, builds, or focused command equivalents. If no automated checks exist, run the narrowest meaningful manual/static validation and state the limitation.

Before staging:

```bash
git diff --stat
git diff
```

Review the diff for unrelated edits and remove or pause on anything outside issue scope.

### 6. Commit and Push

Commit intentionally with a subject that describes the issue work. Include issue keywords only according to the publication path:

- PR workflow: do not rely on the local commit to close the issue. Put `Closes #123` in the PR body when complete.
- Partial work: use `Refs #123`, `Related to #123`, or `Part of #123`.
- Direct-to-main: only when the user explicitly requested it, a default-branch commit body may contain `Closes #123`.

Push the branch:

```bash
git push -u origin HEAD
```

### 7. Open PR or Close Direct-to-Main Loop

Default PR workflow:

1. Create a draft PR with `gh pr create --draft --body-file "$PR_BODY_FILE"`.
2. Include the scope summary, checks run, and `Closes #123` only if complete.
3. After creation, verify the PR body contains the intended issue reference.
4. Report that the issue will close only when the PR is merged into the default branch.

Direct-to-main workflow:

1. Only use this path when the user explicitly asked for direct push.
2. After pushing to the default branch, run:

```bash
gh issue view "$NUMBER" -R "$REPO" --json state,stateReason,url
```

3. If the issue did not auto-close and the pushed default-branch commit fully satisfies it, close it manually:

```bash
gh issue close "$NUMBER" -R "$REPO" --reason completed --comment "Completed by <commit-or-summary>."
```

## GitHub Closing Semantics

- `Closes #123`, `Fixes #123`, and `Resolves #123` close issues only when the PR is merged into the default branch, or when a commit containing the keyword lands on the default branch.
- A local commit alone does not close an issue.
- A pushed branch alone does not close an issue.
- A PR body with `Closes #123` is the default safe workflow for complete issue work.
- For PR workflow, always verify the PR body contains `Closes #123` and report that the issue will close only when merged into the default branch.

## Final Status

End with:

- Issue reference and URL.
- Branch name.
- Commit hash.
- PR URL, if created.
- Checks run and results.
- Whether the issue will auto-close on PR merge, already closed after direct-to-main, or remains open because the work was partial.
