import {
  type ProposeMissionResult,
  proposeMissionResultSchema,
} from "../../../packages/domain/src/muse-contract";

export interface PlanStepView {
  nodeId: string;
  goal: string;
  operations: string;
  tier: string;
  needsApproval: boolean;
}

export interface PlanView {
  proposalId: string;
  title: string;
  steps: PlanStepView[];
  approvalsRequired: Array<{ tier: string; reason: string }>;
  estimateText: string;
  worstCaseText: string;
  expiresAt: string;
  /** True only for a preview that passed its static checks and has not expired. */
  startable: boolean;
}

function incrementDecimal(digits: string): string {
  const chars = digits.split("");
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (chars[i] === "9") chars[i] = "0";
    else {
      chars[i] = String(Number(chars[i]) + 1);
      return chars.join("");
    }
  }
  return `1${chars.join("")}`;
}

/**
 * Micros (millionths, a digit string) as `USD 0.0000`, using string arithmetic only.
 * Anything below the fourth decimal rounds up, so a cost is never shown lower than it is.
 */
export function formatMicros(micros: string): string {
  if (!/^[0-9]+$/.test(micros)) return "USD unknown";
  const digits = micros.replace(/^0+(?=[0-9])/, "").padStart(7, "0");
  let whole = digits.slice(0, -6).replace(/^0+(?=[0-9])/, "");
  const fraction = digits.slice(-6);
  let cents = Number(fraction.slice(0, 4));
  if (fraction.slice(4) !== "00") cents += 1;
  if (cents === 10000) {
    cents = 0;
    whole = incrementDecimal(whole);
  }
  return `USD ${whole}.${String(cents).padStart(4, "0")}`;
}

export function viewOf(result: ProposeMissionResult, now: number): PlanView {
  const { preview } = result;
  const expires = Date.parse(result.expiresAt);
  return {
    proposalId: result.proposalId,
    title: result.title,
    steps: preview.steps.map((step) => ({
      nodeId: step.node_id,
      goal: step.goal,
      operations: step.operations.join(", "),
      tier: step.approval_tier,
      needsApproval: step.needs_approval,
    })),
    approvalsRequired: preview.approvals_required.map((a) => ({ tier: a.tier, reason: a.reason })),
    estimateText: formatMicros(preview.estimate_micros),
    worstCaseText: formatMicros(preview.worst_case_cap_micros),
    expiresAt: result.expiresAt,
    startable: preview.intrinsic_ok && Number.isFinite(expires) && expires > now,
  };
}

/** `content` may be a JSON string or an object. Anything that is not exactly the contract shape is refused. */
export function parseProposal(
  content: unknown,
  now: number = Date.now(),
): { ok: true; view: PlanView } | { ok: false } {
  let value = content;
  if (typeof content === "string") {
    try {
      value = JSON.parse(content);
    } catch {
      return { ok: false };
    }
  }
  const parsed = proposeMissionResultSchema.safeParse(value);
  return parsed.success ? { ok: true, view: viewOf(parsed.data, now) } : { ok: false };
}
