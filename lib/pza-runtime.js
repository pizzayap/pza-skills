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
const REVIEWER_LABELS = {
  native: "Native",
  ollama: "Ollama",
  codex: "Codex",
  opencode: "OpenCode",
  kilo: "Kilo Code",
  cursor: "Cursor Agent",
  antigravity: "Antigravity",
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
      label: REVIEWER_LABELS[name] || name,
      enabled: settings.reviewers[name]?.enabled !== false,
      model,
      command,
      installed: name === "native" ? true : Boolean(installedPath),
      path: installedPath,
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

function saveReviewerUiState(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Expected a JSON object.");
  }

  const settings = readSettings();
  const reviewers = { ...settings.reviewers };
  const incoming = payload.reviewers && typeof payload.reviewers === "object" ? payload.reviewers : {};
  for (const name of REVIEWER_ORDER) {
    const value = incoming[name];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    reviewers[name] = { ...(reviewers[name] || {}) };
    if (typeof value.enabled === "boolean") reviewers[name].enabled = value.enabled;
    if (typeof value.model === "string") reviewers[name].model = value.model.trim();
  }

  const next = { reviewers };
  if (typeof payload.adversarial === "boolean") next.adversarial = payload.adversarial;
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
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .table-head, .row {
      display: grid;
      grid-template-columns: 1.25fr 110px 110px minmax(220px, 1.5fr) 1.4fr;
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
    .row { border-bottom: 1px solid var(--line); }
    .row:last-child { border-bottom: 0; }
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
    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: max-content;
      cursor: pointer;
      user-select: none;
    }
    .toggle input { inline-size: 18px; block-size: 18px; accent-color: var(--accent); }
    input[type="text"] {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 9px;
      color: var(--text);
      font: inherit;
      background: #ffffff;
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
      .table-head { display: none; }
      .row {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 14px;
      }
      .row > *::before {
        display: block;
        margin-bottom: 3px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .installed::before { content: "Installed"; }
      .enabled::before { content: "Enabled"; }
      .model::before { content: "Model"; }
      .notes::before { content: "Notes"; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>PZA Settings</h1>
        <p>Configure reviewer backends used by /areyousure and /arewedone.</p>
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
        <div>Model</div>
        <div>Notes</div>
      </div>
      <div id="reviewers"></div>
    </section>
    <div class="footer">
      <div id="paths"></div>
      <div id="status" role="status" aria-live="polite"></div>
    </div>
  </main>
  <script>
    const token = ${JSON.stringify(token)};
    const reviewersEl = document.getElementById("reviewers");
    const adversarialEl = document.getElementById("adversarial");
    const statusEl = document.getElementById("status");
    const pathsEl = document.getElementById("paths");
    let state = null;

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
      if (reviewer.notes) parts.push(reviewer.notes);
      if (reviewer.enabled && !reviewer.installed) parts.push("Enabled but command is not installed.");
      if (reviewer.path) parts.push(reviewer.path);
      return parts.join(" ");
    }

    function render(data) {
      state = data;
      adversarialEl.checked = Boolean(data.adversarial);
      pathsEl.textContent = "Settings: " + data.paths.settings;
      reviewersEl.replaceChildren();
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
        if (reviewer.enabled && !reviewer.installed) notes.classList.add("warning");

        row.append(name, installed, enabled, model, notes);
        reviewersEl.append(row);
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
      return { adversarial: adversarialEl.checked, reviewers };
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
    console.error(`Unable to start PZA Settings UI: ${error.message}`);
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

function buildPlanReviewPrompt(planContent, source = "unknown") {
  return `Review this implementation plan for technical accuracy. Check for:
- Outdated APIs or deprecated patterns
- Wrong method signatures or return types
- Incorrect configuration formats
- Missing steps or dependencies
- Assumptions that don't match current library docs or local code

Review only. Do not modify files, run fix commands, or apply patches.

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
} else if (cmd === "settings-ui") {
  const exitCode = runSettingsUi(process.argv.slice(3));
  if (exitCode !== null) process.exit(exitCode);
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
  console.error("Usage: pza-runtime <settings|get-setting|set-settings|get-model|set-model|reviewer-settings|set-reviewer|get-reviewer-enabled|get-reviewer-model|settings-ui|plan-reviewers|plan-review-prompt|run-plan-reviewer|session-files|session-stat|mark-reviewed|diff-hash|ollama-run>");
  process.exit(2);
}
