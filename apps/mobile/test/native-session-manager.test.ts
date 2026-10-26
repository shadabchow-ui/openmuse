import assert from "node:assert/strict";
import { test } from "node:test";
import type { NativeConfig } from "../src/native/config";
import { readNativeConfig } from "../src/native/config";
import { AuthError } from "../src/native/errors";
import { createSessionManager } from "../src/native/session-manager";
import { MemoryTokenStore, parseStoredSession, type StoredSession, type TokenStore } from "../src/native/token-store-core";

const cfg: NativeConfig = readNativeConfig(
  { EXPO_PUBLIC_API_URL: "https://gateway.example.test" },
  { dev: false, platform: "ios" },
);

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION: StoredSession = { token: "t".repeat(64), expiresAtMs: 2_000_000_000_000, publicId: "public-1" };

function scriptedStore(value: unknown, writes: StoredSession[] = []): TokenStore {
  return {
    read: async () => value as StoredSession | null,
    write: async (session: StoredSession) => {
      writes.push(session);
    },
    clear: async () => {},
  };
}

test("parseStoredSession accepts objects and JSON strings", () => {
  assert.deepEqual(parseStoredSession(SESSION), SESSION);
  assert.deepEqual(parseStoredSession(JSON.stringify(SESSION)), SESSION);
  assert.equal(parseStoredSession(null), null);
  assert.equal(parseStoredSession("not json"), null);
  assert.equal(parseStoredSession({ token: "", expiresAtMs: -1, publicId: "" }), null);
  assert.equal(parseStoredSession({ token: SESSION.token }), null);
});

test("restore with no stored session signs out with reason none", async () => {
  const manager = createSessionManager({ store: new MemoryTokenStore(), cfg, platform: "ios" });
  await manager.restore();
  assert.deepEqual(manager.state(), { kind: "signedOut", reason: "none" });
  assert.equal(manager.getToken(), null);
});

test("restore with a valid session signs in", async () => {
  const store = new MemoryTokenStore();
  await store.write(SESSION);
  const manager = createSessionManager({ store, cfg, platform: "ios", now: () => SESSION.expiresAtMs - DAY_MS });
  await manager.restore();
  assert.deepEqual(manager.state(), {
    kind: "signedIn",
    expiresAtMs: SESSION.expiresAtMs,
    publicId: SESSION.publicId,
  });
  assert.equal(manager.getToken(), SESSION.token);
});

test("restore with an expired session clears and signs out expired", async () => {
  const cleared: string[] = [];
  const store: TokenStore = {
    read: async () => SESSION,
    write: async () => {},
    clear: async () => {
      cleared.push("cleared");
    },
  };
  const manager = createSessionManager({ store, cfg, platform: "ios", now: () => SESSION.expiresAtMs });
  await manager.restore();
  assert.deepEqual(cleared, ["cleared"]);
  assert.deepEqual(manager.state(), { kind: "signedOut", reason: "expired" });
});

test("restore with garbage treats it as none and clears", async () => {
  const manager = createSessionManager({
    store: scriptedStore("definitely not json"),
    cfg,
    platform: "ios",
  });
  await manager.restore();
  assert.deepEqual(manager.state(), { kind: "signedOut", reason: "none" });
});

test("no renew outside the 7-day window", async () => {
  let calls = 0;
  const manager = createSessionManager({
    store: scriptedStore(SESSION),
    cfg,
    platform: "ios",
    now: () => SESSION.expiresAtMs - 8 * DAY_MS,
    renew: async () => {
      calls += 1;
      return null;
    },
  });
  await manager.restore();
  await manager.ensureFresh();
  assert.equal(calls, 0);
  assert.deepEqual(manager.state(), {
    kind: "signedIn",
    expiresAtMs: SESSION.expiresAtMs,
    publicId: SESSION.publicId,
  });
});

test("renew inside the window writes the new session", async () => {
  const writes: StoredSession[] = [];
  const fresh: StoredSession = { token: "n".repeat(64), expiresAtMs: SESSION.expiresAtMs + 30 * DAY_MS, publicId: "public-2" };
  const manager = createSessionManager({
    store: scriptedStore(SESSION, writes),
    cfg,
    platform: "ios",
    now: () => SESSION.expiresAtMs - 6 * DAY_MS,
    renew: async () => fresh,
  });
  await manager.restore();
  await manager.ensureFresh();
  assert.deepEqual(writes, [fresh]);
  assert.deepEqual(manager.state(), { kind: "signedIn", expiresAtMs: fresh.expiresAtMs, publicId: fresh.publicId });
  assert.equal(manager.getToken(), fresh.token);
});

test("renew returning null changes nothing", async () => {
  const manager = createSessionManager({
    store: scriptedStore(SESSION),
    cfg,
    platform: "ios",
    now: () => SESSION.expiresAtMs - DAY_MS,
    renew: async () => null,
  });
  await manager.restore();
  await manager.ensureFresh();
  assert.deepEqual(manager.state(), {
    kind: "signedIn",
    expiresAtMs: SESSION.expiresAtMs,
    publicId: SESSION.publicId,
  });
});

test("concurrent ensureFresh shares one renew call", async () => {
  let calls = 0;
  const manager = createSessionManager({
    store: scriptedStore(SESSION),
    cfg,
    platform: "ios",
    now: () => SESSION.expiresAtMs - DAY_MS,
    renew: async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return null;
    },
  });
  await manager.restore();
  await Promise.all(Array.from({ length: 10 }, () => manager.ensureFresh()));
  assert.equal(calls, 1);
});

test("renew network failure keeps the token and stays signed in", async () => {
  const manager = createSessionManager({
    store: scriptedStore(SESSION),
    cfg,
    platform: "ios",
    now: () => SESSION.expiresAtMs - DAY_MS,
    renew: async () => {
      throw new AuthError("network");
    },
  });
  await manager.restore();
  await manager.ensureFresh();
  assert.equal(manager.getToken(), SESSION.token);
  assert.deepEqual(manager.state(), {
    kind: "signedIn",
    expiresAtMs: SESSION.expiresAtMs,
    publicId: SESSION.publicId,
  });
});

test("renew 401 clears once and notifies subscribers once", async () => {
  let cleared = 0;
  const store: TokenStore = {
    read: async () => SESSION,
    write: async () => {},
    clear: async () => {
      cleared += 1;
    },
  };
  const manager = createSessionManager({
    store,
    cfg,
    platform: "ios",
    now: () => SESSION.expiresAtMs - DAY_MS,
    renew: async () => {
      throw new AuthError("revoked");
    },
  });
  let notifications = 0;
  manager.subscribe(() => {
    notifications += 1;
  });
  await manager.restore();
  const afterRestore = notifications;
  await manager.ensureFresh();
  assert.equal(cleared, 1);
  assert.deepEqual(manager.state(), { kind: "signedOut", reason: "revoked" });
  assert.equal(notifications, afterRestore + 1);
  await manager.onUnauthorized();
  assert.equal(cleared, 1);
  assert.equal(notifications, afterRestore + 1);
});

test("signOut clears even when logout throws", async () => {
  const store = new MemoryTokenStore();
  await store.write(SESSION);
  const manager = createSessionManager({
    store,
    cfg,
    platform: "ios",
    logout: async () => {
      throw new Error("offline");
    },
  });
  await manager.restore();
  await manager.signOut();
  assert.equal(await store.read(), null);
  assert.deepEqual(manager.state(), { kind: "signedOut", reason: "none" });
  assert.equal(manager.getToken(), null);
});

test("completeSignIn writes and publishes one transition", async () => {
  const store = new MemoryTokenStore();
  const manager = createSessionManager({ store, cfg, platform: "ios" });
  let notifications = 0;
  manager.subscribe(() => {
    notifications += 1;
  });
  await manager.completeSignIn(SESSION);
  assert.deepEqual(await store.read(), SESSION);
  assert.equal(manager.getToken(), SESSION.token);
  assert.equal(notifications, 1);
  await manager.completeSignIn(SESSION);
  assert.equal(notifications, 1);
});

test("onUnsupportedVersion keeps the token", async () => {
  const store = new MemoryTokenStore();
  await store.write(SESSION);
  const manager = createSessionManager({ store, cfg, platform: "ios" });
  await manager.restore();
  manager.onUnsupportedVersion();
  assert.deepEqual(manager.state(), { kind: "unsupportedVersion" });
  assert.deepEqual(await store.read(), SESSION);
});
