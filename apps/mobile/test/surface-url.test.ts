import assert from "node:assert/strict";
import { test } from "node:test";
import { safeSignInTarget, safeSurfacePath } from "../src/surface-url";

test("safeSignInTarget accepts an https URL and a single-slash path", () => {
  assert.equal(safeSignInTarget("https://login.example/x"), "https://login.example/x");
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
    assert.equal(safeSignInTarget(value), null, JSON.stringify(value)?.slice(0, 60));
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
