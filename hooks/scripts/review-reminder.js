#!/usr/bin/env node
const fs = require("fs");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const { session_id } = input;

if (!session_id || /[/\\\0]|\.\./.test(session_id)) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const filesPath = `/tmp/claude-session-${session_id}-files.json`;
const reviewedPath = `/tmp/claude-session-${session_id}-reviewed.json`;

const hasFiles =
  fs.existsSync(filesPath) &&
  (() => {
    try {
      const arr = JSON.parse(fs.readFileSync(filesPath, "utf8"));
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  })();

function currentDiffHash() {
  const hash = crypto.createHash("sha256");
  try {
    hash.update(execFileSync("git", ["diff"], { encoding: "utf8", timeout: 3000 }));
  } catch {}
  try {
    hash.update(execFileSync("git", ["diff", "--cached"], { encoding: "utf8", timeout: 3000 }));
  } catch {}
  try {
    hash.update(execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8", timeout: 3000 }));
  } catch {}
  return hash.digest("hex");
}

let reviewCurrent = false;
if (fs.existsSync(reviewedPath)) {
  try {
    const marker = JSON.parse(fs.readFileSync(reviewedPath, "utf8"));
    if (marker.diffHash) {
      reviewCurrent = currentDiffHash() === marker.diffHash;
    }
  } catch {
    reviewCurrent = false;
  }
}

if (hasFiles && !reviewCurrent) {
  console.log(
    JSON.stringify({
      continue: true,
      systemMessage:
        "This session modified files but no code review was run (or the diff has changed since the last review). Consider running /arewedone or /ollama-review before finishing.",
    })
  );
} else {
  console.log(JSON.stringify({ continue: true }));
}
