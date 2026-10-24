import assert from "node:assert/strict";
import { test } from "node:test";
import type { Section, Workspace } from "../../../packages/domain/src";
import { capabilitiesSchema } from "../../../packages/domain/src/muse-contract";
import { capabilityOf, visibleNav } from "../src/capabilities";

const KEYS = Object.keys(capabilitiesSchema.shape) as Array<keyof ReturnType<typeof all>>;
const all = (value = true) => ({
  delegate: value,
  goals: value,
  ideas: value,
  monitors: value,
  files: value,
  mail: value,
  calendar: value,
  browser: value,
  computer: value,
  memoryWrite: value,
  identityEdit: value,
  taskPause: value,
  taskRetry: value,
  threadRename: value,
  threadArchive: value,
});
const runtime = (capabilities?: ReturnType<typeof all>): Workspace["runtime"] => ({
  provider: "model",
  configured: true,
  openbotConfigured: false,
  ...(capabilities ? { capabilities } : {}),
});
const nav = (["chat", "activity", "ideas", "goals", "apps"] as Section[]).map((id) => ({ id }));

test("the helper knows exactly the fifteen contract keys", () => {
  assert.equal(KEYS.length, 15);
});

test("an absent capabilities object hides nothing", () => {
  for (const key of KEYS) assert.equal(capabilityOf(runtime(), key), true, key);
  assert.equal(capabilityOf(undefined, "ideas"), true);
  assert.deepEqual(
    visibleNav(nav, runtime()).map((n) => n.id),
    ["chat", "activity", "ideas", "goals", "apps"],
  );
});

test("each flag set to false hides exactly its own entry", () => {
  for (const key of KEYS) {
    const capabilities = all(true);
    capabilities[key] = false;
    for (const other of KEYS)
      assert.equal(capabilityOf(runtime(capabilities), other), other !== key, `${key}/${other}`);
  }
});

test("navigation hides ideas and goals only when their flags are false", () => {
  assert.deepEqual(
    visibleNav(nav, runtime({ ...all(true), ideas: false })).map((n) => n.id),
    ["chat", "activity", "goals", "apps"],
  );
  assert.deepEqual(
    visibleNav(nav, runtime({ ...all(true), goals: false })).map((n) => n.id),
    ["chat", "activity", "ideas", "apps"],
  );
  assert.deepEqual(
    visibleNav(nav, runtime(all(false))).map((n) => n.id),
    ["chat", "activity", "apps"],
  );
  assert.deepEqual(visibleNav(nav, runtime({ ...all(true), mail: false })).length, 5);
});
