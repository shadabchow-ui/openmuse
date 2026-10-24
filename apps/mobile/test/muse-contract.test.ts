import assert from "node:assert/strict";
import { test } from "node:test";
import {
  approvalCatalogDataSchema,
  capabilitiesSchema,
  errorBodySchema,
  planPreviewSchema,
  proposeMissionResultSchema,
  runtimeExtensionsSchema,
  runtimeSchema,
  startPlanResponseSchema,
} from "../../../packages/domain/src/muse-contract";

const capabilities = Object.fromEntries(
  [
    "delegate",
    "goals",
    "ideas",
    "monitors",
    "files",
    "mail",
    "calendar",
    "browser",
    "computer",
    "memoryWrite",
    "identityEdit",
    "taskPause",
    "taskRetry",
    "threadRename",
    "threadArchive",
  ].map((k) => [k, false]),
);

const preview = {
  mission_id: "m1",
  topology: "linear",
  node_count: 1,
  steps: [
    {
      rank: 0,
      node_id: "n1",
      goal: "Create a document",
      operations: ["docs.create"],
      cost_budget_micros: "1000",
      approval_tier: "T1",
      needs_approval: true,
      verifier_kind: "schema",
      depends_on: [],
    },
  ],
  effects: { total: 1, irreversible: 0, compensable: 1 },
  estimate_micros: "1500",
  estimate_credits: "0.0015",
  worst_case_cap_micros: "2000",
  worst_case_cap_credits: "0.002",
  budget_ceiling_micros: "5000",
  manifest_version: "v1",
  approvals_required: [{ node_id: "n1", tier: "T1", reason: "creates a document" }],
  intrinsic_ok: true,
  intrinsic_violations: [],
  charter_checks: "pending-at-dispatch",
  intent_digest: "abc",
  dag_digest: "def",
};
const proposal = {
  proposalId: "p1",
  title: "Make a doc",
  intent: "make a doc",
  expiresAt: "2026-10-23T12:00:00Z",
  preview,
};
const catalog = {
  requestId: "r1",
  what: "Create a document",
  affects: "Your documents",
  reversible: "Yes",
  cost: "USD 0.0015",
  tier: "T1",
  validity: "10 minutes",
  digestPrefix: "0123456789ab",
};

test("capabilities: fifteen booleans, strict", () => {
  assert.ok(capabilitiesSchema.safeParse(capabilities).success);
  assert.equal(capabilitiesSchema.safeParse({ ...capabilities, extra: true }).success, false);
  const { delegate: _removed, ...missing } = capabilities;
  assert.equal(capabilitiesSchema.safeParse(missing).success, false);
  assert.equal(capabilitiesSchema.safeParse({ ...capabilities, goals: "yes" }).success, false);
});

test("runtime extensions: all optional, strict, surfaces and auth validated", () => {
  assert.ok(runtimeExtensionsSchema.safeParse({}).success);
  assert.ok(
    runtimeExtensionsSchema.safeParse({
      capabilities,
      surfaces: [{ id: "a", title: "A", path: "/a", kind: "presence" }],
      auth: { mode: "external", signInUrl: "https://login.example" },
      brand: { name: "X", tagline: "Y" },
    }).success,
  );
  assert.equal(
    runtimeExtensionsSchema.safeParse({
      surfaces: [{ id: "a", title: "A", path: "/a", kind: "other" }],
    }).success,
    false,
  );
  assert.equal(runtimeExtensionsSchema.safeParse({ auth: { mode: "bearer" } }).success, false);
  assert.equal(runtimeExtensionsSchema.safeParse({ brand: { name: "" } }).success, false);
  assert.equal(runtimeExtensionsSchema.safeParse({ unknown: 1 }).success, false);
});

test("runtime: upstream fields plus extensions", () => {
  assert.ok(
    runtimeSchema.safeParse({
      provider: "model",
      configured: true,
      openbotConfigured: false,
      richThreads: true,
      brand: { name: "X" },
    }).success,
  );
  assert.equal(runtimeSchema.safeParse({ provider: "model", configured: true }).success, false);
  assert.equal(
    runtimeSchema.safeParse({ provider: "other", configured: true, openbotConfigured: false })
      .success,
    false,
  );
});

test("approval catalog data: eight strings, strict", () => {
  assert.ok(approvalCatalogDataSchema.safeParse(catalog).success);
  assert.equal(approvalCatalogDataSchema.safeParse({ ...catalog, extra: "x" }).success, false);
  const { tier: _tier, ...missing } = catalog;
  assert.equal(approvalCatalogDataSchema.safeParse(missing).success, false);
  assert.equal(
    approvalCatalogDataSchema.safeParse({ ...catalog, reversible: true }).success,
    false,
  );
});

test("plan preview: exact fields, string micros", () => {
  assert.ok(planPreviewSchema.safeParse(preview).success);
  assert.equal(planPreviewSchema.safeParse({ ...preview, extra: 1 }).success, false);
  assert.equal(planPreviewSchema.safeParse({ ...preview, estimate_micros: 1500 }).success, false);
  assert.equal(planPreviewSchema.safeParse({ ...preview, estimate_micros: "1.5" }).success, false);
  const { dag_digest: _dag, ...missing } = preview;
  assert.equal(planPreviewSchema.safeParse(missing).success, false);
  assert.equal(
    planPreviewSchema.safeParse({ ...preview, steps: [{ ...preview.steps[0], rank: -1 }] }).success,
    false,
  );
});

test("propose_mission result: strict, ISO expiry, bounded title", () => {
  assert.ok(proposeMissionResultSchema.safeParse(proposal).success);
  assert.equal(
    proposeMissionResultSchema.safeParse({ ...proposal, expiresAt: "tomorrow" }).success,
    false,
  );
  assert.equal(
    proposeMissionResultSchema.safeParse({ ...proposal, title: "x".repeat(81) }).success,
    false,
  );
  assert.equal(
    proposeMissionResultSchema.safeParse({ ...proposal, button: "Approve" }).success,
    false,
  );
  assert.equal(
    proposeMissionResultSchema.safeParse({ ...proposal, preview: { ...preview, extra: 1 } })
      .success,
    false,
  );
});

test("start response and error body", () => {
  assert.ok(startPlanResponseSchema.safeParse({ id: "run1" }).success);
  assert.ok(startPlanResponseSchema.safeParse({ id: "run1", duplicate: true }).success);
  assert.equal(startPlanResponseSchema.safeParse({}).success, false);
  assert.ok(
    errorBodySchema.safeParse({
      error: "Sign in to continue.",
      code: "sign_in_required",
      signInUrl: null,
    }).success,
  );
  assert.ok(errorBodySchema.safeParse({ error: "x", code: "y" }).success);
  assert.equal(errorBodySchema.safeParse({ error: "x" }).success, false);
  assert.equal(errorBodySchema.safeParse({ error: "x", code: "y", detail: "z" }).success, false);
});
