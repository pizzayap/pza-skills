#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const { execFileSync, spawnSync } = require("child_process");

const home = os.homedir();
const CONFIG_DIR = path.join(home, ".pza-skills");
const SETTINGS_PATH = path.join(CONFIG_DIR, "settings.json");
const MODEL_PATH = path.join(CONFIG_DIR, "ollama-model");
const PLAN_REVIEWERS_PATH = path.join(CONFIG_DIR, "plan-reviewers.json");
const DEFAULT_SETTINGS = { codex: true, ollama: true, adversarial: true };
const DEFAULT_CHECKS = { snyk: { enabled: false, severityThreshold: "high" } };
const DEFAULT_MODEL = "kimi-k2.6:cloud";
const REVIEWER_ORDER = ["native", "ollama", "codex", "opencode", "kilo", "cursor", "antigravity"];
const ADVERSARIAL_PROVIDER_ORDER = ["ollama", "codex", "opencode", "kilo", "cursor", "antigravity"];
const CHECK_ORDER = ["snyk"];
const REVIEWER_COMMANDS = {
  ollama: "ollama",
  codex: "codex",
  opencode: "opencode",
  kilo: "kilo",
  cursor: "cursor-agent",
  antigravity: "agy",
};
const CHECK_COMMANDS = {
  snyk: "snyk",
};
const REVIEWER_LABELS = {
  native: "Native",
  ollama: "Ollama",
  codex: "Codex",
  opencode: "OpenCode",
  kilo: "Kilo Code",
  cursor: "Cursor Agent",
  antigravity: "Antigravity",
};
const CHECK_LABELS = {
  snyk: "Snyk",
};
const MODEL_PLACEHOLDERS = {
  native: "codex:gpt-5.5",
  ollama: "kimi-k2.6:cloud",
  codex: "gpt-5.3-codex",
  opencode: "openai/gpt-5.3-codex",
  kilo: "openai/gpt-5.3-codex",
  cursor: "model accepted by cursor-agent",
  antigravity: "only if agy supports model selection",
};
const REVIEWER_RUN_RESULT_PREFIX = "PZA reviewer result:";
const DEFAULT_PLAN_CONTEXT_BYTES = 20 * 1024;
const DEFAULT_REVIEW_SUMMARY_BYTES = 20 * 1024;
const DEFAULT_REVIEW_DIFF_BYTES = 40 * 1024;
const DEFAULT_REVIEW_PER_FILE_BYTES = 8 * 1024;
const SNYK_SEVERITY_LEVELS = ["low", "medium", "high", "critical"];
const GENERATED_OR_BINARY_RE =
  /\.(lock|min\.js|min\.css|map|svg|png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|bz2|xz|7z|wasm|woff2?|ttf|otf|mp[34]|mov|avi|bin)$/i;

const LEGACY_SETTINGS = [
  path.join(home, ".claude", "pza-settings.json"),
  path.join(home, ".Codex", "pza-settings.json"),
  path.join(home, ".codex", "pza-settings.json"),
];
const LEGACY_MODELS = [
  path.join(home, ".claude", "pza-ollama-model"),
  path.join(home, ".Codex", "pza-ollama-model"),
  path.join(home, ".codex", "pza-ollama-model"),
];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function readSettings() {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(readJson(LEGACY_SETTINGS.find((p) => fs.existsSync(p)) || "") || {}),
    ...(readJson(SETTINGS_PATH) || {}),
  };
  return {
    ...settings,
    reviewers: normalizeReviewers(settings),
    adversarialReviewers: normalizeConfiguredAdversarialReviewers(settings),
    checks: normalizeChecks(settings),
  };
}

function writeSettings(next) {
  ensureConfigDir();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ ...readSettings(), ...next }, null, 2) + "\n");
}

function readModel() {
  for (const file of [MODEL_PATH, ...LEGACY_MODELS]) {
    try {
      const value = fs.readFileSync(file, "utf8").trim();
      if (value) return value;
    } catch {}
  }
  return DEFAULT_MODEL;
}

function writeModel(model) {
  ensureConfigDir();
  fs.writeFileSync(MODEL_PATH, `${model}\n`);
}

function normalizeReviewerName(name) {
  const value = String(name || "").trim().toLowerCase();
  const aliases = {
    cursoragent: "cursor",
    "cursor-agent": "cursor",
    agy: "antigravity",
    google: "antigravity",
    "google-antigravity": "antigravity",
  };
  return aliases[value] || value;
}

function normalizeReviewers(settings = {}) {
  const configured = settings.reviewers && typeof settings.reviewers === "object" ? settings.reviewers : {};
  const defaults = {
    native: { enabled: true, model: settings.nativeModel || "" },
    ollama: { enabled: settings.ollama !== false, model: readModel() },
    codex: { enabled: settings.codex !== false, model: "" },
    opencode: { enabled: false, model: "" },
    kilo: { enabled: false, model: "" },
    cursor: { enabled: false, model: "" },
    antigravity: { enabled: false, model: "" },
  };

  return Object.fromEntries(
    REVIEWER_ORDER.map((name) => {
      const item = configured[name] && typeof configured[name] === "object" ? configured[name] : {};
      const enabled =
        typeof item.enabled === "boolean"
          ? item.enabled
          : typeof defaults[name].enabled === "boolean"
            ? defaults[name].enabled
            : false;
      const model = typeof item.model === "string" && item.model.trim() ? item.model.trim() : defaults[name].model;
      return [name, { enabled, model }];
    }),
  );
}

function normalizeSeverityThreshold(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SNYK_SEVERITY_LEVELS.includes(normalized) ? normalized : DEFAULT_CHECKS.snyk.severityThreshold;
}

function normalizeChecks(settings = {}) {
  const configured = settings.checks && typeof settings.checks === "object" && !Array.isArray(settings.checks) ? settings.checks : {};
  const snyk = configured.snyk && typeof configured.snyk === "object" && !Array.isArray(configured.snyk) ? configured.snyk : {};
  return {
    snyk: {
      enabled: snyk.enabled === true,
      severityThreshold: normalizeSeverityThreshold(snyk.severityThreshold),
    },
  };
}

function normalizeAdversarialProvider(provider) {
  const value = normalizeReviewerName(provider);
  return ADVERSARIAL_PROVIDER_ORDER.includes(value) ? value : "";
}

function slugifyId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeLaneId(id) {
  return slugifyId(id);
}

function normalizeConfiguredAdversarialReviewers(settings = {}) {
  if (!Array.isArray(settings.adversarialReviewers)) return undefined;
  const seen = new Set();
  return settings.adversarialReviewers.flatMap((lane, index) => {
    if (!lane || typeof lane !== "object" || Array.isArray(lane)) return [];
    const provider = normalizeAdversarialProvider(lane.provider);
    if (!provider) return [];
    const fallbackId = uniqueAdversarialLaneId(`${provider}-${lane.model || index + 1}`, seen);
    const id = normalizeLaneId(lane.id) || fallbackId;
    if (seen.has(id)) return [];
    seen.add(id);
    return [
      {
        id,
        provider,
        model: typeof lane.model === "string" ? lane.model.trim() : "",
        enabled: lane.enabled !== false,
      },
    ];
  });
}

function uniqueAdversarialLaneId(base, existing) {
  const used = existing || new Set();
  const root = slugifyId(base) || "adversarial-lane";
  let candidate = root;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function configuredAdversarialReviewers(settings = readSettings()) {
  return Array.isArray(settings.adversarialReviewers) ? settings.adversarialReviewers : null;
}

function legacyAdversarialReviewers(settings = readSettings()) {
  return ["ollama", "codex"].map((provider) => ({
    id: `${provider}-default`,
    provider,
    model: settings.reviewers[provider]?.model || "",
    enabled: settings.reviewers[provider]?.enabled !== false,
    legacy: true,
  }));
}

function effectiveAdversarialReviewers(settings = readSettings()) {
  return configuredAdversarialReviewers(settings) ?? legacyAdversarialReviewers(settings);
}

function adversarialReviewerSettingsStatus(options = {}) {
  const settings = readSettings();
  const explicit = Array.isArray(settings.adversarialReviewers);
  const globalEnabled = settings.adversarial !== false || options.force === true;
  const lanes = effectiveAdversarialReviewers(settings);
  return {
    path: SETTINGS_PATH,
    adversarial: settings.adversarial !== false,
    forced: options.force === true,
    explicit,
    reviewers: lanes.map((lane) => {
      const command = REVIEWER_COMMANDS[lane.provider] || null;
      const installedPath = command ? commandPath(command) : null;
      const configuredModel = typeof lane.model === "string" ? lane.model.trim() : "";
      const fallbackModel = settings.reviewers[lane.provider]?.model || "";
      const model = configuredModel || fallbackModel;
      const enabled = lane.enabled !== false;
      const effectiveEnabled = globalEnabled && enabled;
      const preflight = reviewerPreflightStatus(lane.provider, {
        enabled: effectiveEnabled,
        model,
        installedPath,
        disabledBlocker: enabled && !globalEnabled ? "Adversarial review is disabled." : "",
      });
      return {
        id: lane.id,
        provider: lane.provider,
        label: REVIEWER_LABELS[lane.provider] || lane.provider,
        enabled,
        effectiveEnabled,
        model,
        configuredModel,
        command,
        installed: Boolean(installedPath),
        path: installedPath,
        state: preflight.state,
        requiredWhenEnabled: preflight.requiredWhenEnabled,
        forwardsPrivateContext: preflight.forwardsPrivateContext,
        blocker: preflight.blocker,
        legacy: lane.legacy === true,
        modelPlaceholder: MODEL_PLACEHOLDERS[lane.provider] || "",
        notes:
          lane.provider === "antigravity"
            ? "Only used when local agy --help confirms a safe non-interactive prompt or stdin mode."
            : "",
      };
    }),
  };
}

function printAdversarialReviewerSettings(options = {}) {
  console.log(JSON.stringify(adversarialReviewerSettingsStatus(options), null, 2));
}

function explicitAdversarialListForWrite(settings = readSettings()) {
  return configuredAdversarialReviewers(settings) ? [...settings.adversarialReviewers] : [];
}

function addAdversarialReviewer(providerRaw, modelRaw, idRaw) {
  const provider = normalizeAdversarialProvider(providerRaw);
  if (!provider) {
    console.error(`Unknown adversarial provider: ${providerRaw}`);
    return 2;
  }
  const model = String(modelRaw || "").trim();
  if (!model) {
    console.error("Usage: pza-runtime add-adversarial-reviewer <provider> <model> [id]");
    return 2;
  }

  const settings = readSettings();
  const lanes = explicitAdversarialListForWrite(settings);
  const existingIds = new Set(lanes.map((lane) => lane.id));
  const explicitId = String(idRaw || "").trim();
  const id = explicitId ? normalizeLaneId(explicitId) : uniqueAdversarialLaneId(`${provider}-${model}`, existingIds);
  if (!id) {
    console.error("Adversarial reviewer id must contain at least one letter or number.");
    return 2;
  }
  if (existingIds.has(id)) {
    console.error(`Adversarial reviewer id already exists: ${id}`);
    return 2;
  }

  lanes.push({ id, provider, model, enabled: true });
  writeSettings({ adversarialReviewers: lanes });
  printAdversarialReviewerSettings();
  return 0;
}

function setAdversarialReviewer(idRaw, field, rawValue) {
  const id = normalizeLaneId(idRaw);
  if (!id) {
    console.error("Usage: pza-runtime set-adversarial-reviewer <id> <enabled|model> <value>");
    return 2;
  }
  const setting = String(field || "").trim().toLowerCase();
  if (!["enabled", "model"].includes(setting)) {
    console.error("Usage: pza-runtime set-adversarial-reviewer <id> <enabled|model> <value>");
    return 2;
  }

  const settings = readSettings();
  const lanes = explicitAdversarialListForWrite(settings);
  const index = lanes.findIndex((lane) => lane.id === id);
  if (index === -1) {
    console.error(`Adversarial reviewer not found: ${id}`);
    return 1;
  }

  if (setting === "enabled") {
    const value = String(rawValue || "").trim().toLowerCase();
    if (!["on", "off", "true", "false", "yes", "no"].includes(value)) {
      console.error("Enabled value must be on/off, yes/no, or true/false.");
      return 2;
    }
    lanes[index] = { ...lanes[index], enabled: ["on", "true", "yes"].includes(value) };
  } else {
    lanes[index] = { ...lanes[index], model: String(rawValue || "").trim() };
  }

  writeSettings({ adversarialReviewers: lanes });
  printAdversarialReviewerSettings();
  return 0;
}

function removeAdversarialReviewer(idRaw) {
  const id = normalizeLaneId(idRaw);
  if (!id) {
    console.error("Usage: pza-runtime remove-adversarial-reviewer <id>");
    return 2;
  }
  const settings = readSettings();
  const lanes = explicitAdversarialListForWrite(settings);
  const next = lanes.filter((lane) => lane.id !== id);
  if (next.length === lanes.length) {
    console.error(`Adversarial reviewer not found: ${id}`);
    return 1;
  }
  writeSettings({ adversarialReviewers: next });
  printAdversarialReviewerSettings();
  return 0;
}

function commandPath(command) {
  if (!command) return null;
  const result = spawnSync("sh", ["-c", 'command -v "$1"', "sh", command], { encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout.trim().split(/\r?\n/)[0] || null;
}

function reviewerPreflightStatus(name, options = {}) {
  const enabled = options.enabled !== false;
  const model = String(options.model || "").trim();
  const installedPath = options.installedPath || null;
  const disabledBlocker = String(options.disabledBlocker || "");
  const base = {
    requiredWhenEnabled: name !== "native",
    forwardsPrivateContext: name !== "native",
    blocker: "",
  };

  if (!enabled) {
    return { ...base, state: "disabled", blocker: disabledBlocker };
  }
  if (name === "native") {
    return { ...base, state: "ready" };
  }
  if (!installedPath) {
    return { ...base, state: "missing", blocker: `${REVIEWER_LABELS[name] || name} command is not installed.` };
  }
  if (name === "ollama" && !model) {
    return { ...base, state: "blocked", blocker: "Ollama model is not configured." };
  }
  if (name === "antigravity" && !antigravitySupportsSafePrint()) {
    return {
      ...base,
      state: "blocked",
      blocker: "Antigravity safe non-interactive sandbox print mode was not confirmed.",
    };
  }
  return { ...base, state: "ready" };
}

function reviewerSettingsStatus() {
  const settings = readSettings();
  return REVIEWER_ORDER.map((name) => {
    const command = REVIEWER_COMMANDS[name] || null;
    const installedPath = command ? commandPath(command) : null;
    const enabled = settings.reviewers[name]?.enabled !== false;
    const model = settings.reviewers[name]?.model || "";
    const preflight = reviewerPreflightStatus(name, { enabled, model, installedPath });
    return {
      name,
      label: REVIEWER_LABELS[name] || name,
      enabled,
      model,
      command,
      installed: name === "native" ? true : Boolean(installedPath),
      path: installedPath,
      state: preflight.state,
      requiredWhenEnabled: preflight.requiredWhenEnabled,
      forwardsPrivateContext: preflight.forwardsPrivateContext,
      blocker: preflight.blocker,
      modelPlaceholder: MODEL_PLACEHOLDERS[name] || "",
      notes:
        name === "native"
          ? "Set this to the active harness/model label manually; most harnesses do not expose it programmatically."
          : name === "antigravity"
            ? "Only used when local agy --help confirms a safe non-interactive prompt or stdin mode."
            : "",
    };
  });
}

function printReviewerSettings() {
  console.log(JSON.stringify({ path: SETTINGS_PATH, reviewers: reviewerSettingsStatus() }, null, 2));
}

function checkStatus(name, options = {}) {
  const settings = options.settings || readSettings();
  const check = settings.checks[name] || DEFAULT_CHECKS[name] || {};
  const command = CHECK_COMMANDS[name] || null;
  const installedPath = command ? commandPath(command) : null;
  const enabled = options.enabled ?? (check.enabled === true);
  const severityThreshold = normalizeSeverityThreshold(check.severityThreshold);
  const base = {
    name,
    label: CHECK_LABELS[name] || name,
    enabled,
    command,
    installed: Boolean(installedPath),
    path: installedPath,
    state: "disabled",
    requiredWhenEnabled: true,
    forwardsPrivateContext: false,
    blocker: "",
    severityThreshold,
    notes: "",
  };

  if (name === "snyk") {
    base.notes =
      "Opt-in trusted-worktree dependency scan. Snyk CLI may execute package-manager code while collecting dependency data.";
  }
  if (!enabled) return base;
  if (!installedPath) {
    return { ...base, state: "missing", blocker: `${CHECK_LABELS[name] || name} command is not installed.` };
  }
  return { ...base, state: "ready" };
}

function checkSettingsStatus(options = {}) {
  const settings = readSettings();
  return {
    path: SETTINGS_PATH,
    checks: Object.fromEntries(CHECK_ORDER.map((name) => [name, checkStatus(name, { ...options, settings })])),
  };
}

function printCheckSettings() {
  console.log(JSON.stringify(checkSettingsStatus(), null, 2));
}

function setCheck(name, field, rawValue, print = true) {
  const checkName = String(name || "").trim().toLowerCase();
  if (!CHECK_ORDER.includes(checkName)) {
    console.error(`Unknown check: ${name}`);
    return 2;
  }
  const setting = String(field || "").trim().toLowerCase();
  if (!["enabled", "severity-threshold", "severitythreshold"].includes(setting)) {
    console.error("Usage: pza-runtime set-check <check> <enabled|severity-threshold> <value>");
    return 2;
  }

  const settings = readSettings();
  const checks = { ...settings.checks, [checkName]: { ...(settings.checks[checkName] || {}) } };
  if (setting === "enabled") {
    const value = String(rawValue || "").trim().toLowerCase();
    if (!["on", "off", "true", "false", "yes", "no"].includes(value)) {
      console.error("Enabled value must be on/off, yes/no, or true/false.");
      return 2;
    }
    checks[checkName].enabled = ["on", "true", "yes"].includes(value);
  } else {
    const value = String(rawValue || "").trim().toLowerCase();
    if (!SNYK_SEVERITY_LEVELS.includes(value)) {
      console.error(`Severity threshold must be one of: ${SNYK_SEVERITY_LEVELS.join(", ")}.`);
      return 2;
    }
    checks[checkName].severityThreshold = value;
  }
  writeSettings({ checks });
  if (print) printCheckSettings();
  return 0;
}

function saveReviewerUiState(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Expected a JSON object.");
  }

  const settings = readSettings();
  const reviewers = { ...settings.reviewers };
  const checks = { ...settings.checks };
  const adversarialReviewers = [];
  const incoming = payload.reviewers && typeof payload.reviewers === "object" ? payload.reviewers : {};
  for (const name of REVIEWER_ORDER) {
    const value = incoming[name];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    reviewers[name] = { ...(reviewers[name] || {}) };
    if (typeof value.enabled === "boolean") reviewers[name].enabled = value.enabled;
    if (typeof value.model === "string") reviewers[name].model = value.model.trim();
  }
  const incomingAdversarial = Array.isArray(payload.adversarialReviewers) ? payload.adversarialReviewers : null;
  if (incomingAdversarial) {
    const seen = new Set();
    for (const lane of incomingAdversarial) {
      if (!lane || typeof lane !== "object" || Array.isArray(lane)) continue;
      const provider = normalizeAdversarialProvider(lane.provider);
      if (!provider) continue;
      const rawId = typeof lane.id === "string" ? lane.id.trim() : "";
      let id = "";
      if (rawId) {
        id = normalizeLaneId(rawId);
        if (!id) throw new Error("Adversarial lane id must contain at least one letter or number.");
      } else {
        id = uniqueAdversarialLaneId(`${provider}-${lane.model || "lane"}`, seen);
      }
      if (seen.has(id)) throw new Error(`Duplicate adversarial lane id: ${id}`);
      seen.add(id);
      adversarialReviewers.push({
        id,
        provider,
        model: typeof lane.model === "string" ? lane.model.trim() : "",
        enabled: lane.enabled !== false,
      });
    }
  }
  const incomingChecks = payload.checks && typeof payload.checks === "object" && !Array.isArray(payload.checks) ? payload.checks : {};
  for (const name of CHECK_ORDER) {
    const value = incomingChecks[name];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    checks[name] = { ...(checks[name] || {}) };
    if (typeof value.enabled === "boolean") checks[name].enabled = value.enabled;
    if (typeof value.severityThreshold === "string") checks[name].severityThreshold = normalizeSeverityThreshold(value.severityThreshold);
  }

  const next = { reviewers, checks };
  if (typeof payload.adversarial === "boolean") next.adversarial = payload.adversarial;
  if (incomingAdversarial) next.adversarialReviewers = adversarialReviewers;
  next.nativeModel = reviewers.native?.model || "";
  next.ollama = reviewers.ollama?.enabled !== false;
  next.codex = reviewers.codex?.enabled !== false;
  if (reviewers.ollama?.model) writeModel(reviewers.ollama.model);
  writeSettings(next);
  return settingsUiState();
}

function settingsUiState() {
  const settings = readSettings();
  return {
    paths: { settings: SETTINGS_PATH, model: MODEL_PATH },
    adversarial: settings.adversarial !== false,
    reviewers: reviewerSettingsStatus(),
    checks: checkSettingsStatus().checks,
    adversarialReviewers: adversarialReviewerSettingsStatus().reviewers,
    adversarialReviewersExplicit: Array.isArray(settings.adversarialReviewers),
    adversarialProviders: ADVERSARIAL_PROVIDER_ORDER.map((name) => ({
      name,
      label: REVIEWER_LABELS[name] || name,
      modelPlaceholder: MODEL_PLACEHOLDERS[name] || "",
    })),
  };
}

function settingsUiHtml(token) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PZA Settings</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f8;
      --panel: #ffffff;
      --text: #171717;
      --muted: #5f6368;
      --line: #d8dcdf;
      --accent: #1f7a4d;
      --accent-strong: #145c39;
      --warn: #9a4b00;
      --bad: #a32727;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(1120px, calc(100vw - 32px));
      margin: 24px auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0;
    }
    p { margin: 0; color: var(--muted); }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    button {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 9px 12px;
      background: var(--panel);
      color: var(--text);
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #ffffff;
    }
    button.primary:hover { background: var(--accent-strong); }
    button:disabled { opacity: 0.6; cursor: wait; }
    button.compact { padding: 7px 9px; font-size: 12px; }
    button.danger { color: var(--bad); }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .table-head, .row {
      display: grid;
      grid-template-columns: 1.25fr 100px 100px 100px minmax(210px, 1.35fr) 1.4fr;
      gap: 12px;
      align-items: center;
      padding: 12px 14px;
    }
    .lane-head, .lane-row {
      display: grid;
      grid-template-columns: minmax(150px, 1fr) 150px minmax(220px, 1.5fr) 90px 100px minmax(170px, 1fr) 90px;
      gap: 12px;
      align-items: center;
      padding: 12px 14px;
    }
    .table-head {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      border-bottom: 1px solid var(--line);
      background: #fbfbfb;
    }
    .lane-head {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      border-bottom: 1px solid var(--line);
      background: #fbfbfb;
    }
    .row, .lane-row { border-bottom: 1px solid var(--line); }
    .row:last-child, .lane-row:last-child { border-bottom: 0; }
    .name strong { display: block; font-size: 15px; }
    .name span { display: block; color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
    .pill {
      display: inline-flex;
      align-items: center;
      width: max-content;
      min-height: 24px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      border: 1px solid var(--line);
      color: var(--muted);
      background: #fafafa;
    }
    .pill.ok { color: var(--accent-strong); border-color: #9fd0b7; background: #eef8f2; }
    .pill.missing { color: var(--bad); border-color: #e5adad; background: #fff3f3; }
    .pill.blocked { color: var(--warn); border-color: #e8c48a; background: #fff8ea; }
    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: max-content;
      cursor: pointer;
      user-select: none;
    }
    .toggle input { inline-size: 18px; block-size: 18px; accent-color: var(--accent); }
    input[type="text"], select {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 9px;
      color: var(--text);
      font: inherit;
      background: #ffffff;
    }
    .section-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin: 18px 0 8px;
    }
    .section-title h2 {
      margin: 0;
      font-size: 15px;
      letter-spacing: 0;
    }
    .note {
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .warning { color: var(--warn); }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-top: 12px;
      color: var(--muted);
      font-size: 12px;
    }
    .adversarial {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      padding: 14px;
      margin: 14px 0;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    #status { min-height: 20px; }
    @media (max-width: 800px) {
      header, .footer, .adversarial { flex-direction: column; align-items: stretch; }
      .actions { justify-content: flex-start; }
      .table-head, .lane-head { display: none; }
      .row, .lane-row {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 14px;
      }
      .row > *::before, .lane-row > *::before {
        display: block;
        margin-bottom: 3px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .installed::before { content: "Installed"; }
      .enabled::before { content: "Enabled"; }
      .state::before { content: "State"; }
      .model::before { content: "Model"; }
      .severity::before { content: "Severity"; }
      .notes::before { content: "Notes"; }
      .lane-id::before { content: "Lane ID"; }
      .provider::before { content: "Provider"; }
      .lane-state::before { content: "State"; }
      .lane-action::before { content: "Action"; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>PZA Settings</h1>
        <p>Configure reviewer backends and adversarial lanes used by /arewedone.</p>
      </div>
      <div class="actions">
        <button id="refresh" type="button">Refresh</button>
        <button id="save" class="primary" type="button">Save</button>
        <button id="saveStop" type="button">Save and Stop Server</button>
      </div>
    </header>
    <section class="adversarial">
      <div>
        <strong>Adversarial review</strong>
        <p>Security-focused review for supported backends.</p>
      </div>
      <label class="toggle">
        <input id="adversarial" type="checkbox">
        <span>Enabled</span>
      </label>
    </section>
    <section class="panel" aria-label="Reviewer backends">
      <div class="table-head">
        <div>Reviewer</div>
        <div>Installed</div>
        <div>Enabled</div>
        <div>State</div>
        <div>Model</div>
        <div>Notes</div>
      </div>
      <div id="reviewers"></div>
    </section>
    <div class="section-title">
      <div>
        <h2>Proof checks</h2>
        <p>Optional local checks used by /arewedone after review synthesis.</p>
      </div>
    </div>
    <section class="panel" aria-label="Proof checks">
      <div class="table-head">
        <div>Check</div>
        <div>Installed</div>
        <div>Enabled</div>
        <div>State</div>
        <div>Severity</div>
        <div>Notes</div>
      </div>
      <div id="checks"></div>
    </section>
    <div class="section-title">
      <div>
        <h2>Adversarial lanes</h2>
        <p>Each enabled lane runs one security-focused provider/model review.</p>
      </div>
      <button id="addLane" class="compact" type="button">Add Lane</button>
    </div>
    <section class="panel" aria-label="Adversarial lanes">
      <div class="lane-head">
        <div>Lane ID</div>
        <div>Provider</div>
        <div>Model</div>
        <div>Enabled</div>
        <div>State</div>
        <div>Notes</div>
        <div>Action</div>
      </div>
      <div id="adversarialLanes"></div>
    </section>
    <div class="footer">
      <div id="paths"></div>
      <div id="status" role="status" aria-live="polite"></div>
    </div>
  </main>
  <script>
    const token = ${JSON.stringify(token)};
    const reviewersEl = document.getElementById("reviewers");
    const checksEl = document.getElementById("checks");
    const adversarialLanesEl = document.getElementById("adversarialLanes");
    const adversarialEl = document.getElementById("adversarial");
    const statusEl = document.getElementById("status");
    const pathsEl = document.getElementById("paths");
    let state = null;
    let adversarialDirty = false;

    function api(path) {
      const separator = path.includes("?") ? "&" : "?";
      return path + separator + "token=" + encodeURIComponent(token);
    }

    function setBusy(busy) {
      for (const button of document.querySelectorAll("button")) button.disabled = busy;
    }

    function setStatus(message, tone) {
      statusEl.textContent = message || "";
      statusEl.className = tone || "";
    }

    function reviewerNote(reviewer) {
      const parts = [];
      if (reviewer.blocker) parts.push(reviewer.blocker);
      if (reviewer.notes) parts.push(reviewer.notes);
      if (reviewer.enabled && !reviewer.installed) parts.push("Enabled but command is not installed.");
      if (reviewer.path) parts.push(reviewer.path);
      return parts.join(" ");
    }

    function checkNote(check) {
      const parts = [];
      if (check.blocker) parts.push(check.blocker);
      if (check.notes) parts.push(check.notes);
      if (check.enabled && !check.installed) parts.push("Enabled but command is not installed.");
      if (check.path) parts.push(check.path);
      return parts.join(" ");
    }

    function statePillClass(state) {
      if (state === "ready") return "ok";
      if (state === "disabled") return "";
      return state === "blocked" ? "blocked" : "missing";
    }

    function renderCheck(check) {
      const row = document.createElement("div");
      row.className = "row check-row";
      row.dataset.name = check.name;

      const name = document.createElement("div");
      name.className = "name";
      const strong = document.createElement("strong");
      strong.textContent = check.label || check.name;
      const command = document.createElement("span");
      command.textContent = check.command || "local check";
      name.append(strong, command);

      const installed = document.createElement("div");
      installed.className = "installed";
      const installedPill = document.createElement("span");
      installedPill.className = "pill " + (check.installed ? "ok" : "missing");
      installedPill.textContent = check.installed ? "Installed" : "Missing";
      installed.append(installedPill);

      const enabled = document.createElement("div");
      enabled.className = "enabled";
      const label = document.createElement("label");
      label.className = "toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(check.enabled);
      checkbox.dataset.field = "enabled";
      const toggleText = document.createElement("span");
      toggleText.textContent = "On";
      label.append(checkbox, toggleText);
      enabled.append(label);

      const checkState = document.createElement("div");
      checkState.className = "state";
      const statePill = document.createElement("span");
      statePill.className = "pill " + statePillClass(check.state);
      statePill.textContent = check.state || "unknown";
      checkState.append(statePill);

      const severity = document.createElement("div");
      severity.className = "severity";
      const select = document.createElement("select");
      select.dataset.field = "severityThreshold";
      for (const level of ["low", "medium", "high", "critical"]) {
        const option = document.createElement("option");
        option.value = level;
        option.textContent = level;
        option.selected = level === check.severityThreshold;
        select.append(option);
      }
      severity.append(select);

      const notes = document.createElement("div");
      notes.className = "notes note";
      const noteText = checkNote(check);
      notes.textContent = noteText || "No extra setup notes.";
      if (check.blocker || (check.enabled && !check.installed)) notes.classList.add("warning");

      row.append(name, installed, enabled, checkState, severity, notes);
      return row;
    }

    function providerOptions(selectedProvider) {
      const fragment = document.createDocumentFragment();
      for (const provider of state.adversarialProviders || []) {
        const option = document.createElement("option");
        option.value = provider.name;
        option.textContent = provider.label || provider.name;
        option.selected = provider.name === selectedProvider;
        fragment.append(option);
      }
      return fragment;
    }

    function providerPlaceholder(providerName) {
      const provider = (state.adversarialProviders || []).find((item) => item.name === providerName);
      return provider && provider.modelPlaceholder ? provider.modelPlaceholder : "";
    }

    function renderAdversarialLane(lane) {
      const row = document.createElement("div");
      row.className = "lane-row";

      const id = document.createElement("div");
      id.className = "lane-id";
      const idInput = document.createElement("input");
      idInput.type = "text";
      idInput.value = lane.id || "";
      idInput.dataset.field = "id";
      id.append(idInput);

      const provider = document.createElement("div");
      provider.className = "provider";
      const providerSelect = document.createElement("select");
      providerSelect.dataset.field = "provider";
      providerSelect.append(providerOptions(lane.provider || "ollama"));
      provider.append(providerSelect);

      const model = document.createElement("div");
      model.className = "model";
      const modelInput = document.createElement("input");
      modelInput.type = "text";
      modelInput.placeholder = providerPlaceholder(lane.provider || "ollama");
      modelInput.value = lane.configuredModel || lane.model || "";
      modelInput.dataset.field = "model";
      model.append(modelInput);

      const enabled = document.createElement("div");
      enabled.className = "enabled";
      const label = document.createElement("label");
      label.className = "toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(lane.enabled);
      checkbox.dataset.field = "enabled";
      const toggleText = document.createElement("span");
      toggleText.textContent = "On";
      label.append(checkbox, toggleText);
      enabled.append(label);

      const laneState = document.createElement("div");
      laneState.className = "lane-state";
      const statePill = document.createElement("span");
      statePill.className = "pill " + statePillClass(lane.state);
      statePill.textContent = lane.state || "unknown";
      laneState.append(statePill);

      const notes = document.createElement("div");
      notes.className = "notes note";
      const noteParts = [];
      if (lane.blocker) noteParts.push(lane.blocker);
      if (lane.legacy) noteParts.push("Legacy default from normal reviewer settings.");
      if (lane.notes) noteParts.push(lane.notes);
      if (lane.enabled && !lane.installed) noteParts.push("Enabled but command is not installed.");
      notes.textContent = noteParts.join(" ") || "Configured adversarial lane.";
      if (lane.blocker || (lane.enabled && !lane.installed)) notes.classList.add("warning");

      const action = document.createElement("div");
      action.className = "lane-action";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "compact danger";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        adversarialDirty = true;
        row.remove();
      });
      action.append(remove);

      for (const input of [idInput, providerSelect, modelInput, checkbox]) {
        input.addEventListener("change", () => {
          adversarialDirty = true;
          if (input === providerSelect) modelInput.placeholder = providerPlaceholder(providerSelect.value);
        });
      }

      row.append(id, provider, model, enabled, laneState, notes, action);
      return row;
    }

    function render(data) {
      state = data;
      adversarialDirty = false;
      adversarialEl.checked = Boolean(data.adversarial);
      pathsEl.textContent = "Settings: " + data.paths.settings;
      reviewersEl.replaceChildren();
      checksEl.replaceChildren();
      adversarialLanesEl.replaceChildren();
      for (const reviewer of data.reviewers) {
        const row = document.createElement("div");
        row.className = "row";
        row.dataset.name = reviewer.name;

        const name = document.createElement("div");
        name.className = "name";
        const strong = document.createElement("strong");
        strong.textContent = reviewer.label || reviewer.name;
        const command = document.createElement("span");
        command.textContent = reviewer.command || "active harness";
        name.append(strong, command);

        const installed = document.createElement("div");
        installed.className = "installed";
        const pill = document.createElement("span");
        pill.className = "pill " + (reviewer.installed ? "ok" : "missing");
        pill.textContent = reviewer.installed ? "Installed" : "Missing";
        installed.append(pill);

        const enabled = document.createElement("div");
        enabled.className = "enabled";
        const label = document.createElement("label");
        label.className = "toggle";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(reviewer.enabled);
        checkbox.dataset.field = "enabled";
        const toggleText = document.createElement("span");
        toggleText.textContent = "On";
        label.append(checkbox, toggleText);
        enabled.append(label);

        const reviewerState = document.createElement("div");
        reviewerState.className = "state";
        const statePill = document.createElement("span");
        statePill.className = "pill " + statePillClass(reviewer.state);
        statePill.textContent = reviewer.state || "unknown";
        reviewerState.append(statePill);

        const model = document.createElement("div");
        model.className = "model";
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = reviewer.modelPlaceholder || "";
        input.value = reviewer.model || "";
        input.dataset.field = "model";
        model.append(input);

        const notes = document.createElement("div");
        notes.className = "notes note";
        const noteText = reviewerNote(reviewer);
        notes.textContent = noteText || "No extra setup notes.";
        if (reviewer.blocker || (reviewer.enabled && !reviewer.installed)) notes.classList.add("warning");

        row.append(name, installed, enabled, reviewerState, model, notes);
        reviewersEl.append(row);
      }
      for (const check of Object.values(data.checks || {})) {
        checksEl.append(renderCheck(check));
      }
      for (const lane of data.adversarialReviewers || []) {
        adversarialLanesEl.append(renderAdversarialLane(lane));
      }
    }

    async function load() {
      setBusy(true);
      setStatus("Loading...");
      try {
        const response = await fetch(api("/api/state"), { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        render(await response.json());
        setStatus("Ready.");
      } catch (error) {
        setStatus(error.message || "Unable to load settings.", "warning");
      } finally {
        setBusy(false);
      }
    }

    function collect() {
      const reviewers = {};
      for (const row of reviewersEl.querySelectorAll(".row")) {
        reviewers[row.dataset.name] = {
          enabled: row.querySelector('[data-field="enabled"]').checked,
          model: row.querySelector('[data-field="model"]').value.trim(),
        };
      }
      const checks = {};
      for (const row of checksEl.querySelectorAll(".check-row")) {
        checks[row.dataset.name] = {
          enabled: row.querySelector('[data-field="enabled"]').checked,
          severityThreshold: row.querySelector('[data-field="severityThreshold"]').value,
        };
      }
      const payload = { adversarial: adversarialEl.checked, reviewers, checks };
      if (state.adversarialReviewersExplicit || adversarialDirty) {
        payload.adversarialReviewers = Array.from(adversarialLanesEl.querySelectorAll(".lane-row")).map((row) => ({
          id: row.querySelector('[data-field="id"]').value.trim(),
          provider: row.querySelector('[data-field="provider"]').value,
          model: row.querySelector('[data-field="model"]').value.trim(),
          enabled: row.querySelector('[data-field="enabled"]').checked,
        }));
      }
      return payload;
    }

    async function save(stopAfter) {
      setBusy(true);
      setStatus("Saving...");
      try {
        const response = await fetch(api("/api/save"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(collect()),
        });
        if (!response.ok) throw new Error(await response.text());
        render(await response.json());
        setStatus("Saved.");
        if (stopAfter) {
          await fetch(api("/api/stop"), { method: "POST" }).catch(() => {});
          setStatus("Saved. Server stopped.");
        }
      } catch (error) {
        setStatus(error.message || "Unable to save settings.", "warning");
      } finally {
        if (!stopAfter) setBusy(false);
      }
    }

    document.getElementById("refresh").addEventListener("click", load);
    document.getElementById("save").addEventListener("click", () => save(false));
    document.getElementById("saveStop").addEventListener("click", () => save(true));
    document.getElementById("addLane").addEventListener("click", () => {
      adversarialDirty = true;
      adversarialLanesEl.append(renderAdversarialLane({
        id: "",
        provider: "cursor",
        model: "",
        configuredModel: "",
        enabled: true,
        installed: true,
        state: "ready",
      }));
    });
    load();
  </script>
</body>
</html>`;
}

function readRequestBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Request body too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendResponse(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}

function parseSettingsUiArgs(args) {
  const options = { host: "127.0.0.1", port: 0, token: crypto.randomBytes(18).toString("hex"), help: false, printHtml: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--print-html") options.printHtml = true;
    else if (arg === "--host") options.host = args[++index] || options.host;
    else if (arg === "--port") options.port = Number(args[++index] || 0);
    else if (arg === "--token") options.token = args[++index] || options.token;
    else throw new Error(`Unknown settings-ui option: ${arg}`);
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(options.host)) {
    throw new Error("settings-ui only binds to localhost addresses.");
  }
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error("settings-ui port must be an integer from 0 to 65535.");
  }
  return options;
}

function printSettingsUiHelp() {
  console.log(`Usage: pza-runtime settings-ui [--host 127.0.0.1] [--port 0]

Starts a localhost-only visual settings companion for /pza-settings.
Options:
  --host <host>      Localhost bind address. Default: 127.0.0.1
  --port <port>      Port to bind. Default: 0 (random available port)
  --token <token>    Override random URL token for tests
  --print-html       Print the UI HTML and exit
  --help             Show this help`);
}

function formatSettingsUiError(error, options = {}) {
  const code = error?.code || "";
  const message = error?.message || String(error || "unknown error");
  const host = options.host || "127.0.0.1";
  const port = Number.isInteger(options.port) ? options.port : 0;
  if (code === "EADDRINUSE") {
    const portLabel = port === 0 ? "an OS-assigned port" : `port ${port}`;
    return `Unable to start PZA Settings UI: ${portLabel} on ${host} is already in use. Retry with --port 0 or choose another localhost port. (${message})`;
  }
  if (code === "EACCES" || code === "EPERM") {
    return `Unable to start PZA Settings UI: localhost bind was denied by the OS, harness, or sandbox. Use /pza-settings --status or direct pza-runtime settings commands instead. (${message})`;
  }
  return `Unable to start PZA Settings UI: ${message}`;
}

function runSettingsUi(args) {
  let options;
  try {
    options = parseSettingsUiArgs(args);
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  if (options.help) {
    printSettingsUiHelp();
    return 0;
  }
  if (options.printHtml) {
    process.stdout.write(settingsUiHtml(options.token));
    return 0;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
      const token = requestUrl.searchParams.get("token") || req.headers["x-pza-token"];
      if (token !== options.token) {
        sendResponse(res, 403, "Forbidden");
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/") {
        sendResponse(
          res,
          200,
          settingsUiHtml(options.token),
          "text/html; charset=utf-8",
        );
      } else if (req.method === "GET" && requestUrl.pathname === "/api/state") {
        sendResponse(res, 200, JSON.stringify(settingsUiState()), "application/json; charset=utf-8");
      } else if (req.method === "POST" && requestUrl.pathname === "/api/save") {
        const body = await readRequestBody(req);
        const saved = saveReviewerUiState(JSON.parse(body || "{}"));
        sendResponse(res, 200, JSON.stringify(saved), "application/json; charset=utf-8");
      } else if (req.method === "POST" && requestUrl.pathname === "/api/stop") {
        sendResponse(res, 200, "Stopping");
        setTimeout(() => server.close(() => process.exit(0)), 25);
      } else {
        sendResponse(res, 404, "Not found");
      }
    } catch (error) {
      sendResponse(res, 400, error.message || "Bad request");
    }
  });

  server.on("error", (error) => {
    console.error(formatSettingsUiError(error, options));
    process.exit(1);
  });

  server.listen(options.port, options.host, () => {
    const address = server.address();
    const host = options.host === "::1" ? "[::1]" : options.host;
    const url = `http://${host}:${address.port}/?token=${encodeURIComponent(options.token)}`;
    console.log(`PZA Settings UI: ${url}`);
    console.log(`Settings path: ${SETTINGS_PATH}`);
    console.log("Press Ctrl-C to stop.");
  });
  return null;
}

function setReviewer(name, field, rawValue, print = true) {
  const reviewerName = normalizeReviewerName(name);
  if (!REVIEWER_ORDER.includes(reviewerName)) {
    console.error(`Unknown reviewer: ${name}`);
    return 2;
  }

  const setting = String(field || "").trim().toLowerCase();
  if (!["enabled", "model"].includes(setting)) {
    console.error("Usage: pza-runtime set-reviewer <reviewer> <enabled|model> <value>");
    return 2;
  }

  const settings = readSettings();
  const reviewers = { ...settings.reviewers };
  reviewers[reviewerName] = { ...(reviewers[reviewerName] || {}) };

  if (setting === "enabled") {
    const value = String(rawValue || "").trim().toLowerCase();
    if (!["on", "off", "true", "false", "yes", "no"].includes(value)) {
      console.error("Enabled value must be on/off, yes/no, or true/false.");
      return 2;
    }
    reviewers[reviewerName].enabled = ["on", "true", "yes"].includes(value);
  } else {
    const value = String(rawValue || "").trim();
    reviewers[reviewerName].model = value;
    if (reviewerName === "ollama" && value) writeModel(value);
  }

  const next = { reviewers };
  if (reviewerName === "native") next.nativeModel = reviewers.native.model || "";
  if (reviewerName === "ollama") next.ollama = reviewers.ollama.enabled !== false;
  if (reviewerName === "codex") next.codex = reviewers.codex.enabled !== false;
  writeSettings(next);
  if (print) printReviewerSettings();
  return 0;
}

function getReviewerValue(name, field) {
  const reviewerName = normalizeReviewerName(name);
  if (!REVIEWER_ORDER.includes(reviewerName)) return null;
  const reviewer = readSettings().reviewers[reviewerName] || {};
  if (field === "enabled") return reviewer.enabled !== false ? "yes" : "no";
  if (field === "model") return reviewer.model || "";
  return null;
}

function readPlanReviewers() {
  const parsed = readJson(PLAN_REVIEWERS_PATH);
  const reviewers = Array.isArray(parsed?.reviewers) ? parsed.reviewers : [];
  return reviewers.flatMap((reviewer, index) => {
    const name = typeof reviewer?.name === "string" ? reviewer.name.trim() : "";
    const command = reviewer?.command;
    if (!name || !Array.isArray(command) || command.length === 0 || !command.every((part) => typeof part === "string" && part.length > 0)) {
      return [];
    }
    return [{ name, command, enabled: reviewer.enabled !== false, index }];
  });
}

function printPlanReviewers() {
  const reviewers = readPlanReviewers().map(({ name, enabled, index }) => ({
    name,
    enabled,
    index,
    commandConfigured: true,
  }));
  console.log(JSON.stringify({ path: PLAN_REVIEWERS_PATH, reviewers }, null, 2));
}

function byteLength(value) {
  return Buffer.byteLength(String(value || ""), "utf8");
}

function shannonEntropy(value) {
  const text = String(value || "");
  if (!text) return 0;
  const counts = new Map();
  for (const char of text) counts.set(char, (counts.get(char) || 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / text.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function looksLikeHashOrUuid(value) {
  const text = String(value || "");
  return (
    /^[a-f0-9]{32,128}$/i.test(text) ||
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(text)
  );
}

function redactContext(input) {
  let output = String(input || "");
  const replacements = [
    [/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]"],
    [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_ACCESS_KEY]"],
    [/\bASIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_TEMP_ACCESS_KEY]"],
    [/\bgh[pousr]_[A-Za-z0-9_]{30,255}\b/g, "[REDACTED_GITHUB_TOKEN]"],
    [/\bgithub_pat_[A-Za-z0-9_]{30,255}\b/g, "[REDACTED_GITHUB_TOKEN]"],
    [/\bxox[abprs]-[A-Za-z0-9-]{20,255}\b/g, "[REDACTED_SLACK_TOKEN]"],
    [/\bsk_(?:live|test)_[A-Za-z0-9]{16,255}\b/g, "[REDACTED_STRIPE_SECRET]"],
    [/\brk_(?:live|test)_[A-Za-z0-9]{16,255}\b/g, "[REDACTED_STRIPE_RESTRICTED_KEY]"],
    [/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,255}\b/g, "[REDACTED_OPENAI_KEY]"],
    [/\bsk-ant-[A-Za-z0-9_-]{20,255}\b/g, "[REDACTED_ANTHROPIC_KEY]"],
    [/\bAIza[0-9A-Za-z_-]{30,80}\b/g, "[REDACTED_GOOGLE_API_KEY]"],
    [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]"],
  ];
  for (const [pattern, replacement] of replacements) output = output.replace(pattern, replacement);

  output = output.replace(
    /([a-z][a-z0-9+.-]*:\/\/)([^:\s/@]+):([^@\s/]+)@/gi,
    "$1[REDACTED_USER]:[REDACTED_SECRET]@",
  );
  output = output.replace(/(\bAuthorization\s*:\s*(?:Bearer|Basic)\s+)[^\s"'`]+/gi, "$1[REDACTED_AUTH]");
  output = output.replace(/(\bBearer\s+)[A-Za-z0-9._~+/-]+=*/g, "$1[REDACTED_BEARER]");
  output = output.replace(
    /(\b[A-Za-z0-9_.-]*(?:api[_-]?key|token|secret|password|passwd|pwd|credential|cookie)[A-Za-z0-9_.-]*\b\s*[:=]\s*)(["'])([^"']{8,})(\2)/gi,
    "$1$2[REDACTED_SECRET]$4",
  );
  output = output.replace(
    /(\b[A-Za-z0-9_.-]*(?:api[_-]?key|token|secret|password|passwd|pwd|credential|cookie)[A-Za-z0-9_.-]*\b\s*[:=]\s*)([^"',\s;}]{8,})/gi,
    "$1[REDACTED_SECRET]",
  );

  return output.replace(/\b[A-Za-z0-9_./+-]{32,}={0,2}\b/g, (token) => {
    if (looksLikeHashOrUuid(token)) return token;
    if (token.includes("/") && !/[+=]/.test(token)) return token;
    const uniqueChars = new Set(token).size;
    return uniqueChars >= 10 && shannonEntropy(token) >= 3.6 ? "[REDACTED_HIGH_ENTROPY_TOKEN]" : token;
  });
}

function truncateByBytes(input, maxBytes, label = "context") {
  const text = String(input || "");
  const totalBytes = byteLength(text);
  const limit = Number(maxBytes);
  if (!Number.isFinite(limit) || limit <= 0 || totalBytes <= limit) {
    return { text, truncated: false, originalBytes: totalBytes, bytes: totalBytes };
  }

  const note = `\n\n[PZA ${label} truncated from ${totalBytes} to ${limit} bytes]\n\n`;
  const noteBytes = byteLength(note);
  const available = Math.max(0, limit - noteBytes);
  if (available <= 0) {
    const compact = `[PZA ${label} truncated from ${totalBytes} to ${limit} bytes]`;
    return { text: compact, truncated: true, originalBytes: totalBytes, bytes: byteLength(compact) };
  }

  const headBytes = Math.floor(available * 0.6);
  const tailBytes = available - headBytes;
  const buffer = Buffer.from(text, "utf8");
  const head = buffer.subarray(0, headBytes).toString("utf8");
  const tail = buffer.subarray(Math.max(0, buffer.length - tailBytes)).toString("utf8");
  const truncated = `${head}${note}${tail}`;
  return { text: truncated, truncated: true, originalBytes: totalBytes, bytes: byteLength(truncated) };
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function optionValue(args, name, fallback) {
  const prefixed = args.find((arg) => String(arg).startsWith(`${name}=`));
  if (prefixed) return prefixed.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function hasOption(args, name) {
  return args.includes(name);
}

function prepareContext(rawContent, options = {}) {
  const originalBytes = byteLength(rawContent);
  const redacted = redactContext(rawContent);
  const redactedBytes = byteLength(redacted);
  const truncated = truncateByBytes(redacted, options.maxBytes || DEFAULT_PLAN_CONTEXT_BYTES, options.label || "context");
  return {
    content: truncated.text,
    originalBytes,
    redactedBytes,
    bytes: truncated.bytes,
    truncated: truncated.truncated,
    redacted: redacted !== String(rawContent || ""),
  };
}

function contextNotice(kind, prepared) {
  const notes = [`PZA ${kind} context is redacted before being forwarded to external reviewers.`];
  if (prepared.redacted) notes.push("Potential secrets were replaced with redaction markers.");
  if (prepared.truncated) notes.push(`Content was truncated from ${prepared.originalBytes} bytes to ${prepared.bytes} bytes.`);
  return notes.join(" ");
}

function printRedactedContext() {
  process.stdout.write(redactContext(fs.readFileSync(0, "utf8")));
  return 0;
}

function printCollectedPlanContext(args) {
  const planFile = args[0];
  if (!planFile) {
    console.error("Usage: pza-runtime collect-plan-context <plan-file|-> [source] [--max-bytes N] [--json]");
    return 2;
  }
  const source = args[1] && !args[1].startsWith("--") ? args[1] : "unknown";
  const maxBytes = parsePositiveInt(optionValue(args, "--max-bytes", ""), DEFAULT_PLAN_CONTEXT_BYTES);
  try {
    const raw = planFile === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(planFile, "utf8");
    const prepared = prepareContext(raw, { maxBytes, label: "plan context" });
    const result = {
      source,
      maxBytes,
      originalBytes: prepared.originalBytes,
      bytes: prepared.bytes,
      redacted: prepared.redacted,
      truncated: prepared.truncated,
      content: prepared.content,
    };
    if (hasOption(args, "--json")) console.log(JSON.stringify(result, null, 2));
    else process.stdout.write(`${contextNotice("plan", prepared)}\n\n${prepared.content}`);
    return 0;
  } catch (error) {
    console.error(`Unable to collect plan context: ${error.message}`);
    return 1;
  }
}

function gitOutput(args, options = {}) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      timeout: options.timeout || 5000,
      maxBuffer: options.maxBuffer || 5 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

function gitStatus(args) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return result.status ?? 1;
}

function uniqueSorted(items) {
  return [...new Set(items.filter(Boolean))].sort();
}

function splitLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isGeneratedOrBinaryPath(file) {
  return GENERATED_OR_BINARY_RE.test(file) || /(^|\/)(node_modules|\.git|\.next|\.turbo|dist|build|coverage)\//.test(file);
}

function isHiddenUntrackedPath(file) {
  if (/^\.opencode\//.test(file) || /^\.pi\//.test(file) || /^\.claude-plugin\//.test(file)) return false;
  return /(^|\/)\.[^/]+/.test(file);
}

function isLikelyTextFile(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1024 * 1024) return false;
    const fd = fs.openSync(file, "r");
    const buffer = Buffer.alloc(Math.min(stat.size, 4096));
    const bytes = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    return !buffer.subarray(0, bytes).includes(0);
  } catch {
    return false;
  }
}

function currentReviewScope() {
  const unstaged = gitStatus(["diff", "--quiet"]) !== 0;
  const staged = gitStatus(["diff", "--cached", "--quiet"]) !== 0;
  const untracked = splitLines(gitOutput(["ls-files", "--others", "--exclude-standard"]));
  if (unstaged || staged || untracked.length) {
    return { mode: "uncommitted", staged, unstaged, untracked };
  }
  if (!gitOutput(["rev-parse", "--verify", "HEAD~1"])) {
    return { mode: "none", reason: "clean working tree with no parent commit" };
  }
  if (gitStatus(["diff", "--quiet", "HEAD~1", "HEAD"]) === 0) {
    return { mode: "none", reason: "last commit has no diff" };
  }
  return { mode: "last-commit", staged: false, unstaged: false, untracked: [] };
}

function changedTrackedFiles(scope) {
  if (scope.mode === "uncommitted") {
    return uniqueSorted([
      ...splitLines(gitOutput(["diff", "--name-only"])),
      ...splitLines(gitOutput(["diff", "--cached", "--name-only"])),
    ]);
  }
  if (scope.mode === "last-commit") return splitLines(gitOutput(["diff", "--name-only", "HEAD~1", "HEAD"]));
  return [];
}

function reviewStat(scope) {
  if (scope.mode === "uncommitted") {
    return [gitOutput(["diff", "--stat"]), gitOutput(["diff", "--cached", "--stat"])].filter(Boolean).join("\n").trim();
  }
  if (scope.mode === "last-commit") return gitOutput(["diff", "--stat", "HEAD~1", "HEAD"]).trim();
  return "";
}

function diffForFile(scope, file) {
  if (scope.mode === "uncommitted") return [gitOutput(["diff", "--", file]), gitOutput(["diff", "--cached", "--", file])].filter(Boolean).join("\n");
  if (scope.mode === "last-commit") return gitOutput(["diff", "HEAD~1", "HEAD", "--", file]);
  return "";
}

function visibleGitStatus(status) {
  return String(status || "")
    .split(/\r?\n/)
    .filter((line) => {
      if (!line.startsWith("?? ")) return Boolean(line.trim());
      const pathPart = line.slice(3).trim();
      const firstPath = pathPart.split(/\s+->\s+/)[0];
      return firstPath && !isHiddenUntrackedPath(firstPath);
    })
    .join("\n");
}

function collectReviewContext(options = {}) {
  const mode = options.mode || "summary";
  const maxBytes = options.maxBytes || (mode === "redacted-diff" ? DEFAULT_REVIEW_DIFF_BYTES : DEFAULT_REVIEW_SUMMARY_BYTES);
  const perFileBytes = options.perFileBytes || DEFAULT_REVIEW_PER_FILE_BYTES;
  const scope = currentReviewScope();
  const trackedFiles = changedTrackedFiles(scope);
  const untrackedFiles = scope.mode === "uncommitted" ? scope.untracked || [] : [];
  const visibleUntrackedFiles = untrackedFiles.filter((file) => !isHiddenUntrackedPath(file));
  const hiddenUntrackedCount = untrackedFiles.length - visibleUntrackedFiles.length;
  const included = [];
  const skipped = [];
  const parts = [
    "PZA review context",
    `Scope: ${scope.mode}${scope.reason ? ` (${scope.reason})` : ""}`,
    "",
    "Changed files:",
    ...uniqueSorted([...trackedFiles, ...visibleUntrackedFiles]).map((file) => `- ${file}`),
  ];
  if (hiddenUntrackedCount) parts.push(`- ${hiddenUntrackedCount} hidden untracked path(s) omitted`);
  const stat = reviewStat(scope);
  if (stat) parts.push("", "Diff stat:", stat);
  if (scope.mode === "uncommitted") {
    const status = visibleGitStatus(gitOutput(["status", "--short"]).trim());
    if (status) parts.push("", "Git status:", status);
  }

  if (mode === "redacted-diff") {
    parts.push("", "Redacted diff context:");
    for (const file of trackedFiles) {
      if (isGeneratedOrBinaryPath(file)) {
        skipped.push({ file, reason: "generated or binary path" });
        continue;
      }
      const diff = diffForFile(scope, file);
      if (!diff) continue;
      const prepared = prepareContext(diff, { maxBytes: perFileBytes, label: `${file} diff` });
      included.push({ file, bytes: prepared.bytes, originalBytes: prepared.originalBytes, redacted: prepared.redacted, truncated: prepared.truncated });
      parts.push(`\n=== FILE: ${file} ===\n${prepared.content}`);
    }
    if (hiddenUntrackedCount) skipped.push({ file: "<hidden untracked path>", reason: "hidden untracked path", count: hiddenUntrackedCount });
    for (const file of visibleUntrackedFiles) {
      if (isGeneratedOrBinaryPath(file) || !isLikelyTextFile(file)) {
        skipped.push({ file, reason: "generated, binary, too large, or unreadable" });
        continue;
      }
      try {
        const raw = fs.readFileSync(file, "utf8");
        const prepared = prepareContext(raw, { maxBytes: perFileBytes, label: `${file} new file` });
        included.push({ file, bytes: prepared.bytes, originalBytes: prepared.originalBytes, redacted: prepared.redacted, truncated: prepared.truncated });
        parts.push(`\n=== NEW FILE: ${file} ===\n${prepared.content}`);
      } catch (error) {
        skipped.push({ file, reason: error.code || error.message });
      }
    }
    if (skipped.length) {
      parts.push("", "Skipped files:", ...skipped.map((item) => `- ${item.file}: ${item.reason}`));
    }
  }

  const prepared = prepareContext(parts.join("\n"), { maxBytes, label: "review context" });
  return {
    scope: scope.mode,
    reason: scope.reason || "",
    mode,
    maxBytes,
    perFileBytes,
    files: uniqueSorted([...trackedFiles, ...visibleUntrackedFiles]),
    hiddenUntrackedCount,
    included,
    skipped,
    originalBytes: prepared.originalBytes,
    bytes: prepared.bytes,
    redacted: prepared.redacted,
    truncated: prepared.truncated,
    content: prepared.content,
  };
}

function printCollectedReviewContext(args) {
  const mode = hasOption(args, "--redacted-diff") ? "redacted-diff" : "summary";
  const maxBytes = parsePositiveInt(optionValue(args, "--max-bytes", ""), mode === "redacted-diff" ? DEFAULT_REVIEW_DIFF_BYTES : DEFAULT_REVIEW_SUMMARY_BYTES);
  const perFileBytes = parsePositiveInt(optionValue(args, "--per-file-bytes", ""), DEFAULT_REVIEW_PER_FILE_BYTES);
  const context = collectReviewContext({ mode, maxBytes, perFileBytes });
  if (hasOption(args, "--json")) console.log(JSON.stringify(context, null, 2));
  else process.stdout.write(`${contextNotice("review", context)}\n\n${context.content}\n`);
  return 0;
}

function cliAvailabilityStatus() {
  return Object.fromEntries(
    Object.entries(REVIEWER_COMMANDS).map(([name, command]) => [
      name,
      { command, installed: Boolean(commandPath(command)), path: commandPath(command) },
    ]),
  );
}

function printSkillStatus(skill) {
  const status = {
    skill: skill || "unknown",
    cwd: process.cwd(),
    runtime: __filename,
    settingsPath: SETTINGS_PATH,
    modelPath: MODEL_PATH,
  };
  if (skill === "arewedone" || skill === "pza-settings" || !skill) {
    status.reviewers = reviewerSettingsStatus();
    status.adversarialReviewers = adversarialReviewerSettingsStatus().reviewers;
    status.checks = checkSettingsStatus().checks;
    status.cliAvailability = cliAvailabilityStatus();
  }
  if (skill === "pza-settings") {
    status.planReviewers = readPlanReviewers().map(({ name, enabled, index }) => ({ name, enabled, index, commandConfigured: true }));
  }
  if (skill === "arewedone") {
    const files = readSessionFiles();
    status.sessionFiles = files;
    status.sessionStat = files.length ? gitOutput(["diff", "--stat", "--", ...files]).trim() : "";
    status.reviewContext = collectReviewContext({ mode: "summary" });
  } else if (skill === "areyousure") {
    status.recentPlanFiles = uniqueSorted([
      ...splitLines(gitOutput(["ls-files", "*.md"])).filter((file) => /(^|\/)(PLAN|plan|.*plan.*)\.md$/i.test(file)).slice(0, 20),
    ]);
    status.projectInstructions = {
      AGENTS: fs.existsSync("AGENTS.md") ? `${"AGENTS.md"} - ${splitLines(fs.readFileSync("AGENTS.md", "utf8")).length} non-empty lines` : "",
      CLAUDE: fs.existsSync("CLAUDE.md") ? `${"CLAUDE.md"} - ${splitLines(fs.readFileSync("CLAUDE.md", "utf8")).length} non-empty lines` : "",
    };
  }
  console.log(JSON.stringify(status, null, 2));
  return 0;
}

function inspectHookItems(value, warnings, pathParts = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectHookItems(item, warnings, [...pathParts, String(index)]));
    return;
  }

  const location = pathParts.length ? pathParts.join(".") : "root";
  if (value.type === "command") {
    warnings.push(`${location}: command hooks require explicit user approval of the exact command.`);
    const command = String(value.command || "");
    if (!command.trim()) warnings.push(`${location}: command hook is missing a command string.`);
    if (/\b(rm\s+-rf|sudo|curl\b.*\|\s*(sh|bash)|wget\b.*\|\s*(sh|bash)|eval|chmod\s+777)\b/.test(command)) {
      warnings.push(`${location}: command contains a high-risk shell pattern.`);
    }
  }
  if (value.type === "prompt" && typeof value.prompt === "string" && value.prompt.trim().length < 20) {
    warnings.push(`${location}: prompt hook is too short to be actionable.`);
  }
  for (const [key, child] of Object.entries(value)) inspectHookItems(child, warnings, [...pathParts, key]);
}

function validateHookProposal() {
  const input = fs.readFileSync(0, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    console.log(JSON.stringify({ ok: false, warnings: [`Invalid JSON: ${error.message}`] }, null, 2));
    return 1;
  }
  const warnings = [];
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) warnings.push("Proposal must be a JSON object.");
  if (!parsed.hooks || typeof parsed.hooks !== "object" || Array.isArray(parsed.hooks)) warnings.push("Proposal should contain a hooks object.");
  inspectHookItems(parsed, warnings);
  console.log(JSON.stringify({ ok: warnings.length === 0, warnings }, null, 2));
  return 0;
}

function buildPlanReviewPrompt(planContent, source = "unknown", notice = "") {
  return `Review this implementation plan for technical accuracy. Check for:
- Outdated APIs or deprecated patterns
- Wrong method signatures or return types
- Incorrect configuration formats
- Missing steps or dependencies
- Assumptions that don't match current library docs or local code

Review only. Do not modify files, run fix commands, or apply patches.

Plan source: ${source}
${notice ? `\nContext handling: ${notice}` : ""}

Plan content:

${planContent}

Return a structured report with:
- Critical findings (must fix)
- Warning findings (should fix)
- Info findings (minor)
- Verified correct items

Format each finding as: Claim | Issue | Correction | Confidence
`;
}

function printPlanReviewPrompt(planFile, source) {
  if (!planFile) {
    console.error("Usage: pza-runtime plan-review-prompt <plan-file|-> [source]");
    return 2;
  }
  try {
    const planContent = planFile === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(planFile, "utf8");
    const prepared = prepareContext(planContent, { maxBytes: DEFAULT_PLAN_CONTEXT_BYTES, label: "plan context" });
    process.stdout.write(buildPlanReviewPrompt(prepared.content, source, contextNotice("plan", prepared)));
    return 0;
  } catch (error) {
    console.error(`Unable to read plan content: ${error.message}`);
    return 1;
  }
}

function runCustomPlanReviewer(name, prompt) {
  const reviewer = readPlanReviewers().find((candidate) => candidate.enabled && candidate.name === name);
  if (!reviewer) {
    console.error(`Custom plan reviewer blocked - not configured or disabled: ${name}`);
    console.error(`${REVIEWER_RUN_RESULT_PREFIX} blocked - custom reviewer is not configured or disabled`);
    return 2;
  }

  let result;
  try {
    result = spawnSync(reviewer.command[0], reviewer.command.slice(1), {
      input: prompt,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 5 * 60 * 1000,
    });
  } catch (error) {
    console.error(`Custom plan reviewer blocked - ${error.message}`);
    console.error(`${REVIEWER_RUN_RESULT_PREFIX} blocked - ${error.message}`);
    return 1;
  }

  writeReviewerProcessOutput(result);
  if (result.error) {
    const reason = result.error.code === "ENOENT" ? `command not found: ${reviewer.command[0]}` : result.error.message;
    console.error(`Custom plan reviewer blocked - ${reason}`);
    console.error(`${REVIEWER_RUN_RESULT_PREFIX} blocked - ${reason}`);
    return result.error.code === "ENOENT" ? 127 : 1;
  }
  const outcome = reviewerOutcome(result.status ?? 1, `${result.stdout || ""}${result.stderr || ""}`, null);
  console.error(`${REVIEWER_RUN_RESULT_PREFIX} ${outcome.status}${outcome.reason ? ` - ${outcome.reason}` : ""}`);
  return outcome.exitCode;
}

function safeSessionId(id) {
  const value = id || process.env.PZA_SESSION_ID || process.env.CODEX_SESSION_ID || process.env.CLAUDE_SESSION_ID || "unknown";
  return String(value).replace(/[^A-Za-z0-9_.-]/g, "_");
}

function sessionPaths(id = safeSessionId()) {
  const sessionId = safeSessionId(id);
  return {
    files: `/tmp/pza-skills-session-${sessionId}-files.json`,
    reviewed: `/tmp/pza-skills-session-${sessionId}-reviewed.json`,
    legacyFiles: [
      `/tmp/claude-session-${sessionId}-files.json`,
      `/tmp/Codex-session-${sessionId}-files.json`,
    ],
    legacyReviewed: [
      `/tmp/claude-session-${sessionId}-reviewed.json`,
      `/tmp/Codex-session-${sessionId}-reviewed.json`,
    ],
  };
}

function readSessionFiles(id) {
  const paths = sessionPaths(id);
  for (const file of [paths.files, ...paths.legacyFiles]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

function currentDiffHash() {
  const hash = crypto.createHash("sha256");
  for (const args of [["diff"], ["diff", "--cached"]]) {
    try {
      hash.update(`git ${args.join(" ")}\0`);
      hash.update(execFileSync("git", args, { timeout: 5000 }));
    } catch {}
  }
  try {
    const output = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], { timeout: 5000 });
    const files = output.toString("utf8").split("\0").filter(Boolean).sort();
    for (const file of files) {
      hash.update(`untracked\0${file}\0`);
      try {
        const stat = fs.statSync(file);
        if (stat.isFile()) hash.update(fs.readFileSync(file));
      } catch (error) {
        hash.update(`unreadable\0${error.code || error.message}\0`);
      }
    }
  } catch {}
  return hash.digest("hex");
}

function markReviewed(skill, id) {
  const paths = sessionPaths(id);
  const marker = {
    reviewed: true,
    skill,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    diffHash: currentDiffHash(),
  };
  fs.writeFileSync(paths.reviewed, JSON.stringify(marker) + "\n");
  return paths.reviewed;
}

function printStatus() {
  const settings = readSettings();
  console.log(
    JSON.stringify(
      {
        settings,
        model: readModel(),
        reviewers: reviewerSettingsStatus(),
        adversarialReviewers: adversarialReviewerSettingsStatus().reviewers,
        checks: checkSettingsStatus().checks,
        paths: { settings: SETTINGS_PATH, model: MODEL_PATH, planReviewers: PLAN_REVIEWERS_PATH },
      },
      null,
      2,
    ),
  );
}

function runOllamaResult(model, prompt) {
  const args = ["run", model, prompt];
  const first = spawnSync("ollama", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  if (first.status === 0) {
    writeReviewerProcessOutput(first);
    return { exitCode: first.status, output: `${first.stdout || ""}${first.stderr || ""}`, error: first.error || null };
  }

  // Compatibility fallback for older Ollama launch workflows.
  const fallback = spawnSync("ollama", ["launch", "claude", "--model", model, "--yes", "--", "-p", prompt], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const output = `${fallback.stdout || first.stdout || ""}${fallback.stderr || first.stderr || ""}`;
  if (fallback.stdout || fallback.stderr) writeReviewerProcessOutput(fallback);
  else writeReviewerProcessOutput(first);
  return { exitCode: fallback.status ?? first.status ?? 1, output, error: fallback.error || first.error || null };
}

function runOllama(model, prompt) {
  return runOllamaResult(model, prompt).exitCode;
}

function reviewerResultLooksUnauthenticated(output) {
  return /\b(not logged in|not authenticated|unauthorized|authentication required|api key|login required|please log in|not signed in)\b/i.test(
    String(output || ""),
  );
}

function reviewerBlockedReason(output, error) {
  const text = `${output || ""}\n${error?.message || ""}`;
  if (reviewerResultLooksUnauthenticated(text)) return "not authenticated";
  if (/\b(operation not permitted|permission denied|sandbox|blocked by sandbox|approval denied|approval rejected|request denied|request rejected)\b/i.test(text)) {
    return "sandbox or permission denied";
  }
  return "";
}

function reviewerOutcome(exitCode, output = "", error = null) {
  if (exitCode === 0) return { status: "passed", exitCode: 0, reason: "" };
  const blockedReason = reviewerBlockedReason(output, error);
  if (blockedReason) return { status: "blocked", exitCode: exitCode || 2, reason: blockedReason };
  return { status: "failed", exitCode: exitCode || 1, reason: `exit code ${exitCode || 1}` };
}

function staticReviewerOutcome(status, exitCode, reason) {
  return { status, exitCode, reason };
}

function emitReviewerOutcome(provider, label, outcome) {
  const suffix = outcome.reason ? ` - ${outcome.reason}` : "";
  console.error(`${REVIEWER_RUN_RESULT_PREFIX} ${outcome.status}${suffix}`);
  if (outcome.status === "blocked") {
    console.error(`${REVIEWER_LABELS[provider] || provider} ${label} blocked - ${outcome.reason}`);
  } else if (outcome.status === "failed") {
    console.error(`${REVIEWER_LABELS[provider] || provider} ${label} failed - ${outcome.reason}`);
  }
}

function writeReviewerProcessOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function emitCheckOutcome(check, outcome) {
  const suffix = outcome.reason ? ` - ${outcome.reason}` : "";
  console.error(`PZA check result: ${outcome.status}${suffix}`);
  if (outcome.status !== "passed") {
    console.error(`${CHECK_LABELS[check] || check} check ${outcome.status} - ${outcome.reason}`);
  }
}

function snykCheckOutcome(exitCode, output = "", error = null) {
  if (error) {
    const reason = error.code === "ENOENT" ? "snyk is not installed" : error.message;
    return staticReviewerOutcome(error.code === "ENOENT" ? "blocked" : "failed", error.code === "ENOENT" ? 127 : 1, reason);
  }
  const blockedReason = reviewerBlockedReason(output, error);
  if (blockedReason) return staticReviewerOutcome("blocked", exitCode || 2, blockedReason);
  if (exitCode === 0) return staticReviewerOutcome("passed", 0, "");
  if (exitCode === 1) return staticReviewerOutcome("failed", 1, "vulnerabilities found at or above the configured severity threshold");
  if (exitCode === 2) return staticReviewerOutcome("failed", 2, "Snyk scan failed");
  if (exitCode === 3) return staticReviewerOutcome("skipped", 3, "no supported projects detected");
  return staticReviewerOutcome("failed", exitCode || 1, `exit code ${exitCode || 1}`);
}

function runSnykCheck(args = []) {
  const severity = normalizeSeverityThreshold(optionValue(args, "--severity-threshold", readSettings().checks.snyk.severityThreshold));
  if (!commandPath(CHECK_COMMANDS.snyk)) {
    const outcome = staticReviewerOutcome("blocked", 127, "snyk is not installed");
    emitCheckOutcome("snyk", outcome);
    return outcome.exitCode;
  }

  console.error(
    "PZA Snyk check: opt-in trusted-worktree scan. Snyk CLI may execute package-manager code while collecting dependency data.",
  );
  const result = spawnSync(CHECK_COMMANDS.snyk, ["test", `--severity-threshold=${severity}`], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 5 * 60 * 1000,
  });
  writeReviewerProcessOutput(result);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const outcome = snykCheckOutcome(result.status ?? 1, output, result.error || null);
  emitCheckOutcome("snyk", outcome);
  return outcome.exitCode;
}

function runSpawnedReviewer(provider, args, prompt, options = {}) {
  const command = REVIEWER_COMMANDS[provider];
  if (!command || !commandPath(command)) {
    const reason = `${command || provider} is not installed`;
    return staticReviewerOutcome("blocked", 127, reason);
  }

  const result = spawnSync(command, args, {
    input: options.stdin ? prompt : undefined,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 5 * 60 * 1000,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  writeReviewerProcessOutput(result);
  if (result.error) {
    const reason = result.error.code === "ENOENT" ? `command not found: ${command}` : result.error.message;
    const isBlocked = Boolean(reviewerBlockedReason(output, result.error)) || result.error.code === "ENOENT";
    const status = isBlocked ? "blocked" : "failed";
    return staticReviewerOutcome(status, result.error.code === "ENOENT" ? 127 : 1, reason);
  }
  return reviewerOutcome(result.status ?? 1, output, null);
}

function antigravitySupportsSafePrint() {
  const command = REVIEWER_COMMANDS.antigravity;
  if (!commandPath(command)) return false;
  const result = spawnSync(command, ["--help"], { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 5000 });
  const help = `${result.stdout || ""}${result.stderr || ""}`;
  return /--print\b/.test(help) && /--sandbox\b/.test(help);
}

function runReviewer(modeRaw, providerRaw, modelRaw, prompt) {
  const mode = String(modeRaw || "").trim().toLowerCase();
  const provider = normalizeReviewerName(providerRaw);
  const model = String(modelRaw || "").trim();
  if (!["code", "plan", "adversarial"].includes(mode) || !provider) {
    console.error("Usage: pza-runtime run-reviewer <code|plan|adversarial> <provider> [model]");
    return 2;
  }
  if (!REVIEWER_COMMANDS[provider]) {
    const outcome = staticReviewerOutcome("blocked", 2, `unsupported provider: ${providerRaw}`);
    emitReviewerOutcome(provider, `${mode} review`, outcome);
    return 2;
  }

  const label = `${mode} review`;
  const beforeHash = currentDiffHash();
  let outcome = staticReviewerOutcome("failed", 1, "reviewer did not run");
  if (provider === "ollama") {
    if (!model) {
      outcome = staticReviewerOutcome("blocked", 2, "model is not configured");
    } else if (!commandPath(REVIEWER_COMMANDS.ollama)) {
      outcome = staticReviewerOutcome("blocked", 127, "ollama is not installed");
    } else {
      const result = runOllamaResult(model, prompt);
      outcome = reviewerOutcome(result.exitCode, result.output, result.error);
    }
  } else if (provider === "codex") {
    const args = ["exec"];
    if (model) args.push("--model", model);
    args.push("-");
    outcome = runSpawnedReviewer(provider, args, prompt, { label, stdin: true });
  } else if (provider === "opencode") {
    const args = ["run"];
    if (model) args.push("--model", model);
    args.push(prompt);
    outcome = runSpawnedReviewer(provider, args, prompt, { label });
  } else if (provider === "kilo") {
    const args = ["run"];
    if (model) args.push("--model", model);
    args.push(prompt);
    outcome = runSpawnedReviewer(provider, args, prompt, { label });
  } else if (provider === "cursor") {
    const args = ["-p", "--output-format", "text"];
    if (model) args.push("--model", model);
    args.push(prompt);
    outcome = runSpawnedReviewer(provider, args, prompt, { label });
  } else if (provider === "antigravity") {
    if (!antigravitySupportsSafePrint()) {
      outcome = staticReviewerOutcome("blocked", 2, "safe non-interactive sandbox print mode was not confirmed");
    } else {
      outcome = runSpawnedReviewer(provider, ["--sandbox", "--print", prompt], prompt, { label });
    }
  }

  const afterHash = currentDiffHash();
  if (beforeHash !== afterHash) {
    const changed = staticReviewerOutcome("failed", 3, "worktree changed during review");
    console.error(`${REVIEWER_LABELS[provider] || provider} ${label} stopped - worktree changed during review.`);
    emitReviewerOutcome(provider, label, changed);
    return 3;
  }
  emitReviewerOutcome(provider, label, outcome);
  return outcome.exitCode;
}

const cmd = process.argv[2];
if (cmd === "settings") printStatus();
else if (cmd === "get-setting") console.log(readSettings()[process.argv[3]] !== false ? "yes" : "no");
else if (cmd === "set-settings") {
  const next = {};
  const reviewers = { ...readSettings().reviewers };
  for (let i = 3; i < process.argv.length; i += 2) {
    const key = normalizeReviewerName(process.argv[i]);
    const enabled = process.argv[i + 1] === "on";
    if (REVIEWER_ORDER.includes(key)) {
      reviewers[key] = { ...(reviewers[key] || {}), enabled };
      if (["ollama", "codex"].includes(key)) next[key] = enabled;
    } else {
      next[key] = enabled;
    }
  }
  if (Object.keys(reviewers).length) next.reviewers = reviewers;
  writeSettings(next);
  printStatus();
} else if (cmd === "get-model") console.log(readModel());
else if (cmd === "set-model") {
  writeModel(process.argv[3]);
  setReviewer("ollama", "model", process.argv[3], false);
  console.log(readModel());
} else if (cmd === "reviewer-settings") printReviewerSettings();
else if (cmd === "check-settings") printCheckSettings();
else if (cmd === "adversarial-reviewer-settings") {
  printAdversarialReviewerSettings({ force: process.argv.includes("--force") });
} else if (cmd === "add-adversarial-reviewer") {
  process.exit(addAdversarialReviewer(process.argv[3], process.argv[4], process.argv[5]));
} else if (cmd === "set-adversarial-reviewer") {
  const value = process.argv.slice(5).join(" ");
  process.exit(setAdversarialReviewer(process.argv[3], process.argv[4], value));
} else if (cmd === "remove-adversarial-reviewer") {
  process.exit(removeAdversarialReviewer(process.argv[3]));
}
else if (cmd === "set-reviewer") {
  const value = process.argv.slice(5).join(" ");
  process.exit(setReviewer(process.argv[3], process.argv[4], value));
} else if (cmd === "set-check") {
  const value = process.argv.slice(5).join(" ");
  process.exit(setCheck(process.argv[3], process.argv[4], value));
} else if (cmd === "get-reviewer-enabled") {
  const value = getReviewerValue(process.argv[3], "enabled");
  if (value === null) process.exit(2);
  console.log(value);
} else if (cmd === "get-reviewer-model") {
  const value = getReviewerValue(process.argv[3], "model");
  if (value === null) process.exit(2);
  console.log(value);
} else if (cmd === "settings-ui") {
  const exitCode = runSettingsUi(process.argv.slice(3));
  if (exitCode !== null) process.exit(exitCode);
} else if (cmd === "plan-reviewers") printPlanReviewers();
else if (cmd === "skill-status") process.exit(printSkillStatus(process.argv[3]));
else if (cmd === "redact-context") process.exit(printRedactedContext());
else if (cmd === "collect-plan-context") process.exit(printCollectedPlanContext(process.argv.slice(3)));
else if (cmd === "collect-review-context") process.exit(printCollectedReviewContext(process.argv.slice(3)));
else if (cmd === "validate-hook-proposal") process.exit(validateHookProposal());
else if (cmd === "plan-review-prompt") process.exit(printPlanReviewPrompt(process.argv[3], process.argv[4]));
else if (cmd === "run-plan-reviewer") {
  const prompt = fs.readFileSync(0, "utf8");
  process.exit(runCustomPlanReviewer(process.argv[3], prompt));
} else if (cmd === "session-files") {
  const files = readSessionFiles(process.argv[3]);
  if (files.length) files.forEach((f) => console.log(f));
  else process.exit(1);
} else if (cmd === "session-stat") {
  const files = readSessionFiles(process.argv[3]);
  if (!files.length) process.exit(1);
  const result = spawnSync("git", ["diff", "--stat", "--", ...files], { stdio: "inherit" });
  process.exit(result.status ?? 1);
} else if (cmd === "mark-reviewed") console.log(markReviewed(process.argv[3] || "unknown", process.argv[4]));
else if (cmd === "diff-hash") console.log(currentDiffHash());
else if (cmd === "ollama-run") {
  const model = process.argv[3];
  const prompt = fs.readFileSync(0, "utf8");
  process.exit(runOllama(model, prompt));
} else if (cmd === "run-reviewer") {
  const prompt = fs.readFileSync(0, "utf8");
  process.exit(runReviewer(process.argv[3], process.argv[4], process.argv[5], prompt));
} else if (cmd === "run-check") {
  if (process.argv[3] === "snyk") process.exit(runSnykCheck(process.argv.slice(4)));
  console.error("Usage: pza-runtime run-check snyk [--severity-threshold <low|medium|high|critical>]");
  process.exit(2);
} else {
  console.error("Usage: pza-runtime <settings|get-setting|set-settings|get-model|set-model|reviewer-settings|check-settings|adversarial-reviewer-settings|add-adversarial-reviewer|set-adversarial-reviewer|remove-adversarial-reviewer|set-reviewer|set-check|get-reviewer-enabled|get-reviewer-model|settings-ui|plan-reviewers|skill-status|redact-context|collect-plan-context|collect-review-context|validate-hook-proposal|plan-review-prompt|run-plan-reviewer|session-files|session-stat|mark-reviewed|diff-hash|ollama-run|run-reviewer|run-check>");
  process.exit(2);
}
