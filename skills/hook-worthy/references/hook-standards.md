# Claude Code Hook Standards Reference

## Hook Configuration Locations

### Project-level hooks (`.claude/settings.json`)
Scoped to one project. Event names are top-level keys — no wrapper object.

### User-level hooks (`~/.claude/settings.json`)
Apply to all projects for the user.

## Hook Events

| Event | When it fires | Common use |
|---|---|---|
| `PreToolUse` | Before a tool executes | Block dangerous operations, validate inputs |
| `PostToolUse` | After a tool completes | Analyze results, provide feedback, logging |
| `Stop` | When Claude finishes a turn | Verify work completeness, run checks |
| `SessionStart` | When a session begins | Load context, check environment |

## Hook Types

### Prompt-based hooks
Claude evaluates a natural language prompt. Best for nuanced, context-dependent checks.

```json
{
  "type": "prompt",
  "prompt": "Check if this edit follows project conventions...",
  "timeout": 30
}
```

### Command-based hooks
Runs a shell command. Best for deterministic, fast checks.

```json
{
  "type": "command",
  "command": "bash scripts/validate.sh",
  "timeout": 10
}
```

## Configuration Format

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<regex matching tool name or *>",
        "hooks": [
          {
            "type": "prompt" | "command",
            "prompt": "...",
            "command": "...",
            "timeout": <seconds>
          }
        ]
      }
    ]
  }
}
```

### Matcher patterns
- `"Write|Edit"` — matches Write or Edit tools
- `"Bash"` — matches Bash tool only
- `"*"` or `".*"` — matches all tools

### Exit codes (command hooks)
- **Exit 0**: stdout shown in transcript (success)
- **Exit 2**: stderr fed back to Claude as error (blocks the action)

## Prompt-Based Hook Best Practices

- Be specific about what to check (not "check everything")
- Reference project-specific conventions by name
- Keep prompts concise — one concern per hook
- Use `$TOOL_INPUT` to reference the tool's input in the prompt
- Set reasonable timeouts (10-30s for prompts, 2-10s for commands)

## Multiple Hooks

Multiple hooks under one matcher run in parallel:

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    { "type": "command", "command": "bash check-size.sh", "timeout": 2 },
    { "type": "prompt", "prompt": "Check naming conventions", "timeout": 10 }
  ]
}
```

## Anti-Patterns

- **Too broad**: A hook on `*` that checks "everything is good" — noisy, slow
- **Too frequent**: PostToolUse on every Read — fires constantly, adds latency
- **Duplicating linters**: Don't hook what ESLint/Prettier already catches at commit time
- **Feature additions**: Hooks enforce conventions, they don't add features
- **One-time fixes**: If it only happened once, it's not a pattern worth hooking
