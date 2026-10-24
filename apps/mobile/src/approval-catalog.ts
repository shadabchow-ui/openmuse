import type { ActionProposal } from "../../../packages/domain/src";
import { approvalCatalogDataSchema } from "../../../packages/domain/src/muse-contract";

export interface CatalogView {
  fields: Array<{ label: string; value: string }>;
  tier: string;
  /**
   * Always false. An approval is decided only on the backend's own first-party approval page; this
   * client shows a read-only summary and hands the person over to it. See `docs/EXTERNAL-BACKEND.md`.
   */
  canDecide: false;
  /** True while the approval is pending, so the sheet may offer the hand-over. */
  handoff: boolean;
}

export function catalogView(action: ActionProposal): CatalogView | null {
  if (action.kind !== "approval.catalog") return null;
  const parsed = approvalCatalogDataSchema.safeParse(action.data);
  if (!parsed.success) return null;
  const d = parsed.data;
  return {
    fields: [
      { label: "What", value: d.what },
      { label: "Affects", value: d.affects },
      { label: "Reversible", value: d.reversible },
      { label: "Cost", value: d.cost },
      { label: "Approval level", value: d.tier },
      { label: "Valid for", value: d.validity },
      { label: "Reference", value: d.digestPrefix },
    ],
    tier: d.tier,
    canDecide: false,
    handoff: action.status === "awaiting_review",
  };
}

/**
 * Which review the client may render. In external auth mode only a catalog summary is shown; any other kind
 * gets a fixed notice, so the client has no path that decides an approval there.
 */
export function reviewKind(
  kind: string,
  authMode: "accessKey" | "external",
): "catalog" | "action" | "none" {
  if (kind === "approval.catalog") return "catalog";
  return authMode === "external" ? "none" : "action";
}
