import assert from "node:assert/strict";
import { test } from "node:test";
import { ROBOT_PAGES } from "../src/robot/pages";

test("the eight page ids are unique and overview is first", () => {
  const ids = ROBOT_PAGES.map((page) => page.id);
  assert.equal(ids.length, 8);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids[0], "overview");
});

test("more and settings are the last two pages", () => {
  const ids = ROBOT_PAGES.map((page) => page.id);
  assert.deepEqual(ids.slice(-2), ["more", "settings"]);
});

test("every page has a title and an icon", () => {
  for (const page of ROBOT_PAGES) {
    assert.ok(page.title.length > 0);
    assert.ok(page.icon);
  }
});
