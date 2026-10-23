#!/usr/bin/env node
// Privacy guard: this repository is public, so lines added on the branch must not carry private
// product names, hosts or flag keys.
//
//   node scripts/check-private-identifiers.mjs
//
// Scans the added lines of `git diff -U0 origin/main...HEAD`, except this file (it holds the patterns).
// Exit codes: 0 clean, 1 hit, 2 origin/main is missing.

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "scripts/check-private-identifiers.mjs";

export const PATTERNS = [
  /\bibot\b/i,
  /\bethen\b/i,
  /\bfaros\b/i,
  /\btemporal\b/i,
  /robot_os/i,
  /\/api\/robot\//i,
  /ROBOT_OS/i,
  /robot\.[a-z]+\.[a-z0-9_.]+/i,
  /vercel\.app/i,
  /fly\.dev/i,
];

/** @returns {{pattern: string, line: number, text: string}[]} */
export function scan(text) {
  const hits = [];
  text.split("\n").forEach((line, index) => {
    for (const pattern of PATTERNS) {
      if (pattern.test(line))
        hits.push({ pattern: String(pattern), line: index + 1, text: line.trim().slice(0, 120) });
    }
  });
  return hits;
}

/** Added lines per file from a zero-context unified diff. */
export function addedLines(diff) {
  const files = new Map();
  let file = null;
  let line = 0;
  for (const row of diff.split("\n")) {
    if (row.startsWith("+++ ")) {
      file = row.startsWith("+++ b/") ? row.slice(6) : null;
    } else if (row.startsWith("@@")) {
      const match = /\+(\d+)/.exec(row);
      line = match ? Number(match[1]) : 0;
    } else if (file !== null && row.startsWith("+") && !row.startsWith("+++")) {
      if (!files.has(file)) files.set(file, []);
      files.get(file).push({ line, text: row.slice(1) });
      line += 1;
    }
  }
  return files;
}

function main() {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", "origin/main"], {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    console.error("check-private-identifiers: origin/main not found; fetch it first");
    return 2;
  }
  const diff = execFileSync("git", ["diff", "-U0", "origin/main...HEAD"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  let hits = 0;
  for (const [file, lines] of addedLines(diff)) {
    if (file === SELF) continue;
    for (const { line, text } of lines) {
      for (const pattern of PATTERNS) {
        if (pattern.test(text)) {
          hits += 1;
          console.log(`${file}:${line}: ${pattern}`);
        }
      }
    }
  }
  console.log(hits === 0 ? "no private identifiers in added lines" : `${hits} hit(s)`);
  return hits === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
