import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldLock } from "../src/native/biometric-policy";
test("biometric lock: sixteen combinations", () => {
  let locked = 0;
  for (const enabled of [undefined, false, true]) {
    for (const hasHardware of [false, true]) {
      for (const enrolled of [false, true]) {
        for (const awayMs of [59_999, 60_000]) {
          const result = shouldLock({ enabled, hasHardware, enrolled, awayMs });
          const expected = enabled === true && hasHardware && enrolled && awayMs >= 60_000;
          assert.equal(result, expected, JSON.stringify({ enabled, hasHardware, enrolled, awayMs }));
          if (result) locked += 1;
        }
      }
    }
  }
  assert.equal(locked, 1);
});
