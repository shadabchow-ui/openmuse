#!/usr/bin/env node
// Patch-surface guard for the external-backend branch.
//
//   node scripts/check-patch-surface.mjs
//
// 1. Every path changed against origin/main must be on the allowed list below.
// 2. No file under apps/mobile/src or apps/mobile/App.tsx may import a web-only UI library
//    (the import-deny list). This reads the committed tree, not just the diff.
// Exit codes: 0 clean, 1 violations, 2 origin/main is missing.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Exact paths, or a single `*` that stands for one path segment's characters (no slash). */
export const ALLOWED = [
  "apps/mobile/src/api-config.ts",
  "apps/mobile/src/api.ts",
  "apps/mobile/src/api-response.ts",
  "apps/mobile/src/capabilities.ts",
  "apps/mobile/src/brand.ts",
  "apps/mobile/src/telemetry-off.ts",
  "apps/mobile/src/surface-url.ts",
  "apps/mobile/src/plan-proposal.ts",
  "apps/mobile/src/approval-catalog.ts",
  "apps/mobile/src/plan-card.tsx",
  "apps/mobile/src/embedded-surface.tsx",
  "apps/mobile/index.js",
  "apps/mobile/App.tsx",
  "apps/mobile/src/chat.tsx",
  "apps/mobile/src/details.tsx",
  "apps/mobile/src/workspace.tsx",
  "apps/mobile/src/agent-ui.tsx",
  "apps/mobile/src/screens.tsx",
  "apps/mobile/src/threads.tsx",
  "packages/domain/src/index.ts",
  "packages/domain/src/muse-contract.ts",
  "apps/mobile/test/*.test.ts",
  "scripts/check-patch-surface.mjs",
  "scripts/check-private-identifiers.mjs",
  ".github/workflows/external-backend.yml",
  "docs/EXTERNAL-BACKEND.md",
];

export function isAllowed(path) {
  return ALLOWED.some((entry) => {
    if (!entry.includes("*")) return entry === path;
    const [head, tail] = entry.split("*");
    return (
      path.startsWith(head) &&
      path.endsWith(tail) &&
      !path.slice(head.length, path.length - tail.length).includes("/")
    );
  });
}

/** Import specifiers that must never reach the client or a native bundle. `lucide-react-native` is allowed. */
export function isDeniedImport(specifier) {
  return (
    specifier.startsWith("@radix-ui/") ||
    specifier === "radix-ui" ||
    specifier.startsWith("radix-ui/") ||
    specifier === "tailwindcss" ||
    specifier.startsWith("tailwindcss/") ||
    specifier === "next-themes" ||
    specifier.startsWith("next-themes/") ||
    specifier === "lucide-react" ||
    specifier.startsWith("lucide-react/") ||
    /^@[^/]+\/robot-ui(-tokens)?(\/|$)/.test(specifier)
  );
}

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

/** @param {{path: string, text: string}[]} files */
export function deniedImports(files) {
  const hits = [];
  for (const { path, text } of files) {
    text.split("\n").forEach((line, index) => {
      for (const match of line.matchAll(SPECIFIER)) {
        if (isDeniedImport(match[1])) hits.push({ path, line: index + 1, specifier: match[1] });
      }
    });
  }
  return hits;
}

/** Source files the import-deny rule covers, relative to `base`. */
export function sourceFiles(base) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) out.push(full);
    }
  };
  walk(join(base, "apps", "mobile", "src"));
  const app = join(base, "apps", "mobile", "App.tsx");
  if (existsSync(app)) out.push(app);
  return out.map((full) => ({
    path: relative(base, full).split(sep).join("/"),
    text: readFileSync(full, "utf8"),
  }));
}

function main() {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", "origin/main"], {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    console.error("check-patch-surface: origin/main not found; fetch it first");
    return 2;
  }
  const changed = execFileSync("git", ["diff", "--name-only", "origin/main...HEAD"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const problems = [];
  for (const path of changed) if (!isAllowed(path)) problems.push(`path not allowed: ${path}`);
  for (const hit of deniedImports(sourceFiles(root))) {
    problems.push(`denied import: ${hit.path}:${hit.line} imports ${hit.specifier}`);
  }
  for (const problem of problems) console.log(problem);
  console.log(
    problems.length === 0
      ? `patch surface clean (${changed.length} changed paths)`
      : `${problems.length} problem(s)`,
  );
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
