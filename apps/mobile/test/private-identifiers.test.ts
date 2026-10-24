import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  addedLines,
  loadProtectedPatterns,
  STRUCTURAL,
  scan,
} from "../../../scripts/check-private-identifiers.mjs";

// Dirty inputs are assembled from parts so this file never holds a working credential-shaped string.
const join2 = (...parts: string[]) => parts.join("");

test("every structural check catches its own dirty input", () => {
  const dirty: Record<string, string> = {
    "private-key-block": join2("-----BEGIN RSA PRIV", "ATE KEY-----"),
    "provider-token": join2("token = gh", "p_", "a".repeat(30)),
    jwt: join2("ey", "J", "a".repeat(12), ".ey", "J", "b".repeat(12), ".", "c".repeat(12)),
    "bearer-token": join2("Authorization: Bear", "er ", "a".repeat(30)),
    "url-with-credentials": join2("https://user", ":pass", "@host.example/x"),
    "internal-hostname": join2("api.", "build", ".internal"),
    "private-ip": join2("http://192.", "168.1.20/x"),
  };
  assert.deepEqual(Object.keys(dirty).sort(), STRUCTURAL.map((check) => check.name).sort());
  for (const [name, line] of Object.entries(dirty)) {
    assert.deepEqual(
      scan(line).map((hit) => hit.pattern),
      [name],
      name,
    );
  }
});

test("clean text, the emulator alias and ordinary public URLs have no hits", () => {
  assert.deepEqual(scan("external backend, gateway and surface\nCreate a document"), []);
  assert.deepEqual(scan("temporary and robotic are fine"), []);
  assert.deepEqual(scan('const a = "http://10.0.2.2:8787";'), []);
  assert.deepEqual(scan("see https://login.example/x and https://docs.example/a?b=c"), []);
  assert.deepEqual(scan(join2("Authorization: Bearer $", "{token}")), []);
});

test("a protected pattern from outside the repository is applied, and a bad file is rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "boundary-"));
  try {
    const good = join(dir, "good.json");
    writeFileSync(good, JSON.stringify(["internal-widget-\\d+"]));
    const patterns = loadProtectedPatterns(good);
    assert.equal(scan("uses Internal-Widget-7 here", patterns).length, 1);
    assert.equal(scan("uses internal-widget here", patterns).length, 0);
    for (const body of ["{}", '["ok", ""]', "[1]", "not json"]) {
      const bad = join(dir, "bad.json");
      writeFileSync(bad, body);
      assert.throws(() => loadProtectedPatterns(bad), body);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("added lines are read from a zero-context diff with line numbers", () => {
  const diff = [
    "diff --git a/x.ts b/x.ts",
    "--- a/x.ts",
    "+++ b/x.ts",
    "@@ -1,0 +5,2 @@",
    "+first",
    "+second",
    "@@ -9 +20 @@",
    "-old",
    "+third",
    "",
  ].join("\n");
  assert.deepEqual(addedLines(diff).get("x.ts"), [
    { line: 5, text: "first" },
    { line: 6, text: "second" },
    { line: 20, text: "third" },
  ]);
});
