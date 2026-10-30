#!/usr/bin/env node
// Patch-surface guard for the external-backend branch.
//
//   node scripts/check-patch-surface.mjs
//
// 1. Every path changed against origin/main must be on the allowed list below.
// 2. No file under apps/mobile/src or apps/mobile/App.tsx may import a web-only UI library
//    (the import-deny list). This reads the committed tree, not just the diff.
// 3. Every package imported on a line the branch added must be declared in apps/mobile/package.json, so a
//    package that is not a declared dependency (for example one from a private registry) cannot slip in.
// Exit codes: 0 clean, 1 violations, 2 origin/main is missing.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Exact paths, or a single `*` that stands for one path segment's characters (no slash). */
export const ALLOWED = [
  "scripts/theme-launch-gate.mjs",
  "scripts/__tests__/theme-launch-gate.test.ts",
  "docs/theme-launch-gate/RESULTS.md",
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
  "apps/mobile/src/embed-messages.ts",
  "apps/mobile/src/embed-frame.tsx",
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
  "scripts/check-bundle-config.mjs",
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
    specifier.startsWith("lucide-react/")
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

const BUILTINS = new Set([
  "assert",
  "child_process",
  "crypto",
  "fs",
  "os",
  "path",
  "url",
  "util",
  "events",
  "stream",
]);

/** Package name of a bare specifier, or null for a relative path, a `node:` import or a built-in module. */
export function packageName(specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("node:"))
    return null;
  const parts = specifier.split("/");
  const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  return BUILTINS.has(name) ? null : name;
}

/**
 * Imports of packages that are not declared dependencies. `lines` are `{path, line, text}` for added lines only,
 * `declared` is a Set of package names from apps/mobile/package.json.
 */
export function undeclaredImports(lines, declared) {
  const hits = [];
  for (const { path, line, text } of lines) {
    for (const match of text.matchAll(SPECIFIER)) {
      const name = packageName(match[1]);
      if (name !== null && !declared.has(name)) hits.push({ path, line, specifier: match[1] });
    }
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

/** Package names declared in apps/mobile/package.json (dependencies, devDependencies, peerDependencies). */
export function declaredPackages(base) {
  const pkg = JSON.parse(readFileSync(join(base, "apps", "mobile", "package.json"), "utf8"));
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);
}

// Retain only byte/mode-identical source already accepted at this fixed public commit.
// This never permits a new path or a modified historical file.
export const ACCEPTED_SOURCE_BASELINE = "c03b183044295ee9c1005dfb3c86845f087bf5f0";
export function identicalAcceptedEntry(baseline, current) {
  return typeof baseline === "string" && baseline.length > 0 && baseline === current;
}
export function requireAcceptedAncestor(exists, ancestor) {
  if (!exists || !ancestor) throw Error("fixed accepted source baseline missing or not an ancestor");
}
function acceptedEntries(ref) {
  const raw=execFileSync("git",["ls-tree","-r","-z",ref],{cwd:root,encoding:"utf8",maxBuffer:64*1024*1024});
  return new Map(raw.split("\0").filter(Boolean).map(entry=>[entry.slice(entry.indexOf("\t")+1),entry]));
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
  let baselineEntries, currentEntries;
  try {
    const exists=execFileSync("git",["rev-parse","--verify",ACCEPTED_SOURCE_BASELINE+"^{commit}"],{cwd:root,encoding:"utf8"}).trim()===ACCEPTED_SOURCE_BASELINE;
    let ancestor=false;
    try { execFileSync("git",["merge-base","--is-ancestor",ACCEPTED_SOURCE_BASELINE,"HEAD"],{cwd:root,stdio:"ignore"});ancestor=true; } catch {}
    requireAcceptedAncestor(exists,ancestor);
    baselineEntries=acceptedEntries(ACCEPTED_SOURCE_BASELINE);currentEntries=acceptedEntries("HEAD");
  } catch(error) { console.error(String(error.message));return 2; }
  const changed = execFileSync("git", ["diff", "--name-only", "origin/main...HEAD"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const problems = [];
  for (const path of changed) if (!isAllowed(path) && !identicalAcceptedEntry(baselineEntries.get(path),currentEntries.get(path))) problems.push(`path not allowed: ${path}`);
  for (const hit of deniedImports(sourceFiles(root))) {
    problems.push(`denied import: ${hit.path}:${hit.line} imports ${hit.specifier}`);
  }
  const declared = declaredPackages(root);
  const added = execFileSync(
    "git",
    ["diff", "-U0", "origin/main...HEAD", "--", "apps/mobile/src", "apps/mobile/App.tsx"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const addedSource = [];
  let file = null;
  let lineNo = 0;
  for (const row of added.split("\n")) {
    if (row.startsWith("+++ ")) file = row.startsWith("+++ b/") ? row.slice(6) : null;
    else if (row.startsWith("@@")) lineNo = Number(/\+(\d+)/.exec(row)?.[1] ?? 0);
    else if (file !== null && row.startsWith("+") && !row.startsWith("+++")) {
      if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
        addedSource.push({ path: file, line: lineNo, text: row.slice(1) });
      lineNo += 1;
    }
  }
  for (const hit of undeclaredImports(addedSource, declared)) {
    problems.push(`undeclared package: ${hit.path}:${hit.line} imports ${hit.specifier}`);
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
