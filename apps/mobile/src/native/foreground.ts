/** Foreground/background tracking: refresh on return, reconnect after real absence. */

export type AppVisibility = "active" | "background" | "inactive";

export interface ForegroundDecision {
  refresh: boolean;
  reconnect: boolean;
}

export function createForegroundTracker(opts: { now: () => number; minAwayMs?: number }): {
  onChange: (state: AppVisibility) => ForegroundDecision;
} {
  const minAwayMs = opts.minAwayMs ?? 30000;
  let last: AppVisibility | null = null;
  let backgroundSince: number | null = null;
  return {
    onChange: (state: AppVisibility): ForegroundDecision => {
      const at = opts.now();
      if (state !== "active") {
        if (state === "background" && backgroundSince === null) backgroundSince = at;
        last = state;
        return { refresh: false, reconnect: false };
      }
      if (last === null || last === "active") {
        last = state;
        return { refresh: false, reconnect: false };
      }
      const reconnect = backgroundSince !== null && at - backgroundSince >= minAwayMs;
      backgroundSince = null;
      last = state;
      return { refresh: true, reconnect };
    },
  };
}
