---
name: pza-settings
description: >-
  Configure PZA-skills reviewer backends. Set the native reviewer model label,
  toggle Ollama, Codex, OpenCode, Kilo Code, Cursor Agent, Antigravity, and
  adversarial review lanes, choose exact models for CLI reviewers, and launch
  the local visual settings companion.
user-invocable: true
argument-hint: '[--ui|--status] [native|ollama|codex|opencode|kilo|cursor|antigravity model <model>] [ollama|codex|opencode|kilo|cursor|antigravity on|off] [adversarial on|off|add <provider> <model> [id]|set <id> enabled|model <value>|remove <id>]'
---

# PZA Settings

Setup surface for `/areyousure` and `/arewedone`. Read current settings only
when the skill is invoked. Do not use load-time markdown command injection.

Arguments: `$ARGUMENTS`

## Workflow

### 1. Collect Status

If a shell runner is available, gather current status with:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" skill-status pza-settings
```

This reports reviewer settings, adversarial lanes, and CLI availability without
exposing custom reviewer command arrays. If shell execution is unavailable,
explain that settings cannot be inspected from this harness and ask the user to
run the runtime command locally.

### 2. Choose Interface

If no arguments were provided, or the user passed `--ui`, launch the local visual
settings companion:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" settings-ui
```

Report the printed localhost URL. The companion binds only to localhost, uses a
random URL token, and writes the same local config files as the CLI flow.

If the UI cannot start, or the user passed `--status`, display a status table
from `skill-status pza-settings` instead.

### 3. Parse Direct Arguments

Supported direct forms:

- `<reviewer> on`
- `<reviewer> off`
- `<reviewer> model <model>`
- `adversarial on`
- `adversarial off`
- `adversarial add <provider> <model> [id]`
- `adversarial set <id> enabled <on|off>`
- `adversarial set <id> model <model>`
- `adversarial remove <id>`
- `--status`
- `--ui`

Valid reviewers:

- `native`
- `ollama`
- `codex`
- `opencode`
- `kilo`
- `cursor`
- `antigravity`

Apply changes through the shared runtime:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer REVIEWER enabled on
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer REVIEWER enabled off
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer REVIEWER model MODEL
node "$HOME/.pza-skills/lib/pza-runtime.js" set-settings adversarial on
node "$HOME/.pza-skills/lib/pza-runtime.js" set-settings adversarial off
node "$HOME/.pza-skills/lib/pza-runtime.js" add-adversarial-reviewer PROVIDER MODEL [ID]
node "$HOME/.pza-skills/lib/pza-runtime.js" set-adversarial-reviewer ID enabled on
node "$HOME/.pza-skills/lib/pza-runtime.js" set-adversarial-reviewer ID enabled off
node "$HOME/.pza-skills/lib/pza-runtime.js" set-adversarial-reviewer ID model MODEL
node "$HOME/.pza-skills/lib/pza-runtime.js" remove-adversarial-reviewer ID
```

Examples:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer native model codex:gpt-5.5
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer ollama model kimi-k2.6:cloud
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer opencode enabled on
node "$HOME/.pza-skills/lib/pza-runtime.js" set-reviewer cursor enabled off
node "$HOME/.pza-skills/lib/pza-runtime.js" add-adversarial-reviewer cursor anthropic/claude-sonnet-4.5 cursor-sonnet
```

After any update, display:

```bash
node "$HOME/.pza-skills/lib/pza-runtime.js" reviewer-settings
node "$HOME/.pza-skills/lib/pza-runtime.js" adversarial-reviewer-settings
```

### 4. Display Status

Show one reviewer table:

| Reviewer | Enabled | Installed | State | Model | Blocker/Notes |
|----------|---------|-----------|-------|-------|---------------|
| Native | yes/no | yes | ready/disabled | configured label | active harness model label |
| Ollama | yes/no | yes/no | ready/disabled/missing/blocked | configured model | `/areyousure` and `/arewedone` |
| Codex | yes/no | yes/no | ready/disabled/missing/blocked | configured model or default | Codex CLI reviewer |
| OpenCode | yes/no | yes/no | ready/disabled/missing/blocked | configured model or default | OpenCode CLI reviewer |
| Kilo Code | yes/no | yes/no | ready/disabled/missing/blocked | configured model or default | Kilo CLI reviewer |
| Cursor Agent | yes/no | yes/no | ready/disabled/missing/blocked | configured model or default | Cursor CLI reviewer |
| Antigravity | yes/no | yes/no | ready/disabled/missing/blocked | configured model or default | only when safe non-interactive mode exists |

Show one adversarial lane table:

| Lane ID | Provider | Enabled | Effective | Installed | State | Model | Blocker/Notes |
|---------|----------|---------|-----------|-----------|-------|-------|---------------|

If a reviewer is enabled with `state=missing` or `state=blocked`, report it as a
strict-review blocker. It must be disabled, fixed, or explicitly excluded before
`/areyousure` or `/arewedone` can declare strict verification complete.

### 5. Terminal Interactive Fallback

If the visual companion is not usable and the active harness exposes a
user-input tool, ask what to configure:

- Set native model label.
- Toggle reviewer CLIs.
- Set reviewer models.
- Toggle adversarial review.
- Configure adversarial lanes.
- No changes.

When asking for model names, use concrete examples:

- Native: `codex:gpt-5.5`, `claude:opus-4.5`, `opencode:anthropic/claude-sonnet-4.5`
- Ollama: `kimi-k2.6:cloud`, `glm-5.1:cloud`
- Codex: `gpt-5.3-codex`, `gpt-5.5`
- OpenCode/Kilo: `openai/gpt-5.3-codex`, `anthropic/claude-sonnet-4.5`
- Cursor: any model accepted by local `cursor-agent --model`

After updates, confirm that settings were saved to `~/.pza-skills/settings.json`
and that the Ollama compatibility model is kept at
`~/.pza-skills/ollama-model`.
