export const APPROVAL_GUIDANCE =
  "Approval hand-off is not available in this app. Open Robot OS on the web to review it.";
export const APPROVAL_NEUTRAL = "Needs your attention on the web";

export interface ApprovalRow {
  title: string;
  meta: string;
  guidance: string;
  actionable: false;
}

interface UnknownAction {
  title?: unknown;
  kind?: unknown;
  status?: unknown;
  data?: unknown;
}

function tierOf(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const tier = (data as { tier?: unknown }).tier;
  return typeof tier === "string" && tier.length > 0 ? tier : null;
}

/**
 * Read-only approval summary. An unknown kind or a missing field fails closed
 * to neutral text; there is never an actionable control on the phone.
 */
export function approvalRow(action: UnknownAction): ApprovalRow {
  const kind = typeof action.kind === "string" ? action.kind : null;
  const title = typeof action.title === "string" ? action.title.trim() : "";
  const known = kind === "approval.catalog" && title.length > 0;
  const status = typeof action.status === "string" ? action.status.replace("_", " ") : "waiting";
  const tier = tierOf(action.data);
  return {
    title: known ? title : APPROVAL_NEUTRAL,
    meta: known && tier ? `${tier} · ${status}` : APPROVAL_NEUTRAL,
    guidance: APPROVAL_GUIDANCE,
    actionable: false,
  };
}
