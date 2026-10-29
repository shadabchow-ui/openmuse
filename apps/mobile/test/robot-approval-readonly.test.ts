import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { APPROVAL_GUIDANCE, APPROVAL_NEUTRAL, approvalRow } from "../src/robot/approvals";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "robot");

test("a known approval summary is read-only and names what, tier and status", () => {
  const row = approvalRow({
    title: "Create a document",
    kind: "approval.catalog",
    status: "awaiting_review",
    data: { tier: "T2" },
  });
  assert.equal(row.title, "Create a document");
  assert.match(row.meta, /T2/);
  assert.match(row.meta, /awaiting review/);
  assert.equal(row.guidance, APPROVAL_GUIDANCE);
  assert.equal(row.actionable, false);
});

test("an unknown kind fails closed to neutral text", () => {
  const row = approvalRow({
    title: "Something the client does not know",
    kind: "future.approval_kind",
    status: "awaiting_review",
    data: { tier: "T4" },
  });
  assert.equal(row.title, APPROVAL_NEUTRAL);
  assert.equal(row.meta, APPROVAL_NEUTRAL);
  assert.equal(row.actionable, false);
});

test("missing fields fail closed without throwing", () => {
  const row = approvalRow({});
  assert.equal(row.title, APPROVAL_NEUTRAL);
  assert.equal(row.meta, APPROVAL_NEUTRAL);
  assert.equal(row.guidance, APPROVAL_GUIDANCE);
});

test("no approval decision identifier or button label exists in the robot client", () => {
  const decision = /\b(?:approve|deny|decide)\b/i;
  for (const name of readdirSync(src).filter((entry) => /\.(ts|tsx)$/.test(entry))) {
    const text = readFileSync(join(src, name), "utf8");
    assert.doesNotMatch(text, decision, name);
    assert.doesNotMatch(text, />\s*(?:Approve|Deny|Confirm|Decide)\s*</i, name);
  }
});
