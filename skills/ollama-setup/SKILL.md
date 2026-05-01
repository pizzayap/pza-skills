---
name: ollama-setup
description: >-
  Configure the Ollama model used by /ollama-review, /areyousure, and /arewedone.
  Fetches the latest cloud models from ollama.com, lets the user pick one, tests it,
  and saves the choice.
user-invocable: true
argument-hint: '[model-name]'
---

# Ollama Setup

Ollama available:
!`which ollama >/dev/null 2>&1 && echo "yes" || echo "no"`

Current model:
!`cat ~/.claude/pza-ollama-model 2>/dev/null || echo "(not configured — default: kimi-k2.6:cloud)"`

Arguments:
`$ARGUMENTS`

## Step 1 — Pre-check

If the Ollama availability check above shows "no", tell the user:

> "Ollama is not installed. Install it from https://ollama.com, then run `/ollama-setup` again."

**Stop here.**

## Step 2 — Determine Model

Check Arguments from above:

### If the user passed a model name (e.g. `/ollama-setup glm-5.1:cloud`)

Use the provided model name directly. Skip to Step 3.

### Otherwise (no arguments)

Fetch the latest cloud models dynamically:

```bash
curl -s "https://ollama.com/search?c=cloud" | grep -o 'href="/library/[^"]*' | sed 's|href="/library/||' | awk '{print $0":cloud"}'
```

Use **AskUserQuestion** to let the user pick. Show the top 4 models as options (the user can also type a custom model name via "Other"):

```yaml
question: "Which Ollama cloud model should be used for code review?"
options:
  - label: "<1st model>"
    description: "Top-ranked cloud model on ollama.com"
  - label: "<2nd model>"
    description: "Second-ranked cloud model"
  - label: "<3rd model>"
    description: "Third-ranked cloud model"
  - label: "<4th model>"
    description: "Fourth-ranked cloud model"
```

## Step 3 — Test Model

Run a quick validation to confirm the model works:

```bash
ollama launch claude --model <chosen-model> --yes -- -p "Reply with exactly: MODEL_TEST_OK"
```

- If the output contains `MODEL_TEST_OK` → success, proceed to Step 4.
- If the command fails or the output does not contain `MODEL_TEST_OK` → report the error and tell the user:

> "Model test failed. Make sure the model name is correct and Ollama is running. Try: `ollama serve` in another terminal."

**Stop here.**

## Step 4 — Save Config

Write the model name to the config file:

```bash
echo "<chosen-model>" > ~/.claude/pza-ollama-model
```

Tell the user:

> "Model set to `<chosen-model>`. All Ollama-powered skills (`/ollama-review`, `/areyousure`, `/arewedone`) will use this model."

## Step 5 — Show Current Config

Read back the saved model:

```bash
cat ~/.claude/pza-ollama-model
```

Confirm the configuration and remind the user they can change it anytime by running `/ollama-setup` again.
