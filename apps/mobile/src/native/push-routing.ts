/** Push notification routing: untrusted payloads map to the closed route set. */

import { UUID_RE, type Route } from "./deep-link";

const KNOWN_KINDS = new Set([
  "mission.completed",
  "mission.failed",
  "mission.capped",
  "approval.waiting",
  "schedule.fired",
  "schedule.skipped",
  "stop.acknowledged",
  "system.notice",
]);

function runIdOf(data: Record<string, unknown>): string | null {
  const candidate = data["missionRunId"];
  return typeof candidate === "string" && UUID_RE.test(candidate) ? candidate : null;
}

/** Never throws and never navigates to attacker-chosen text: unknown input opens notifications at most. */
export function routeForNotification(data: unknown): Route | null {
  if (typeof data !== "object" || data === null) return { kind: "notifications" };
  const record = data as Record<string, unknown>;
  const kind = typeof record["kind"] === "string" ? record["kind"] : "";
  if (!KNOWN_KINDS.has(kind)) return { kind: "notifications" };
  const runId = runIdOf(record);
  if (kind === "approval.waiting") return runId ? { kind: "approval", runId } : { kind: "notifications" };
  if (kind === "mission.completed" || kind === "mission.failed" || kind === "mission.capped") {
    return runId ? { kind: "task", taskId: runId } : { kind: "notifications" };
  }
  return { kind: "notifications" };
}
