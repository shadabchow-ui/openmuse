import assert from "node:assert/strict";
import { test } from "node:test";
import { nativeHeaders } from "../src/native/headers";
test("native headers are exactly the three X-Muse headers", () => {
  assert.deepEqual(nativeHeaders({ apiVersion: 1, appVersion: "0.1.0" }, "ios"), {
    "X-Muse-Client": "ios",
    "X-Muse-Api-Version": "1",
    "X-Muse-App-Version": "0.1.0",
  });
  assert.deepEqual(nativeHeaders({ apiVersion: 1, appVersion: "2.0.0" }, "android"), {
    "X-Muse-Client": "android",
    "X-Muse-Api-Version": "1",
    "X-Muse-App-Version": "2.0.0",
  });
});

