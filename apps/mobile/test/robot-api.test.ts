import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  createWebLink,
  engageStop,
  forgetMemory,
  getDeletionJob,
  getDevices,
  getDna,
  getMemory,
  getPresence,
  getSessions,
  getSkills,
  getSpend,
  getStop,
  getSummary,
  markDeviceLost,
  RobotApiError,
  type RobotRequest,
  type RobotResult,
  revokeSession,
} from "../src/robot/robot-api";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "robot");
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(fixtures, `${name}.json`), "utf8"));

const MEMORY_ID = (fixture("memory") as { items: { id: string }[] }).items[0]!.id;
const JOB_ID = (fixture("memory-forget") as { jobId: string }).jobId;
const DEVICE_ID = (fixture("devices") as { devices: { id: string }[] }).devices[0]!.id;
const SESSION_ID = "3f0d6a1e-9fb7-4eef-8a8e-4cc7d4b1a2c3";

interface Call {
  path: string;
  body?: unknown;
  method?: string;
}

function responder(value: unknown, calls: Call[]): RobotRequest {
  return (async (path: string, body?: unknown, method?: string) => {
    calls.push({ path, body, method });
    if (typeof value === "function") return (value as () => unknown)();
    return value;
  }) as unknown as RobotRequest;
}

function router(values: Record<string, unknown>, calls: Call[]): RobotRequest {
  return (async (path: string, body?: unknown, method?: string) => {
    calls.push({ path, body, method });
    const key = path.split("?")[0] ?? path;
    if (!(key in values)) throw new Error(`unexpected path ${key}`);
    return values[key];
  }) as unknown as RobotRequest;
}

async function expectOk<T>(promise: Promise<RobotResult<T>>): Promise<T> {
  const result = await promise;
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("unreachable");
  return result.value;
}

test("every read model calls its literal path and method", async () => {
  const calls: Call[] = [];
  const request = router(
    {
      "/api/robot/summary": fixture("summary"),
      "/api/presence": fixture("presence-idle"),
      "/api/robot/memory": fixture("memory"),
      "/api/robot/skills": fixture("skills"),
      "/api/robot/devices": fixture("devices"),
      "/api/robot/dna": fixture("dna"),
      "/api/robot/spend": fixture("spend"),
      "/api/robot/stop": fixture("stop"),
    },
    calls,
  );
  await expectOk(getSummary(request));
  await expectOk(getPresence(request));
  await expectOk(getMemory(request, "preferences", 10));
  await expectOk(getSkills(request));
  await expectOk(getDevices(request));
  await expectOk(getDna(request));
  await expectOk(getSpend(request));
  await expectOk(getStop(request));
  assert.deepEqual(
    calls.map((call) => [call.method, call.path]),
    [
      ["GET", "/api/robot/summary"],
      ["GET", "/api/presence"],
      ["GET", "/api/robot/memory?scope=preferences&limit=10"],
      ["GET", "/api/robot/skills"],
      ["GET", "/api/robot/devices"],
      ["GET", "/api/robot/dna"],
      ["GET", "/api/robot/spend"],
      ["GET", "/api/robot/stop"],
    ],
  );
});

test("mutations call the literal path, method and body", async () => {
  const calls: Call[] = [];
  const request = router(
    {
      [`/api/robot/memory/${MEMORY_ID}/forget`]: fixture("memory-forget"),
      [`/api/robot/deletion-jobs/${JOB_ID}`]: fixture("deletion-job"),
      [`/api/robot/devices/${DEVICE_ID}/lost`]: { ok: true },
      "/api/robot/stop": fixture("stop"),
      [`/api/native/sessions/${SESSION_ID}/revoke`]: { ok: true },
      "/api/native/web-link": {
        url: "https://gateway.example.test/native/web-link/consume?code=abcdefghijklmnopqrstuvwx",
      },
    },
    calls,
  );
  await expectOk(forgetMemory(request, MEMORY_ID));
  await expectOk(getDeletionJob(request, JOB_ID));
  await expectOk(markDeviceLost(request, DEVICE_ID));
  await expectOk(engageStop(request));
  await expectOk(revokeSession(request, SESSION_ID));
  await expectOk(createWebLink(request, "killswitch"));
  assert.deepEqual(
    calls.map((call) => [call.method, call.path, call.body]),
    [
      ["POST", `/api/robot/memory/${MEMORY_ID}/forget`, { confirm: true }],
      ["GET", `/api/robot/deletion-jobs/${JOB_ID}`, undefined],
      ["POST", `/api/robot/devices/${DEVICE_ID}/lost`, {}],
      ["POST", "/api/robot/stop", {}],
      ["POST", `/api/native/sessions/${SESSION_ID}/revoke`, {}],
      ["POST", "/api/native/web-link", { target: "killswitch" }],
    ],
  );
});

test("fixtures parse into the contract values", async () => {
  const calls: Call[] = [];
  const summary = await expectOk(getSummary(responder(fixture("summary"), calls)));
  assert.equal(summary.robot.name, "Test Robot");
  const memory = await expectOk(getMemory(responder(fixture("memory"), calls)));
  assert.equal(memory.items.length, 3);
  const devices = await expectOk(getDevices(responder(fixture("devices"), calls)));
  assert.equal(devices.devices[0]?.id, "test-phone");
});

test("sessions use the wrapper shape", async () => {
  const value = {
    sessions: [
      {
        publicId: SESSION_ID,
        label: "Test phone",
        platform: "ios",
        createdAt: "2026-10-26T14:11:29.512Z",
        lastSeenAt: "2026-10-26T14:11:29.512Z",
        current: true,
        pushRegistered: false,
      },
    ],
  };
  const sessions = await expectOk(getSessions(responder(value, [])));
  assert.equal(sessions.sessions[0]?.pushRegistered, false);
});

test("an unexpected key throws the fixed shape error", async () => {
  const summary = fixture("summary") as Record<string, unknown>;
  const request = responder({ ...summary, unusable: true }, []);
  await assert.rejects(
    () => getSummary(request),
    (error: unknown) => {
      assert.ok(error instanceof RobotApiError);
      assert.equal(error.code, "shape");
      assert.equal(error.message, "Something went wrong.");
      return true;
    },
  );
});

test("an invalid id is rejected before the request is made", async () => {
  const calls: Call[] = [];
  const request = responder(fixture("memory-forget"), calls);
  assert.throws(() => forgetMemory(request, "not-a-uuid"), RobotApiError);
  assert.throws(() => revokeSession(request, "not-a-uuid"), RobotApiError);
  assert.throws(() => getDeletionJob(request, "not-a-job"), RobotApiError);
  assert.equal(calls.length, 0);
});

test("a 403 maps to the typed unavailable result used by screens", async () => {
  const request = (async () => {
    throw Object.assign(new Error("forbidden"), { status: 403 });
  }) as unknown as RobotRequest;
  const result = await getSummary(request);
  assert.deepEqual(result, { ok: false, kind: "unavailable", message: "Not available yet." });
});
