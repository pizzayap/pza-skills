---
name: pza-settings
description: >-
  Configure PZA-skills integrations. Toggle Codex and Ollama code review
  on or off. Run with arguments like '/pza-settings codex off' or
  interactively without arguments.
user-invocable: true
argument-hint: '[codex on|off] [ollama on|off]'
---

# PZA Settings

Current settings:
!`cat ~/.claude/pza-settings.json 2>/dev/null || echo '{"codex":true,"ollama":true}'`

Codex CLI available:
!`which codex >/dev/null 2>&1 && echo "yes" || echo "no"`

Ollama available:
!`which ollama >/dev/null 2>&1 && echo "yes" || echo "no"`

Arguments:
`$ARGUMENTS`

## Workflow

### Step 1 — Parse Arguments

Check the Arguments above.

**If arguments are provided** (e.g., `codex off`, `ollama on`, `codex on ollama off`):

Parse the arguments as space-separated `<key> <value>` pairs. Valid keys: `codex`, `ollama`. Valid values: `on`, `off`.

Apply all pairs in a single `node -e` call (handles one or two pairs):

```bash
node -e "
  const fs = require('fs');
  const path = require('os').homedir() + '/.claude/pza-settings.json';
  let s = {};
  try { s = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
  // Set each key-value pair parsed from arguments:
  s['KEY1'] = VALUE1;
  // If a second pair was provided, add: s['KEY2'] = VALUE2;
  fs.writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
  console.log(JSON.stringify(s));
"
```

Replace `KEY1`/`VALUE1` (and optionally `KEY2`/`VALUE2`) with the setting names and `true` (for `on`) or `false` (for `off`). For a single pair like `codex off`, only one assignment is needed.

After updating, display the new settings and stop.

**If no arguments**, proceed to Step 2.

### Step 2 — Display Status

Show a status table:

| Integration | Enabled | Installed |
|-------------|---------|-----------|
| Codex       | yes/no  | yes/no    |
| Ollama      | yes/no  | yes/no    |

Read "Enabled" from the current settings shown in session context above. Read "Installed" from the availability checks above.

If an integration is enabled but not installed, note it:
> Codex is enabled but not installed. Install it with `npm install -g @openai/codex` and run `codex login`.
> Ollama is enabled but not installed. Install it from https://ollama.com.

### Step 3 — Ask User

Use **AskUserQuestion** to let the user toggle:

```yaml
question: "Which integrations do you want to change?"
multiSelect: true
options:
  - label: "Toggle Codex"
    description: "Currently [on/off] — will switch to [off/on]"
  - label: "Toggle Ollama"
    description: "Currently [on/off] — will switch to [off/on]"
  - label: "No changes"
    description: "Keep current settings"
```

Fill in the current state dynamically from the session context.

### Step 4 — Apply Changes

If the user selected toggles, apply each change:

```bash
node -e "
  const fs = require('fs');
  const path = require('os').homedir() + '/.claude/pza-settings.json';
  let s = {};
  try { s = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
  s['codex'] = CODEX_VALUE;
  s['ollama'] = OLLAMA_VALUE;
  fs.writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
  console.log('Settings updated:');
  console.log(JSON.stringify(s, null, 2));
"
```

Replace `CODEX_VALUE` and `OLLAMA_VALUE` with the new boolean values based on the user's selections.

Show the updated settings and confirm:

> Settings saved to `~/.claude/pza-settings.json`. Changes take effect on next skill invocation.
