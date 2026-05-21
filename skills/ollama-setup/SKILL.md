---
name: ollama-setup
description: >-
  Backward-compatible alias for configuring the Ollama reviewer model. New
  installs should use /pza-settings so Ollama is configured alongside the other
  reviewer backends.
user-invocable: false
argument-hint: '[model-name]'
---

# Ollama Setup Compatibility

Current reviewer backends:
!`node ./lib/pza-runtime.js reviewer-settings 2>/dev/null || echo '{"reviewers":[]}'`

Arguments:
`$ARGUMENTS`

## Workflow

Prefer `/pza-settings` for all new setup. This compatibility skill only updates
the Ollama reviewer model.

If a model argument was provided, run:

```bash
node ./lib/pza-runtime.js set-reviewer ollama model <model-name>
```

If no model was provided, tell the user:

> Ollama setup now lives in `/pza-settings`. Use `/pza-settings ollama model kimi-k2.6:cloud` or run `/pza-settings` for interactive setup.

Do not fetch model lists here. `/pza-settings` is the canonical place to set the
native model label, toggle reviewer CLIs, and choose exact reviewer models.
