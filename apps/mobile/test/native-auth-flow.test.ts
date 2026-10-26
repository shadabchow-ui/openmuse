import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAuthorizeUrl, exchangeCode, parseCallback } from "../src/native/auth-flow";
import { readNativeConfig } from "../src/native/config";
import { AuthError } from "../src/native/errors";
import type { NativeConfig } from "../src/native/config";

const cfg: NativeConfig = readNativeConfig(
  { EXPO_PUBLIC_API_URL: "https://gateway.example.test", EXPO_PUBLIC_APP_VERSION: "0.1.0" },
  { dev: false, platform: "ios" },
);

const SECRET_CODE = "sample-authorization-code-abc123XYZ";
const SECRET_VERIFIER = "sample-verifier-".padEnd(43, "x");
const TOKEN = "t".repeat(64);
const EXPIRES_AT = "2030-01-01T00:00:00.000Z";
const PUBLIC_ID = "123e4567-e89b-12d3-a456-426614174000";
const STATE = "state-value-0123456789abcdef";

interface LoggedRequest {
  method: string;
  url: string;
  status: number;
}

function fakeFetch(handler: (url: string, body: unknown) => { status: number; body: unknown }) {
  const requestLog: LoggedRequest[] = [];
  const bodies: unknown[] = [];
  const fetchFn = async (url: string, init?: RequestInit): Promise<Response> => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    bodies.push(body);
    const { status, body: payload } = handler(url, body);
    requestLog.push({ method: init?.method ?? "GET", url, status });
    return new Response(JSON.stringify(payload), { status });
  };
  return { fetchFn, requestLog, bodies };
}

function okFetch() {
  return fakeFetch(() => ({ status: 200, body: { token: TOKEN, expiresAt: EXPIRES_AT, sessionPublicId: PUBLIC_ID } }));
}

const CALLBACK = `${cfg.redirectUri}?code=${SECRET_CODE}&state=${STATE}`;

test("authorize URL shape and parameter order", () => {
  const url = buildAuthorizeUrl(cfg, {
    challenge: "challenge-value-0123456789abcdefghij",
    state: STATE,
    label: "Phone",
    platform: "ios",
  });
  assert.equal(
    url,
    "https://gateway.example.test/api/native/authorize" +
      "?client_id=muse-native" +
      "&redirect_uri=openmuse%3A%2F%2Fauth%2Fcallback" +
      "&code_challenge=challenge-value-0123456789abcdefghij" +
      "&code_challenge_method=S256" +
      `&state=${STATE}` +
      "&device_label=Phone" +
      "&platform=ios",
  );
});

test("device label is clipped to 60 characters", () => {
  const url = buildAuthorizeUrl(cfg, {
    challenge: "c",
    state: STATE,
    label: "L".repeat(80),
    platform: "android",
  });
  const query = url.split("?")[1]!;
  const label = new URLSearchParams(query).get("device_label")!;
  assert.equal(label.length, 60);
});

test("valid callback parses to code", () => {
  assert.deepEqual(parseCallback(CALLBACK, STATE, cfg), { kind: "code", code: SECRET_CODE });
});

test("access_denied with matching state parses to denied", () => {
  const url = `${cfg.redirectUri}?error=access_denied&state=${STATE}`;
  assert.deepEqual(parseCallback(url, STATE, cfg), { kind: "denied" });
});

for (const [name, url] of [
  ["wrong prefix", `https://evil.example.test/?code=${SECRET_CODE}&state=${STATE}`],
  ["wrong state", `${cfg.redirectUri}?code=${SECRET_CODE}&state=other-state-value-0000000000`],
  ["wrong state, different length", `${cfg.redirectUri}?code=${SECRET_CODE}&state=${STATE}x`],
  ["wrong state, too short", `${cfg.redirectUri}?code=${SECRET_CODE}&state=short`],
  ["missing state", `${cfg.redirectUri}?code=${SECRET_CODE}`],
  ["short code", `${cfg.redirectUri}?code=short&state=${STATE}`],
  ["bad alphabet", `${cfg.redirectUri}?code=${"!".repeat(24)}&state=${STATE}`],
  ["duplicate code", `${cfg.redirectUri}?code=${SECRET_CODE}&code=${SECRET_CODE}&state=${STATE}`],
  ["javascript URL", `javascript:alert(1)//${cfg.redirectUri}?code=${SECRET_CODE}&state=${STATE}`],
  ["different scheme", `otherapp://auth/callback?code=${SECRET_CODE}&state=${STATE}`],
  ["error with wrong state", `${cfg.redirectUri}?error=access_denied&state=wrong-state-0000000000000000`],
  ["empty", ""],
] as Array<[string, string]>) {
  test(`callback rejection: ${name}`, () => {
    assert.deepEqual(parseCallback(url, STATE, cfg), { kind: "invalid" });
  });
}

test("exchange success posts the contract body with native headers", async () => {
  const { fetchFn, bodies } = okFetch();
  const session = await exchangeCode(fetchFn, cfg, {
    code: SECRET_CODE,
    verifier: SECRET_VERIFIER,
    platform: "ios",
  });
  assert.equal(session.token, TOKEN);
  assert.equal(session.expiresAtMs, Date.parse(EXPIRES_AT));
  assert.equal(session.publicId, PUBLIC_ID);
  assert.deepEqual(bodies[0], {
    code: SECRET_CODE,
    code_verifier: SECRET_VERIFIER,
    redirect_uri: cfg.redirectUri,
  });
});

for (const [status, code] of [
  [400, "expired"],
  [426, "unsupported_version"],
  [429, "network"],
  [500, "network"],
  [503, "network"],
  [403, "invalid"],
] as Array<[number, string]>) {
  test(`exchange HTTP ${status} maps to ${code}`, async () => {
    const { fetchFn } = fakeFetch(() => ({ status, body: { error: "x" } }));
    await assert.rejects(
      () => exchangeCode(fetchFn, cfg, { code: SECRET_CODE, verifier: SECRET_VERIFIER, platform: "ios" }),
      (error: unknown) => error instanceof AuthError && error.code === code,
    );
  });
}

test("exchange rejection maps to network", async () => {
  const fetchFn = async (): Promise<Response> => {
    throw new Error("socket hang up");
  };
  await assert.rejects(
    () => exchangeCode(fetchFn, cfg, { code: SECRET_CODE, verifier: SECRET_VERIFIER, platform: "ios" }),
    (error: unknown) => error instanceof AuthError && error.code === "network",
  );
});

test("exchange rejects malformed success bodies", async () => {
  for (const body of [
    { token: "short", expiresAt: EXPIRES_AT, sessionPublicId: PUBLIC_ID },
    { token: TOKEN, expiresAt: "not-a-date", sessionPublicId: PUBLIC_ID },
    { token: TOKEN, expiresAt: EXPIRES_AT, sessionPublicId: "not-a-uuid" },
    { nope: true },
  ]) {
    const { fetchFn } = fakeFetch(() => ({ status: 200, body }));
    await assert.rejects(
      () => exchangeCode(fetchFn, cfg, { code: SECRET_CODE, verifier: SECRET_VERIFIER, platform: "ios" }),
      (error: unknown) => error instanceof AuthError && error.code === "invalid",
    );
  }
});

test("thrown errors and the request log carry no secrets", async () => {
  const { fetchFn, requestLog } = fakeFetch(() => ({ status: 400, body: { error: "invalid_grant" } }));
  const thrown: unknown[] = [];
  try {
    await exchangeCode(fetchFn, cfg, { code: SECRET_CODE, verifier: SECRET_VERIFIER, platform: "ios" });
  } catch (error) {
    thrown.push(error);
  }
  assert.equal(thrown.length, 1);
  const rendered = thrown.map((error) => `${String(error)} ${JSON.stringify(error)}`);
  for (const value of [...rendered, ...requestLog.map((entry) => JSON.stringify(entry))]) {
    assert.ok(!value.includes(SECRET_CODE), "code leaked");
    assert.ok(!value.includes(SECRET_VERIFIER), "verifier leaked");
    assert.ok(!value.includes(TOKEN), "token leaked");
  }
  assert.equal(requestLog.length, 1);
});
