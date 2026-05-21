#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawnSync } = require("child_process");

const home = os.homedir();
const CONFIG_DIR = path.join(home, ".pza-skills");
const SETTINGS_PATH = path.join(CONFIG_DIR, "settings.json");
const MODEL_PATH = path.join(CONFIG_DIR, "ollama-model");
const PLAN_REVIEWERS_PATH = path.join(CONFIG_DIR, "plan-reviewers.json");
const DEFAULT_SETTINGS = { codex: true, ollama: true, adversarial: true };
const DEFAULT_MODEL = "kimi-k2.6:cloud";
const REVIEWER_ORDER = ["native", "ollama", "codex", "opencode", "kilo", "cursor", "antigravity"];
const REVIEWER_COMMANDS = {
  ollama: "ollama",
  codex: "codex",
  opencode: "opencode",
  kilo: "kilo",
  cursor: "cursor-agent",
  antigravity: "agy",
};

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
  return { ...settings, reviewers: normalizeReviewers(settings) };
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

function commandPath(command) {
  if (!command) return null;
  const result = spawnSync("sh", ["-c", 'command -v "$1"', "sh", command], { encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout.trim().split(/\r?\n/)[0] || null;
}

function reviewerSettingsStatus() {
  const settings = readSettings();
  return REVIEWER_ORDER.map((name) => {
    const command = REVIEWER_COMMANDS[name] || null;
    const installedPath = command ? commandPath(command) : null;
    const model = settings.reviewers[name]?.model || "";
    return {
      name,
      enabled: settings.reviewers[name]?.enabled !== false,
      model,
      command,
      installed: name === "native" ? true : Boolean(installedPath),
      path: installedPath,
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

function buildPlanReviewPrompt(planContent, source = "unknown") {
  return `Review this implementation plan for technical accuracy. Check for:
- Outdated APIs or deprecated patterns
- Wrong method signatures or return types
- Incorrect configuration formats
- Missing steps or dependencies
- Assumptions that don't match current library docs or local code

Plan source: ${source}

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
    process.stdout.write(buildPlanReviewPrompt(planContent, source));
    return 0;
  } catch (error) {
    console.error(`Unable to read plan content: ${error.message}`);
    return 1;
  }
}

function runCustomPlanReviewer(name, prompt) {
  const reviewer = readPlanReviewers().find((candidate) => candidate.enabled && candidate.name === name);
  if (!reviewer) {
    console.error(`Custom plan reviewer skipped - not configured or disabled: ${name}`);
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
    console.error(`Custom plan reviewer skipped - ${error.message}`);
    return 1;
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    const reason = result.error.code === "ENOENT" ? `command not found: ${reviewer.command[0]}` : result.error.message;
    console.error(`Custom plan reviewer skipped - ${reason}`);
    return result.error.code === "ENOENT" ? 127 : 1;
  }
  return result.status ?? 1;
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
  for (const args of [["diff"], ["diff", "--cached"], ["ls-files", "--others", "--exclude-standard"]]) {
    try {
      hash.update(execFileSync("git", args, { encoding: "utf8", timeout: 5000 }));
    } catch {}
  }
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
        paths: { settings: SETTINGS_PATH, model: MODEL_PATH, planReviewers: PLAN_REVIEWERS_PATH },
      },
      null,
      2,
    ),
  );
}

function runOllama(model, prompt) {
  const args = ["run", model, prompt];
  const first = spawnSync("ollama", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  if (first.status === 0) {
    process.stdout.write(first.stdout);
    process.stderr.write(first.stderr);
    return first.status;
  }

  // Compatibility fallback for older Ollama launch workflows.
  const fallback = spawnSync("ollama", ["launch", "claude", "--model", model, "--yes", "--", "-p", prompt], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  process.stdout.write(fallback.stdout || first.stdout || "");
  process.stderr.write(fallback.stderr || first.stderr || "");
  return fallback.status ?? first.status ?? 1;
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
    next[key] = enabled;
    if (["ollama", "codex"].includes(key)) reviewers[key] = { ...(reviewers[key] || {}), enabled };
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
else if (cmd === "set-reviewer") {
  const value = process.argv.slice(5).join(" ");
  process.exit(setReviewer(process.argv[3], process.argv[4], value));
} else if (cmd === "get-reviewer-enabled") {
  const value = getReviewerValue(process.argv[3], "enabled");
  if (value === null) process.exit(2);
  console.log(value);
} else if (cmd === "get-reviewer-model") {
  const value = getReviewerValue(process.argv[3], "model");
  if (value === null) process.exit(2);
  console.log(value);
} else if (cmd === "plan-reviewers") printPlanReviewers();
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
} else {
  console.error("Usage: pza-runtime <settings|get-setting|set-settings|get-model|set-model|reviewer-settings|set-reviewer|get-reviewer-enabled|get-reviewer-model|plan-reviewers|plan-review-prompt|run-plan-reviewer|session-files|session-stat|mark-reviewed|diff-hash|ollama-run>");
  process.exit(2);
}
