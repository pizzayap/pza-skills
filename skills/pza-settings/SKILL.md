---
name: pza-settings
description: >-
  Configure PZA-skills reviewer backends. Set the native reviewer model label,
  toggle Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, Antigravity, and
  adversarial review, and choose exact models for CLI reviewers.
user-invocable: true
argument-hint: '[native|ollama|codex|opencode|kilo|cursor|antigravity model <model>] [ollama|codex|opencode|kilo|cursor|antigravity on|off] [adversarial on|off]'
---

# PZA Settings

Current settings:
!`node ./lib/pza-runtime.js settings 2>/dev/null || echo '{"settings":{"codex":true,"ollama":true,"adversarial":true},"reviewers":[]}'`

Reviewer backends:
!`node ./lib/pza-runtime.js reviewer-settings 2>/dev/null || echo '{"reviewers":[]}'`

CLI availability:
!`for cmd in ollama codex opencode kilo cursor-agent agy; do if command -v "$cmd" >/dev/null 2>&1; then echo "$cmd: yes"; else echo "$cmd: no"; fi; done`

Antigravity CLI help probe:
!`if command -v agy >/dev/null 2>&1; then agy --help 2>&1 | head -40; else echo "agy: not installed"; fi`

Arguments:
`$ARGUMENTS`

## Workflow

`/pza-settings` is the setup surface for `/areyousure` and `/arewedone`. Treat
Ollama like every other reviewer backend here. Legacy Ollama-only skill files
remain for migration/reference, but new installs should use this setup flow.

### Step 1 - Parse Arguments

If arguments are provided, parse them in one of these forms:

- `<reviewer> on`
- `<reviewer> off`
- `<reviewer> model <model>`
- `adversarial on`
- `adversarial off`

Valid reviewers:

- `native` - the active harness/model label; set manually because most harnesses do not expose it
- `ollama` - Ollama CLI reviewer; model also writes legacy `~/.pza-skills/ollama-model`
- `codex` - Codex CLI reviewer
- `opencode` - OpenCode CLI reviewer
- `kilo` - Kilo Code CLI reviewer
- `cursor` - Cursor Agent CLI reviewer
- `antigravity` - Google Antigravity CLI reviewer

Apply each argument through the shared runtime:

```bash
node ./lib/pza-runtime.js set-reviewer REVIEWER enabled on
node ./lib/pza-runtime.js set-reviewer REVIEWER enabled off
node ./lib/pza-runtime.js set-reviewer REVIEWER model MODEL
node ./lib/pza-runtime.js set-settings adversarial on
node ./lib/pza-runtime.js set-settings adversarial off
```

Examples:

```bash
node ./lib/pza-runtime.js set-reviewer native model codex:gpt-5.5
node ./lib/pza-runtime.js set-reviewer ollama model kimi-k2.6:cloud
node ./lib/pza-runtime.js set-reviewer opencode enabled on
node ./lib/pza-runtime.js set-reviewer opencode model openai/gpt-5.3-codex
node ./lib/pza-runtime.js set-reviewer cursor enabled off
```

After updating, display `node ./lib/pza-runtime.js reviewer-settings` and stop.

### Step 2 - Display Setup Status

If no arguments were provided, show a status table from the session context:

| Reviewer | Enabled | Installed | Model | Notes |
|----------|---------|-----------|-------|-------|
| Native | yes/no | yes | configured label or default | The current harness model cannot usually be detected automatically |
| Ollama | yes/no | yes/no | configured model | Used by `/areyousure` and `/arewedone` |
| Codex | yes/no | yes/no | configured model or CLI default | `codex exec --model` and `codex review -c model=...` where supported |
| OpenCode | yes/no | yes/no | configured model or CLI default | `opencode run --model provider/model` |
| Kilo Code | yes/no | yes/no | configured model or CLI default | `kilo run --model provider/model` |
| Cursor Agent | yes/no | yes/no | configured model or CLI default | `cursor-agent -p --output-format text --model <model>` |
| Antigravity | yes/no | yes/no | configured model or CLI default | Use only if `agy --help` shows a safe non-interactive prompt/stdin mode |
| Adversarial | yes/no | - | - | Security-focused review mode for supported backends |

If a reviewer is enabled but not installed, report it clearly and keep going.
Missing CLIs should never make setup fail.

### Step 3 - Interactive Setup

If the active harness exposes a user-input tool, ask the user what to configure:

```yaml
question: "What should PZA-skills configure?"
multiSelect: true
options:
  - label: "Set native model label"
    description: "Record the model/harness used by the primary assistant"
  - label: "Toggle reviewer CLIs"
    description: "Turn Ollama, Codex, OpenCode, Kilo, Cursor, or Antigravity on/off"
  - label: "Set reviewer models"
    description: "Choose exact models for enabled CLI reviewers"
  - label: "Toggle adversarial review"
    description: "Enable or disable security-focused adversarial review"
  - label: "No changes"
    description: "Keep current settings"
```

When asking for model names, use concrete examples:

- Native: `codex:gpt-5.5`, `claude:opus-4.5`, `opencode:anthropic/claude-sonnet-4.5`
- Ollama: `kimi-k2.6:cloud`, `glm-5.1:cloud`
- Codex: `gpt-5.3-codex`, `gpt-5.5`
- OpenCode/Kilo: `openai/gpt-5.3-codex`, `anthropic/claude-sonnet-4.5`
- Cursor: any model accepted by local `cursor-agent --model`
- Antigravity: only set a model if local `agy --help` documents model selection

### Step 4 - Apply Changes

Apply selected changes with `node ./lib/pza-runtime.js set-reviewer` and
`node ./lib/pza-runtime.js set-settings adversarial ...`.

After updates, show the reviewer table and confirm:

> Settings saved to `~/.pza-skills/settings.json`. Ollama model compatibility is also kept at `~/.pza-skills/ollama-model`. Changes take effect on the next `/areyousure` or `/arewedone` run.
