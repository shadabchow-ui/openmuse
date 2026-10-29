import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const mobile = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the web nav array never contains the robot section", () => {
  const app = readFileSync(join(mobile, "App.tsx"), "utf8");
  const start = app.indexOf("const nav:");
  assert.ok(start >= 0);
  const end = app.indexOf("];", start);
  const nav = app.slice(start, end);
  assert.doesNotMatch(nav, /id:\s*"robot"/);
});

test("the robot tab is added only behind the native flag", () => {
  const app = readFileSync(join(mobile, "App.tsx"), "utf8");
  assert.match(app, /const navItems = nativeMode\s*\?\s*\[\.\.\.nav,\s*\{\s*id:\s*"robot"/s);
  assert.match(app, /robot:\s*\{\s*title:\s*"Robot"/);
  assert.match(app, /section === "robot"\s*\?\s*RobotScreen/);
});

test("the domain Section union includes robot", () => {
  const index = readFileSync(
    join(mobile, "..", "..", "packages", "domain", "src", "index.ts"),
    "utf8",
  );
  assert.match(index, /\|\s*"robot"/);
});
