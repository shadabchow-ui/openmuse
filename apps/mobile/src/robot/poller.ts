export type Schedule = (fn: () => void, ms: number) => () => void;

export interface PollerOptions {
  fetchOnce: () => Promise<unknown>;
  intervalMs: number;
  maxBackoffMs: number;
  isActive: () => boolean;
  now?: () => number;
  schedule?: Schedule;
}

export interface PollerState {
  running: boolean;
  inFlight: boolean;
  nextDelayMs: number;
  failures: number;
}

export interface Poller {
  start: () => void;
  stop: () => void;
  refreshNow: () => Promise<void>;
  state: () => PollerState;
}

const defaultSchedule: Schedule = (fn, ms) => {
  const timer = setTimeout(fn, ms);
  return () => clearTimeout(timer);
};

/**
 * One request in flight per resource, foreground only, with exponential
 * backoff capped at `maxBackoffMs` and an immediate manual refresh that
 * coalesces with a request already in flight.
 */
export function createPoller(options: PollerOptions): Poller {
  const schedule = options.schedule ?? defaultSchedule;
  let cancelTimer: (() => void) | null = null;
  let running = false;
  let inFlight = false;
  let failureCount = 0;
  let delay = options.intervalMs;
  let current: Promise<void> | null = null;

  const state = (): PollerState => ({
    running,
    inFlight,
    nextDelayMs: delay,
    failures: failureCount,
  });

  function clearTimer(): void {
    if (cancelTimer) {
      cancelTimer();
      cancelTimer = null;
    }
  }

  function scheduleNext(ms: number): void {
    clearTimer();
    if (!running) return;
    cancelTimer = schedule(() => {
      cancelTimer = null;
      void run();
    }, ms);
  }

  function run(): Promise<void> {
    if (current) return current;
    if (!running) return Promise.resolve();
    if (!options.isActive()) {
      scheduleNext(options.intervalMs);
      return Promise.resolve();
    }
    inFlight = true;
    current = (async () => {
      try {
        await options.fetchOnce();
        failureCount = 0;
        delay = options.intervalMs;
      } catch {
        failureCount += 1;
        delay = Math.min(options.intervalMs * 2 ** failureCount, options.maxBackoffMs);
      } finally {
        inFlight = false;
        current = null;
        if (running) scheduleNext(delay);
      }
    })();
    return current;
  }

  return {
    start: () => {
      if (running) return;
      running = true;
      void run();
    },
    stop: () => {
      running = false;
      clearTimer();
    },
    refreshNow: () => {
      if (current) return current;
      clearTimer();
      if (!running) {
        running = true;
      }
      return run();
    },
    state,
  };
}
