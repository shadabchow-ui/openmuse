import assert from "node:assert/strict";
import { test } from "node:test";
import { createPoller } from "../src/robot/poller";

interface Task {
  at: number;
  fn: () => void;
  cancelled: boolean;
}

function fakeClock() {
  let now = 0;
  const tasks: Task[] = [];
  const schedule = (fn: () => void, ms: number) => {
    const task = { at: now + ms, fn, cancelled: false };
    tasks.push(task);
    return () => {
      task.cancelled = true;
    };
  };
  const flush = async () => {
    for (let i = 0; i < 5; i += 1) await new Promise<void>((resolve) => setImmediate(resolve));
  };
  const advance = async (ms: number) => {
    const end = now + ms;
    for (;;) {
      const next = tasks
        .filter((task) => !task.cancelled && task.at <= end)
        .sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      next.cancelled = true;
      now = next.at;
      next.fn();
      await flush();
    }
    now = end;
  };
  return { now: () => now, schedule, advance, flush };
}

test("polls on the interval and only one request is in flight", async () => {
  const clock = fakeClock();
  let calls = 0;
  const pendingFetch: { resolve: (() => void) | null } = { resolve: null };
  const poller = createPoller({
    fetchOnce: () => {
      calls += 1;
      return new Promise<void>((resolve) => {
        pendingFetch.resolve = resolve;
      });
    },
    intervalMs: 15000,
    maxBackoffMs: 60000,
    isActive: () => true,
    schedule: clock.schedule,
  });
  poller.start();
  await clock.flush();
  assert.equal(calls, 1);
  await clock.advance(15000);
  assert.equal(calls, 1, "no overlap while the first request is pending");
  pendingFetch.resolve?.();
  await clock.flush();
  assert.equal(poller.state().inFlight, false);
  await clock.advance(15000);
  assert.equal(calls, 2);
  poller.stop();
});

test("backoff doubles to the cap, then a success resets the interval", async () => {
  const clock = fakeClock();
  const delays: number[] = [];
  let fail = true;
  const poller = createPoller({
    fetchOnce: async () => {
      delays.push(poller.state().nextDelayMs);
      if (fail) throw new Error("offline");
    },
    intervalMs: 15000,
    maxBackoffMs: 60000,
    isActive: () => true,
    schedule: clock.schedule,
  });
  poller.start();
  await clock.flush();
  assert.equal(poller.state().nextDelayMs, 30000);
  await clock.advance(30000);
  assert.equal(poller.state().nextDelayMs, 60000);
  await clock.advance(60000);
  assert.equal(poller.state().nextDelayMs, 60000);
  fail = false;
  await clock.advance(60000);
  assert.equal(poller.state().nextDelayMs, 15000);
  assert.deepEqual(delays, [15000, 30000, 60000, 60000]);
  poller.stop();
});

test("an inactive app pauses without dropping the schedule and resumes later", async () => {
  const clock = fakeClock();
  let active = false;
  let calls = 0;
  const poller = createPoller({
    fetchOnce: async () => {
      calls += 1;
    },
    intervalMs: 15000,
    maxBackoffMs: 60000,
    isActive: () => active,
    schedule: clock.schedule,
  });
  poller.start();
  await clock.flush();
  assert.equal(calls, 0);
  await clock.advance(15000);
  assert.equal(calls, 0);
  active = true;
  await clock.advance(15000);
  assert.equal(calls, 1);
  poller.stop();
});

test("refreshNow coalesces with an in-flight request and stops on stop", async () => {
  const clock = fakeClock();
  let calls = 0;
  const pendingFetch: { resolve: (() => void) | null } = { resolve: null };
  const poller = createPoller({
    fetchOnce: () => {
      calls += 1;
      return new Promise<void>((resolve) => {
        pendingFetch.resolve = resolve;
      });
    },
    intervalMs: 15000,
    maxBackoffMs: 60000,
    isActive: () => true,
    schedule: clock.schedule,
  });
  poller.start();
  await clock.flush();
  const first = poller.refreshNow();
  const second = poller.refreshNow();
  assert.equal(calls, 1);
  pendingFetch.resolve?.();
  await first;
  await second;
  await clock.flush();
  assert.equal(calls, 1);
  poller.stop();
  await clock.advance(120000);
  assert.equal(calls, 1);
});

test("fetch errors never escape the poller", async () => {
  const clock = fakeClock();
  const poller = createPoller({
    fetchOnce: async () => {
      throw new Error("boom");
    },
    intervalMs: 15000,
    maxBackoffMs: 60000,
    isActive: () => true,
    schedule: clock.schedule,
  });
  poller.start();
  await clock.flush();
  await clock.advance(30000);
  assert.equal(poller.state().failures > 0, true);
  poller.stop();
});
