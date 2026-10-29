import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initialStopState,
  STOP_FAILED_SENTENCE,
  type StopEvent,
  type StopState,
  stopReducer,
} from "../src/robot/stop-flow";

function apply(events: StopEvent[], start: StopState = initialStopState): StopState {
  return events.reduce(stopReducer, start);
}

test("the full happy path is idle -> confirming -> sending -> requested -> engaged", () => {
  const confirming = apply([{ type: "open" }]);
  assert.equal(confirming.phase, "confirming");
  const sending = stopReducer(confirming, { type: "confirm" });
  assert.equal(sending.phase, "sending");
  const requested = stopReducer(sending, { type: "sent" });
  assert.equal(requested.phase, "requested");
  const engaged = stopReducer(requested, { type: "summary", engaged: true });
  assert.equal(engaged.phase, "engaged");
});

test("confirm only works from confirming, and a double tap cannot send twice", () => {
  assert.equal(stopReducer(initialStopState, { type: "confirm" }).phase, "idle");
  const sending = apply([{ type: "open" }, { type: "confirm" }]);
  const again = stopReducer(sending, { type: "confirm" });
  assert.equal(again.phase, "sending");
  assert.equal(again.polls, 0);
});

test("cancel closes the sheet; sending cannot be cancelled", () => {
  assert.equal(apply([{ type: "open" }, { type: "cancel" }]).phase, "idle");
  const sending = apply([{ type: "open" }, { type: "confirm" }]);
  assert.equal(stopReducer(sending, { type: "cancel" }).phase, "sending");
});

test("a release seen from the web returns an engaged robot to idle", () => {
  const engaged = apply([
    { type: "open" },
    { type: "confirm" },
    { type: "sent" },
    { type: "summary", engaged: true },
  ]);
  assert.equal(stopReducer(engaged, { type: "summary", engaged: false }).phase, "idle");
});

test("a summary from any state engages and clears the error", () => {
  const failed = apply([{ type: "open" }, { type: "confirm" }, { type: "sendFailed" }]);
  const engaged = stopReducer(failed, { type: "summary", engaged: true });
  assert.equal(engaged.phase, "engaged");
  assert.equal(engaged.error, null);
});

test("an offline send failure keeps the sheet closed and shows the fixed sentence", () => {
  const failed = apply([{ type: "open" }, { type: "confirm" }, { type: "sendFailed" }]);
  assert.equal(failed.phase, "failed");
  assert.equal(failed.error, STOP_FAILED_SENTENCE);
  assert.equal(stopReducer(failed, { type: "open" }).phase, "confirming");
  assert.equal(stopReducer(failed, { type: "dismissError" }).phase, "idle");
});

test("ten unconfirmed polls set the stale flag and keep waiting", () => {
  let state = apply([{ type: "open" }, { type: "confirm" }, { type: "sent" }]);
  for (let i = 0; i < 9; i += 1) state = stopReducer(state, { type: "summary", engaged: false });
  assert.equal(state.phase, "requested");
  assert.equal(state.stale, false);
  state = stopReducer(state, { type: "summary", engaged: false });
  assert.equal(state.phase, "requested");
  assert.equal(state.stale, true);
  assert.equal(state.polls, 10);
});

test("open does nothing once the robot is engaged or the request is sending", () => {
  const engaged = stopReducer(initialStopState, { type: "summary", engaged: true });
  assert.equal(stopReducer(engaged, { type: "open" }).phase, "engaged");
  const sending = apply([{ type: "open" }, { type: "confirm" }]);
  assert.equal(stopReducer(sending, { type: "open" }).phase, "sending");
});
