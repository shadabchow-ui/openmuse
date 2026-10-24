import assert from "node:assert/strict";
import { test } from "node:test";
import type { ActionProposal } from "../../../packages/domain/src";
import { catalogView, reviewKind } from "../src/approval-catalog";

const data = {
  requestId: "r1",
  what: "Create a document",
  affects: "Your documents",
  reversible: "Yes",
  cost: "USD 0.0015",
  tier: "T1",
  validity: "10 minutes",
  digestPrefix: "0123456789ab",
};
const action = (
  over: Partial<ActionProposal> = {},
  dataOver: Record<string, unknown> = {},
): ActionProposal => ({
  id: "run1",
  title: "Create a document",
  kind: "approval.catalog",
  data: { ...data, ...dataOver },
  status: "awaiting_review",
  hash: "h",
  createdAt: "2026-10-23T11:00:00Z",
  expiresAt: "2026-10-23T12:00:00Z",
  ...over,
});

test("a valid catalog action becomes seven labelled fields", () => {
  const view = catalogView(action());
  assert.ok(view);
  assert.deepEqual(
    view.fields.map((f) => f.label),
    ["What", "Affects", "Reversible", "Cost", "Approval level", "Valid for", "Reference"],
  );
  assert.equal(view.fields[0]?.value, "Create a document");
  assert.equal(view.tier, "T1");
  assert.equal(view.handoff, true);
});

test("this client never decides: canDecide is false for every tier and status", () => {
  for (const tier of ["T0", "T1", "T2", "T3", "T4"]) {
    for (const status of [
      "awaiting_review",
      "executing",
      "succeeded",
      "failed",
      "outcome_unknown",
      "denied",
      "cancelled",
      "expired",
    ] as const) {
      const view = catalogView(action({ status }, { tier }));
      assert.equal(view?.canDecide, false, `${tier}/${status}`);
      assert.equal(view?.handoff, status === "awaiting_review", `${tier}/${status}`);
    }
  }
});

test("invalid data gives null", () => {
  assert.equal(catalogView(action({ data: {} })), null);
  assert.equal(catalogView(action({}, { tier: 3 })), null);
  assert.equal(catalogView(action({}, { extra: "x" })), null);
  assert.equal(catalogView(action({ data: { ...data, what: undefined } })), null);
});

test("other kinds are not catalog actions", () => {
  assert.equal(catalogView(action({ kind: "email.send" as ActionProposal["kind"] })), null);
});

test("external mode renders a catalog summary or the fixed notice, never the upstream approve and deny review", () => {
  assert.equal(reviewKind("approval.catalog", "external"), "catalog");
  for (const kind of [
    "calendar.event",
    "document.create",
    "email.send",
    "",
    "approval.catalog.x",
  ]) {
    assert.equal(reviewKind(kind, "external"), "none", kind);
  }
});

test("access-key mode keeps the upstream review for other kinds", () => {
  assert.equal(reviewKind("approval.catalog", "accessKey"), "catalog");
  assert.equal(reviewKind("calendar.event", "accessKey"), "action");
});
