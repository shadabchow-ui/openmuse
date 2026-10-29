import assert from "node:assert/strict";
import { test } from "node:test";
import type { DeletionJobView } from "../../../packages/domain/src/muse-robot-contract";
import {
  createForgetFlow,
  FORGET_FAILED_SENTENCE,
  FORGET_TIMEOUT_NOTE,
  initialForgetState,
} from "../src/robot/forget-flow";

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
  return { schedule, advance, flush };
}

const JOB: DeletionJobView = {
  id: "del:8df4f3c4-948e-4a6f-8438-178ced5e15eb:2026-10-26T14:11:29.529Z",
  state: "succeeded",
  createdAt: "2026-10-26T14:11:29.529Z",
};

test("the initial state is idle", () => {
  assert.deepEqual(initialForgetState, {
    phase: "idle",
    memoryId: null,
    jobId: null,
    polls: 0,
    note: null,
    error: null,
  });
});

test("a response without a job id finishes immediately", async () => {
  const flow = createForgetFlow({
    forget: async () => ({ deleted: true, jobId: null }),
    getJob: async () => JOB,
  });
  await flow.start("8df4f3c4-948e-4a6f-8438-178ced5e15eb");
  assert.equal(flow.state().phase, "done");
});

test("a succeeded job finishes after one poll", async () => {
  const clock = fakeClock();
  let polls = 0;
  const flow = createForgetFlow({
    forget: async () => ({ deleted: true, jobId: JOB.id }),
    getJob: async () => {
      polls += 1;
      return JOB;
    },
    schedule: clock.schedule,
  });
  await flow.start("8df4f3c4-948e-4a6f-8438-178ced5e15eb");
  assert.equal(flow.state().phase, "waiting");
  await clock.advance(3000);
  assert.equal(polls, 1);
  assert.equal(flow.state().phase, "done");
});

test("a job that never finishes ends in done with the background note after ten polls", async () => {
  const clock = fakeClock();
  let polls = 0;
  const flow = createForgetFlow({
    forget: async () => ({ deleted: true, jobId: JOB.id }),
    getJob: async () => {
      polls += 1;
      return { ...JOB, state: "running" };
    },
    schedule: clock.schedule,
  });
  await flow.start("8df4f3c4-948e-4a6f-8438-178ced5e15eb");
  await clock.advance(3000 * 10);
  assert.equal(polls, 10);
  assert.equal(flow.state().phase, "done");
  assert.equal(flow.state().note, FORGET_TIMEOUT_NOTE);
});

test("a failed send shows the fixed sentence and never calls the job route", async () => {
  let jobCalls = 0;
  const flow = createForgetFlow({
    forget: async () => {
      throw new Error("offline");
    },
    getJob: async () => {
      jobCalls += 1;
      return JOB;
    },
  });
  await flow.start("8df4f3c4-948e-4a6f-8438-178ced5e15eb");
  assert.equal(flow.state().phase, "failed");
  assert.equal(flow.state().error, FORGET_FAILED_SENTENCE);
  assert.equal(jobCalls, 0);
});

test("a second start while waiting never sends the request twice", async () => {
  const clock = fakeClock();
  let forgetCalls = 0;
  const flow = createForgetFlow({
    forget: async () => {
      forgetCalls += 1;
      return { deleted: true, jobId: JOB.id };
    },
    getJob: async () => ({ ...JOB, state: "running" }),
    schedule: clock.schedule,
  });
  await flow.start("8df4f3c4-948e-4a6f-8438-178ced5e15eb");
  await flow.start("8df4f3c4-948e-4a6f-8438-178ced5e15eb");
  assert.equal(forgetCalls, 1);
  flow.stop();
});
