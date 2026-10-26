import assert from "node:assert/strict";
import { test } from "node:test";
import { routeForNotification } from "../src/native/push-routing";

const ID = "123e4567-e89b-12d3-a456-426614174000";

for (const kind of ["mission.completed", "mission.failed", "mission.capped"]) {
  test(`${kind} with a run id routes to the task`, () => {
    assert.deepEqual(routeForNotification({ kind, missionRunId: ID }), { kind: "task", taskId: ID });
  });
  test(`${kind} without a run id routes to notifications`, () => {
    assert.deepEqual(routeForNotification({ kind }), { kind: "notifications" });
  });
}

test("approval.waiting with a run id routes to approval", () => {
  assert.deepEqual(routeForNotification({ kind: "approval.waiting", missionRunId: ID }), {
    kind: "approval",
    runId: ID,
  });
});

for (const kind of ["approval.waiting", "schedule.fired", "schedule.skipped", "stop.acknowledged", "system.notice"]) {
  test(`${kind} without a run id routes to notifications`, () => {
    assert.deepEqual(routeForNotification({ kind }), { kind: "notifications" });
  });
}

for (const [name, data] of [
  ["null", null],
  ["string", "approval.waiting"],
  ["array", ["approval.waiting"]],
  ["unknown kind", { kind: "robot.dance" }],
  ["missing kind", { missionRunId: ID }],
  ["non-UUID run id", { kind: "approval.waiting", missionRunId: "abc" }],
  ["nested run id", { kind: "mission.completed", missionRunId: { id: ID } }],
  ["very long string", { kind: "system.notice", missionRunId: "x".repeat(5000) }],
  ["proto key", { kind: "__proto__", missionRunId: ID }],
  ["numeric kind", { kind: 42 }],
] as Array<[string, unknown]>) {
  test(`hostile payload routes to notifications at most: ${name}`, () => {
    assert.deepEqual(routeForNotification(data), { kind: "notifications" });
  });
}

test("routing never throws", () => {
  assert.doesNotThrow(() => routeForNotification(undefined));
  assert.doesNotThrow(() => routeForNotification(Object.create(null)));
});
