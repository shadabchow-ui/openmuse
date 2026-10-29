import type { z } from "zod";
import {
  type DeletionJobView,
  type DeviceList,
  type DnaSummary,
  deletionJobViewSchema,
  deviceListSchema,
  dnaSummarySchema,
  type ForgetResult,
  forgetResultSchema,
  type MemoryList,
  memoryListSchema,
  type NativeSessions,
  nativeSessionsSchema,
  okSchema,
  type PresenceView,
  presenceViewSchema,
  type RobotSummary,
  robotSummarySchema,
  type SkillList,
  type SpendView,
  type StopStatus,
  skillListSchema,
  spendViewSchema,
  stopStatusSchema,
  type WebLink,
  webLinkSchema,
} from "../../../../packages/domain/src/muse-robot-contract";
import { HANDOFF_TARGETS, type HandoffKey } from "./handoff";

/** The narrow request shape of `MuseApi.request`; the client never calls `fetch` here. */
export type RobotRequest = <T>(path: string, body?: unknown, method?: string) => Promise<T>;

export type RobotFailureKind = "unavailable" | "not_found" | "error";
export type RobotResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: RobotFailureKind; message: string };

export const SHAPE_ERROR = "Something went wrong.";
export const UNAVAILABLE_MESSAGE = "Not available yet.";
export const NOT_FOUND_MESSAGE = "That item was not found.";

export class RobotApiError extends Error {
  constructor(
    readonly code: "shape" | "invalid_id",
    message = SHAPE_ERROR,
  ) {
    super(message);
    this.name = "RobotApiError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const JOB_ID = /^del:[A-Za-z0-9-]{1,64}:[0-9T:.\-Z]{1,40}$/;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export function assertUuid(value: string): void {
  if (!isUuid(value)) throw new RobotApiError("invalid_id");
}

export function assertDeviceId(value: string): void {
  if (!DEVICE_ID.test(value)) throw new RobotApiError("invalid_id");
}

export function assertJobId(value: string): void {
  if (!JOB_ID.test(value)) throw new RobotApiError("invalid_id");
}

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

function failureFor(error: unknown): RobotResult<never> {
  const status = statusOf(error);
  if (status === 403) return { ok: false, kind: "unavailable", message: UNAVAILABLE_MESSAGE };
  if (status === 404) return { ok: false, kind: "not_found", message: NOT_FOUND_MESSAGE };
  return { ok: false, kind: "error", message: SHAPE_ERROR };
}

async function call<T>(
  request: RobotRequest,
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  method?: string,
): Promise<RobotResult<T>> {
  let raw: unknown;
  try {
    raw = await request<unknown>(path, body, method);
  } catch (error) {
    return failureFor(error);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new RobotApiError("shape");
  return { ok: true, value: parsed.data };
}

export function getSummary(request: RobotRequest): Promise<RobotResult<RobotSummary>> {
  return call(request, "/api/robot/summary", robotSummarySchema, undefined, "GET");
}

export function getPresence(request: RobotRequest): Promise<RobotResult<PresenceView>> {
  return call(request, "/api/presence", presenceViewSchema, undefined, "GET");
}

export function getMemory(
  request: RobotRequest,
  scope?: string,
  limit?: number,
): Promise<RobotResult<MemoryList>> {
  const query: string[] = [];
  if (scope) query.push(`scope=${encodeURIComponent(scope)}`);
  if (limit !== undefined) {
    const bounded = Math.max(1, Math.min(100, Math.trunc(limit)));
    query.push(`limit=${bounded}`);
  }
  const suffix = query.length ? `?${query.join("&")}` : "";
  return call(request, `/api/robot/memory${suffix}`, memoryListSchema, undefined, "GET");
}

export function forgetMemory(
  request: RobotRequest,
  id: string,
): Promise<RobotResult<ForgetResult>> {
  assertUuid(id);
  return call(
    request,
    `/api/robot/memory/${id}/forget`,
    forgetResultSchema,
    { confirm: true },
    "POST",
  );
}

export function getDeletionJob(
  request: RobotRequest,
  id: string,
): Promise<RobotResult<DeletionJobView>> {
  assertJobId(id);
  return call(request, `/api/robot/deletion-jobs/${id}`, deletionJobViewSchema, undefined, "GET");
}

export function getSkills(request: RobotRequest): Promise<RobotResult<SkillList>> {
  return call(request, "/api/robot/skills", skillListSchema, undefined, "GET");
}

export function getDevices(request: RobotRequest): Promise<RobotResult<DeviceList>> {
  return call(request, "/api/robot/devices", deviceListSchema, undefined, "GET");
}

export function markDeviceLost(
  request: RobotRequest,
  id: string,
): Promise<RobotResult<{ ok: true }>> {
  assertDeviceId(id);
  return call(request, `/api/robot/devices/${id}/lost`, okSchema, {}, "POST");
}

export function getDna(request: RobotRequest): Promise<RobotResult<DnaSummary>> {
  return call(request, "/api/robot/dna", dnaSummarySchema, undefined, "GET");
}

export function getSpend(request: RobotRequest): Promise<RobotResult<SpendView>> {
  return call(request, "/api/robot/spend", spendViewSchema, undefined, "GET");
}

export function getStop(request: RobotRequest): Promise<RobotResult<StopStatus>> {
  return call(request, "/api/robot/stop", stopStatusSchema, undefined, "GET");
}

export function engageStop(request: RobotRequest): Promise<RobotResult<StopStatus>> {
  return call(request, "/api/robot/stop", stopStatusSchema, {}, "POST");
}

export function getSessions(request: RobotRequest): Promise<RobotResult<NativeSessions>> {
  return call(request, "/api/native/sessions", nativeSessionsSchema, undefined, "GET");
}

export function revokeSession(
  request: RobotRequest,
  publicId: string,
): Promise<RobotResult<{ ok: true }>> {
  assertUuid(publicId);
  return call(request, `/api/native/sessions/${publicId}/revoke`, okSchema, {}, "POST");
}

export function createWebLink(
  request: RobotRequest,
  target: HandoffKey,
): Promise<RobotResult<WebLink>> {
  const known = HANDOFF_TARGETS.some((entry) => entry.key === target);
  if (!known) throw new RobotApiError("invalid_id");
  return call(request, "/api/native/web-link", webLinkSchema, { target }, "POST");
}
