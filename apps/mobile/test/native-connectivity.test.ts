import assert from "node:assert/strict";
import { test } from "node:test";
import { reduceConnectivity } from "../src/native/connectivity";
test("connectivity: all nine reachability combinations", () => {
  const values = [false, null, true] as const;
  const online = { offline: false };
  const offline = { offline: true };
  for (const isConnected of values) {
    for (const isInternetReachable of values) {
      const expected = isConnected === false || isInternetReachable === false;
      assert.deepEqual(
        reduceConnectivity(online, { isConnected, isInternetReachable }),
        { offline: expected, changedToOnline: false },
        `${String(isConnected)}/${String(isInternetReachable)}`,
      );
      assert.deepEqual(reduceConnectivity(offline, { isConnected, isInternetReachable }), {
        offline: expected,
        changedToOnline: !expected,
      });
    }
  }
});

test("connectivity: changedToOnline only fires on offline-to-online", () => {
  assert.deepEqual(reduceConnectivity({ offline: false }, { isConnected: true, isInternetReachable: true }), {
    offline: false,
    changedToOnline: false,
  });
  assert.deepEqual(reduceConnectivity({ offline: true }, { isConnected: true, isInternetReachable: true }), {
    offline: false,
    changedToOnline: true,
  });
});

