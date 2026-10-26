import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const nativeDir = join(mobileRoot, "src", "native");
const editedFiles = ["src/api.ts", "App.tsx", "src/chat.tsx", "src/workspace.tsx"].map((f) =>
  join(mobileRoot, f),
);

const SECRET_WORDS = ["token", "code", "verifier", "session", "pushToken"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (/\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

test("native modules never log, store in web storage, or alert", () => {
  const offenders: string[] = [];
  for (const path of walk(nativeDir)) {
    const source = readFileSync(path, "utf8");
    for (const pattern of [/console\./, /localStorage/, /AsyncStorage/, /[^_A-Za-z]alert\(/]) {
      if (pattern.test(source)) offenders.push(`${path}: ${String(pattern)}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("no secret is interpolated into a URL, log, or error", () => {
  const offenders: string[] = [];
  const files = [...walk(nativeDir), ...editedFiles];
  for (const path of files) {
    const lines = readFileSync(path, "utf8").split("\n");
    lines.forEach((line, index) => {
      const lowered = line.toLowerCase();
      const sinks = line.includes("http") || line.includes("console") || /throw new/.test(line);
      if (!sinks) return;
      for (const word of SECRET_WORDS) {
        if (new RegExp(`\\$\\{[^}]*\\b${word}\\b`, "i").test(line) && !lowered.includes("push-token")) {
          offenders.push(`${path}:${index + 1}: ${line.trim()}`);
        }
      }
    });
  }
  assert.deepEqual(offenders, []);
});

test("no hard-coded foreign hostnames", () => {
  const offenders: string[] = [];
  const allowed = new Set(["example.test", "localhost", "127.0.0.1", "10.0.2.2"]);
  const isAllowedIp = (host: string): boolean => {
    const parts = host.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    return (
      parts[0] === 10 || (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) || (parts[0] === 192 && parts[1] === 168)
    );
  };
  const files = [...walk(nativeDir), ...editedFiles];
  for (const path of files) {
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) {
      const host = match[1]!.toLowerCase();
      if (![...allowed].some((suffix) => host === suffix || host.endsWith(`.${suffix}`)) && !isAllowedIp(host)) {
        offenders.push(`${path}: ${match[0]}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("Diagnostics is unreachable from any production code path", () => {
  const app = readFileSync(join(mobileRoot, "App.tsx"), "utf8");
  const lines = app.split("\n");
  lines.forEach((line, index) => {
    if (!line.includes("Diagnostics")) return;
    if (/^\s*import\b/.test(line)) return;
    const window = lines.slice(Math.max(0, index - 12), index + 1).join("\n");
    assert.ok(window.includes("__DEV__"), `Diagnostics use at App.tsx:${index + 1} is not __DEV__-gated`);
  });
  const diagnostics = readFileSync(join(mobileRoot, "src", "Diagnostics.tsx"), "utf8");
  assert.ok(diagnostics.includes("if (!__DEV__) return null"), "Diagnostics must early-return outside __DEV__");
});
