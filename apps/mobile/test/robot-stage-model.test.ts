import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  type PresenceView,
  parsePresenceView,
} from "../../../packages/domain/src/muse-robot-contract";
import { NO_PRESENCE, OFFLINE_TEXT, stageViewFor } from "../src/robot/stage-model";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "robot");

function presence(name: string): PresenceView {
  const parsed = parsePresenceView(
    JSON.parse(readFileSync(join(fixtures, `presence-${name}.json`), "utf8")),
  );
  assert.equal(parsed.ok, true, name);
  if (!parsed.ok) throw new Error("unreachable");
  return parsed.value;
}

const STATES = ["idle", "active", "awaiting_owner", "stopped", "degraded", "offline"] as const;
const TITLES = ["Idle", "Working", "Needs you", "Stopped", "Degraded", "Offline"];
const MOTION = ["none", "progress", "pulse_once", "none", "none", "none"] as const;

test("each of the six states maps to its fixed title, glyph and tone", () => {
  STATES.forEach((state, index) => {
    const view = stageViewFor(presence(state), { reducedMotion: false, offline: false });
    assert.equal(view.title, TITLES[index]);
    assert.equal(view.statusText, presence(state).text);
    assert.equal(view.tone === "offline", state === "offline");
  });
});

test("motion follows the cited animation and is removed by reduced motion", () => {
  STATES.forEach((state, index) => {
    const allowed = stageViewFor(presence(state), { reducedMotion: false, offline: false });
    const reduced = stageViewFor(presence(state), { reducedMotion: true, offline: false });
    assert.equal(allowed.motion, MOTION[index], state);
    assert.equal(reduced.motion, "none", state);
  });
});

test("the offline override shows the last known status without claiming liveness", () => {
  const view = stageViewFor(presence("active"), { reducedMotion: false, offline: true });
  assert.equal(view.tone, "offline");
  assert.equal(view.glyph, "offline");
  assert.equal(view.title, "Offline");
  assert.equal(view.motion, "none");
  assert.match(
    view.statusText,
    new RegExp(`^${OFFLINE_TEXT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} `),
  );
  assert.match(view.statusText, /Working on your mission/);
  assert.equal(view.announce, OFFLINE_TEXT);
});

test("the no-event answer renders the degraded view and never invents activity", () => {
  const view = stageViewFor(NO_PRESENCE, { reducedMotion: false, offline: false });
  assert.equal(view.title, "Degraded");
  assert.equal(view.glyph, "degraded");
  assert.equal(view.statusText, "No presence signal yet.");
  assert.equal(view.accessibilityLabel, "No presence signal yet.");
});

test("the accessibility label prefers the server frame text", () => {
  const view = stageViewFor(presence("awaiting_owner"), {
    reducedMotion: false,
    offline: false,
  });
  assert.equal(view.accessibilityLabel, "Robot needs your review.");
  assert.equal(view.announce, "Robot needs your review.");
  assert.equal(view.cues[0]?.label, "Approval waiting");
  assert.equal(view.showUncertainty, false);
});
