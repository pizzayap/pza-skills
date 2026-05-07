---
name: areyousure
description: >-
  Run when the user says "are you sure", "are you sure about the plan",
  "double-check the plan", "verify plan", "deep check the plan", or "validate
  the plan". Re-validates the plan against the codebase and current stable
  APIs by launching verification agents (Claude + optional Ollama + optional
  Codex) in parallel, then merges findings with confidence scores and applies
  corrections.
user-invocable: true
argument-hint: '[--claude-only|--ollama-only|--codex-only]'
---

# Session Context

Most recent plan files:
!`ls -t ~/.claude/plans/*.md 2>/dev/null | head -5`

Project CLAUDE.md:
!`test -f ./CLAUDE.md && echo "yes — $(wc -l < ./CLAUDE.md) lines" || echo "no"`

Ollama enabled:
!`node -e "try{const s=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/pza-settings.json','utf8'));console.log(s.ollama!==false?'yes':'no')}catch{console.log('yes')}" 2>/dev/null`

Ollama available:
!`which ollama >/dev/null 2>&1 && echo "yes" || echo "no"`

Ollama model:
!`cat ~/.claude/pza-ollama-model 2>/dev/null || echo "kimi-k2.6:cloud"`

Codex enabled:
!`node -e "try{const s=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/pza-settings.json','utf8'));console.log(s.codex!==false?'yes':'no')}catch{console.log('yes')}" 2>/dev/null`

Codex CLI available:
!`which codex >/dev/null 2>&1 && echo "yes" || echo "no"`

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
> "No plan file found. Create a plan first (enter plan mode), then run /areyousure."

Once the path is identified:
- Read the plan file in full using the `Read` tool
- If `./CLAUDE.md` exists (shown above): read it too. If it is longer than 200 lines, read only the first 200 lines for context.

## Step 2 — Launch Verification Agents

Check the Arguments from Session Context and availability of each tool. Explicit flags (`--claude-only`, `--ollama-only`, `--codex-only`) override the enabled/disabled toggle in `pza-settings.json` — if a user explicitly requests a specific agent via flag, respect it regardless of settings.

- If `--claude-only`: launch only `plan-verifier`
- If `--ollama-only`: launch only `ollama-plan-verifier`
- If `--codex-only`: launch only `codex-plan-verifier`
- Otherwise (default): launch `plan-verifier` (always) + `ollama-plan-verifier` (if Ollama enabled AND available) + `codex-plan-verifier` (if Codex enabled AND Codex CLI available) — up to 3 agents

If Ollama is enabled but not available: warn user, skip Ollama agent.
If Codex is enabled but CLI not available: skip Codex agent silently.

### Multi-Agent Verification (default)

Launch all eligible Agent tool calls **in the same message** (parallel execution):

**Agent 1: `plan-verifier` (Claude)** — always launched
```
You are verifying this implementation plan against current documentation.

**Working directory:** [pwd from session context above]

**Plan content:**
[paste the full plan file content here]

**Project conventions (CLAUDE.md excerpt):**
[paste CLAUDE.md content here, or "No CLAUDE.md found" if absent]

Return a structured verification report. Do NOT modify any files.
```

**Agent 2: `ollama-plan-verifier` (Ollama)** — launch if Ollama enabled AND available
```
Verify this implementation plan for technical accuracy.

**Ollama model to use:** [model from session context above]

**Plan content:**
[paste the full plan file content here]

Return findings in this format:
- Critical findings (must fix)
- Warning findings (should fix)
- Info findings (minor)
- Verified correct items
```

**Agent 3: `codex-plan-verifier` (Codex)** — launch if Codex enabled AND CLI available
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

Tell the user how many verifiers are launching, e.g.: "Launching triple verification — Claude, Ollama, and Codex reviewing in parallel (2–5 min)..." or "Launching dual verification — Claude and Ollama reviewing in parallel (2–5 min)..."

### Single Verification (flag or fallback)

Launch only the specified/available agent. Tell the user which verifier is running and why.

## Step 2.5 — Merge Findings

Once all launched agents return, merge their reports. Skip this step for single-verification runs.

1. **Parse all reports** — extract Critical, Warning, Info, and Verified Correct items from each agent
2. **Deduplicate** — if all active reviewers found the same claim with the same issue, mark with HIGH confidence. If a majority agree (e.g., 2 of 3), mark with MEDIUM-HIGH confidence.
3. **Mark unique findings** — findings from only one reviewer get source label (Claude/Ollama/Codex) with MEDIUM confidence
4. **Handle conflicts** — if reviewers disagree on the same claim, include all perspectives with LOW confidence
5. **Calculate agreement rate** — count overlapping findings vs. total unique findings (same formula across N reviewers)

## Step 3 — Present Findings

Once the agent(s) return, parse the (merged) report and display a summary table:

**For multi-agent verification:**

| Severity | Count | Source Breakdown |
|----------|-------|------------------|
| Critical | N | Claude: X, Ollama: Y, Codex: Z, Multiple: W |
| Warning  | N | Claude: X, Ollama: Y, Codex: Z, Multiple: W |
| Info     | N | Claude: X, Ollama: Y, Codex: Z, Multiple: W |
| Verified Correct | N | — |
| Unverifiable | N | — |

Only include source columns for agents that were actually launched. E.g., if only Claude + Ollama ran, omit the Codex column.

**Agreement rate:** X/Y findings overlapped (multiple reviewers found the same issue)

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

**For multi-agent verification:**
```markdown
## Verification Notes

**Verified:** [date]
**Confidence:** [HIGH/MEDIUM/LOW from merged report]
**Tools:** [list only the agents that were launched, e.g.: plan-verifier (Claude), ollama-plan-verifier (Ollama), codex-plan-verifier (Codex)]
**Agreement rate:** X/Y findings overlapped
**Summary:** [one sentence from the merged summary]
**Findings applied:** [Critical: N, Warning: N, Info: N (if "apply all") or "Critical + Warning only"]
```

**For single verification:**
```markdown
## Verification Notes

**Verified:** [date]
**Confidence:** [HIGH/MEDIUM/LOW from agent report]
**Tool:** [plan-verifier (Claude) OR ollama-plan-verifier (Ollama) OR codex-plan-verifier (Codex)]
**Summary:** [one sentence from the agent's summary]
**Findings applied:** [Critical: N, Warning: N, Info: N (if "apply all") or "Critical + Warning only"]
```

For "Apply critical + warning only": also append an `## Info Findings (Deferred)` section listing the info-level items from the report without applying them as edits.

### Show full report only

Display the agent's complete markdown report in full. Do not modify the plan file.
