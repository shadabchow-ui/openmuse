import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "robot");

function files(extension: string): Array<{ name: string; text: string }> {
  return readdirSync(src)
    .filter((name) => name.endsWith(extension))
    .map((name) => ({ name, text: readFileSync(join(src, name), "utf8") }));
}

test("every Pressable has a role and a non-empty label", () => {
  for (const file of files(".tsx")) {
    for (const match of file.text.matchAll(/<Pressable\b[^>]*>/g)) {
      const tag = match[0];
      assert.match(tag, /accessibilityRole=/, `${file.name}: ${tag}`);
      assert.match(tag, /accessibilityLabel=/, `${file.name}: ${tag}`);
    }
  }
});

test("every Button has text children or an explicit label", () => {
  for (const file of files(".tsx")) {
    for (const match of file.text.matchAll(/<Button\b([^>]*)>([\s\S]*?)<\/Button>/g)) {
      const attrs = match[1] ?? "";
      const children = (match[2] ?? "").trim();
      assert.ok(children.length > 0 || /accessibilityLabel=/.test(attrs), file.name);
    }
  }
});

test("no accessibility label is empty", () => {
  for (const file of files(".tsx")) {
    assert.doesNotMatch(file.text, /accessibilityLabel=\{?["']{2}\}?/, file.name);
  }
});

test("the stage has a polite live region and a reduced-motion branch, and no looping animation", () => {
  const stage = readFileSync(join(src, "RobotStage.tsx"), "utf8");
  assert.match(stage, /accessibilityLiveRegion="polite"/);
  assert.match(stage, /reducedMotion/);
  for (const file of files(".tsx")) {
    assert.doesNotMatch(file.text, /Animated\.loop/, file.name);
  }
});
