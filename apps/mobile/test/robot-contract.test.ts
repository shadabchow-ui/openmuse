import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseCeilingItem,
  parseDeletionJobView,
  parseDeviceList,
  parseDnaSummary,
  parseForgetResult,
  parseMemoryItem,
  parseMemoryList,
  parseNativeSessions,
  parsePresenceView,
  parseRobotSummary,
  parseSkillList,
  parseSpendView,
  parseStopStatus,
} from "../../../packages/domain/src/muse-robot-contract";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "robot");

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixtures, `${name}.json`), "utf8"));
}

const NINE = [
  ["summary", parseRobotSummary],
  ["stop", parseStopStatus],
  ["memory", parseMemoryList],
  ["memory-forget", parseForgetResult],
  ["skills", parseSkillList],
  ["devices", parseDeviceList],
  ["dna", parseDnaSummary],
  ["spend", parseSpendView],
  ["deletion-job", parseDeletionJobView],
] as const;

test("all nine IOM-13 fixtures parse with the strict schemas", () => {
  for (const [name, parse] of NINE) {
    const result = parse(fixture(name));
    assert.equal(result.ok, true, name);
  }
});

test("the six presence states and the no-event answer parse", () => {
  for (const name of [
    "presence-idle",
    "presence-active",
    "presence-awaiting_owner",
    "presence-stopped",
    "presence-degraded",
    "presence-offline",
    "presence-none",
  ]) {
    const result = parsePresenceView(fixture(name));
    assert.equal(result.ok, true, name);
  }
  const none = parsePresenceView(fixture("presence-none"));
  assert.equal(none.ok && none.value.source, "none");
  assert.equal(none.ok && none.value.frame, null);
});

test("a memory item parses and an oversize preview is rejected", () => {
  const item = (fixture("memory") as { items: unknown[] }).items[0];
  assert.equal(parseMemoryItem(item).ok, true);
  const oversize = { ...(item as object), preview: "x".repeat(201) };
  assert.equal(parseMemoryItem(oversize).ok, false);
});

test("missing and extra keys are rejected", () => {
  const summary = fixture("summary") as Record<string, unknown>;
  assert.equal(parseRobotSummary({ ...summary, extra: true }).ok, false);
  const { counts: _counts, ...missing } = summary;
  assert.equal(parseRobotSummary(missing).ok, false);
  const presence = fixture("presence-idle") as Record<string, unknown>;
  assert.equal(parsePresenceView({ ...presence, tenantId: "x" }).ok, false);
});

test("amounts are digit strings, and the fixture's null ceilings stay allowed", () => {
  assert.equal(parseCeilingItem({ scope: "day", ceilingMicros: "1000", consumedBps: 0 }).ok, true);
  assert.equal(parseCeilingItem({ scope: "day", ceilingMicros: "1.5", consumedBps: 0 }).ok, false);
  assert.equal(parseCeilingItem({ scope: "day", ceilingMicros: "1e6", consumedBps: 0 }).ok, false);
  assert.equal(parseCeilingItem({ scope: "day", ceilingMicros: null, consumedBps: null }).ok, true);
  assert.equal(parseSpendView({ ceilings: [], consumedMicros: "12.50" }).ok, false);
  assert.equal(parseSpendView({ ceilings: [], consumedMicros: "1250" }).ok, true);
});

test("native sessions use the wrapper shape and reject a bare array or extra field", () => {
  const session = {
    publicId: "3f0d6a1e-9fb7-4eef-8a8e-4cc7d4b1a2c3",
    label: "Test phone",
    platform: "ios",
    createdAt: "2026-10-26T14:11:29.512Z",
    lastSeenAt: "2026-10-26T14:11:29.512Z",
    current: true,
    pushRegistered: false,
  };
  assert.equal(parseNativeSessions({ sessions: [session] }).ok, true);
  assert.equal(parseNativeSessions([session]).ok, false);
  assert.equal(parseNativeSessions({ sessions: [{ ...session, extra: 1 }] }).ok, false);
  const { pushRegistered: _push, ...withoutPush } = session;
  assert.equal(parseNativeSessions({ sessions: [withoutPush] }).ok, false);
});
