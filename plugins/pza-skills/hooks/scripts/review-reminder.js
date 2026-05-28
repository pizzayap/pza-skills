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

const filePaths = [
  `/tmp/pza-skills-session-${session_id}-files.json`,
  `/tmp/claude-session-${session_id}-files.json`,
  `/tmp/Codex-session-${session_id}-files.json`,
];
const reviewedPaths = [
  `/tmp/pza-skills-session-${session_id}-reviewed.json`,
  `/tmp/claude-session-${session_id}-reviewed.json`,
  `/tmp/Codex-session-${session_id}-reviewed.json`,
];

const hasFiles =
  filePaths.some((filesPath) =>
    fs.existsSync(filesPath) &&
    (() => {
      try {
        const arr = JSON.parse(fs.readFileSync(filesPath, "utf8"));
        return Array.isArray(arr) && arr.length > 0;
      } catch {
        return false;
      }
    })()
  );

function currentDiffHash() {
  const hash = crypto.createHash("sha256");
  for (const args of [["diff"], ["diff", "--cached"]]) {
    try {
      hash.update(`git ${args.join(" ")}\0`);
      hash.update(execFileSync("git", args, { timeout: 3000 }));
    } catch {}
  }
  try {
    const output = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], { timeout: 3000 });
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

let reviewCurrent = false;
for (const reviewedPath of reviewedPaths) {
  if (!reviewCurrent && fs.existsSync(reviewedPath)) {
    try {
      const marker = JSON.parse(fs.readFileSync(reviewedPath, "utf8"));
      if (marker.diffHash) {
        reviewCurrent = currentDiffHash() === marker.diffHash;
      }
    } catch {
      reviewCurrent = false;
    }
  }
}

if (hasFiles && !reviewCurrent) {
  console.log(
    JSON.stringify({
      continue: true,
      systemMessage:
        "This session modified files but no code review was run (or the diff has changed since the last review). Consider running /arewedone before finishing.",
    })
  );
} else {
  console.log(JSON.stringify({ continue: true }));
}
