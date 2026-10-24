import assert from "node:assert/strict";
import { test } from "node:test";
import {
  acceptEmbedMessage,
  embedMessageSchema,
  frameProps,
  newEmbedNonce,
} from "../src/embed-messages";
import { SURFACE_SANDBOX } from "../src/surface-url";

const nonce = "0123456789abcdef0123456789abcdef";
const good = {
  expectedNonce: nonce,
  sourceIsFrame: true,
  origin: "null",
  pageOrigin: "https://app.example",
};
const ready = { v: 1, type: "ready", nonce };
const resize = { v: 1, type: "resize", nonce, height: 600 };

test("a ready and a resize message from this frame's opaque origin are accepted", () => {
  assert.deepEqual(acceptEmbedMessage(good, ready), ready);
  assert.deepEqual(acceptEmbedMessage(good, resize), resize);
});

test("a message from any other window is refused, whatever it says", () => {
  assert.equal(acceptEmbedMessage({ ...good, sourceIsFrame: false }, ready), null);
});

test("only the opaque origin is accepted; a named origin or the page's own origin means the sandbox is not in force", () => {
  for (const origin of [
    "https://app.example",
    "https://evil.example",
    "http://app.example",
    "",
    "undefined",
  ]) {
    assert.equal(acceptEmbedMessage({ ...good, origin }, ready), null, origin);
  }
  assert.equal(acceptEmbedMessage({ ...good, origin: "null", pageOrigin: "null" }, ready), null);
});

test("a wrong, missing, malformed or reused-from-another-embed nonce is refused", () => {
  const other = "f".repeat(32);
  for (const bad of [
    { ...ready, nonce: other },
    { v: 1, type: "ready" },
    { ...ready, nonce: "short" },
    { ...ready, nonce: nonce.toUpperCase() },
    { ...ready, nonce: 7 },
  ]) {
    assert.equal(acceptEmbedMessage(good, bad), null, JSON.stringify(bad));
  }
});

test("messages that would navigate, submit, open windows or change location are refused", () => {
  for (const type of [
    "navigate",
    "open",
    "popup",
    "submit",
    "form",
    "location",
    "redirect",
    "eval",
    "decide",
    "approve",
    "sign-in",
    "set-token",
  ]) {
    assert.equal(
      acceptEmbedMessage(good, { v: 1, type, nonce, url: "https://evil.example/" }),
      null,
      type,
    );
    assert.equal(acceptEmbedMessage(good, { v: 1, type, nonce }), null, type);
  }
});

test("the schema is strict: extra keys, wrong version, bad sizes and non-objects are refused", () => {
  for (const bad of [
    { ...ready, extra: 1 },
    { ...resize, href: "/x" },
    { ...ready, v: 2 },
    { ...resize, height: 119 },
    { ...resize, height: 2001 },
    { ...resize, height: 300.5 },
    { ...resize, height: "300" },
    { ...resize, height: Number.NaN },
    { ...resize, height: Number.POSITIVE_INFINITY },
    JSON.stringify(ready),
    [ready],
    null,
    undefined,
    42,
    JSON.parse(
      '{"v":1,"type":"ready","nonce":"0123456789abcdef0123456789abcdef","__proto__":{"x":1}}',
    ),
  ]) {
    assert.equal(acceptEmbedMessage(good, bad), null, JSON.stringify(bad));
  }
  assert.equal(embedMessageSchema.safeParse(ready).success, true);
});

test("a nonce is 128 random bits in hex, and a missing random source yields none", () => {
  const value = newEmbedNonce();
  assert.match(value ?? "", /^[0-9a-f]{32}$/);
  assert.notEqual(newEmbedNonce(), value);
  assert.equal(newEmbedNonce(null), null);
  assert.equal(newEmbedNonce({}), null);
});

test("the frame is built with the pinned sandbox, no referrer, no permissions and the nonce in the fragment", () => {
  const props = frameProps("/embed/presence?x=1#old", "Presence", nonce);
  assert.equal(props.sandbox, "allow-scripts");
  assert.equal(props.sandbox, SURFACE_SANDBOX);
  assert.equal(props.src, `/embed/presence?x=1#embed=${nonce}`);
  assert.equal(props.referrerPolicy, "no-referrer");
  assert.equal(props.allow, "");
  const tokens = props.sandbox.split(/\s+/);
  for (const forbidden of [
    "allow-same-origin",
    "allow-top-navigation",
    "allow-top-navigation-by-user-activation",
    "allow-top-navigation-to-custom-protocols",
    "allow-forms",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-modals",
    "allow-downloads",
    "allow-pointer-lock",
    "allow-presentation",
    "allow-orientation-lock",
    "allow-storage-access-by-user-activation",
  ]) {
    assert.ok(!tokens.includes(forbidden), forbidden);
  }
  assert.deepEqual(tokens, ["allow-scripts"]);
});
