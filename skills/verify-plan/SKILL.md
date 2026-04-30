---
name: verify-plan
description: >-
  Run when the user says "verify plan", "deep check the plan", or "validate
  the plan". Launches dual verification agents (Claude + Codex) in parallel,
  then merges findings with confidence scores and applies corrections.
user-invocable: true
argument-hint: '[--claude-only|--codex-only]'
---

# Session Context

Most recent plan files:
!`ls -t ~/.claude/plans/*.md 2>/dev/null | head -5`

Project CLAUDE.md:
!`test -f ./CLAUDE.md && echo "yes — $(wc -l < ./CLAUDE.md) lines" || echo "no"`

Codex available:
!`test -f ~/.codex/auth.json && echo "yes" || echo "no"`

Working directory:
!`pwd`

Arguments:
$ARGUMENTS

# Workflow

## Step 1 — Locate and Read Plan

Find the current plan file path using this priority order:

1. **Plan mode** — Extract the path from the `<system-reminder>` block containing `Plan File Info:`. It will be a `.md` path like `/Users/.../plans/some-name.md`.
2. **Fallback** — Use the most recently modified `.md` file from the list shown above in Session Context.

**Early exit guard:** If no plan file path is found in the system-reminder AND the session context shows no files in `~/.claude/plans/`, stop immediately and tell the user:
> "No plan file found. Create a plan first (enter plan mode), then run /verify-plan."

Once the path is identified:
- Read the plan file in full using the `Read` tool
- If `./CLAUDE.md` exists (shown above): read it too. If it is longer than 200 lines, read only the first 200 lines for context.

## Step 2 — Launch Verification Agents

Check the Arguments from Session Context and Codex availability:

- If `--claude-only`: skip Codex agent, launch only `plan-verifier`
- If `--codex-only`: skip Claude agent, launch only `codex-plan-verifier`
- If Codex not available (auth.json missing): warn user, launch only `plan-verifier`
- Otherwise (default): launch BOTH agents in parallel

### Dual Verification (default)

Launch TWO Agent tool calls **in the same message** (parallel execution):

**Agent 1: `plan-verifier` (Claude)**
```
You are verifying this implementation plan against current documentation.

**Working directory:** [pwd from session context above]

**Plan content:**
[paste the full plan file content here]

**Project conventions (CLAUDE.md excerpt):**
[paste CLAUDE.md content here, or "No CLAUDE.md found" if absent]

Return a structured verification report. Do NOT modify any files.
```

**Agent 2: `codex-plan-verifier` (Codex/GPT)**
```
Verify this implementation plan for technical accuracy.

**Plan content:**
[paste the full plan file content here]

Return findings in this format:
- Critical findings (must fix)
- Warning findings (should fix)
- Info findings (minor)
- Verified correct items
```

Tell the user: "Launching dual verification — Claude and Codex reviewing in parallel (2–5 min)..."

### Single Verification (flag or fallback)

Launch only the specified/available agent. Tell the user which verifier is running and why.

## Step 2.5 — Merge Findings

Once both agents return, merge their reports:

1. **Parse both reports** — extract Critical, Warning, Info, and Verified Correct items from each
2. **Deduplicate** — if both found the same claim with the same issue, mark as "Both" with HIGH confidence
3. **Mark unique findings** — findings from only one reviewer get source label (Claude/Codex) with MEDIUM confidence
4. **Handle conflicts** — if reviewers disagree on the same claim, include both perspectives with LOW confidence
5. **Calculate agreement rate** — count overlapping findings vs. total unique findings

Skip this step for single-verification runs.

## Step 3 — Present Findings

Once the agent(s) return, parse the (merged) report and display a summary table:

**For dual verification:**

| Severity | Count | Source Breakdown |
|----------|-------|------------------|
| Critical | N | Claude: X, Codex: Y, Both: Z |
| Warning  | N | Claude: X, Codex: Y, Both: Z |
| Info     | N | Claude: X, Codex: Y, Both: Z |
| Verified Correct | N | — |
| Unverifiable | N | — |

**Agreement rate:** X/Y findings overlapped (both reviewers found the same issue)

**For single verification:**

| Severity | Count |
|----------|-------|
| Critical | N |
| Warning  | N |
| Info     | N |
| Verified Correct | N |
| Unverifiable | N |

Show the Overall Confidence rating and the Summary paragraph from the report.

If zero Critical + Warning findings: tell the user the plan looks solid and show the "Verified Correct" list. Offer to show the full report anyway. Stop.

## Step 4 — User Choice

Use **AskUserQuestion** to let the user decide:

```yaml
question: "How should we update the plan with these findings?"
options:
  - label: "Apply all corrections"
    description: "Update the plan with all Critical, Warning, and Info corrections"
  - label: "Apply critical + warning only"
    description: "Update plan with high-severity items; append Info findings as notes at the bottom"
  - label: "Show full report only"
    description: "Display the complete verification report without modifying the plan"
```

## Step 5 — Apply Corrections

### Apply all / Apply critical + warning only

Edit the plan file using the agent's "Suggested Plan Updates" section. Each update specifies:
- Which plan section to edit
- The exact current text to replace
- The corrected replacement text

Apply each update using the `Edit` tool. After all edits, append a `## Verification Notes` section at the end of the plan file:

**For dual verification:**
```markdown
## Verification Notes

**Verified:** [date]
**Confidence:** [HIGH/MEDIUM/LOW from merged report]
**Tools:** plan-verifier (Claude), codex-plan-verifier (Codex)
**Agreement rate:** X/Y findings overlapped
**Summary:** [one sentence from the merged summary]
**Findings applied:** [Critical: N, Warning: N, Info: N (if "apply all") or "Critical + Warning only"]
```

**For single verification:**
```markdown
## Verification Notes

**Verified:** [date]
**Confidence:** [HIGH/MEDIUM/LOW from agent report]
**Tool:** [plan-verifier (Claude) OR codex-plan-verifier (Codex)]
**Summary:** [one sentence from the agent's summary]
**Findings applied:** [Critical: N, Warning: N, Info: N (if "apply all") or "Critical + Warning only"]
```

For "Apply critical + warning only": also append an `## Info Findings (Deferred)` section listing the info-level items from the report without applying them as edits.

### Show full report only

Display the agent's complete markdown report in full. Do not modify the plan file.
