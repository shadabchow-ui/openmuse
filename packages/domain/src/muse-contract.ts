import { z } from "zod";

/**
 * Schemas for the external-backend client contract. Every object is strict: an
 * unknown key is an error, so a backend cannot smuggle controls or fields in.
 */

export const capabilitiesSchema = z.strictObject({
  delegate: z.boolean(),
  goals: z.boolean(),
  ideas: z.boolean(),
  monitors: z.boolean(),
  files: z.boolean(),
  mail: z.boolean(),
  calendar: z.boolean(),
  browser: z.boolean(),
  computer: z.boolean(),
  memoryWrite: z.boolean(),
  identityEdit: z.boolean(),
  taskPause: z.boolean(),
  taskRetry: z.boolean(),
  threadRename: z.boolean(),
  threadArchive: z.boolean(),
});
export type Capabilities = z.infer<typeof capabilitiesSchema>;

export const surfaceSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Same-origin path; the client validates it again before framing or navigating. */
  path: z.string().min(1),
  kind: z.enum(["presence", "console"]),
});
export type RuntimeSurface = z.infer<typeof surfaceSchema>;

export const runtimeExtensionsSchema = z.strictObject({
  capabilities: capabilitiesSchema.optional(),
  surfaces: z.array(surfaceSchema).optional(),
  auth: z
    .strictObject({
      mode: z.enum(["accessKey", "external"]),
      signInUrl: z.string().optional(),
    })
    .optional(),
  brand: z
    .strictObject({
      name: z.string().min(1),
      tagline: z.string().optional(),
    })
    .optional(),
});
export type RuntimeExtensions = z.infer<typeof runtimeExtensionsSchema>;

/** The whole `runtime` object of a workspace snapshot: upstream fields plus the extensions. */
export const runtimeSchema = runtimeExtensionsSchema.extend({
  provider: z.enum(["sample", "model", "openbot"]),
  configured: z.boolean(),
  openbotConfigured: z.boolean(),
  richThreads: z.boolean().optional(),
});

/** Data of an `approval.catalog` action: a read-only summary of one approval card. */
export const approvalCatalogDataSchema = z.strictObject({
  requestId: z.string().min(1),
  what: z.string(),
  affects: z.string(),
  reversible: z.string(),
  cost: z.string(),
  tier: z.string().min(1),
  validity: z.string(),
  digestPrefix: z.string(),
});
export type ApprovalCatalogData = z.infer<typeof approvalCatalogDataSchema>;

const micros = z.string().regex(/^[0-9]+$/);

export const planPreviewStepSchema = z.strictObject({
  rank: z.number().int().nonnegative(),
  node_id: z.string(),
  goal: z.string(),
  operations: z.array(z.string()),
  cost_budget_micros: micros,
  approval_tier: z.string(),
  needs_approval: z.boolean(),
  verifier_kind: z.string(),
  depends_on: z.array(z.string()),
});

export const planPreviewSchema = z.strictObject({
  mission_id: z.string(),
  topology: z.string(),
  node_count: z.number().int().nonnegative(),
  steps: z.array(planPreviewStepSchema),
  effects: z.strictObject({
    total: z.number().int().nonnegative(),
    irreversible: z.number().int().nonnegative(),
    compensable: z.number().int().nonnegative(),
  }),
  estimate_micros: micros,
  estimate_credits: z.string(),
  worst_case_cap_micros: micros,
  worst_case_cap_credits: z.string(),
  budget_ceiling_micros: micros,
  manifest_version: z.string(),
  approvals_required: z.array(
    z.strictObject({ node_id: z.string(), tier: z.string(), reason: z.string() }),
  ),
  intrinsic_ok: z.boolean(),
  intrinsic_violations: z.array(
    z.strictObject({ code: z.string(), node_id: z.string().nullable(), detail: z.string() }),
  ),
  charter_checks: z.string(),
  intent_digest: z.string(),
  dag_digest: z.string(),
});
export type PlanPreview = z.infer<typeof planPreviewSchema>;

/** Result of the `propose_mission` tool call. */
export const proposeMissionResultSchema = z.strictObject({
  proposalId: z.string().min(1),
  title: z.string().min(1).max(80),
  intent: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
  preview: planPreviewSchema,
});
export type ProposeMissionResult = z.infer<typeof proposeMissionResultSchema>;

export const startPlanResponseSchema = z.strictObject({
  id: z.string().min(1),
  duplicate: z.boolean().optional(),
});

export const errorBodySchema = z.strictObject({
  error: z.string(),
  code: z.string(),
  signInUrl: z.string().nullable().optional(),
});
