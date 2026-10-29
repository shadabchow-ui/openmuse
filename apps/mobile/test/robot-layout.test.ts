import assert from "node:assert/strict";
import { test } from "node:test";
import {
  overviewColumns,
  ROBOT_TAB_COUNT,
  ROBOT_TARGET_PT,
  robotLayoutFor,
  tabBarFits,
} from "../src/robot/layout";

test("the layout switches to split at exactly 900", () => {
  assert.equal(robotLayoutFor(320), "single");
  assert.equal(robotLayoutFor(899), "single");
  assert.equal(robotLayoutFor(900), "split");
  assert.equal(robotLayoutFor(1366), "split");
});

test("the overview grid is one column below 600 and two from 600", () => {
  assert.equal(overviewColumns(320), 1);
  assert.equal(overviewColumns(599), 1);
  assert.equal(overviewColumns(600), 2);
  assert.equal(overviewColumns(1366), 2);
});

test("six 44 pt tabs fit at 320 pt and inside the 370 pt bar", () => {
  assert.equal(ROBOT_TAB_COUNT, 6);
  assert.equal(ROBOT_TARGET_PT, 44);
  assert.equal(tabBarFits(320), true);
  assert.equal(tabBarFits(263), false);
  assert.equal(tabBarFits(370), true);
  assert.equal(ROBOT_TAB_COUNT * ROBOT_TARGET_PT <= 370, true);
});
