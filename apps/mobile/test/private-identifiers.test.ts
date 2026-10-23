import assert from "node:assert/strict";
import { test } from "node:test";
import { addedLines, PATTERNS, scan } from "../../../scripts/check-private-identifiers.mjs";

// Dirty inputs are assembled from parts so this file does not contain the words it tests for.
const word = (...parts: string[]) => parts.join("");

test("every pattern catches its own dirty input", () => {
  const dirty = [
    word("the ib", "ot app"),
    word("by Eth", "en"),
    word("Far", "os routing"),
    word("a Tempo", "ral worker"),
    word("ROBOT", "_OS_KEY"),
    word("/api/", "robot/v0"),
    word("rob", "ot.muse.gateway_v1"),
    word("app.verc", "el.app"),
    word("x.fl", "y.dev"),
  ];
  for (const line of dirty) assert.ok(scan(line).length > 0, line);
  assert.equal(PATTERNS.length, 10);
});

test("clean text has no hits", () => {
  assert.deepEqual(scan("external backend, gateway and surface\nCreate a document"), []);
  assert.deepEqual(scan("temporary and robotic are fine"), []);
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
  const files = addedLines(diff);
  assert.deepEqual(files.get("x.ts"), [
    { line: 5, text: "first" },
    { line: 6, text: "second" },
    { line: 20, text: "third" },
  ]);
});
