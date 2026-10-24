import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isEmbedPathAllowed,
  parseEmbedPrefixes,
  parseOrigins,
  SURFACE_SANDBOX,
  safeSignInTarget,
  safeSurfacePath,
  surfaceMode,
} from "../src/surface-url";

const allowed = ["https://login.example"];

test("safeSignInTarget accepts a single-slash path, and an https URL only from an allowed origin", () => {
  assert.equal(safeSignInTarget("https://login.example/x", allowed), "https://login.example/x");
  assert.equal(safeSignInTarget("HTTPS://LOGIN.example/x", allowed), "HTTPS://LOGIN.example/x");
  assert.equal(safeSignInTarget("/sign-in"), "/sign-in");
  assert.equal(safeSignInTarget("/sign-in?next=%2Fhome"), "/sign-in?next=%2Fhome");
});

test("safeSignInTarget refuses scripts, data URLs, protocol-relative URLs and non-strings", () => {
  for (const value of [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,x",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "http://insecure.example/x",
    "ftp://x.example",
    "https:///nohost",
    "https://a b.example",
    "/sign in",
    "/sign-in\n",
    "",
    42,
    null,
    undefined,
    {},
    "x".repeat(2049),
    `https://login.example/${"x".repeat(2100)}`,
  ]) {
    assert.equal(safeSignInTarget(value, allowed), null, JSON.stringify(value)?.slice(0, 60));
  }
});

test("safeSurfacePath accepts plain same-origin paths", () => {
  assert.equal(safeSurfacePath("/embed/presence"), "/embed/presence");
  assert.equal(safeSurfacePath("/home"), "/home");
  assert.equal(safeSurfacePath("/a/b?x=1#y"), "/a/b?x=1#y");
});

test("safeSurfacePath refuses traversal, backslashes, absolute and doubled-slash forms", () => {
  for (const value of [
    "",
    "relative/path",
    "//evil.example/x",
    "/a//b",
    "/a/../b",
    "/..",
    "/a\\b",
    "https://evil.example/x",
    "javascript:alert(1)",
    "/a/%2e%2e/b",
    "/a%2Fb",
    "/a%5Cb",
    "/a b",
    `/${"x".repeat(200)}`,
    7,
    null,
  ]) {
    assert.equal(safeSurfacePath(value), null, JSON.stringify(value)?.slice(0, 60));
  }
  assert.equal(safeSurfacePath(`/${"x".repeat(199)}`)?.length, 200);
});

test("safeSignInTarget refuses a host outside the allowed origins, including credential and case tricks", () => {
  const trusted = ["https://trusted.example"];
  for (const value of [
    "https://evil.example/x",
    "https://trusted.example@evil.example/",
    "https://trusted.example%2f@evil.example",
    ["https://trusted.example", ":pw", "@trusted.example/"].join(""),
    "HTTPS://EVIL.example",
    "https://localhost/",
    "https://trusted.example.evil.example/",
    "https://trusted.example:8443/",
  ]) {
    assert.equal(safeSignInTarget(value, trusted), null, value);
    assert.equal(safeSignInTarget(value), null, value);
  }
  assert.equal(
    safeSignInTarget("https://trusted.example/in", trusted),
    "https://trusted.example/in",
  );
  assert.equal(
    safeSignInTarget("https://trusted.example/in"),
    null,
    "no allowlist means paths only",
  );
});

test("parseOrigins keeps bare https origins and drops everything else", () => {
  assert.deepEqual(parseOrigins(undefined), []);
  assert.deepEqual(parseOrigins(""), []);
  assert.deepEqual(parseOrigins("https://a.example, HTTPS://B.example/ ,https://a.example"), [
    "https://a.example",
    "https://b.example",
  ]);
  assert.deepEqual(
    parseOrigins(
      "http://a.example,https://u@a.example,https://a.example/path,https://a.example?x=1,javascript:alert(1),//a.example,not a url",
    ),
    [],
  );
});

test("the sandbox is exactly allow-scripts and carries none of the powerful tokens", () => {
  assert.equal(SURFACE_SANDBOX, "allow-scripts");
  const tokens = SURFACE_SANDBOX.split(" ");
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
});

test("parseEmbedPrefixes keeps plain path prefixes and drops the rest", () => {
  assert.deepEqual(parseEmbedPrefixes(undefined), []);
  assert.deepEqual(parseEmbedPrefixes("/embed, /static/views/ ,/embed"), [
    "/embed",
    "/static/views",
  ]);
  assert.deepEqual(parseEmbedPrefixes("/,//x,/a?b=1,/a#b,/../x,https://x.example/a,embed"), []);
});

test("isEmbedPathAllowed matches whole path segments only", () => {
  const prefixes = ["/embed"];
  assert.ok(isEmbedPathAllowed("/embed", prefixes));
  assert.ok(isEmbedPathAllowed("/embed/presence?x=1", prefixes));
  assert.ok(!isEmbedPathAllowed("/embedded/presence", prefixes));
  assert.ok(!isEmbedPathAllowed("/uploads/user.html", prefixes));
  assert.ok(!isEmbedPathAllowed("/api/files/x.html", prefixes));
  assert.ok(!isEmbedPathAllowed("/embed/presence", []));
});

test("surfaceMode frames only listed prefixes on the web and never frames a console view", () => {
  const prefixes = ["/embed"];
  assert.equal(surfaceMode({ kind: "presence", path: "/embed/p" }, "web", prefixes), "frame");
  assert.equal(surfaceMode({ kind: "presence", path: "/embed/p" }, "web", []), "unavailable");
  assert.equal(
    surfaceMode({ kind: "presence", path: "/uploads/user.html" }, "web", prefixes),
    "unavailable",
  );
  assert.equal(surfaceMode({ kind: "presence", path: "/embed/p" }, "ios", prefixes), "text");
  assert.equal(
    surfaceMode({ kind: "presence", path: "//evil.example" }, "web", prefixes),
    "unavailable",
  );
  for (const list of [prefixes, [], ["/console", "/views"]]) {
    assert.equal(surfaceMode({ kind: "console", path: "/muse/approvals" }, "web", list), "open");
    assert.notEqual(surfaceMode({ kind: "console", path: "/embed/p" }, "web", list), "frame");
  }
});

test("ambiguous hostnames never match, even when written into the allowlist", () => {
  for (const host of [
    "https://exаmple.com", // Cyrillic a
    "https://xn--exmple-cua.com",
    "https://trusted.example.",
    "https://127.0.0.1",
    "https://0x7f.1",
    "https://2130706433",
    "https://[::1]",
    "https://trusted..example",
    "https://-trusted.example",
  ]) {
    assert.deepEqual(parseOrigins(host), [], host);
    assert.equal(safeSignInTarget(`${host}/x`, [host]), null, host);
  }
  assert.deepEqual(parseOrigins("https://sub.trusted-1.example"), [
    "https://sub.trusted-1.example",
  ]);
});

test("malformed redirects are refused", () => {
  const trusted = ["https://trusted.example"];
  for (const value of [
    "https:trusted.example/x",
    "https:/trusted.example/x",
    "https://trusted.example\\@evil.example/",
    "https://trusted.example%00.evil.example/",
    "https://trusted.example\t/",
    " https://trusted.example/",
    ["https://trusted.example", ":443", "@evil.example/"].join(""),
    "https://@trusted.example/",
    "https://:@trusted.example/",
  ]) {
    assert.equal(safeSignInTarget(value, trusted), null, JSON.stringify(value));
  }
});

test("only a presence view is framed", () => {
  const prefixes = ["/embed"];
  assert.equal(surfaceMode({ kind: "presence", path: "/embed/p" }, "web", prefixes), "frame");
  assert.equal(surfaceMode({ kind: "unknown", path: "/embed/p" }, "web", prefixes), "unavailable");
  assert.equal(surfaceMode({ kind: "", path: "/embed/p" }, "web", prefixes), "unavailable");
});
