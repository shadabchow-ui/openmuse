import assert from "node:assert/strict";
import { test } from "node:test";
import { createForegroundTracker } from "../src/native/foreground";
test("foreground: inactive blips never reconnect", () => {
  let at = 1_000_000;
  const tracker = createForegroundTracker({ now: () => at });
  assert.deepEqual(tracker.onChange("active"), { refresh: false, reconnect: false });
  at += 5_000;
  assert.deepEqual(tracker.onChange("inactive"), { refresh: false, reconnect: false });
  at += 2_000;
  assert.deepEqual(tracker.onChange("active"), { refresh: true, reconnect: false });
});

test("foreground: background under the threshold refreshes without reconnect", () => {
  let at = 1_000_000;
  const tracker = createForegroundTracker({ now: () => at });
  tracker.onChange("active");
  tracker.onChange("background");
  at += 29_000;
  assert.deepEqual(tracker.onChange("active"), { refresh: true, reconnect: false });
});

test("foreground: background past the threshold reconnects", () => {
  let at = 1_000_000;
  const tracker = createForegroundTracker({ now: () => at });
  tracker.onChange("active");
  tracker.onChange("background");
  at += 31_000;
  assert.deepEqual(tracker.onChange("active"), { refresh: true, reconnect: true });
});

test("foreground: background then inactive still reconnects on return", () => {
  let at = 1_000_000;
  const tracker = createForegroundTracker({ now: () => at });
  tracker.onChange("active");
  tracker.onChange("background");
  at += 40_000;
  tracker.onChange("inactive");
  at += 1_000;
  assert.deepEqual(tracker.onChange("active"), { refresh: true, reconnect: true });
});

test("foreground: repeated active events are no-ops", () => {
  let at = 1_000_000;
  const tracker = createForegroundTracker({ now: () => at });
  tracker.onChange("active");
  at += 60_000;
  assert.deepEqual(tracker.onChange("active"), { refresh: false, reconnect: false });
  at += 60_000;
  assert.deepEqual(tracker.onChange("active"), { refresh: false, reconnect: false });
});

