#!/usr/bin/env node
// Public-boundary guard. This repository is public, so lines added on the branch must not carry credentials,
// credentialed URLs, internal hostnames or private network addresses. The checks are structural: this file holds
// no list of private names. A protected pattern source can be supplied at run time (see below).
//
//   node scripts/check-private-identifiers.mjs
//
// Scans the added lines of `git diff -U0 origin/main...HEAD`, except this file.
// Optional: PRIVATE_IDENTIFIER_PATTERNS_FILE=<path> names a JSON array of regular-expression sources kept outside
// this repository (for example written from a CI secret). Those patterns are applied too. When it is unset only
// the structural checks run, and the output says so.
// Exit codes: 0 clean, 1 hit, 2 origin/main is missing or the pattern file is unreadable.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "scripts/check-private-identifiers.mjs";

/** The documented Android emulator alias is the one private address the client may name. */
const ALLOWED_PRIVATE_IPS = new Set(["10.0.2.2"]);

/** Structural patterns: what a secret or an internal address looks like, not which ones exist. */
export const STRUCTURAL = [
  { name: "private-key-block", test: (line) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line) },
  {
    name: "provider-token",
    test: (line) =>
      /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|xox[abprs]-[A-Za-z0-9-]{10,})\b/.test(
        line,
      ),
  },
  {
    name: "jwt",
    test: (line) => /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/.test(line),
  },
  { name: "bearer-token", test: (line) => /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}/.test(line) },
  {
    name: "url-with-credentials",
    test: (line) => /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@[^\s/]+/i.test(line),
  },
  {
    name: "internal-hostname",
    test: (line) =>
      /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:internal|corp|lan|intranet|home\.arpa)\b/i.test(line),
  },
  {
    name: "private-ip",
    test: (line) =>
      [
        ...line.matchAll(
          /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
        ),
      ].some((match) => !ALLOWED_PRIVATE_IPS.has(match[1])),
  },
];

/** @returns {{pattern: string, line: number, text: string}[]} */
export function scan(text, extra = []) {
  const hits = [];
  text.split("\n").forEach((line, index) => {
    for (const { name, test } of STRUCTURAL) {
      if (test(line)) hits.push({ pattern: name, line: index + 1, text: "(structural match)" });
    }
    for (const pattern of extra) {
      if (pattern.test(line))
        hits.push({ pattern: "protected-pattern", line: index + 1, text: "(protected match)" });
    }
  });
  return hits;
}

/** Regular expressions from a JSON array of sources; throws on anything else. */
export function loadProtectedPatterns(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (
    !Array.isArray(parsed) ||
    parsed.some((source) => typeof source !== "string" || source === "")
  ) {
    throw new Error("the pattern file must be a JSON array of non-empty strings");
  }
  return parsed.map((source) => new RegExp(source, "i"));
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
  let extra = [];
  const patternFile = process.env.PRIVATE_IDENTIFIER_PATTERNS_FILE;
  if (patternFile) {
    try {
      extra = loadProtectedPatterns(patternFile);
    } catch (error) {
      console.error(`check-private-identifiers: cannot use the pattern file: ${error.message}`);
      return 2;
    }
  } else {
    console.log("protected pattern source not configured: only the structural checks ran");
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
      for (const hit of scan(text, extra)) {
        hits += 1;
        console.log(`${file}:${line}: ${hit.pattern}`);
      }
    }
  }
  console.log(
    hits === 0 ? "no credential-shaped or internal-address lines added" : `${hits} hit(s)`,
  );
  return hits === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
