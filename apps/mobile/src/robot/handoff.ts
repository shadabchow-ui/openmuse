export interface HandoffTarget {
  readonly key: string;
  readonly title: string;
  readonly reason: string;
}

const ORDINARY_REASON = "Opens the console in your browser.";

/** The fixed sixteen web hand-off keys from contract section 10.6. */
export const HANDOFF_TARGETS: readonly HandoffTarget[] = Object.freeze([
  { key: "dna", title: "Identity and DNA", reason: ORDINARY_REASON },
  { key: "skills", title: "Skills", reason: ORDINARY_REASON },
  { key: "devices", title: "Robot devices", reason: ORDINARY_REASON },
  { key: "trust", title: "Trust contract", reason: ORDINARY_REASON },
  { key: "charter", title: "Charter", reason: ORDINARY_REASON },
  { key: "passport", title: "Passport", reason: ORDINARY_REASON },
  { key: "upgrades", title: "Upgrades", reason: ORDINARY_REASON },
  { key: "unresolved", title: "Unresolved items", reason: ORDINARY_REASON },
  { key: "data", title: "Export or delete my data", reason: ORDINARY_REASON },
  { key: "data_use", title: "How my data is used", reason: ORDINARY_REASON },
  { key: "delegation", title: "Delegation", reason: ORDINARY_REASON },
  { key: "factory", title: "Factory", reason: ORDINARY_REASON },
  { key: "schedules", title: "Schedules", reason: ORDINARY_REASON },
  { key: "recovery", title: "Recovery", reason: ORDINARY_REASON },
  { key: "charge", title: "Spend limits", reason: ORDINARY_REASON },
  {
    key: "killswitch",
    title: "Resume after stop",
    reason: "Stopping is instant on your phone; resuming is done in the console.",
  },
]);

export type HandoffKey =
  | "dna"
  | "skills"
  | "devices"
  | "trust"
  | "charter"
  | "passport"
  | "upgrades"
  | "unresolved"
  | "data"
  | "data_use"
  | "delegation"
  | "factory"
  | "schedules"
  | "recovery"
  | "charge"
  | "killswitch";

export function isHandoffKey(value: string): value is HandoffKey {
  return HANDOFF_TARGETS.some((entry) => entry.key === value);
}

const CODE_QUERY = /^\?code=[A-Za-z0-9_-]{20,100}$/;
const CONSUME_SUFFIX = "/native/web-link/consume";

/**
 * A hand-off URL is safe only when it is an origin-matching consume link with
 * exactly one well-formed code. The URL is never displayed or persisted.
 */
export function isSafeHandoffUrl(raw: string, apiUrl: string, dev: boolean): boolean {
  let target: URL;
  let base: URL;
  try {
    target = new URL(raw);
    base = new URL(apiUrl);
  } catch {
    return false;
  }
  if (target.protocol !== "https:" && !(dev && target.protocol === "http:")) return false;
  if (target.username !== "" || target.password !== "") return false;
  if (target.origin !== base.origin) return false;
  const path = target.pathname;
  if (!path.endsWith(CONSUME_SUFFIX)) return false;
  if (path.includes("//") || path.includes("..") || path.includes("\\")) return false;
  if (target.hash !== "") return false;
  if (!CODE_QUERY.test(target.search)) return false;
  return true;
}
