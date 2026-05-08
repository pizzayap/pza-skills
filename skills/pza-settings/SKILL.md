---
name: pza-settings
description: >-
  Configure PZA-skills integrations. Toggle Codex, Ollama, and adversarial
  security review on or off. Run with arguments like '/pza-settings codex off'
  or interactively without arguments.
user-invocable: true
argument-hint: '[codex on|off] [ollama on|off] [adversarial on|off]'
---

# PZA Settings

Current settings:
!`cat ~/.claude/pza-settings.json 2>/dev/null || echo '{"codex":true,"ollama":true,"adversarial":true}'`

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

Parse the arguments as space-separated `<key> <value>` pairs. Valid keys: `codex`, `ollama`, `adversarial`. Valid values: `on`, `off`.

Apply all pairs in a single `node -e` call (handles one, two, or three pairs):

```bash
node -e "
  const fs = require('fs');
  const path = require('os').homedir() + '/.claude/pza-settings.json';
  let s = {};
  try { s = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
  // Set each key-value pair parsed from arguments:
  s['KEY1'] = VALUE1;
  // If a second pair was provided, add: s['KEY2'] = VALUE2;
  // If a third pair was provided, add: s['KEY3'] = VALUE3;
  fs.writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
  console.log(JSON.stringify(s));
"
```

Replace `KEY1`/`VALUE1` (and optionally `KEY2`/`VALUE2`, `KEY3`/`VALUE3`) with the setting names and `true` (for `on`) or `false` (for `off`). For a single pair like `codex off`, only one assignment is needed.

After updating, display the new settings and stop.

**If no arguments**, proceed to Step 2.

### Step 2 — Display Status

Show a status table:

| Integration | Enabled | Installed | Notes |
|-------------|---------|-----------|-------|
| Codex       | yes/no  | yes/no    |       |
| Ollama      | yes/no  | yes/no    |       |
| Adversarial | yes/no  | —         | Requires Ollama and/or Codex |

Read "Enabled" from the current settings shown in session context above. Read "Installed" from the availability checks above. Adversarial has no independent install — it uses Ollama and Codex.

If an integration is enabled but not installed, note it:
> Codex is enabled but not installed. Install it with `npm install -g @openai/codex` and run `codex login`.
> Ollama is enabled but not installed. Install it from https://ollama.com.

If adversarial is enabled but neither Ollama nor Codex is available, note it:
> Adversarial is enabled but has no effect — neither Ollama nor Codex is installed.

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
  - label: "Toggle Adversarial"
    description: "Currently [on/off] — will switch to [off/on]. Controls security-focused adversarial review in /arewedone"
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
  s['adversarial'] = ADVERSARIAL_VALUE;
  fs.writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
  console.log('Settings updated:');
  console.log(JSON.stringify(s, null, 2));
"
```

Replace `CODEX_VALUE`, `OLLAMA_VALUE`, and `ADVERSARIAL_VALUE` with the new boolean values based on the user's selections. Only include assignments for settings the user chose to toggle; keep the others at their current values.

Show the updated settings and confirm:

> Settings saved to `~/.claude/pza-settings.json`. Changes take effect on next skill invocation.
