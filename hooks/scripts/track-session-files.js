#!/usr/bin/env node
const fs = require("fs");

let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const { session_id, tool_name, tool_input } = input;

// Validate session_id (security: prevent path traversal and null bytes)
if (!session_id || /[/\\\0]|\.\./.test(session_id)) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Track files modified by Edit or Write tools
if (tool_name === "Edit" || tool_name === "Write") {
  const filePath = tool_input?.file_path;
  if (filePath && typeof filePath === "string") {
    const trackFile = `/tmp/claude-session-${session_id}-files.json`;

    let files = [];
    try {
      if (fs.existsSync(trackFile)) {
        files = JSON.parse(fs.readFileSync(trackFile, "utf8"));
      }
    } catch {
      files = [];
    }

    if (!files.includes(filePath)) {
      files.push(filePath);
      // Atomic write: write to a per-pid temp file, then rename. Prevents
      // lost updates if two Write/Edit hooks run concurrently for the same session.
      const tmpFile = `${trackFile}.tmp.${process.pid}`;
      fs.writeFileSync(tmpFile, JSON.stringify(files, null, 2));
      fs.renameSync(tmpFile, trackFile);
    }
  }
}

console.log(JSON.stringify({ continue: true }));
