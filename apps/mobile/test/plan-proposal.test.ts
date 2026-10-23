import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMicros, parseProposal } from "../src/plan-proposal";

const preview = {
  mission_id: "m1",
  topology: "linear",
  node_count: 1,
  steps: [
    {
      rank: 0,
      node_id: "n1",
      goal: "Create a document",
      operations: ["docs.create", "docs.share"],
      cost_budget_micros: "1000",
      approval_tier: "T1",
      needs_approval: true,
      verifier_kind: "schema",
      depends_on: [],
    },
  ],
  effects: { total: 1, irreversible: 0, compensable: 1 },
  estimate_micros: "123456",
  estimate_credits: "0.12",
  worst_case_cap_micros: "1000000",
  worst_case_cap_credits: "1",
  budget_ceiling_micros: "5000000",
  manifest_version: "v1",
  approvals_required: [{ node_id: "n1", tier: "T1", reason: "creates a document" }],
  intrinsic_ok: true,
  intrinsic_violations: [],
  charter_checks: "pending-at-dispatch",
  intent_digest: "a",
  dag_digest: "b",
};
const proposal = (
  extra: Record<string, unknown> = {},
  previewExtra: Record<string, unknown> = {},
) => ({
  proposalId: "p1",
  title: "Make a doc",
  intent: "make a doc",
  expiresAt: "2026-10-23T12:00:00Z",
  preview: { ...preview, ...previewExtra },
  ...extra,
});
const before = Date.parse("2026-10-23T11:00:00Z");
const after = Date.parse("2026-10-23T13:00:00Z");

test("a valid proposal parses from an object and from a JSON string", () => {
  for (const content of [proposal(), JSON.stringify(proposal())]) {
    const result = parseProposal(content, before);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.view.proposalId, "p1");
    assert.equal(result.view.title, "Make a doc");
    assert.deepEqual(result.view.steps, [
      {
        nodeId: "n1",
        goal: "Create a document",
        operations: "docs.create, docs.share",
        tier: "T1",
        needsApproval: true,
      },
    ]);
    assert.deepEqual(result.view.approvalsRequired, [{ tier: "T1", reason: "creates a document" }]);
    assert.equal(result.view.estimateText, "USD 0.1235");
    assert.equal(result.view.worstCaseText, "USD 1.0000");
    assert.equal(result.view.startable, true);
  }
});

test("malformed or unknown-shaped content is refused", () => {
  for (const content of [
    "",
    "not json",
    "[]",
    "null",
    42,
    null,
    undefined,
    {},
    proposal({ button: "Approve" }),
    proposal({}, { extra: 1 }),
    proposal({ expiresAt: "soon" }),
    proposal({ proposalId: "" }),
  ]) {
    assert.deepEqual(
      parseProposal(content, before),
      { ok: false },
      JSON.stringify(content)?.slice(0, 50),
    );
  }
});

test("a preview that failed its static checks is not startable", () => {
  const result = parseProposal(proposal({}, { intrinsic_ok: false }), before);
  assert.equal(result.ok && result.view.startable, false);
});

test("an expired proposal is not startable", () => {
  const result = parseProposal(proposal(), after);
  assert.equal(result.ok && result.view.startable, false);
  const exact = parseProposal(proposal(), Date.parse("2026-10-23T12:00:00Z"));
  assert.equal(exact.ok && exact.view.startable, false);
});

test("micros convert with string arithmetic and round up past the fourth decimal", () => {
  assert.equal(formatMicros("0"), "USD 0.0000");
  assert.equal(formatMicros("1"), "USD 0.0001");
  assert.equal(formatMicros("100"), "USD 0.0001");
  assert.equal(formatMicros("101"), "USD 0.0002");
  assert.equal(formatMicros("123456"), "USD 0.1235");
  assert.equal(formatMicros("1000000"), "USD 1.0000");
  assert.equal(formatMicros("999999"), "USD 1.0000");
  assert.equal(formatMicros("999900"), "USD 0.9999");
  assert.equal(formatMicros("00012"), "USD 0.0001");
  assert.equal(formatMicros("123456789012345678901234567890"), "USD 123456789012345678901234.5679");
  assert.equal(formatMicros("99999999999999999999"), "USD 100000000000000.0000");
});

test("a non-digit micros string is refused", () => {
  for (const value of ["", "-1", "1.5", "1e6", "abc"])
    assert.equal(formatMicros(value), "USD unknown");
});
