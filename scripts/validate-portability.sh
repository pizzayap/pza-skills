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
  const advById = Object.fromEntries(data.adversarialReviewers.map((reviewer) => [reviewer.id, reviewer]));
  if (!advById['ollama-default']?.legacy || !advById['ollama-default']?.effectiveEnabled) process.exit(1);
  if (!advById['codex-default']?.legacy || !advById['codex-default']?.effectiveEnabled) process.exit(1);
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
  const advById = Object.fromEntries(data.adversarialReviewers.map((reviewer) => [reviewer.id, reviewer]));
  if (advById['ollama-default'].effectiveEnabled !== false) process.exit(1);
  if (advById['codex-default'].enabled !== false) process.exit(1);
"
rm -rf "$tmp_home" /tmp/pza-runtime-merged.json

echo "== Reviewer settings runtime =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-reviewer-settings.XXXXXX")
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer native model codex:gpt-5.5 >/tmp/pza-reviewer-native.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer opencode enabled on >/tmp/pza-reviewer-opencode-on.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer opencode model openai/gpt-5.3-codex >/tmp/pza-reviewer-opencode-model.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer ollama model glm-5.1:cloud >/tmp/pza-reviewer-ollama-model.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer opencode enabled off >/tmp/pza-reviewer-opencode-off.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-settings opencode on adversarial off >/tmp/pza-reviewer-legacy-settings.json
HOME="$tmp_home" node ./lib/pza-runtime.js get-model | grep -qx 'glm-5.1:cloud'
HOME="$tmp_home" node ./lib/pza-runtime.js get-reviewer-enabled opencode | grep -qx 'yes'
HOME="$tmp_home" node ./lib/pza-runtime.js get-reviewer-model opencode | grep -qx 'openai/gpt-5.3-codex'
HOME="$tmp_home" node ./lib/pza-runtime.js reviewer-settings >/tmp/pza-reviewer-settings.json
node -e "
  const fs = require('fs');
  const status = JSON.parse(fs.readFileSync('/tmp/pza-reviewer-settings.json', 'utf8'));
  const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const byName = Object.fromEntries(status.reviewers.map((reviewer) => [reviewer.name, reviewer]));
  if (byName.native.model !== 'codex:gpt-5.5') process.exit(1);
  if (byName.opencode.enabled !== true) process.exit(1);
  if (byName.opencode.model !== 'openai/gpt-5.3-codex') process.exit(1);
  if (byName.ollama.model !== 'glm-5.1:cloud') process.exit(1);
  if (data.adversarial !== false) process.exit(1);
" "$tmp_home/.pza-skills/settings.json"
rm -rf "$tmp_home"
rm -f /tmp/pza-reviewer-native.json /tmp/pza-reviewer-opencode-on.json /tmp/pza-reviewer-opencode-model.json /tmp/pza-reviewer-ollama-model.json /tmp/pza-reviewer-opencode-off.json /tmp/pza-reviewer-legacy-settings.json /tmp/pza-reviewer-settings.json

echo "== Adversarial reviewer runtime =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-adversarial-settings.XXXXXX")
HOME="$tmp_home" node ./lib/pza-runtime.js adversarial-reviewer-settings >/tmp/pza-adversarial-default.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-adversarial-default.json', 'utf8'));
  if (data.explicit !== false) process.exit(1);
  const byId = Object.fromEntries(data.reviewers.map((reviewer) => [reviewer.id, reviewer]));
  if (!byId['ollama-default']?.legacy || !byId['codex-default']?.legacy) process.exit(1);
"
HOME="$tmp_home" node ./lib/pza-runtime.js add-adversarial-reviewer cursor anthropic/claude-sonnet-4.5 >/tmp/pza-adversarial-add-one.json
HOME="$tmp_home" node ./lib/pza-runtime.js add-adversarial-reviewer cursor anthropic/claude-sonnet-4.5 >/tmp/pza-adversarial-add-two.json
HOME="$tmp_home" node ./lib/pza-runtime.js add-adversarial-reviewer codex gpt-5.5 codex-gpt55 >/tmp/pza-adversarial-add-codex.json
if HOME="$tmp_home" node ./lib/pza-runtime.js add-adversarial-reviewer ollama kimi-k2.6:cloud codex-gpt55 >/tmp/pza-adversarial-dup.out 2>/tmp/pza-adversarial-dup.err; then
  echo "duplicate adversarial lane id was accepted" >&2
  exit 1
fi
grep -q 'already exists' /tmp/pza-adversarial-dup.err
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer cursor enabled off >/tmp/pza-adversarial-cursor-off.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-adversarial-reviewer cursor-anthropic-claude-sonnet-4-5-2 enabled off >/tmp/pza-adversarial-disable-second.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-settings adversarial off >/tmp/pza-adversarial-master-off.json
HOME="$tmp_home" node ./lib/pza-runtime.js adversarial-reviewer-settings >/tmp/pza-adversarial-explicit.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-adversarial-explicit.json', 'utf8'));
  if (data.explicit !== true || data.adversarial !== false) process.exit(1);
  const byId = Object.fromEntries(data.reviewers.map((reviewer) => [reviewer.id, reviewer]));
  if (!byId['cursor-anthropic-claude-sonnet-4-5']) process.exit(1);
  if (!byId['cursor-anthropic-claude-sonnet-4-5-2']) process.exit(1);
  if (byId['cursor-anthropic-claude-sonnet-4-5'].enabled !== true) process.exit(1);
  if (byId['cursor-anthropic-claude-sonnet-4-5'].effectiveEnabled !== false) process.exit(1);
  if (byId['cursor-anthropic-claude-sonnet-4-5-2'].enabled !== false) process.exit(1);
  if (byId['codex-gpt55'].model !== 'gpt-5.5') process.exit(1);
"
HOME="$tmp_home" node ./lib/pza-runtime.js adversarial-reviewer-settings --force >/tmp/pza-adversarial-force.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-adversarial-force.json', 'utf8'));
  const byId = Object.fromEntries(data.reviewers.map((reviewer) => [reviewer.id, reviewer]));
  if (byId['cursor-anthropic-claude-sonnet-4-5'].effectiveEnabled !== true) process.exit(1);
  if (byId['cursor-anthropic-claude-sonnet-4-5-2'].effectiveEnabled !== false) process.exit(1);
"
HOME="$tmp_home" node ./lib/pza-runtime.js remove-adversarial-reviewer codex-gpt55 >/tmp/pza-adversarial-remove.json
mkdir -p "$tmp_home/.pza-skills"
printf '%s\n' '{"adversarialReviewers":[]}' > "$tmp_home/.pza-skills/settings.json"
HOME="$tmp_home" node ./lib/pza-runtime.js adversarial-reviewer-settings >/tmp/pza-adversarial-empty.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-adversarial-empty.json', 'utf8'));
  if (data.explicit !== true || data.reviewers.length !== 0) process.exit(1);
"
rm -rf "$tmp_home"
rm -f /tmp/pza-adversarial-default.json /tmp/pza-adversarial-add-one.json /tmp/pza-adversarial-add-two.json /tmp/pza-adversarial-add-codex.json /tmp/pza-adversarial-dup.out /tmp/pza-adversarial-dup.err /tmp/pza-adversarial-cursor-off.json /tmp/pza-adversarial-disable-second.json /tmp/pza-adversarial-master-off.json /tmp/pza-adversarial-explicit.json /tmp/pza-adversarial-force.json /tmp/pza-adversarial-remove.json /tmp/pza-adversarial-empty.json

echo "== Settings UI runtime =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-settings-ui.XXXXXX")
HOME="$tmp_home" node ./lib/pza-runtime.js settings-ui --help | grep -q 'localhost-only visual settings companion'
HOME="$tmp_home" node ./lib/pza-runtime.js settings-ui --token fixed-token --print-html >/tmp/pza-settings-ui.html
grep -q 'PZA Settings' /tmp/pza-settings-ui.html
grep -q 'Adversarial lanes' /tmp/pza-settings-ui.html
grep -q '/api/save' /tmp/pza-settings-ui.html
grep -q 'Save and Stop Server' /tmp/pza-settings-ui.html
grep -q 'fixed-token' /tmp/pza-settings-ui.html
HOME="$tmp_home" node -e "
  const fs = require('fs');
  const vm = require('vm');
  let source = fs.readFileSync('lib/pza-runtime.js', 'utf8').replace(/^#!.*\\n/, '');
  const mainIndex = source.indexOf('\\nconst cmd = process.argv[2];');
  if (mainIndex < 0) process.exit(1);
  source = source.slice(0, mainIndex) + \`
    let duplicateRejected = false;
    try {
      saveReviewerUiState({
        adversarialReviewers: [
          { id: 'duplicate', provider: 'cursor', model: 'one', enabled: true },
          { id: 'duplicate', provider: 'codex', model: 'two', enabled: true },
        ],
      });
    } catch (error) {
      duplicateRejected = /Duplicate adversarial lane id: duplicate/.test(error.message);
    }
    if (!duplicateRejected) throw new Error('duplicate lane id was not rejected');

    let invalidRejected = false;
    try {
      saveReviewerUiState({
        adversarialReviewers: [
          { id: '!!!', provider: 'cursor', model: 'one', enabled: true },
        ],
      });
    } catch (error) {
      invalidRejected = /at least one letter or number/.test(error.message);
    }
    if (!invalidRejected) throw new Error('invalid explicit lane id was not rejected');

    const saved = saveReviewerUiState({
      adversarialReviewers: [
        { provider: 'cursor', model: 'same', enabled: true },
        { provider: 'cursor', model: 'same', enabled: true },
      ],
    });
    const ids = saved.adversarialReviewers.map((lane) => lane.id);
    if (ids[0] !== 'cursor-same' || ids[1] !== 'cursor-same-2') {
      throw new Error('generated lane id suffixing failed: ' + ids.join(','));
    }
  \`;
  vm.runInNewContext(source, { require, console, process, Buffer, URL, setTimeout, clearTimeout });
"
if HOME="$tmp_home" node ./lib/pza-runtime.js settings-ui --host 0.0.0.0 --print-html >/tmp/pza-settings-ui-invalid.out 2>/tmp/pza-settings-ui-invalid.err; then
  echo "settings-ui accepted a non-localhost bind address" >&2
  exit 1
fi
grep -q 'only binds to localhost' /tmp/pza-settings-ui-invalid.err
rm -rf "$tmp_home"
rm -f /tmp/pza-settings-ui.html /tmp/pza-settings-ui-invalid.out /tmp/pza-settings-ui-invalid.err /tmp/pza-settings-ui-server.out /tmp/pza-settings-ui-server.err

echo "== Diff hash untracked content =="
tmp_untracked="pza-diff-hash-untracked-$$.txt"
printf '%s\n' 'one' > "$tmp_untracked"
hash_one=$(node ./lib/pza-runtime.js diff-hash)
printf '%s\n' 'two' > "$tmp_untracked"
hash_two=$(node ./lib/pza-runtime.js diff-hash)
rm -f "$tmp_untracked"
test "$hash_one" != "$hash_two"

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
  .opencode/commands/work-issue.md \
  .pi/prompts/arewedone.md \
  .pi/prompts/areyousure.md \
  .pi/prompts/pza-settings.md \
  .pi/prompts/hook-worthy.md \
  .pi/prompts/work-issue.md \
  docs/harnesses.md \
  docs/portability.md
do
  test -f "$file"
done

echo "== User-invocable discovery parity =="
for skill_file in skills/*/SKILL.md; do
  name=$(awk -F': ' '/^name:/{print $2; exit}' "$skill_file")
  invocable=$(awk -F': ' '/^user-invocable:/{print $2; exit}' "$skill_file")
  if [ "$invocable" = "true" ]; then
    grep -q -- "--skill $name" README.md
    grep -q -- "/$name" README.md
    grep -q "\"./skills/$name\"" .claude-plugin/plugin.json
    test -f ".opencode/commands/$name.md"
    test -f ".pi/prompts/$name.md"
  fi
done

echo "== Portability scan =="
if rg -n "ollama launch claude|AskUserQuestion|Bash\\(" skills agents hooks lib .opencode .pi .claude-plugin; then
  echo "Unexpected non-portable invocation text found" >&2
  exit 1
fi

echo "Remaining Claude compatibility references:"
rg -n "CLAUDE_SESSION_ID|/tmp/claude-session|~/.claude" skills agents README.md AGENTS.md CLAUDE.md docs hooks lib .opencode .pi .claude-plugin || true

echo "validate-portability: PASS"
