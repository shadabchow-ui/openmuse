import assert from "node:assert/strict";
import { test } from "node:test";
import { readNativeConfig } from "../src/native/config";
import { NativeConfigError } from "../src/native/errors";

const HTTPS = "https://gateway.example.test";
const URL_ERROR = "native builds need an absolute https gateway URL";

function env(overrides: Record<string, string | undefined> = {}) {
  return { EXPO_PUBLIC_API_URL: HTTPS, ...overrides };
}

test("defaults produce a complete native config", () => {
  const cfg = readNativeConfig(env(), { dev: false, platform: "ios" });
  assert.equal(cfg.authMode, "native");
  assert.equal(cfg.apiUrl, HTTPS);
  assert.equal(cfg.apiPrefix, "/api");
  assert.equal(cfg.scheme, "openmuse");
  assert.equal(cfg.redirectUri, "openmuse://auth/callback");
  assert.equal(cfg.clientId, "muse-native");
  assert.equal(cfg.apiVersion, 1);
  assert.equal(cfg.appVersion, "0.0.0");
  assert.equal(cfg.storeUrl, null);
});

test("trailing slashes are trimmed from the gateway URL", () => {
  const cfg = readNativeConfig(env({ EXPO_PUBLIC_API_URL: `${HTTPS}///` }), {
    dev: false,
    platform: "android",
  });
  assert.equal(cfg.apiUrl, HTTPS);
});

test("https URLs are always allowed", () => {
  const cfg = readNativeConfig(env({ EXPO_PUBLIC_API_URL: "https://10.0.0.9:9443/sub" }), {
    dev: false,
    platform: "ios",
  });
  assert.equal(cfg.apiUrl, "https://10.0.0.9:9443/sub");
});

for (const url of [
  "http://localhost:8787",
  "http://127.0.0.1:8787",
  "http://10.0.2.2:8787",
  "http://192.168.1.20:8787",
  "http://10.4.5.6:8787",
  "http://172.16.9.9:8787",
  "http://172.31.255.1:8787",
]) {
  test(`dev http is allowed for local host ${url}`, () => {
    const cfg = readNativeConfig(env({ EXPO_PUBLIC_API_URL: url }), { dev: true, platform: "ios" });
    assert.equal(cfg.apiUrl, url);
  });
}

for (const url of ["http://localhost:8787", "http://127.0.0.1:8787", "http://192.168.1.20:8787"]) {
  test(`http is rejected outside dev (${url})`, () => {
    assert.throws(
      () => readNativeConfig(env({ EXPO_PUBLIC_API_URL: url }), { dev: false, platform: "ios" }),
      (error: unknown) => {
        assert.ok(error instanceof NativeConfigError);
        assert.equal((error as NativeConfigError).message, URL_ERROR);
        return true;
      },
    );
  });
}

test("dev http to a public host is rejected", () => {
  assert.throws(
    () => readNativeConfig(env({ EXPO_PUBLIC_API_URL: "http://203.0.113.7:8787" }), { dev: true, platform: "ios" }),
    (error: unknown) => error instanceof NativeConfigError && error.message === URL_ERROR,
  );
});

for (const url of [
  undefined,
  "gateway.example.test",
  "/relative/path",
  "javascript:alert(1)",
  "ftp://gateway.example.test",
  "openmuse://auth/callback",
  "https://user@gateway.example.test",
  "https://user:pass@gateway.example.test",
]) {
  test(`malformed or credentialed URLs are rejected (${String(url)})`, () => {
    assert.throws(
      () => readNativeConfig(env({ EXPO_PUBLIC_API_URL: url }), { dev: true, platform: "ios" }),
      (error: unknown) => error instanceof NativeConfigError && error.message === URL_ERROR,
    );
  });
}

test("custom prefix, scheme, version and store URL", () => {
  const cfg = readNativeConfig(
    env({
      EXPO_PUBLIC_API_PREFIX: "/gateway",
      EXPO_PUBLIC_APP_SCHEME: "museroom",
      EXPO_PUBLIC_APP_VERSION: "1.2.3",
      EXPO_PUBLIC_STORE_URL: "https://apps.example.test/openmuse",
    }),
    { dev: false, platform: "android" },
  );
  assert.equal(cfg.apiPrefix, "/gateway");
  assert.equal(cfg.scheme, "museroom");
  assert.equal(cfg.redirectUri, "museroom://auth/callback");
  assert.equal(cfg.appVersion, "1.2.3");
  assert.equal(cfg.storeUrl, "https://apps.example.test/openmuse");
});

test("prefix must start with a slash", () => {
  assert.throws(
    () => readNativeConfig(env({ EXPO_PUBLIC_API_PREFIX: "gateway" }), { dev: false, platform: "ios" }),
    NativeConfigError,
  );
});

for (const scheme of ["Openmuse", "x", "has space", "under_score", "-lead", ""]) {
  test(`bad schemes are rejected (${JSON.stringify(scheme)})`, () => {
    assert.throws(
      () => readNativeConfig(env({ EXPO_PUBLIC_APP_SCHEME: scheme }), { dev: false, platform: "ios" }),
      NativeConfigError,
    );
  });
}

for (const version of ["1.2", "v1.2.3", "1.2.3.4.5", "latest"]) {
  test(`bad versions are rejected (${version})`, () => {
    assert.throws(
      () => readNativeConfig(env({ EXPO_PUBLIC_APP_VERSION: version }), { dev: false, platform: "ios" }),
      NativeConfigError,
    );
  });
}

test("non-https store URLs become null", () => {
  for (const store of ["http://apps.example.test/x", "openmuse://store", undefined]) {
    const cfg = readNativeConfig(env({ EXPO_PUBLIC_STORE_URL: store }), { dev: false, platform: "ios" });
    assert.equal(cfg.storeUrl, null);
  }
});
