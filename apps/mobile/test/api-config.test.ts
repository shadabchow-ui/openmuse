import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ExternalAuthRequired,
  ExternalModeBlocked,
  isUpstreamDecidePath,
  makeApiConfig,
  mapApiPath,
  openSession,
  requestInit,
  sendRequest,
} from "../src/api-config";

const external = { EXPO_PUBLIC_AUTH_MODE: "external" };

test("defaults keep the upstream behaviour", () => {
  const config = makeApiConfig({});
  assert.equal(config.apiUrl, "http://localhost:8787");
  assert.equal(config.prefix, "/api");
  assert.equal(config.authMode, "accessKey");
  assert.equal(config.telemetryOff, false);
  assert.equal(config.brandName, undefined);
  assert.equal(makeApiConfig({}, true).apiUrl, "http://10.0.2.2:8787");
  assert.equal(mapApiPath(config, "/api/session"), "/api/session");
});

test("a configured API URL loses one trailing slash", () => {
  assert.equal(
    makeApiConfig({ EXPO_PUBLIC_API_URL: "https://x.example/" }).apiUrl,
    "https://x.example",
  );
});

test("external mode with no API URL uses the same origin", () => {
  assert.equal(makeApiConfig(external).apiUrl, "");
  assert.equal(makeApiConfig({ ...external, EXPO_PUBLIC_API_URL: "" }).apiUrl, "");
  assert.equal(
    makeApiConfig({ ...external, EXPO_PUBLIC_API_URL: "https://x.example" }).apiUrl,
    "https://x.example",
  );
});

test("a custom prefix maps every api path", () => {
  const config = makeApiConfig({ EXPO_PUBLIC_API_PREFIX: "/api/gateway" });
  assert.equal(mapApiPath(config, "/api/copilotkit"), "/api/gateway/copilotkit");
  assert.equal(mapApiPath(config, "/api/session"), "/api/gateway/session");
  assert.equal(mapApiPath(config, "/api/agent/tasks/abc"), "/api/gateway/agent/tasks/abc");
  assert.equal(mapApiPath(config, "/api/calendar/events?a=1"), "/api/gateway/calendar/events?a=1");
});

test("paths outside /api/ are unchanged", () => {
  const config = makeApiConfig({ EXPO_PUBLIC_API_PREFIX: "/api/gateway" });
  assert.equal(mapApiPath(config, "/health"), "/health");
  assert.equal(mapApiPath(config, "https://x.example/api/y"), "https://x.example/api/y");
  assert.equal(mapApiPath(config, "/apiary/x"), "/apiary/x");
});

test("a trailing slash on the prefix is stripped", () => {
  assert.equal(makeApiConfig({ EXPO_PUBLIC_API_PREFIX: "/v1/" }).prefix, "/v1");
});

test("an invalid prefix falls back to /api", () => {
  for (const value of ["v1", "", "  ", "/", "https://x.example/api"]) {
    assert.equal(
      makeApiConfig({ EXPO_PUBLIC_API_PREFIX: value }).prefix,
      "/api",
      JSON.stringify(value),
    );
  }
});

test("external mode implies telemetry off unless set otherwise", () => {
  assert.equal(makeApiConfig(external).telemetryOff, true);
  assert.equal(makeApiConfig({ ...external, EXPO_PUBLIC_TELEMETRY: "on" }).telemetryOff, false);
  assert.equal(makeApiConfig({ EXPO_PUBLIC_TELEMETRY: "off" }).telemetryOff, true);
  assert.equal(makeApiConfig({ EXPO_PUBLIC_TELEMETRY: "OFF" }).telemetryOff, false);
});

test("auth mode is external only for the exact string", () => {
  assert.equal(makeApiConfig({ EXPO_PUBLIC_AUTH_MODE: "External" }).authMode, "accessKey");
  assert.equal(makeApiConfig({ EXPO_PUBLIC_AUTH_MODE: "accessKey" }).authMode, "accessKey");
});

test("brand name is trimmed and empty means unset", () => {
  assert.equal(makeApiConfig({ EXPO_PUBLIC_BRAND_NAME: "  Acme  " }).brandName, "Acme");
  assert.equal(makeApiConfig({ EXPO_PUBLIC_BRAND_NAME: "   " }).brandName, undefined);
});

test("request options: bearer token upstream, no Authorization and same-origin credentials in external mode", () => {
  const upstream = requestInit(makeApiConfig({}), "tok", "POST", { a: 1 });
  assert.deepEqual(upstream.headers, {
    Authorization: "Bearer tok",
    "Content-Type": "application/json",
  });
  assert.equal(upstream.credentials, undefined);
  assert.equal(upstream.body, '{"a":1}');
  const ext = requestInit(makeApiConfig(external), "tok", "GET");
  assert.deepEqual(ext.headers, {});
  assert.equal(ext.credentials, "same-origin");
  assert.equal(ext.body, undefined);
});

interface Call {
  url: string;
  init: RequestInit | undefined;
}

function stub(status: number, body: unknown, calls: Call[]) {
  return async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  };
}

test("external createSession posts {} with same-origin credentials and no Authorization header", async () => {
  const calls: Call[] = [];
  const config = makeApiConfig({ ...external, EXPO_PUBLIC_API_PREFIX: "/api/gateway" });
  const session = await openSession(
    config,
    "",
    "secret-key",
    stub(200, { token: "cookie", mode: "live" }, calls),
  );
  assert.deepEqual(session, { token: "cookie", mode: "live" });
  assert.equal(calls[0]?.url, "/api/gateway/session");
  assert.equal(calls[0]?.init?.body, "{}");
  assert.equal(calls[0]?.init?.credentials, "same-origin");
  assert.equal(JSON.stringify(calls[0]?.init?.headers).includes("Authorization"), false);
  assert.equal(String(calls[0]?.init?.body).includes("secret-key"), false);
});

test("external createSession turns 401 into ExternalAuthRequired", async () => {
  const config = makeApiConfig(external);
  const body = {
    error: "Sign in to continue.",
    code: "sign_in_required",
    signInUrl: "https://login.example/x",
  };
  await assert.rejects(
    openSession(config, "", undefined, stub(401, body, [])),
    (error: unknown) => {
      assert.ok(error instanceof ExternalAuthRequired);
      assert.equal(error.signInUrl, "https://login.example/x");
      return true;
    },
  );
  await assert.rejects(
    openSession(config, "", undefined, stub(401, { error: "x", signInUrl: null }, [])),
    (error: unknown) => error instanceof ExternalAuthRequired && error.signInUrl === null,
  );
});

test("other failures keep their message in external mode", async () => {
  await assert.rejects(
    openSession(
      makeApiConfig(external),
      "",
      undefined,
      stub(500, { error: "Something went wrong." }, []),
    ),
    /Something went wrong\./,
  );
});

test("access-key createSession posts the key and treats 401 as a plain error", async () => {
  const calls: Call[] = [];
  const config = makeApiConfig({});
  await assert.rejects(
    openSession(config, "http://localhost:8787", "k", stub(401, { error: "Bad key." }, calls)),
    (error: unknown) =>
      error instanceof Error &&
      !(error instanceof ExternalAuthRequired) &&
      error.message === "Bad key.",
  );
  assert.equal(calls[0]?.url, "http://localhost:8787/api/session");
  assert.equal(calls[0]?.init?.body, '{"accessKey":"k"}');
  assert.equal(calls[0]?.init?.credentials, undefined);
});

// --- telemetry switch: runs the side-effect module in a clean child process ------------------

function telemetryEnv(extra: Record<string, string>) {
  const module = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "telemetry-off.ts");
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "-e",
      `import(${JSON.stringify(module)}).then(() => console.log(JSON.stringify([process.env.COPILOTKIT_TELEMETRY_DISABLED ?? null, process.env.DO_NOT_TRACK ?? null])))`,
    ],
    {
      encoding: "utf8",
      env: {
        NODE_ENV: "test",
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        ...extra,
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split("\n").pop() ?? "null");
}

test("telemetry-off sets the two opt-out variables only when telemetry is off", () => {
  assert.deepEqual(telemetryEnv({ EXPO_PUBLIC_TELEMETRY: "off" }), ["true", "1"]);
  assert.deepEqual(telemetryEnv({ EXPO_PUBLIC_AUTH_MODE: "external" }), ["true", "1"]);
  assert.deepEqual(telemetryEnv({}), [null, null]);
  assert.deepEqual(
    telemetryEnv({ EXPO_PUBLIC_AUTH_MODE: "external", EXPO_PUBLIC_TELEMETRY: "on" }),
    [null, null],
  );
});

test("sign-in origins and embed prefixes default to none and are parsed from the build settings", () => {
  const empty = makeApiConfig({});
  assert.deepEqual(empty.signInOrigins, []);
  assert.deepEqual(empty.embedPrefixes, []);
  const set = makeApiConfig({
    EXPO_PUBLIC_SIGN_IN_ORIGINS: "https://login.example,http://insecure.example",
    EXPO_PUBLIC_EMBED_PATH_PREFIXES: "/embed,/",
  });
  assert.deepEqual(set.signInOrigins, ["https://login.example"]);
  assert.deepEqual(set.embedPrefixes, ["/embed"]);
});

const externalConfig = makeApiConfig({
  EXPO_PUBLIC_AUTH_MODE: "external",
  EXPO_PUBLIC_API_PREFIX: "/api/gateway",
});
const accessKeyConfig = makeApiConfig({});
const throwingFetch = async (): Promise<Response> => {
  throw new Error("fetch must not be called");
};

test("external mode never sends the upstream decide call, in any spelling", async () => {
  for (const path of [
    "/api/actions/run1/decide",
    "/api/actions/run1/decide?x=1",
    "/api/actions/run1/decide/",
    "/api/actions/%72un1/%64ecide",
    "/api/gateway/actions/run1/decide",
    "/API/ACTIONS/run1/DECIDE",
    "/api/actions/a%2Fb/decide",
  ]) {
    assert.ok(isUpstreamDecidePath(path), path);
    for (const body of [
      undefined,
      { decision: "approve", hash: "h" },
      { decision: "deny", hash: "h" },
    ]) {
      await assert.rejects(
        sendRequest(externalConfig, "", throwingFetch, "t", path, body),
        (error: unknown) => error instanceof ExternalModeBlocked,
        path,
      );
    }
  }
});

test("other calls still go out in external mode, and access-key mode keeps the decide call", async () => {
  const seen: string[] = [];
  const okFetch = async (url: string): Promise<Response> => {
    seen.push(url);
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  await sendRequest(externalConfig, "", okFetch, "t", "/api/actions");
  await sendRequest(externalConfig, "", okFetch, "t", "/api/threads/decide-later");
  await sendRequest(accessKeyConfig, "http://x", okFetch, "t", "/api/actions/run1/decide", {
    decision: "deny",
    hash: "h",
  });
  assert.deepEqual(seen, [
    "/api/gateway/actions",
    "/api/gateway/threads/decide-later",
    "http://x/api/actions/run1/decide",
  ]);
});
