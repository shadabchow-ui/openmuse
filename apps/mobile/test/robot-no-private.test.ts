import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "robot");
const ALLOW_RESUME = new Set(["StopBar.tsx", "handoff.ts"]);

function sources(): Array<{ name: string; text: string }> {
  return readdirSync(src)
    .filter((name) => /\.(ts|tsx)$/.test(name))
    .map((name) => ({ name, text: readFileSync(join(src, name), "utf8") }));
}

test("no console, disk cache, direct fetch or secure-store import", () => {
  const forbidden = [
    /\bconsole\.(?:log|warn|error|info|debug|trace|dir|table|assert)\s*\(/,
    /localStorage/,
    /AsyncStorage/,
    /\bfetch\(/,
    /expo-secure-store/,
  ];
  for (const file of sources()) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(file.text, pattern, `${file.name} matched ${pattern}`);
    }
  }
});

test("only example.test and localhost hosts are named", () => {
  for (const file of sources()) {
    for (const match of file.text.matchAll(/https?:\/\/([^/"'\s]+)/g)) {
      const host = match[1] ?? "";
      assert.ok(
        host === "localhost" || host.endsWith(".example.test") || host === "example.test",
        `${file.name} names ${host}`,
      );
    }
  }
});

const RELEASE_IDENTIFIER =
  /(?:\b(?:function|const|let|var|class)\s+(?:release|resume)\b)|(?:\/(?:release|resume)\b)/i;

test("no release or resume route is defined in the robot client", () => {
  for (const file of sources()) {
    if (ALLOW_RESUME.has(file.name)) continue;
    assert.doesNotMatch(file.text, RELEASE_IDENTIFIER, file.name);
  }
});

test("the stop bar only offers the documented console hand-off for a stopped robot", () => {
  const bar = readFileSync(join(src, "StopBar.tsx"), "utf8");
  assert.match(bar, /openHandoff\("killswitch"\)/);
  assert.doesNotMatch(bar, /robot\/stop\/release/);
});
