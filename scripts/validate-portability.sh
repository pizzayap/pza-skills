#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

echo "== Node syntax =="
node --check lib/pza-runtime.js
node --check hooks/scripts/track-session-files.js
node --check hooks/scripts/review-reminder.js

echo "== Runtime defaults =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-runtime-empty.XXXXXX")
HOME="$tmp_home" node ./lib/pza-runtime.js settings >/tmp/pza-runtime-defaults.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-runtime-defaults.json', 'utf8'));
  if (!data.settings.codex || !data.settings.ollama || !data.settings.adversarial) process.exit(1);
  if (data.model !== 'kimi-k2.6:cloud') process.exit(1);
  const byName = Object.fromEntries(data.reviewers.map((reviewer) => [reviewer.name, reviewer]));
  if (!byName.native?.enabled) process.exit(1);
  if (!byName.ollama?.enabled || byName.ollama.model !== 'kimi-k2.6:cloud') process.exit(1);
  if (!byName.codex?.enabled) process.exit(1);
  for (const name of ['opencode', 'kilo', 'cursor', 'antigravity']) {
    if (byName[name]?.enabled !== false) process.exit(1);
  }
"
rm -rf "$tmp_home" /tmp/pza-runtime-defaults.json

echo "== Runtime migration precedence =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-runtime-legacy.XXXXXX")
mkdir -p "$tmp_home/.claude" "$tmp_home/.pza-skills"
printf '%s\n' '{"ollama":false,"codex":false,"adversarial":false}' > "$tmp_home/.claude/pza-settings.json"
printf '%s\n' '{"ollama":true}' > "$tmp_home/.pza-skills/settings.json"
HOME="$tmp_home" node ./lib/pza-runtime.js settings >/tmp/pza-runtime-merged.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-runtime-merged.json', 'utf8'));
  if (data.settings.ollama !== true) process.exit(1);
  if (data.settings.codex !== false) process.exit(1);
  if (data.settings.adversarial !== false) process.exit(1);
  if (data.settings.reviewers.ollama.enabled !== true) process.exit(1);
  if (data.settings.reviewers.codex.enabled !== false) process.exit(1);
"
rm -rf "$tmp_home" /tmp/pza-runtime-merged.json

echo "== Reviewer settings runtime =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-reviewer-settings.XXXXXX")
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer native model codex:gpt-5.5 >/tmp/pza-reviewer-native.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer opencode enabled on >/tmp/pza-reviewer-opencode-on.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer opencode model openai/gpt-5.3-codex >/tmp/pza-reviewer-opencode-model.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer ollama model glm-5.1:cloud >/tmp/pza-reviewer-ollama-model.json
HOME="$tmp_home" node ./lib/pza-runtime.js get-model | grep -qx 'glm-5.1:cloud'
HOME="$tmp_home" node ./lib/pza-runtime.js get-reviewer-model opencode | grep -qx 'openai/gpt-5.3-codex'
HOME="$tmp_home" node ./lib/pza-runtime.js reviewer-settings >/tmp/pza-reviewer-settings.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-reviewer-settings.json', 'utf8'));
  const byName = Object.fromEntries(data.reviewers.map((reviewer) => [reviewer.name, reviewer]));
  if (byName.native.model !== 'codex:gpt-5.5') process.exit(1);
  if (byName.opencode.enabled !== true) process.exit(1);
  if (byName.opencode.model !== 'openai/gpt-5.3-codex') process.exit(1);
  if (byName.ollama.model !== 'glm-5.1:cloud') process.exit(1);
"
rm -rf "$tmp_home"
rm -f /tmp/pza-reviewer-native.json /tmp/pza-reviewer-opencode-on.json /tmp/pza-reviewer-opencode-model.json /tmp/pza-reviewer-ollama-model.json /tmp/pza-reviewer-settings.json

echo "== Plan reviewer runtime =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-plan-reviewers.XXXXXX")
mkdir -p "$tmp_home/.pza-skills"
cat > "$tmp_home/.pza-skills/plan-reviewers.json" <<'JSON'
{
  "reviewers": [
    {
      "name": "fake",
      "command": [
        "node",
        "-e",
        "process.stdin.resume();let input='';process.stdin.on('data',d=>input+=d);process.stdin.on('end',()=>{if(!input.includes('Plan content:')) process.exit(2); console.log('Critical findings\\n- none\\nVerified correct items\\n- fake reviewer ran');});"
      ],
      "enabled": true
    },
    {
      "name": "invalid-empty-command",
      "command": [],
      "enabled": true
    }
  ]
}
JSON
plan_file="/tmp/pza-plan-validate-$$.md"
prompt_file="/tmp/pza-plan-prompt-$$.md"
review_out="/tmp/pza-plan-review-$$.out"
reviewers_json="/tmp/pza-plan-reviewers-$$.json"
printf '%s\n' '# Plan' '' '- Do the safe thing' > "$plan_file"
HOME="$tmp_home" node ./lib/pza-runtime.js plan-reviewers > "$reviewers_json"
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  if (data.reviewers.length !== 1 || data.reviewers[0].name !== 'fake') process.exit(1);
  if ('command' in data.reviewers[0]) process.exit(1);
  if (data.reviewers[0].commandConfigured !== true) process.exit(1);
" "$reviewers_json"
HOME="$tmp_home" node ./lib/pza-runtime.js plan-review-prompt "$plan_file" file-backed > "$prompt_file"
grep -q 'Plan source: file-backed' "$prompt_file"
printf '%s\n' '# Plan from stdin' | HOME="$tmp_home" node ./lib/pza-runtime.js plan-review-prompt - conversation-backed > "$prompt_file"
grep -q 'Plan source: conversation-backed' "$prompt_file"
HOME="$tmp_home" node ./lib/pza-runtime.js run-plan-reviewer fake < "$prompt_file" > "$review_out"
grep -q 'fake reviewer ran' "$review_out"
rm -rf "$tmp_home"
rm -f "$plan_file" "$prompt_file" "$review_out" "$reviewers_json"

echo "== Hook session tracking =="
session_id="pza-validate-$$"
printf '%s' "{\"session_id\":\"$session_id\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"/tmp/example.txt\"}}" \
  | node hooks/scripts/track-session-files.js >/tmp/pza-hook-output.json
node ./lib/pza-runtime.js session-files "$session_id" | grep -qx '/tmp/example.txt'
rm -f "/tmp/pza-skills-session-$session_id-files.json" "/tmp/pza-skills-session-$session_id-reviewed.json" /tmp/pza-hook-output.json

echo "== Adapter files =="
for file in \
  .opencode/commands/arewedone.md \
  .opencode/commands/areyousure.md \
  .opencode/commands/pza-settings.md \
  .opencode/commands/hook-worthy.md \
  .pi/prompts/arewedone.md \
  .pi/prompts/areyousure.md \
  .pi/prompts/pza-settings.md \
  .pi/prompts/hook-worthy.md \
  docs/harnesses.md \
  docs/portability.md
do
  test -f "$file"
done

echo "== Portability scan =="
if rg -n "ollama launch claude|AskUserQuestion|Bash\\(" skills agents hooks lib .opencode .pi .claude-plugin; then
  echo "Unexpected non-portable invocation text found" >&2
  exit 1
fi

echo "Remaining Claude compatibility references:"
rg -n "CLAUDE_SESSION_ID|/tmp/claude-session|~/.claude" skills agents README.md AGENTS.md CLAUDE.md docs hooks lib .opencode .pi .claude-plugin || true

echo "validate-portability: PASS"
