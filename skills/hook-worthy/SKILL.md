---
name: hook-worthy
description: This skill should be used when the user asks to "check for hooks", "find hook-worthy patterns", "are there any hooks worth adding", "hook-worthy", "what should be a hook", or wants to audit the current session for patterns that should become Claude Code hooks.
user-invocable: true
---

# Hook-Worthy Session Auditor

Analyze the current conversation session for recurring patterns, mistakes, or convention violations that would benefit from being enforced as Claude Code hooks. Filter out noise and generate properly formatted hook configurations following the latest standards.

## When to Run

Run at the end of a session or after a code review surfaces repeated issues. The goal is to catch patterns that keep happening across sessions — not one-time fixes.

## Audit Workflow

### Step 1: Scan the Session

Review the full conversation for these hook-worthy signals:

**Strong signals (likely hook-worthy):**
- Claude made the same type of mistake more than once
- A code review caught a convention violation that CLAUDE.md already documents
- The user corrected Claude on a project-specific rule (e.g., "always add schema aliases")
- A dangerous operation was attempted without safeguards
- A multi-step checklist was required that Claude forgot steps of

**Weak signals (probably NOT hook-worthy):**
- A one-time bug fix or feature addition
- Subjective code quality preferences (readability, naming)
- Things already caught by linters, formatters, or CI
- General programming best practices Claude already knows
- Patterns that only apply to a single file or function

### Step 2: Apply the Hook-Worthy Filter

For each candidate pattern, evaluate against these criteria:

| Criterion | Must pass? | Question to ask |
|---|---|---|
| **Recurrence** | Yes | Will this happen again in future sessions? |
| **Automation** | Yes | Can a hook actually catch this? (matcher + prompt/command) |
| **Signal-to-noise** | Yes | Will this fire only when relevant, not on every edit? |
| **Not already covered** | Yes | Is this already handled by linters, CI, or CLAUDE.md awareness? |
| **Specificity** | Yes | Can the hook prompt be specific enough to be useful? |

Discard any candidate that fails even one criterion. Be conservative — a noisy hook is worse than no hook.

### Step 3: Choose the Right Event and Type

For each surviving candidate, determine:

- **Event**: `PreToolUse` (prevent before it happens), `PostToolUse` (react after), `Stop` (verify at end), or `SessionStart` (set up context)
- **Matcher**: Narrowest regex that catches the pattern (prefer `Write|Edit` over `*`)
- **Type**: `prompt` for nuanced/contextual checks, `command` for deterministic/fast checks

Refer to `references/hook-standards.md` for the complete format specification, exit codes, and anti-patterns.

### Step 4: Generate Hook Configuration

For each hook, produce:

1. **Rationale** — What session pattern triggered this, and why it's recurring
2. **Hook JSON** — Complete, copy-paste-ready configuration block
3. **Target location** — Whether it belongs in project `.claude/settings.json` (project-specific convention) or user `~/.claude/settings.json` (applies everywhere)

Format each hook as:

```
### Hook: [Short name]

**Pattern observed**: [What happened in this session]
**Why it's recurring**: [Why this will happen again]
**Target**: project `.claude/settings.json` | user `~/.claude/settings.json`

​```json
{
  "hooks": {
    "[Event]": [
      {
        "matcher": "[pattern]",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "[specific, actionable prompt]",
            "timeout": [seconds]
          }
        ]
      }
    ]
  }
}
​```
```

### Step 5: Present Results

If **no hook-worthy patterns found**, report:
> No hook-worthy patterns detected in this session. The issues found were either one-time fixes, already covered by existing tooling, or too subjective for automated enforcement.

If **hooks found**, present each hook with its rationale using the format above, then ask the user which hooks to install. When installing, merge into the target settings.json file — do not overwrite existing hooks.

## Important Guidelines

- **Be conservative**. A session with 5 corrections does NOT mean 5 hooks. Most corrections are one-time.
- **Prompt hooks should be specific**. "Check code quality" is useless. "When editing schema.ts, verify a short alias export exists at the bottom for any new table" is useful.
- **Respect existing tooling**. If the project has ESLint, Prettier, or CI checks, don't duplicate them as hooks.
- **Merge, don't overwrite**. When installing hooks into settings.json, preserve existing hook configurations.
- **Project vs user scope**. Convention-specific hooks go in the project. Safety hooks (like blocking force-push) can go in user settings.

## Additional Resources

### Reference Files

For the complete hook configuration format, event types, matcher syntax, and anti-patterns:
- **`references/hook-standards.md`** — Claude Code hook standards and configuration reference
