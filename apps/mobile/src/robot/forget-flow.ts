import type {
  DeletionJobView,
  ForgetResult,
} from "../../../../packages/domain/src/muse-robot-contract";
import type { Schedule } from "./poller";

export type ForgetPhase = "idle" | "confirming" | "sending" | "waiting" | "done" | "failed";

export interface ForgetState {
  phase: ForgetPhase;
  memoryId: string | null;
  jobId: string | null;
  polls: number;
  note: string | null;
  error: string | null;
}

export type ForgetEvent =
  | { type: "open"; memoryId: string }
  | { type: "cancel" }
  | { type: "confirm" }
  | { type: "sent"; jobId: string | null }
  | { type: "sendFailed" }
  | { type: "job"; state: string; maxPolls: number }
  | { type: "pollFailed"; maxPolls: number }
  | { type: "dismiss" };

export const FORGET_FAILED_SENTENCE = "Could not forget this memory. Try again.";
export const FORGET_TIMEOUT_NOTE = "Still finishing in the background";

export const initialForgetState: ForgetState = {
  phase: "idle",
  memoryId: null,
  jobId: null,
  polls: 0,
  note: null,
  error: null,
};

export function forgetReducer(state: ForgetState, event: ForgetEvent): ForgetState {
  switch (event.type) {
    case "open":
      return { ...initialForgetState, phase: "confirming", memoryId: event.memoryId };
    case "cancel":
      return state.phase === "confirming" ? initialForgetState : state;
    case "confirm":
      return state.phase === "confirming" ? { ...state, phase: "sending" } : state;
    case "sent":
      if (state.phase !== "sending") return state;
      return event.jobId === null
        ? { ...state, phase: "done" }
        : { ...state, phase: "waiting", jobId: event.jobId };
    case "sendFailed":
      return state.phase === "sending"
        ? { ...state, phase: "failed", error: FORGET_FAILED_SENTENCE }
        : state;
    case "job": {
      if (state.phase !== "waiting") return state;
      if (event.state === "succeeded" || event.state === "failed") {
        return { ...state, phase: "done" };
      }
      return afterPoll(state, event.maxPolls);
    }
    case "pollFailed":
      return state.phase === "waiting" ? afterPoll(state, event.maxPolls) : state;
    case "dismiss":
      return state.phase === "failed" ? initialForgetState : state;
  }
}

function afterPoll(state: ForgetState, maxPolls: number): ForgetState {
  const polls = state.polls + 1;
  return polls >= maxPolls
    ? { ...state, polls, phase: "done", note: FORGET_TIMEOUT_NOTE }
    : { ...state, polls };
}

export interface ForgetFlowDeps {
  forget: (id: string) => Promise<ForgetResult>;
  getJob: (id: string) => Promise<DeletionJobView>;
  schedule?: Schedule;
  intervalMs?: number;
  maxPolls?: number;
  onChange?: (state: ForgetState) => void;
}

export interface ForgetFlow {
  start: (memoryId: string) => Promise<void>;
  stop: () => void;
  state: () => ForgetState;
}

const defaultSchedule: Schedule = (fn, ms) => {
  const timer = setTimeout(fn, ms);
  return () => clearTimeout(timer);
};

/** Bounded deletion-job polling; the request is sent exactly once per start. */
export function createForgetFlow(deps: ForgetFlowDeps): ForgetFlow {
  const schedule = deps.schedule ?? defaultSchedule;
  const intervalMs = deps.intervalMs ?? 3000;
  const maxPolls = deps.maxPolls ?? 10;
  let state = initialForgetState;
  let cancelTimer: (() => void) | null = null;
  let polling = false;
  let stopped = false;

  function set(next: ForgetState): void {
    state = next;
    deps.onChange?.(state);
  }

  function dispatch(event: ForgetEvent): void {
    set(forgetReducer(state, event));
  }

  function clearTimer(): void {
    if (cancelTimer) {
      cancelTimer();
      cancelTimer = null;
    }
  }

  function schedulePoll(): void {
    clearTimer();
    if (stopped || state.phase !== "waiting") return;
    cancelTimer = schedule(() => {
      cancelTimer = null;
      void poll();
    }, intervalMs);
  }

  async function poll(): Promise<void> {
    if (polling || state.phase !== "waiting" || state.jobId === null) return;
    polling = true;
    try {
      const job = await deps.getJob(state.jobId);
      dispatch({ type: "job", state: job.state, maxPolls });
    } catch {
      dispatch({ type: "pollFailed", maxPolls });
    } finally {
      polling = false;
      schedulePoll();
    }
  }

  async function send(memoryId: string): Promise<void> {
    try {
      const result = await deps.forget(memoryId);
      dispatch({ type: "sent", jobId: result.jobId });
      schedulePoll();
    } catch {
      dispatch({ type: "sendFailed" });
    }
  }

  return {
    start: async (memoryId: string) => {
      if (state.phase === "sending" || state.phase === "waiting" || state.phase === "confirming") {
        return;
      }
      stopped = false;
      dispatch({ type: "open", memoryId });
      dispatch({ type: "confirm" });
      await send(memoryId);
    },
    stop: () => {
      stopped = true;
      clearTimer();
    },
    state: () => state,
  };
}
