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
  if (data.settings.secondOpinionMode !== 'ask' || data.secondOpinion.mode !== 'ask' || data.secondOpinion.approvalRequired !== true || data.secondOpinion.strict !== false) process.exit(1);
  if (data.settings.checks.snyk.enabled !== false || data.settings.checks.snyk.severityThreshold !== 'high') process.exit(1);
  if (data.checks.snyk.enabled !== false || data.checks.snyk.state !== 'disabled') process.exit(1);
  if (data.model !== '') process.exit(1);
  const byName = Object.fromEntries(data.reviewers.map((reviewer) => [reviewer.name, reviewer]));
  if (!byName.native?.enabled) process.exit(1);
  if (byName.native.state !== 'ready' || byName.native.requiredWhenEnabled !== false || byName.native.forwardsPrivateContext !== false) process.exit(1);
  if (byName.native.adversarialSupported !== true || byName.native.adversarialEnabled !== false || byName.native.adversarialState !== 'disabled') process.exit(1);
  if (!byName.ollama?.enabled || byName.ollama.model !== '') process.exit(1);
  if (!['ready', 'missing', 'blocked'].includes(byName.ollama.state) || byName.ollama.requiredWhenEnabled !== true) process.exit(1);
  if (!byName.codex?.enabled) process.exit(1);
  if (byName.codex.model !== '') process.exit(1);
  if (byName.codex.modelPlaceholder !== 'default') process.exit(1);
  if (byName.codex.adversarialEnabled !== true || byName.codex.adversarialModel !== '') process.exit(1);
  if (!['ready', 'missing'].includes(byName.codex.state) || byName.codex.forwardsPrivateContext !== true) process.exit(1);
  for (const name of ['opencode', 'kilo', 'cursor', 'antigravity']) {
    if (byName[name]?.enabled !== false) process.exit(1);
    if (byName[name]?.state !== 'disabled') process.exit(1);
    if (byName[name]?.modelPlaceholder !== 'default') process.exit(1);
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
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer native model native-test-model >/tmp/pza-reviewer-native.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer opencode enabled on >/tmp/pza-reviewer-opencode-on.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer opencode model opencode-test-model >/tmp/pza-reviewer-opencode-model.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer ollama model glm-5.1:cloud >/tmp/pza-reviewer-ollama-model.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer opencode enabled off >/tmp/pza-reviewer-opencode-off.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-settings opencode on adversarial off >/tmp/pza-reviewer-legacy-settings.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-check snyk enabled on >/tmp/pza-check-snyk-on.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-check snyk severity-threshold critical >/tmp/pza-check-snyk-severity.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-second-opinion-mode strict >/tmp/pza-second-opinion-strict.json
HOME="$tmp_home" node ./lib/pza-runtime.js get-model | grep -qx 'glm-5.1:cloud'
HOME="$tmp_home" node ./lib/pza-runtime.js get-reviewer-enabled opencode | grep -qx 'yes'
HOME="$tmp_home" node ./lib/pza-runtime.js get-reviewer-model opencode | grep -qx 'opencode-test-model'
HOME="$tmp_home" node ./lib/pza-runtime.js reviewer-settings >/tmp/pza-reviewer-settings.json
HOME="$tmp_home" node ./lib/pza-runtime.js check-settings >/tmp/pza-check-settings.json
node -e "
  const fs = require('fs');
  const status = JSON.parse(fs.readFileSync('/tmp/pza-reviewer-settings.json', 'utf8'));
  const secondOpinion = JSON.parse(fs.readFileSync('/tmp/pza-second-opinion-strict.json', 'utf8')).secondOpinion;
  const checks = JSON.parse(fs.readFileSync('/tmp/pza-check-settings.json', 'utf8')).checks;
  const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const byName = Object.fromEntries(status.reviewers.map((reviewer) => [reviewer.name, reviewer]));
  if (byName.native.model !== 'native-test-model') process.exit(1);
  if (byName.opencode.enabled !== true) process.exit(1);
  if (!['ready', 'missing'].includes(byName.opencode.state) || byName.opencode.requiredWhenEnabled !== true) process.exit(1);
  if (byName.opencode.model !== 'opencode-test-model') process.exit(1);
  if (byName.ollama.model !== 'glm-5.1:cloud') process.exit(1);
  if (data.adversarial !== false) process.exit(1);
  if (secondOpinion.mode !== 'strict' || secondOpinion.strict !== true || secondOpinion.approvalRequired !== false) process.exit(1);
  if (data.secondOpinionMode !== 'strict') process.exit(1);
  if (checks.snyk.enabled !== true || checks.snyk.severityThreshold !== 'critical') process.exit(1);
  if (!['ready', 'missing'].includes(checks.snyk.state)) process.exit(1);
" "$tmp_home/.pza-skills/settings.json"
rm -rf "$tmp_home"
rm -f /tmp/pza-reviewer-native.json /tmp/pza-reviewer-opencode-on.json /tmp/pza-reviewer-opencode-model.json /tmp/pza-reviewer-ollama-model.json /tmp/pza-reviewer-opencode-off.json /tmp/pza-reviewer-legacy-settings.json /tmp/pza-reviewer-settings.json /tmp/pza-check-snyk-on.json /tmp/pza-check-snyk-severity.json /tmp/pza-second-opinion-strict.json /tmp/pza-check-settings.json

echo "== Skill status scope =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-skill-status.XXXXXX")
HOME="$tmp_home" node ./lib/pza-runtime.js skill-status areyousure >/tmp/pza-skill-status-areyousure.json
HOME="$tmp_home" node ./lib/pza-runtime.js skill-status arewedone >/tmp/pza-skill-status-arewedone.json
HOME="$tmp_home" node ./lib/pza-runtime.js skill-status pza-settings >/tmp/pza-skill-status-settings.json
node -e "
  const fs = require('fs');
  const areyousure = JSON.parse(fs.readFileSync('/tmp/pza-skill-status-areyousure.json', 'utf8'));
  const arewedone = JSON.parse(fs.readFileSync('/tmp/pza-skill-status-arewedone.json', 'utf8'));
  const settings = JSON.parse(fs.readFileSync('/tmp/pza-skill-status-settings.json', 'utf8'));
  if ('reviewers' in areyousure || 'adversarialReviewers' in areyousure || 'planReviewers' in areyousure || 'checks' in areyousure || 'secondOpinion' in areyousure) process.exit(1);
  if (!Array.isArray(arewedone.reviewers) || !Array.isArray(arewedone.adversarialReviewers) || !arewedone.checks?.snyk || arewedone.secondOpinion?.mode !== 'ask') process.exit(1);
  if (!Array.isArray(settings.reviewers) || !Array.isArray(settings.adversarialReviewers) || !Array.isArray(settings.planReviewers) || !settings.checks?.snyk || settings.secondOpinion?.mode !== 'ask') process.exit(1);
"
rm -rf "$tmp_home"
rm -f /tmp/pza-skill-status-areyousure.json /tmp/pza-skill-status-arewedone.json /tmp/pza-skill-status-settings.json

echo "== Reviewer preflight states =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-reviewer-preflight.XXXXXX")
tmp_bin=$(mktemp -d "${TMPDIR:-/tmp}/pza-reviewer-bin.XXXXXX")
node_bin=$(command -v node)
mkdir -p "$tmp_home/.pza-skills"
cat > "$tmp_home/.pza-skills/settings.json" <<'JSON'
{"reviewers":{"antigravity":{"enabled":true,"model":""}}}
JSON
cat > "$tmp_bin/agy" <<'SH'
#!/bin/sh
echo "Usage: agy --print --sandbox"
SH
chmod 755 "$tmp_bin/agy"
PATH="$tmp_bin:/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js reviewer-settings >/tmp/pza-reviewer-agy-ready.json
node -e "
  const fs = require('fs');
  const byName = Object.fromEntries(JSON.parse(fs.readFileSync('/tmp/pza-reviewer-agy-ready.json', 'utf8')).reviewers.map((reviewer) => [reviewer.name, reviewer]));
  if (byName.antigravity.state !== 'ready') process.exit(1);
  if (byName.antigravity.blocker) process.exit(1);
"
cat > "$tmp_bin/agy" <<'SH'
#!/bin/sh
echo "Usage: agy --print"
SH
chmod 755 "$tmp_bin/agy"
PATH="$tmp_bin:/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js reviewer-settings >/tmp/pza-reviewer-agy-blocked.json
node -e "
  const fs = require('fs');
  const byName = Object.fromEntries(JSON.parse(fs.readFileSync('/tmp/pza-reviewer-agy-blocked.json', 'utf8')).reviewers.map((reviewer) => [reviewer.name, reviewer]));
  if (byName.antigravity.state !== 'blocked') process.exit(1);
  if (!/safe non-interactive/.test(byName.antigravity.blocker)) process.exit(1);
"
set +e
printf '%s\n' 'review prompt' | PATH="/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js run-reviewer plan codex "" >/tmp/pza-reviewer-codex-missing.out 2>/tmp/pza-reviewer-codex-missing.err
run_status=$?
set -e
test "$run_status" -eq 127
grep -q 'PZA reviewer result: blocked' /tmp/pza-reviewer-codex-missing.err
rm -rf "$tmp_home" "$tmp_bin"
rm -f /tmp/pza-reviewer-agy-ready.json /tmp/pza-reviewer-agy-blocked.json /tmp/pza-reviewer-codex-missing.out /tmp/pza-reviewer-codex-missing.err

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
HOME="$tmp_home" node ./lib/pza-runtime.js add-adversarial-reviewer cursor cursor-test-model >/tmp/pza-adversarial-add-one.json
HOME="$tmp_home" node ./lib/pza-runtime.js add-adversarial-reviewer cursor cursor-test-model >/tmp/pza-adversarial-add-two.json
HOME="$tmp_home" node ./lib/pza-runtime.js add-adversarial-reviewer native native-test-model native-adversarial >/tmp/pza-adversarial-add-native.json
HOME="$tmp_home" node ./lib/pza-runtime.js add-adversarial-reviewer codex codex-test-model codex-review >/tmp/pza-adversarial-add-codex.json
if HOME="$tmp_home" node ./lib/pza-runtime.js add-adversarial-reviewer ollama ollama-test-model codex-review >/tmp/pza-adversarial-dup.out 2>/tmp/pza-adversarial-dup.err; then
  echo "duplicate adversarial lane id was accepted" >&2
  exit 1
fi
grep -q 'already exists' /tmp/pza-adversarial-dup.err
HOME="$tmp_home" node ./lib/pza-runtime.js set-reviewer cursor enabled off >/tmp/pza-adversarial-cursor-off.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-adversarial-reviewer cursor-cursor-test-model-2 enabled off >/tmp/pza-adversarial-disable-second.json
HOME="$tmp_home" node ./lib/pza-runtime.js set-settings adversarial off >/tmp/pza-adversarial-master-off.json
HOME="$tmp_home" node ./lib/pza-runtime.js adversarial-reviewer-settings >/tmp/pza-adversarial-explicit.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-adversarial-explicit.json', 'utf8'));
  if (data.explicit !== true || data.adversarial !== false) process.exit(1);
  const byId = Object.fromEntries(data.reviewers.map((reviewer) => [reviewer.id, reviewer]));
  if (!byId['cursor-cursor-test-model']) process.exit(1);
  if (!byId['cursor-cursor-test-model-2']) process.exit(1);
  if (byId['cursor-cursor-test-model'].enabled !== true) process.exit(1);
  if (byId['cursor-cursor-test-model'].effectiveEnabled !== false) process.exit(1);
  if (byId['cursor-cursor-test-model-2'].enabled !== false) process.exit(1);
  if (byId['native-adversarial'].provider !== 'native' || byId['native-adversarial'].state !== 'disabled' || byId['native-adversarial'].installed !== true) process.exit(1);
  if (byId['codex-review'].model !== 'codex-test-model') process.exit(1);
"
HOME="$tmp_home" node ./lib/pza-runtime.js adversarial-reviewer-settings --force >/tmp/pza-adversarial-force.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-adversarial-force.json', 'utf8'));
  const byId = Object.fromEntries(data.reviewers.map((reviewer) => [reviewer.id, reviewer]));
  if (byId['native-adversarial'].effectiveEnabled !== true || byId['native-adversarial'].state !== 'ready') process.exit(1);
  if (byId['cursor-cursor-test-model'].effectiveEnabled !== true) process.exit(1);
  if (byId['cursor-cursor-test-model-2'].effectiveEnabled !== false) process.exit(1);
"
HOME="$tmp_home" node ./lib/pza-runtime.js remove-adversarial-reviewer codex-review >/tmp/pza-adversarial-remove.json
mkdir -p "$tmp_home/.pza-skills"
printf '%s\n' '{"adversarialReviewers":[]}' > "$tmp_home/.pza-skills/settings.json"
HOME="$tmp_home" node ./lib/pza-runtime.js adversarial-reviewer-settings >/tmp/pza-adversarial-empty.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/tmp/pza-adversarial-empty.json', 'utf8'));
  if (data.explicit !== true || data.reviewers.length !== 0) process.exit(1);
"
rm -rf "$tmp_home"
rm -f /tmp/pza-adversarial-default.json /tmp/pza-adversarial-add-one.json /tmp/pza-adversarial-add-two.json /tmp/pza-adversarial-add-native.json /tmp/pza-adversarial-add-codex.json /tmp/pza-adversarial-dup.out /tmp/pza-adversarial-dup.err /tmp/pza-adversarial-cursor-off.json /tmp/pza-adversarial-disable-second.json /tmp/pza-adversarial-master-off.json /tmp/pza-adversarial-explicit.json /tmp/pza-adversarial-force.json /tmp/pza-adversarial-remove.json /tmp/pza-adversarial-empty.json

echo "== Settings UI runtime =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-settings-ui.XXXXXX")
HOME="$tmp_home" node ./lib/pza-runtime.js settings-ui --help | grep -q 'localhost-only visual settings companion'
HOME="$tmp_home" node ./lib/pza-runtime.js settings-ui --token fixed-token --print-html >/tmp/pza-settings-ui.html
grep -q 'PZA Settings' /tmp/pza-settings-ui.html
grep -q 'Second-opinion mode' /tmp/pza-settings-ui.html
grep -q 'secondOpinionMode' /tmp/pza-settings-ui.html
grep -q 'adversarialEnabled' /tmp/pza-settings-ui.html
grep -q 'Proof checks' /tmp/pza-settings-ui.html
grep -q 'severityThreshold' /tmp/pza-settings-ui.html
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
      secondOpinionMode: 'native-only',
      adversarialReviewers: [
        { provider: 'cursor', model: 'same', enabled: true },
        { provider: 'cursor', model: 'same', enabled: true },
      ],
    });
    if (saved.secondOpinion.mode !== 'native-only' || saved.secondOpinion.externalReviewersEnabled !== false) {
      throw new Error('second-opinion mode did not persist');
    }
    const ids = saved.adversarialReviewers.map((lane) => lane.id);
    if (ids[0] !== 'cursor-same' || ids[1] !== 'cursor-same-2') {
      throw new Error('generated lane id suffixing failed: ' + ids.join(','));
    }

    const reviewerToggleSaved = saveReviewerUiState({
      reviewers: {
        native: { enabled: true, model: 'native-test-model', adversarialEnabled: true, adversarialLaneId: 'native-adversarial' },
        codex: { enabled: true, model: 'codex-test-model', adversarialEnabled: true, adversarialLaneId: 'codex-adversarial' },
        cursor: { enabled: false, model: 'cursor-test-model', adversarialEnabled: false, adversarialLaneId: 'cursor-adversarial' },
      },
      adversarialReviewers: [
        { id: 'native-adversarial', provider: 'native', model: 'native-test-model', enabled: true },
        { id: 'codex-adversarial', provider: 'codex', model: 'codex-test-model', enabled: true },
        { id: 'cursor-adversarial', provider: 'cursor', model: 'cursor-test-model', enabled: false },
      ],
    });
    const reviewerToggleById = Object.fromEntries(reviewerToggleSaved.adversarialReviewers.map((lane) => [lane.id, lane]));
    if (reviewerToggleById['native-adversarial']?.provider !== 'native' || reviewerToggleById['native-adversarial']?.enabled !== true) {
      throw new Error('reviewer adversarial native toggle did not persist');
    }
    if (reviewerToggleById['codex-adversarial']?.model !== 'codex-test-model' || reviewerToggleById['codex-adversarial']?.enabled !== true) {
      throw new Error('reviewer adversarial codex toggle did not persist');
    }
    if (reviewerToggleById['cursor-adversarial']?.enabled !== false) {
      throw new Error('reviewer adversarial disabled toggle did not persist');
    }

    const checkSaved = saveReviewerUiState({
      checks: { snyk: { enabled: true, severityThreshold: 'critical' } },
    });
    if (checkSaved.checks.snyk.enabled !== true || checkSaved.checks.snyk.severityThreshold !== 'critical') {
      throw new Error('snyk check settings did not persist');
    }

    const busyPort = formatSettingsUiError({ code: 'EADDRINUSE', message: 'listen EADDRINUSE' }, { host: '127.0.0.1', port: 4555 });
    if (!/port 4555/.test(busyPort) || !/--port 0/.test(busyPort)) {
      throw new Error('EADDRINUSE guidance was not actionable: ' + busyPort);
    }
    const denied = formatSettingsUiError({ code: 'EPERM', message: 'listen EPERM' }, { host: '127.0.0.1', port: 0 });
    if (!/localhost bind was denied/.test(denied) || !/pza-settings --status/.test(denied)) {
      throw new Error('EPERM guidance was not actionable: ' + denied);
    }
    const access = formatSettingsUiError({ code: 'EACCES', message: 'listen EACCES' }, { host: '127.0.0.1', port: 0 });
    if (!/localhost bind was denied/.test(access)) {
      throw new Error('EACCES guidance was not actionable: ' + access);
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

echo "== Snyk check runtime =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-snyk-check.XXXXXX")
tmp_bin=$(mktemp -d "${TMPDIR:-/tmp}/pza-snyk-bin.XXXXXX")
node_bin=$(command -v node)
PATH="/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js check-settings >/tmp/pza-snyk-default.json
node -e "
  const fs = require('fs');
  const snyk = JSON.parse(fs.readFileSync('/tmp/pza-snyk-default.json', 'utf8')).checks.snyk;
  if (snyk.enabled !== false || snyk.state !== 'disabled' || snyk.severityThreshold !== 'high') process.exit(1);
"
PATH="/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js set-check snyk enabled on >/tmp/pza-snyk-on.json
PATH="/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js check-settings >/tmp/pza-snyk-missing.json
node -e "
  const fs = require('fs');
  const snyk = JSON.parse(fs.readFileSync('/tmp/pza-snyk-missing.json', 'utf8')).checks.snyk;
  if (snyk.enabled !== true || snyk.state !== 'missing') process.exit(1);
"
cat > "$tmp_bin/snyk" <<'SH'
#!/bin/sh
test "$1" = "test" || exit 2
test "$2" = "--severity-threshold=critical" || exit 2
echo "clean"
exit 0
SH
chmod 755 "$tmp_bin/snyk"
PATH="$tmp_bin:/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js run-check snyk --severity-threshold critical >/tmp/pza-snyk-clean.out 2>/tmp/pza-snyk-clean.err
grep -q 'PZA check result: passed' /tmp/pza-snyk-clean.err
cat > "$tmp_bin/snyk" <<'SH'
#!/bin/sh
echo "high vulnerability found"
exit 1
SH
chmod 755 "$tmp_bin/snyk"
set +e
PATH="$tmp_bin:/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js run-check snyk >/tmp/pza-snyk-vuln.out 2>/tmp/pza-snyk-vuln.err
snyk_status=$?
set -e
test "$snyk_status" -eq 1
grep -q 'PZA check result: failed' /tmp/pza-snyk-vuln.err
cat > "$tmp_bin/snyk" <<'SH'
#!/bin/sh
echo "not authenticated"
exit 2
SH
chmod 755 "$tmp_bin/snyk"
set +e
PATH="$tmp_bin:/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js run-check snyk >/tmp/pza-snyk-auth.out 2>/tmp/pza-snyk-auth.err
snyk_status=$?
set -e
test "$snyk_status" -eq 2
grep -q 'PZA check result: blocked - not authenticated' /tmp/pza-snyk-auth.err
cat > "$tmp_bin/snyk" <<'SH'
#!/bin/sh
echo "no supported projects"
exit 3
SH
chmod 755 "$tmp_bin/snyk"
set +e
PATH="$tmp_bin:/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js run-check snyk >/tmp/pza-snyk-none.out 2>/tmp/pza-snyk-none.err
snyk_status=$?
set -e
test "$snyk_status" -eq 3
grep -q 'PZA check result: skipped - no supported projects detected' /tmp/pza-snyk-none.err
rm -rf "$tmp_home" "$tmp_bin"
rm -f /tmp/pza-snyk-default.json /tmp/pza-snyk-on.json /tmp/pza-snyk-missing.json /tmp/pza-snyk-clean.out /tmp/pza-snyk-clean.err /tmp/pza-snyk-vuln.out /tmp/pza-snyk-vuln.err /tmp/pza-snyk-auth.out /tmp/pza-snyk-auth.err /tmp/pza-snyk-none.out /tmp/pza-snyk-none.err

echo "== Reviewer prompt forwarding safety =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-reviewer-forward.XXXXXX")
tmp_bin=$(mktemp -d "${TMPDIR:-/tmp}/pza-reviewer-forward-bin.XXXXXX")
node_bin=$(command -v node)
marker="/tmp/pza-prompt-injection-marker-$$"
prompt_file="/tmp/pza-hostile-prompt-$$.txt"
cat > "$tmp_bin/codex" <<'SH'
#!/bin/sh
test "$1" = "exec" || exit 2
test "$2" = "-" || exit 2
input=$(cat)
case "$input" in
  *'$(touch '*')'*'EOFPROMPT'*)
    echo "received hostile prompt as stdin"
    exit 0
    ;;
  *)
    echo "hostile prompt was not forwarded intact" >&2
    exit 2
    ;;
esac
SH
chmod 755 "$tmp_bin/codex"
printf '%s\n' 'Review this diff.' '$(touch '"$marker"')' 'EOFPROMPT' > "$prompt_file"
cat "$prompt_file" | PATH="$tmp_bin:/bin:/usr/bin" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js run-reviewer code codex "" >/tmp/pza-reviewer-forward.out 2>/tmp/pza-reviewer-forward.err
test ! -e "$marker"
grep -q 'PZA reviewer result: passed' /tmp/pza-reviewer-forward.err
rm -rf "$tmp_home" "$tmp_bin"
rm -f "$prompt_file" "$marker" /tmp/pza-reviewer-forward.out /tmp/pza-reviewer-forward.err

echo "== Reviewer worktree-change diagnostics =="
tmp_home=$(mktemp -d "${TMPDIR:-/tmp}/pza-reviewer-change.XXXXXX")
tmp_bin=$(mktemp -d "${TMPDIR:-/tmp}/pza-reviewer-change-bin.XXXXXX")
changed_file="pza-reviewer-changed-$$.txt"
prompt_file="/tmp/pza-reviewer-change-prompt-$$.txt"
cat > "$tmp_bin/codex" <<'SH'
#!/usr/bin/env sh
cat >/dev/null
printf '%s\n' 'changed during review' > "$PZA_TEST_CHANGED_FILE"
printf '%s\n' 'review output'
exit 0
SH
chmod 755 "$tmp_bin/codex"
printf '%s\n' 'Review this diff.' > "$prompt_file"
set +e
PATH="$tmp_bin:/bin:/usr/bin" HOME="$tmp_home" PZA_TEST_CHANGED_FILE="$changed_file" "$node_bin" ./lib/pza-runtime.js run-reviewer code codex "" < "$prompt_file" >/tmp/pza-reviewer-change.out 2>/tmp/pza-reviewer-change.err
review_status=$?
set -e
test "$review_status" -eq 3
grep -q 'PZA worktree-change details:' /tmp/pza-reviewer-change.err
grep -q "$changed_file" /tmp/pza-reviewer-change.err
grep -q 'PZA reviewer result: failed - worktree changed during review' /tmp/pza-reviewer-change.err
rm -rf "$tmp_home" "$tmp_bin"
rm -f "$changed_file" "$prompt_file" /tmp/pza-reviewer-change.out /tmp/pza-reviewer-change.err

echo "== Diff hash untracked content =="
tmp_untracked="pza-diff-hash-untracked-$$.txt"
printf '%s\n' 'one' > "$tmp_untracked"
hash_one=$(node ./lib/pza-runtime.js diff-hash)
printf '%s\n' 'two' > "$tmp_untracked"
hash_two=$(node ./lib/pza-runtime.js diff-hash)
rm -f "$tmp_untracked"
test "$hash_one" != "$hash_two"

echo "== Plan reviewer runtime =="
(
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
plan_file=$(mktemp "${TMPDIR:-/tmp}/pza-plan-validate.XXXXXX")
prompt_file=$(mktemp "${TMPDIR:-/tmp}/pza-plan-prompt.XXXXXX")
review_out=$(mktemp "${TMPDIR:-/tmp}/pza-plan-review-out.XXXXXX")
review_err=$(mktemp "${TMPDIR:-/tmp}/pza-plan-review-err.XXXXXX")
reviewers_json=$(mktemp "${TMPDIR:-/tmp}/pza-plan-reviewers.XXXXXX")
tmp_bin=$(mktemp -d "${TMPDIR:-/tmp}/pza-plan-reviewer-bin.XXXXXX")
cleanup_plan_review_runtime() {
  rm -rf "$tmp_home" "$tmp_bin"
  rm -f "$plan_file" "$prompt_file" "$review_out" "$review_err" "$reviewers_json"
}
trap cleanup_plan_review_runtime EXIT
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
grep -q 'Context handling: PZA plan context is redacted' "$prompt_file"
grep -F -q 'Use web search or current public documentation tools' "$prompt_file"
grep -F -q 'If you do not have web access, state that explicitly' "$prompt_file"
grep -F -q 'Web access status and source references used' "$prompt_file"
grep -F -q 'Do not send raw private' "$prompt_file"
grep -F -q 'plans, plan content, source code, secrets, diffs' "$prompt_file"
printf '%s\n' '# Plan from stdin' | HOME="$tmp_home" node ./lib/pza-runtime.js plan-review-prompt - conversation-backed > "$prompt_file"
grep -q 'Plan source: conversation-backed' "$prompt_file"
printf '%s\n' 'api_token=abcdefghijklmnopqrstuvwxyz1234567890' \
  | HOME="$tmp_home" node ./lib/pza-runtime.js plan-review-prompt - conversation-backed > "$prompt_file"
grep -q '\[REDACTED_SECRET\]' "$prompt_file"
HOME="$tmp_home" node ./lib/pza-runtime.js run-plan-reviewer fake < "$prompt_file" > "$review_out" 2>"$review_err"
grep -q 'fake reviewer ran' "$review_out"
grep -q 'PZA reviewer result: passed' "$review_err"
cat > "$tmp_bin/codex" <<'SH'
#!/bin/sh
test "$1" = "exec" || exit 2
test "$2" = "-" || exit 2
grep -q "Plan content:" || {
  echo "missing plan content" >&2
  exit 2
}
echo "fake codex plan reviewer ran"
SH
chmod 755 "$tmp_bin/codex"
PATH="$tmp_bin:$PATH" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js run-reviewer plan codex "" < "$prompt_file" > "$review_out" 2>"$review_err"
grep -q 'fake codex plan reviewer ran' "$review_out"
grep -q 'PZA reviewer result: passed' "$review_err"
cat > "$tmp_bin/opencode" <<'SH'
#!/bin/sh
test "$1" = "run" || exit 2
test "$2" = "--model" || exit 2
test "$3" = "test-plan-model" || exit 2
case "$4" in
  *"Plan content:"*) echo "fake opencode plan reviewer ran"; exit 0 ;;
  *) echo "missing plan content" >&2; exit 2 ;;
esac
SH
chmod 755 "$tmp_bin/opencode"
PATH="$tmp_bin:$PATH" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js run-reviewer plan opencode "test-plan-model" < "$prompt_file" > "$review_out" 2>"$review_err"
grep -q 'fake opencode plan reviewer ran' "$review_out"
grep -q 'PZA reviewer result: passed' "$review_err"
cat > "$tmp_bin/agy" <<'SH'
#!/bin/sh
if [ "$1" = "--help" ]; then
  echo "Usage: agy --print --sandbox"
  exit 0
fi
test "$1" = "--sandbox" || exit 2
test "$2" = "--print" || exit 2
case "$3" in
  *"Plan content:"*) echo "fake antigravity plan reviewer ran"; exit 0 ;;
  *) echo "missing plan content" >&2; exit 2 ;;
esac
SH
chmod 755 "$tmp_bin/agy"
PATH="$tmp_bin:$PATH" HOME="$tmp_home" "$node_bin" ./lib/pza-runtime.js run-reviewer plan antigravity "" < "$prompt_file" > "$review_out" 2>"$review_err"
grep -q 'fake antigravity plan reviewer ran' "$review_out"
grep -q 'PZA reviewer result: passed' "$review_err"
set +e
HOME="$tmp_home" node ./lib/pza-runtime.js run-reviewer plan native "" < "$prompt_file" > "$review_out" 2>"$review_err"
native_status=$?
set -e
test "$native_status" -ne 0
grep -q 'native review runs inside the active harness' "$review_err"
grep -q 'PZA reviewer result: blocked' "$review_err"
grep -F -q 'second-opinion-policy' skills/areyousure/SKILL.md
grep -F -q 'reviewer-settings' skills/areyousure/SKILL.md
grep -F -q 'plan-reviewers' skills/areyousure/SKILL.md
grep -F -q 'run-reviewer plan "$PROVIDER" "$MODEL"' skills/areyousure/SKILL.md
grep -F -q 'run-plan-reviewer "$NAME"' skills/areyousure/SKILL.md
grep -F -q 'Context7' skills/areyousure/SKILL.md
grep -F -q 'DeepWiki' skills/areyousure/SKILL.md
grep -F -q 'Exa' skills/areyousure/SKILL.md
grep -F -q 'claim-focused questions' skills/areyousure/SKILL.md
grep -F -q 'source reference' skills/areyousure/SKILL.md
grep -F -q 'skipped or unavailable' skills/areyousure/SKILL.md
grep -F -q 'Context7' agents/plan-verifier.md
grep -F -q 'DeepWiki' agents/plan-verifier.md
grep -F -q 'Exa' agents/plan-verifier.md
grep -F -q 'claim-focused questions' agents/plan-verifier.md
grep -F -q 'source references' agents/plan-verifier.md
grep -F -q 'skipped or unavailable' agents/plan-verifier.md
cleanup_plan_review_runtime
)

echo "== Redacted context helpers =="
redacted_out="/tmp/pza-redacted-$$.out"
review_context_json="/tmp/pza-review-context-$$.json"
hook_validation_json="/tmp/pza-hook-validation-$$.json"
printf '%s\n' \
  'OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890' \
  'normal_hash=0123456789abcdef0123456789abcdef01234567' \
  'Authorization: Bearer abcdefghijklmnopqrstuvwxyzABCDEFGHIJ1234567890' \
  'agent=structural-completeness-reviewer' \
  'agent_file=structural-completeness-reviewer.md' \
  'agent_config=structural-completeness-reviewer.toml' \
  'padded=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef==' \
  'webhook=https://api.example.com/webhook/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef' \
  'pathid=/api/path/1234567890abcdef1234567890abcdef' \
  | node ./lib/pza-runtime.js redact-context > "$redacted_out"
grep -q '\[REDACTED_SECRET\]' "$redacted_out"
grep -q 'normal_hash=0123456789abcdef0123456789abcdef01234567' "$redacted_out"
grep -q '\[REDACTED_AUTH\]' "$redacted_out"
grep -q 'agent=structural-completeness-reviewer' "$redacted_out"
grep -q 'agent_file=structural-completeness-reviewer.md' "$redacted_out"
grep -q 'agent_config=structural-completeness-reviewer.toml' "$redacted_out"
grep -q 'padded=\[REDACTED_HIGH_ENTROPY_TOKEN\]' "$redacted_out"
grep -q 'webhook=https:\[REDACTED_HIGH_ENTROPY_TOKEN\]' "$redacted_out"
grep -q 'pathid=\[REDACTED_HIGH_ENTROPY_TOKEN\]' "$redacted_out"
if grep -q 'agent=.*REDACTED_HIGH_ENTROPY_TOKEN' "$redacted_out"; then
  echo "Canonical PZA agent name was incorrectly redacted" >&2
  exit 1
fi
node ./lib/pza-runtime.js collect-review-context --summary --json > "$review_context_json"
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  if (!data.content.includes('PZA review context')) process.exit(1);
  if (data.mode !== 'summary') process.exit(1);
" "$review_context_json"
printf '%s\n' '{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"echo ok"}]}]}}' \
  | node ./lib/pza-runtime.js validate-hook-proposal > "$hook_validation_json"
grep -q 'command hooks require explicit user approval' "$hook_validation_json"
hidden_context_file=".pza-hidden-context-$$"
printf '%s\n' 'token=abcdefghijklmnopqrstuvwxyz1234567890' > "$hidden_context_file"
node ./lib/pza-runtime.js collect-review-context --summary --json > "$review_context_json"
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const hidden = process.argv[2];
  if (data.files.includes(hidden)) process.exit(1);
  if (data.content.includes(hidden)) process.exit(1);
  if (!data.hiddenUntrackedCount || data.hiddenUntrackedCount < 1) process.exit(1);
" "$review_context_json" "$hidden_context_file"
rm -f "$hidden_context_file"
rm -f "$redacted_out" "$review_context_json" "$hook_validation_json"

echo "== Hook session tracking =="
session_id="pza-validate-$$"
printf '%s' "{\"session_id\":\"$session_id\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"/tmp/example.txt\"}}" \
  | node hooks/scripts/track-session-files.js >/tmp/pza-hook-output.json
node ./lib/pza-runtime.js session-files "$session_id" | grep -qx '/tmp/example.txt'
node ./lib/pza-runtime.js mark-reviewed arewedone "$session_id" >/tmp/pza-hook-reviewed-path.txt
printf '%s' "{\"session_id\":\"$session_id\"}" \
  | node hooks/scripts/review-reminder.js >/tmp/pza-hook-reminder-current.json
node -e "
  const fs = require('fs');
  const reminder = JSON.parse(fs.readFileSync('/tmp/pza-hook-reminder-current.json', 'utf8'));
  if (reminder.continue !== true || reminder.systemMessage) process.exit(1);
"
printf '%s' "{\"session_id\":\"$session_id\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"/tmp/example-after-review.txt\"}}" \
  | node hooks/scripts/track-session-files.js >/tmp/pza-hook-output-after-review.json
printf '%s' "{\"session_id\":\"$session_id\"}" \
  | node hooks/scripts/review-reminder.js >/tmp/pza-hook-reminder-stale.json
node -e "
  const fs = require('fs');
  const reminder = JSON.parse(fs.readFileSync('/tmp/pza-hook-reminder-stale.json', 'utf8'));
  if (reminder.continue !== true || !/no code review was run/.test(reminder.systemMessage || '')) process.exit(1);
"
rm -f "/tmp/pza-skills-session-$session_id-files.json" "/tmp/pza-skills-session-$session_id-reviewed.json" /tmp/pza-hook-output.json /tmp/pza-hook-reviewed-path.txt /tmp/pza-hook-reminder-current.json /tmp/pza-hook-output-after-review.json /tmp/pza-hook-reminder-stale.json

echo "== Adapter files =="
for file in \
  .codex-plugin/plugin.json \
  .agents/plugins/marketplace.json \
  plugins/pza-skills/.codex-plugin/plugin.json \
  plugins/pza-skills/skills/arewedone/SKILL.md \
  plugins/pza-skills/agents/plan-verifier.md \
  .claude-plugin/plugin.json \
  .claude-plugin/marketplace.json \
  hooks/hooks.json \
  .opencode/commands/arewedone.md \
  .opencode/commands/areyousure.md \
  .opencode/commands/agent-docs-audit.md \
  .opencode/commands/agent-docs-revise.md \
  .opencode/commands/pza-settings.md \
  .opencode/commands/hook-worthy.md \
  .opencode/commands/work-issue.md \
  scripts/install-codex-agents.sh \
  .pi/prompts/arewedone.md \
  .pi/prompts/areyousure.md \
  .pi/prompts/agent-docs-audit.md \
  .pi/prompts/agent-docs-revise.md \
  .pi/prompts/pza-settings.md \
  .pi/prompts/hook-worthy.md \
  .pi/prompts/work-issue.md \
  docs/harnesses.md \
  docs/portability.md
do
  test -f "$file"
done
test ! -e plugins/pza-skills/hooks/hooks.json
diff -qr .codex-plugin plugins/pza-skills/.codex-plugin >/dev/null
diff -qr skills plugins/pza-skills/skills >/dev/null
diff -qr agents plugins/pza-skills/agents >/dev/null
diff -qr hooks/scripts plugins/pza-skills/hooks/scripts >/dev/null
diff -qr lib plugins/pza-skills/lib >/dev/null
diff -q scripts/install-runtime.sh plugins/pza-skills/scripts/install-runtime.sh >/dev/null
diff -q scripts/install-codex-agents.sh plugins/pza-skills/scripts/install-codex-agents.sh >/dev/null
diff -q README.md plugins/pza-skills/README.md >/dev/null
diff -q LICENSE plugins/pza-skills/LICENSE >/dev/null

echo "== Plugin manifests =="
node -e "
  const fs = require('fs');
  const codex = JSON.parse(fs.readFileSync('.codex-plugin/plugin.json', 'utf8'));
  if (codex.name !== 'pza-skills') process.exit(1);
  if (codex.skills !== './skills/') process.exit(1);
  if ('hooks' in codex || 'agents' in codex) process.exit(1);
  if (codex.interface?.displayName !== 'PZA-skills') process.exit(1);
  const codexMarketplace = JSON.parse(fs.readFileSync('.agents/plugins/marketplace.json', 'utf8'));
  const codexEntry = codexMarketplace.plugins?.find((entry) => entry.name === 'pza-skills');
  if (!codexEntry || codexEntry.source?.source !== 'local' || codexEntry.source?.path !== './plugins/pza-skills') process.exit(1);
  if (codexEntry.policy?.installation !== 'AVAILABLE' || codexEntry.policy?.authentication !== 'ON_INSTALL') process.exit(1);
  if (codexEntry.category !== 'Coding') process.exit(1);
  const claude = JSON.parse(fs.readFileSync('.claude-plugin/plugin.json', 'utf8'));
  if (claude.name !== 'pza-skills' || claude.displayName !== 'PZA-skills') process.exit(1);
  if ('agents' in claude || 'hooks' in claude) process.exit(1);
	  const claudeMarketplace = JSON.parse(fs.readFileSync('.claude-plugin/marketplace.json', 'utf8'));
	  if (claudeMarketplace.name !== 'pza-skills' || claudeMarketplace.version !== '1.3.0' || !claudeMarketplace.description) process.exit(1);
	  if (claudeMarketplace.plugins?.[0]?.name !== 'pza-skills' || claudeMarketplace.plugins?.[0]?.version !== '1.3.0') process.exit(1);
	"
	grep -F -q '${CLAUDE_PLUGIN_ROOT}/hooks/scripts/track-session-files.js' hooks/hooks.json
	grep -F -q '${CLAUDE_PLUGIN_ROOT}/hooks/scripts/review-reminder.js' hooks/hooks.json
grep -F -q 'Hooks (2)' docs/harnesses.md

echo "== Agent inventory =="
for file in \
  agents/structural-completeness-reviewer.md \
  agents/code-quality-reviewer.md \
  agents/standards-compliance-reviewer.md \
  agents/spec-compliance-reviewer.md \
  agents/plan-verifier.md \
  agents/adversarial-reviewer.md \
  .opencode/agents/structural-completeness-reviewer.md \
  .opencode/agents/code-quality-reviewer.md \
  .opencode/agents/standards-compliance-reviewer.md \
  .opencode/agents/spec-compliance-reviewer.md \
  .opencode/agents/plan-verifier.md \
  .opencode/agents/adversarial-reviewer.md
do
  test -f "$file"
done
for file in agents/*.md .opencode/agents/*.md; do
  base=$(basename "$file")
  case "$base" in
    codex-*|ollama-*|cli-*|external-*)
      echo "Provider/transport-prefixed agent filename found: $file" >&2
      exit 1
      ;;
  esac
done
for file in agents/*.md; do
  if awk '
    NR == 1 && $0 == "---" { in_frontmatter = 1; next }
    in_frontmatter && $0 == "---" { exit }
    in_frontmatter && /^model:/ { found = 1; exit }
    END { exit found ? 0 : 1 }
  ' "$file"; then
    echo "Canonical agents must not declare model frontmatter: $file" >&2
    exit 1
  fi
done
agent_colors=$(mktemp "${TMPDIR:-/tmp}/pza-agent-colors.XXXXXX")
for file in agents/*.md; do
  color=$(awk -F': ' '
    NR == 1 && $0 == "---" { in_frontmatter = 1; next }
    in_frontmatter && $0 == "---" { exit }
    in_frontmatter && /^color:/ { print $2; found = 1; exit }
    END { if (!found) exit 1 }
  ' "$file") || {
    echo "Canonical agent is missing color frontmatter: $file" >&2
    rm -f "$agent_colors"
    exit 1
  }
  printf '%s %s\n' "$color" "$file" >> "$agent_colors"
done
color_count=$(wc -l < "$agent_colors" | tr -d ' ')
unique_color_count=$(awk '{print $1}' "$agent_colors" | sort -u | wc -l | tr -d ' ')
if [ "$color_count" != "$unique_color_count" ]; then
  echo "Canonical agent colors must be unique:" >&2
  cat "$agent_colors" >&2
  rm -f "$agent_colors"
  exit 1
fi
rm -f "$agent_colors"
for file in .opencode/agents/*.md; do
  target=$(awk -F'`' '/canonical agent instructions/{print $2; exit}' "$file")
  if [ -z "$target" ] || [ ! -f "$target" ]; then
    echo "OpenCode agent wrapper points at missing canonical agent: $file -> $target" >&2
    exit 1
  fi
done
test -x scripts/install-codex-agents.sh
(
tmp_codex_agents=$(mktemp -d "${TMPDIR:-/tmp}/pza-codex-agents.XXXXXX")
agent_install_out=$(mktemp "${TMPDIR:-/tmp}/pza-codex-agent-install.XXXXXX")
agent_install_err=$(mktemp "${TMPDIR:-/tmp}/pza-codex-agent-install-err.XXXXXX")
cleanup_codex_agent_validation() {
  rm -rf "$tmp_codex_agents"
  rm -f "$agent_install_out" "$agent_install_err"
}
trap cleanup_codex_agent_validation EXIT
tmp_codex_agents_abs=$(cd "$tmp_codex_agents" && pwd -P)
CODEX_AGENTS_DIR="$tmp_codex_agents" scripts/install-codex-agents.sh >"$agent_install_out"
grep -F -q "Installed PZA Codex agents to $tmp_codex_agents_abs" "$agent_install_out"
for agent in \
  structural-completeness-reviewer \
  code-quality-reviewer \
  standards-compliance-reviewer \
  spec-compliance-reviewer \
  plan-verifier \
  adversarial-reviewer
do
  grep -F -q "$agent" scripts/install-codex-agents.sh
  test -f "$tmp_codex_agents_abs/$agent.md"
  test -f "$tmp_codex_agents_abs/$agent.toml"
  grep -F -q "name = \"$agent\"" "$tmp_codex_agents_abs/$agent.toml"
  grep -F -q 'description = "' "$tmp_codex_agents_abs/$agent.toml"
  grep -F -q "$tmp_codex_agents_abs/$agent.md" "$tmp_codex_agents_abs/$agent.toml"
  grep -F -q 'developer_instructions = ' "$tmp_codex_agents_abs/$agent.toml"
  grep -F -q 'sandbox_mode = "read-only"' "$tmp_codex_agents_abs/$agent.toml"
  grep -F -q 'Do not request escalated sandbox permissions' "$tmp_codex_agents_abs/$agent.toml"
  grep -F -q 'run proof commands' "$tmp_codex_agents_abs/$agent.toml"
  grep -F -q 'report blockers for the parent skill to handle' "$tmp_codex_agents_abs/$agent.toml"
done
if CODEX_AGENTS_DIR="$ROOT/agents" scripts/install-codex-agents.sh >"$agent_install_out" 2>"$agent_install_err"; then
  echo "Codex agent installer accepted canonical source directory as target" >&2
  exit 1
fi
grep -F -q 'Refusing to install over canonical source agent' "$agent_install_err"
unsafe_codex_agents="${TMPDIR:-/tmp}/pza-codex-agents-unsafe-'"
if CODEX_AGENTS_DIR="$unsafe_codex_agents" scripts/install-codex-agents.sh >"$agent_install_out" 2>"$agent_install_err"; then
  echo "Codex agent installer accepted unsafe target path" >&2
  exit 1
fi
grep -F -q 'Unsafe CODEX_AGENTS_DIR' "$agent_install_err"
)
grep -F -q 'name = "$agent"' scripts/install-codex-agents.sh
grep -F -q 'description = "$description"' scripts/install-codex-agents.sh
grep -F -q 'source_real=' scripts/install-codex-agents.sh
grep -F -q 'sandbox_mode = "read-only"' scripts/install-codex-agents.sh
grep -F -q 'Do not request escalated sandbox permissions' scripts/install-codex-agents.sh
grep -F -q 'run proof commands' scripts/install-codex-agents.sh
grep -F -q 'report blockers for the parent skill to handle' scripts/install-codex-agents.sh
grep -F -q 'rm -f "$target_file" "$target_toml"' scripts/install-codex-agents.sh
for agent_file in agents/*.md; do
  grep -F -q 'Do not request escalated sandbox permissions' "$agent_file"
  grep -F -q 'blocked: requires parent-approved proof command' "$agent_file"
done
for skill_file in skills/arewedone/SKILL.md skills/areyousure/SKILL.md; do
  grep -F -q 'subagent-first' "$skill_file"
  grep -F -q 'read-only' "$skill_file"
  grep -E -q 'background[- ]terminal' "$skill_file"
  grep -F -q 'blocked: read-only subagent unavailable' "$skill_file"
  grep -F -q 'Lane Execution' "$skill_file"
  grep -F -q 'Adjudicated Findings' "$skill_file"
  grep -F -q '20 concrete findings' "$skill_file"
  grep -F -q 'suggested by reviewer output' "$skill_file"
  grep -F -q 'CONFIRMED' "$skill_file"
  grep -F -q 'FALSE_POSITIVE' "$skill_file"
  grep -F -q 'UNVERIFIABLE' "$skill_file"
  grep -F -q 'DUPLICATE' "$skill_file"
  grep -F -q 'OUT_OF_SCOPE' "$skill_file"
  if grep -F -q 'direct fallback' "$skill_file"; then
    echo "Native reviewer lanes must block instead of using direct fallback: $skill_file" >&2
    exit 1
  fi
done
grep -F -q 'Native reviewer subagents are review-only' skills/arewedone/SKILL.md
grep -F -q '`/arewedone` flow owns proof-command execution' skills/arewedone/SKILL.md
grep -F -q 'Do not delegate proof commands to reviewer subagents' skills/arewedone/SKILL.md
grep -F -q 'blocked: requires parent-approved proof command' README.md
grep -F -q 'Native reviewer subagents are' README.md
grep -F -q 'standards-compliance-reviewer' skills/arewedone/SKILL.md
grep -F -q 'spec-compliance-reviewer' skills/arewedone/SKILL.md
grep -F -q -- '--spec <path-or-issue-ref>' skills/arewedone/SKILL.md
grep -F -q -- '--no-spec' skills/arewedone/SKILL.md
grep -F -q -- '--spec <path-or-issue-ref>' .pi/prompts/arewedone.md
grep -F -q -- '--no-spec' .pi/prompts/arewedone.md
grep -F -q -- '--spec <path-or-issue-ref>' .opencode/commands/arewedone.md
grep -F -q -- '--no-spec' .opencode/commands/arewedone.md
arewedone_launch_section=$(awk '
  /^### 2\. Launch Reviews/ { in_section = 1 }
  /^### 3\. Backend Reviewer Context/ { in_section = 0 }
  in_section { print }
' skills/arewedone/SKILL.md)
if printf '%s\n' "$arewedone_launch_section" | grep -F -q -- '- Native adversarial:'; then
  echo "Native adversarial lanes must not launch from /arewedone section 2" >&2
  exit 1
fi
if printf '%s\n' "$arewedone_launch_section" | grep -F -q -- '- External adversarial lanes:'; then
  echo "External adversarial lanes must not launch from /arewedone section 2" >&2
  exit 1
fi
grep -F -q 'Backend code quality: use `code-quality-reviewer` with `mode=backend`' skills/arewedone/SKILL.md
grep -F -q 'Section 4 is the only adversarial launch authority' skills/arewedone/SKILL.md
grep -F -q 'status.adversarialReviewers' skills/arewedone/SKILL.md
grep -F -q 'once and only once' skills/arewedone/SKILL.md
grep -F -q '`effectiveEnabled`, `provider`, `model`' skills/arewedone/SKILL.md
grep -F -q 'collect-review-context --redacted-diff --max-bytes 80000 --per-file-bytes 16384' agents/adversarial-reviewer.md
grep -F -q 'only allowed file-context source for native adversarial review' agents/adversarial-reviewer.md
grep -F -q 'Do not perform native adversarial review from summary-only context' agents/adversarial-reviewer.md
grep -F -q 'return `blocked` for each enabled native lane' agents/adversarial-reviewer.md
grep -F -q 'GitHub CLI (`gh`), Ollama' README.md
grep -F -q '**Optional:** GitHub CLI (`gh`)' README.md
for file in README.md docs/harnesses.md docs/portability.md AGENTS.md CLAUDE.md; do
  grep -F -q 'standards-compliance-reviewer' "$file"
  grep -F -q 'spec-compliance-reviewer' "$file"
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

echo "== Plain areyousure independence =="
plain_extra=$(find skills/areyousure-plain -mindepth 1 -type f ! -name SKILL.md -print)
if [ -n "$plain_extra" ]; then
  echo "areyousure-plain must stay SKILL.md-only:" >&2
  printf '%s\n' "$plain_extra" >&2
  exit 1
fi
for file in \
  skills/areyousure-plain/SKILL.md \
  plugins/pza-skills/skills/areyousure-plain/SKILL.md \
  .opencode/commands/areyousure-plain.md \
  .pi/prompts/areyousure-plain.md
do
  test -f "$file"
done
if rg -n '```|[Cc]aveman|pza-runtime|plan-verifier|run-reviewer|collect-plan-context|plan-review-prompt|skill-status|reviewer-settings|plan-reviewers|second-opinion-policy|subagent' \
  skills/areyousure-plain/SKILL.md \
  plugins/pza-skills/skills/areyousure-plain/SKILL.md \
  .opencode/commands/areyousure-plain.md \
  .pi/prompts/areyousure-plain.md; then
  echo "areyousure-plain must not contain code fences or PZA runtime/delegation hooks" >&2
  exit 1
fi

echo "== Portability scan =="
if rg -n '![`]' skills agents .opencode .pi .codex-plugin .agents/plugins .claude-plugin; then
  echo "Unexpected load-time markdown command injection found" >&2
  exit 1
fi
if rg -n 'verbatim|full diff|cat ~/.|grep -oP|hand-assemble|hand-roll|full plan-review prompt' skills agents README.md docs .opencode .pi .codex-plugin .agents/plugins .claude-plugin; then
  echo "Unexpected scanner-risky forwarding text found" >&2
  exit 1
fi
if rg -n '\$\([^)]*cat' skills agents README.md docs .opencode .pi .codex-plugin .agents/plugins .claude-plugin; then
  echo "Unsafe command substitution around cat found" >&2
  exit 1
fi
if rg -n 'git clone .*2>/dev/null \|\| git -C .*pull --ff-only' skills README.md docs plugins; then
  echo "Unsafe suppress-clone-then-pull bootstrap command found" >&2
  exit 1
fi
for file in README.md docs/harnesses.md docs/portability.md skills/pza-settings/SKILL.md plugins/pza-skills/README.md plugins/pza-skills/skills/pza-settings/SKILL.md; do
  grep -F -q 'set -eu' "$file"
  grep -F -q 'core.hooksPath=/dev/null' "$file"
  grep -F -q 'git -c core.hooksPath=/dev/null -C "$pkg" fetch --prune origin' "$file"
  grep -F -q 'git -c core.hooksPath=/dev/null -C "$pkg" merge --ff-only "$upstream"' "$file"
  grep -F -q 'git -c core.hooksPath=/dev/null clone "$repo" "$pkg"' "$file"
  grep -F -q 'Unexpected pza-skills origin' "$file"
  grep -F -q 'must track an origin/* upstream' "$file"
  grep -F -q 'is not exactly at $upstream' "$file"
  grep -F -q 'diff --quiet -- scripts lib' "$file"
  grep -F -q 'diff --cached --quiet -- scripts lib' "$file"
  grep -F -q 'diff --quiet -- agents' "$file"
  grep -F -q 'diff --cached --quiet -- agents' "$file"
done
if rg -n 'run-reviewer.*--(dangerously-skip-permissions|auto|force)|codex exec.*--(dangerously-skip-permissions|auto|force)' skills agents lib .opencode .pi .codex-plugin .agents/plugins .claude-plugin; then
  echo "Approval-skipping reviewer invocation found" >&2
  exit 1
fi
if rg -n "ollama launch claude|AskUserQuestion|Bash\\(" skills agents hooks lib .opencode .pi .codex-plugin .agents/plugins .claude-plugin; then
  echo "Unexpected non-portable invocation text found" >&2
  exit 1
fi

echo "Remaining Claude compatibility references:"
rg -n "CLAUDE_SESSION_ID|/tmp/claude-session|~/.claude" skills agents README.md AGENTS.md CLAUDE.md docs hooks lib .opencode .pi .codex-plugin .agents/plugins .claude-plugin || true

echo "validate-portability: PASS"
