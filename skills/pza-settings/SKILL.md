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
!`node ./lib/pza-runtime.js settings 2>/dev/null || echo '{"settings":{"codex":true,"ollama":true,"adversarial":true}}'`

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

Apply all pairs through the shared runtime (handles one, two, or three pairs):

```bash
node ./lib/pza-runtime.js set-settings KEY1 on KEY2 off
```

Replace `KEY1 on KEY2 off` with the setting pairs from the arguments. For a single pair like `codex off`, run `node ./lib/pza-runtime.js set-settings codex off`.

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

Use the active harness's user-input tool to let the user toggle:

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
node ./lib/pza-runtime.js set-settings codex CODEX_ON_OFF ollama OLLAMA_ON_OFF adversarial ADVERSARIAL_ON_OFF
```

Replace `CODEX_ON_OFF`, `OLLAMA_ON_OFF`, and `ADVERSARIAL_ON_OFF` with `on` or `off` based on the user's selections. Only include settings the user chose to toggle; keep the others at their current values.

Show the updated settings and confirm:

> Settings saved to `~/.pza-skills/settings.json`. Changes take effect on next skill invocation. Legacy `~/.claude` and `~/.Codex` settings are read as migration fallbacks only.
