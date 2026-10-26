import assert from "node:assert/strict";
import { test } from "node:test";
import { readNativeConfig } from "../src/native/config";
import type { NativeConfig } from "../src/native/config";
import { parseDeepLink } from "../src/native/deep-link";

const cfg: NativeConfig = readNativeConfig(
  { EXPO_PUBLIC_API_URL: "https://gateway.example.test" },
  { dev: false, platform: "ios" },
);
const ID = "123e4567-e89b-12d3-a456-426614174000";

test("accepted deep links parse to routes", () => {
  assert.deepEqual(parseDeepLink("openmuse://task/" + ID, cfg), { kind: "task", taskId: ID });
  assert.deepEqual(parseDeepLink("openmuse://approval/" + ID, cfg), { kind: "approval", runId: ID });
  assert.deepEqual(parseDeepLink("openmuse://chat", cfg), { kind: "chat" });
  assert.deepEqual(parseDeepLink("openmuse://notifications", cfg), { kind: "notifications" });
  const callback = "openmuse://auth/callback?code=abc&state=def";
  assert.deepEqual(parseDeepLink(callback, cfg), { kind: "authCallback", url: callback });
});

for (const url of [
  "openmuse://task/not-a-uuid",
  "openmuse://approval/" + ID + "/extra",
  "openmuse://chat/extra",
  "openmuse://chat?x=1",
  "openmuse://other",
  "openmuse://task/",
  "otherapp://chat",
  "https://gateway.example.test/chat",
  "javascript:openmuse://chat",
  "",
  "openmuse://",
  "openmuse://approval/xyz",
]) {
  test(`rejected deep link: ${JSON.stringify(url)}`, () => {
    assert.equal(parseDeepLink(url, cfg), null);
  });
}
