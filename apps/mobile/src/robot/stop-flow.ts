export type StopPhase = "idle" | "confirming" | "sending" | "requested" | "engaged" | "failed";

export interface StopState {
  phase: StopPhase;
  stale: boolean;
  polls: number;
  error: string | null;
}

export type StopEvent =
  | { type: "open" }
  | { type: "cancel" }
  | { type: "confirm" }
  | { type: "sent" }
  | { type: "sendFailed" }
  | { type: "summary"; engaged: boolean }
  | { type: "dismissError" };

export const STOP_FAILED_SENTENCE = "Could not send the stop request. Try again.";
export const STOP_STALE_SENTENCE = "Still waiting for confirmation";

export const initialStopState: StopState = {
  phase: "idle",
  stale: false,
  polls: 0,
  error: null,
};

function withPhase(phase: StopPhase, patch: Partial<StopState> = {}): StopState {
  return { ...initialStopState, ...patch, phase };
}

/** Pure STOP flow. The phone can engage but has no way to disengage. */
export function stopReducer(state: StopState, event: StopEvent): StopState {
  switch (event.type) {
    case "open":
      if (state.phase === "engaged" || state.phase === "sending") return state;
      return withPhase("confirming");
    case "cancel":
      return state.phase === "confirming" ? withPhase("idle") : state;
    case "confirm":
      return state.phase === "confirming" ? withPhase("sending") : state;
    case "sent":
      return state.phase === "sending" ? withPhase("requested") : state;
    case "sendFailed":
      return state.phase === "sending"
        ? withPhase("failed", { error: STOP_FAILED_SENTENCE })
        : state;
    case "summary":
      if (event.engaged) return withPhase("engaged");
      if (state.phase === "engaged") return withPhase("idle");
      if (state.phase === "requested") {
        const polls = state.polls + 1;
        return { ...state, polls, stale: polls >= 10 };
      }
      return state;
    case "dismissError":
      return state.phase === "failed" ? withPhase("idle") : state;
  }
}
