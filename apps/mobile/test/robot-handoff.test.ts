import assert from "node:assert/strict";
import { test } from "node:test";
import { HANDOFF_TARGETS, isSafeHandoffUrl } from "../src/robot/handoff";

const CONTRACT_KEYS = [
  "dna",
  "skills",
  "devices",
  "trust",
  "charter",
  "passport",
  "upgrades",
  "unresolved",
  "data",
  "data_use",
  "delegation",
  "factory",
  "schedules",
  "recovery",
  "charge",
  "killswitch",
];

const API = "https://gateway.example.test";
const CODE = "a".repeat(24);
const GOOD = `${API}/api/robot/v0/muse/native/web-link/consume?code=${CODE}`;

test("the sixteen contract keys are present exactly once, in order", () => {
  assert.deepEqual(
    HANDOFF_TARGETS.map((entry) => entry.key),
    CONTRACT_KEYS,
  );
  assert.equal(new Set(HANDOFF_TARGETS.map((entry) => entry.key)).size, 16);
});

test("every target has a title and a short reason; the stop target explains the asymmetry", () => {
  for (const entry of HANDOFF_TARGETS) {
    assert.ok(entry.title.length > 0);
    assert.ok(entry.reason.length > 0);
  }
  const killswitch = HANDOFF_TARGETS.find((entry) => entry.key === "killswitch");
  assert.equal(killswitch?.title, "Resume after stop");
  assert.match(killswitch?.reason ?? "", /resuming is done in the console/);
});

test("the generated absolute URL is accepted in production", () => {
  assert.equal(isSafeHandoffUrl(GOOD, API, false), true);
  assert.equal(
    isSafeHandoffUrl(`https://gateway.example.test/native/web-link/consume?code=${CODE}`, API, false),
    true,
  );
});

test("uppercase schemes are normalised by URL and accepted when the rest matches", () => {
  assert.equal(
    isSafeHandoffUrl(`HTTPS://gateway.example.test/native/web-link/consume?code=${CODE}`, API, false),
    true,
  );
});

test("another host, credentials, extra query, wrong path, javascript and a long code are refused", () => {
  const bad = [
    `https://other.example.test/native/web-link/consume?code=${CODE}`,
    `https://user:pass@gateway.example.test/native/web-link/consume?code=${CODE}`,
    `${API}/native/web-link/consume?code=${CODE}&next=https://other.example.test`,
    `${API}/api/robot/v0/muse/native/web-link/other?code=${CODE}`,
    `javascript:alert(1)`,
    `${API}/native/web-link/consume?code=${"a".repeat(101)}`,
    `${API}/native/web-link/consume`,
  ];
  for (const url of bad) assert.equal(isSafeHandoffUrl(url, API, false), false, url);
});

test("http is accepted only in a development build", () => {
  const dev = `http://gateway.example.test/native/web-link/consume?code=${CODE}`;
  assert.equal(isSafeHandoffUrl(dev, "http://gateway.example.test", false), false);
  assert.equal(isSafeHandoffUrl(dev, "http://gateway.example.test", true), true);
});

test("a malformed api URL fails closed", () => {
  assert.equal(isSafeHandoffUrl(GOOD, "not a url", false), false);
});
