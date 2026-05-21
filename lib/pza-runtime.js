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
const DEFAULT_SETTINGS = { codex: true, ollama: true, adversarial: true };
const DEFAULT_MODEL = "kimi-k2.6:cloud";

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
  return {
    ...DEFAULT_SETTINGS,
    ...(readJson(LEGACY_SETTINGS.find((p) => fs.existsSync(p)) || "") || {}),
    ...(readJson(SETTINGS_PATH) || {}),
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
  console.log(JSON.stringify({ settings, model: readModel(), paths: { settings: SETTINGS_PATH, model: MODEL_PATH } }, null, 2));
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
  for (let i = 3; i < process.argv.length; i += 2) next[process.argv[i]] = process.argv[i + 1] === "on";
  writeSettings(next);
  printStatus();
} else if (cmd === "get-model") console.log(readModel());
else if (cmd === "set-model") {
  writeModel(process.argv[3]);
  console.log(readModel());
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
  console.error("Usage: pza-runtime <settings|get-setting|set-settings|get-model|set-model|session-files|session-stat|mark-reviewed|diff-hash|ollama-run>");
  process.exit(2);
}
