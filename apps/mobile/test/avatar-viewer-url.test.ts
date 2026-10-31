import assert from "node:assert/strict";
import test from "node:test";
import { resolveAvatarViewerUrl } from "../src/robot/avatar-viewer-url.ts";

const local = "http://127.0.0.1:8879/runtime/index.html";

test("local avatar preview is available only in development web", () => {
  assert.equal(resolveAvatarViewerUrl(local, "web", true), local);
  assert.equal(resolveAvatarViewerUrl(local, "web", false), null);
  assert.equal(resolveAvatarViewerUrl(local, "native", true), null);
});

test("owner-configured HTTPS runtime page may be embedded", () => {
  const url = "https://avatar.example.test/runtime/index.html";
  assert.equal(resolveAvatarViewerUrl(url, "web", false), url);
  assert.equal(resolveAvatarViewerUrl(url, "native", false), url);
});

test("reject credentials, URL params, external HTTP and unexpected paths", () => {
  for (const url of [
    "http://example.test/runtime/index.html",
    "https://user:secret@example.test/runtime/index.html",
    "https://example.test/runtime/index.html?token=secret",
    "https://example.test/runtime/index.html#auth",
    "https://example.test/not-a-viewer",
    "javascript:alert(1)",
    " http://127.0.0.1:8879/runtime/index.html",
  ]) {
    assert.equal(resolveAvatarViewerUrl(url, "web", true), null, url);
    assert.equal(resolveAvatarViewerUrl(url, "native", true), null, url);
  }
});

test("missing configuration preserves the existing status-only UI", () => {
  assert.equal(resolveAvatarViewerUrl(undefined, "web", true), null);
  assert.equal(resolveAvatarViewerUrl("", "web", true), null);
});
