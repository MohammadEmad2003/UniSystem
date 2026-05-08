/**
 * Auto-resolve git conflict markers in working tree.
 *
 * Strategy:
 * - Keep OURS for attendance/lecture backend logic + embedded firmware files.
 * - Keep THEIRS for everything else (GitHub version is base).
 *
 * This script only operates on text files that contain conflict markers.
 */

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

// Paths are relative to repo root, using forward slashes.
const keepOurs = new Set([
  "backend/controllers/attendanceController.js",
  "backend/controllers/LectureController.js",
  "backend/routes/lecture.js",
  "backend/routes/attendance.js",
  "backend/models/attendanceModel.js",
  "backend/models/lectureModel.js",
  "embedd_system/src/main.cpp",
]);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function isBinaryLikely(buf) {
  // Heuristic: if it contains a lot of NULs, treat as binary
  let nulCount = 0;
  const sample = buf.subarray(0, Math.min(buf.length, 8000));
  for (const b of sample) if (b === 0) nulCount++;
  return nulCount > 0;
}

function resolveConflicts(content, strategy) {
  const lines = content.split(/\r?\n/);
  const out = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith("<<<<<<<")) {
      out.push(line);
      i++;
      continue;
    }

    // Parse a single conflict block
    i++; // skip <<<<<<<
    const ours = [];
    while (i < lines.length && !lines[i].startsWith("=======")) {
      ours.push(lines[i++]);
    }
    if (i >= lines.length) throw new Error("Unterminated conflict (missing =======)");
    i++; // skip =======
    const theirs = [];
    while (i < lines.length && !lines[i].startsWith(">>>>>>>")) {
      theirs.push(lines[i++]);
    }
    if (i >= lines.length) throw new Error("Unterminated conflict (missing >>>>>>>)");
    i++; // skip >>>>>>>

    out.push(...(strategy === "ours" ? ours : theirs));
  }

  return out.join("\n");
}

function walk(dirAbs) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === ".git" || ent.name === "node_modules" || ent.name === "dist") continue;
    const abs = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      walk(abs);
      continue;
    }

    let buf;
    try {
      buf = fs.readFileSync(abs);
    } catch {
      continue;
    }

    if (isBinaryLikely(buf)) continue;

    const text = buf.toString("utf8");
    if (!text.includes("<<<<<<<") || !text.includes("=======") || !text.includes(">>>>>>>")) continue;

    const rel = toPosix(path.relative(repoRoot, abs));
    const strategy = keepOurs.has(rel) ? "ours" : "theirs";

    const resolved = resolveConflicts(text, strategy);
    fs.writeFileSync(abs, resolved, "utf8");
  }
}

walk(repoRoot);
console.log("Conflict markers resolved.");

