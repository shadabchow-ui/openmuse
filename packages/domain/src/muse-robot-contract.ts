import { z } from "zod";

/**
 * Native robot console contract mirror (client contract section 11, plus the
 * presence response from section 9). Every response is parsed with a strict
 * schema so an unexpected field is a visible failure, never extra data.
 */

const iso = z.iso.datetime({ offset: true });
const nullableIso = iso.nullable();
const digitString = z.string().regex(/^\d+$/, "Expected a digit string");
const nullableAmount = digitString.nullable();

export const stopStatusSchema = z.strictObject({
  engaged: z.boolean(),
  reasonCode: z.string().nullable(),
  engagedAt: nullableIso,
});

export const ceilingItemSchema = z.strictObject({
  scope: z.string(),
  // IOM-13 records null when no owner ceiling is set for a reported scope.
  ceilingMicros: nullableAmount,
  consumedBps: z.number().int().min(0).max(100000).nullable(),
});

export const healthSignalSchema = z.strictObject({
  key: z.string(),
  state: z.enum(["ok", "attention", "unknown"]),
  detail: z.string(),
});

export const healthSchema = z.strictObject({
  status: z.enum(["ok", "attention", "unknown"]),
  signals: z.array(healthSignalSchema),
});

export const robotSummarySchema = z.strictObject({
  robot: z.strictObject({
    name: z.string().nullable(),
    activatedAt: nullableIso,
    ageDays: z.number().int().min(0).nullable(),
  }),
  activated: z.boolean(),
  health: healthSchema,
  stop: stopStatusSchema,
  spend: z.strictObject({ ceilings: z.array(ceilingItemSchema) }),
  counts: z.strictObject({
    pendingApprovals: z.number().int().min(0),
    activeMissions: z.number().int().min(0),
    unresolved: z.number().int().min(0),
  }),
  approvalsHandoff: z.string(),
  approvalsHandoffVerified: z.boolean(),
  degraded: z.array(z.string()),
  asOf: iso,
});

export const memoryItemSchema = z.strictObject({
  id: z.uuid(),
  scope: z.string(),
  layer: z.string(),
  admission: z.string(),
  trust: z.string(),
  preview: z.string().max(200).nullable(),
  createdAt: nullableIso,
});

export const memoryListSchema = z.strictObject({
  items: z.array(memoryItemSchema),
  truncated: z.boolean(),
});

export const forgetResultSchema = z.strictObject({
  deleted: z.literal(true),
  jobId: z.string().nullable(),
});

export const skillItemSchema = z.strictObject({
  installId: z.uuid(),
  name: z.string(),
  version: z.string(),
  digestPrefix: z.string(),
  state: z.string(),
  installedAt: nullableIso,
});

export const skillListSchema = z.strictObject({
  skills: z.array(skillItemSchema),
  complete: z.boolean(),
});

export const deviceItemSchema = z.strictObject({
  id: z.string(),
  label: z.string().nullable(),
  state: z.string(),
  lastSeenAt: nullableIso,
});

export const deviceSessionItemSchema = z.strictObject({
  id: z.string(),
  deviceId: z.string(),
  state: z.string(),
  startedAt: nullableIso,
});

export const deviceListSchema = z.strictObject({
  devices: z.array(deviceItemSchema),
  sessions: z.array(deviceSessionItemSchema),
});

export const dnaSummarySchema = z.strictObject({
  name: z.string().nullable(),
  role: z.string().nullable(),
});

export const spendViewSchema = z.strictObject({
  ceilings: z.array(ceilingItemSchema),
  consumedMicros: nullableAmount,
});

export const deletionJobViewSchema = z.strictObject({
  id: z.string(),
  state: z.string(),
  createdAt: nullableIso,
});

export const presenceFrameSchema = z.strictObject({
  state: z.enum(["idle", "active", "awaiting_owner", "stopped", "degraded", "offline"]),
  layout: z.string(),
  text: z.string(),
  cues: z.array(z.strictObject({ slot: z.string().min(1), label: z.string().min(1) })),
  recording_visible: z.boolean(),
  listening_visible: z.boolean(),
  uncertainty_visible: z.boolean(),
  animation: z
    .enum(["transition_fade", "attention_pulse_once", "progress_step"])
    .optional(),
  reduced_motion_alternative: z.literal(true),
  screen_reader_text: z.string().min(1).max(280),
});

export const presenceSceneSchema = z.strictObject({
  pose: z.enum([
    "rest",
    "attentive",
    "working",
    "degraded_hold",
    "offline_hold",
    "stopped_hold",
  ]),
  motion: z.enum(["none", "idle_sway", "acknowledge", "settle"]),
});

export const presenceViewSchema = z.strictObject({
  state: z.enum(["idle", "active", "awaiting_owner", "stopped", "degraded", "offline"]),
  animation: z
    .enum(["transition_fade", "attention_pulse_once", "progress_step"])
    .nullable(),
  text: z.string(),
  reason: z.string().nullable(),
  rung: z.enum(["three_d", "two_d", "voice_status", "text", "headless"]),
  asOf: nullableIso,
  source: z.enum(["mission", "none"]),
  frame: presenceFrameSchema.nullable(),
  scene: presenceSceneSchema.nullable(),
});

export const nativeSessionItemSchema = z.strictObject({
  publicId: z.uuid(),
  label: z.string(),
  platform: z.enum(["ios", "android"]),
  createdAt: iso,
  lastSeenAt: iso,
  current: z.boolean(),
  pushRegistered: z.boolean(),
});

export const nativeSessionsSchema = z.strictObject({
  sessions: z.array(nativeSessionItemSchema).max(20),
});

export const webLinkSchema = z.strictObject({ url: z.string() });

export const okSchema = z.strictObject({ ok: z.literal(true) });

export type StopStatus = z.infer<typeof stopStatusSchema>;
export type CeilingItem = z.infer<typeof ceilingItemSchema>;
export type RobotSummary = z.infer<typeof robotSummarySchema>;
export type MemoryItem = z.infer<typeof memoryItemSchema>;
export type MemoryList = z.infer<typeof memoryListSchema>;
export type ForgetResult = z.infer<typeof forgetResultSchema>;
export type SkillItem = z.infer<typeof skillItemSchema>;
export type SkillList = z.infer<typeof skillListSchema>;
export type DeviceItem = z.infer<typeof deviceItemSchema>;
export type DeviceSessionItem = z.infer<typeof deviceSessionItemSchema>;
export type DeviceList = z.infer<typeof deviceListSchema>;
export type DnaSummary = z.infer<typeof dnaSummarySchema>;
export type SpendView = z.infer<typeof spendViewSchema>;
export type DeletionJobView = z.infer<typeof deletionJobViewSchema>;
export type PresenceFrame = z.infer<typeof presenceFrameSchema>;
export type PresenceScene = z.infer<typeof presenceSceneSchema>;
export type PresenceView = z.infer<typeof presenceViewSchema>;
export type NativeSessionItem = z.infer<typeof nativeSessionItemSchema>;
export type NativeSessions = z.infer<typeof nativeSessionsSchema>;
export type WebLink = z.infer<typeof webLinkSchema>;

export type ParseResult<T> = { ok: true; value: T } | { ok: false };

function tryParse<T>(schema: z.ZodType<T>, value: unknown): ParseResult<T> {
  const parsed = schema.safeParse(value);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false };
}

export const parseRobotSummary = (value: unknown) => tryParse(robotSummarySchema, value);
export const parseStopStatus = (value: unknown) => tryParse(stopStatusSchema, value);
export const parseCeilingItem = (value: unknown) => tryParse(ceilingItemSchema, value);
export const parseMemoryItem = (value: unknown) => tryParse(memoryItemSchema, value);
export const parseMemoryList = (value: unknown) => tryParse(memoryListSchema, value);
export const parseForgetResult = (value: unknown) => tryParse(forgetResultSchema, value);
export const parseSkillItem = (value: unknown) => tryParse(skillItemSchema, value);
export const parseSkillList = (value: unknown) => tryParse(skillListSchema, value);
export const parseDeviceItem = (value: unknown) => tryParse(deviceItemSchema, value);
export const parseDeviceSessionItem = (value: unknown) => tryParse(deviceSessionItemSchema, value);
export const parseDeviceList = (value: unknown) => tryParse(deviceListSchema, value);
export const parseDnaSummary = (value: unknown) => tryParse(dnaSummarySchema, value);
export const parseSpendView = (value: unknown) => tryParse(spendViewSchema, value);
export const parseDeletionJobView = (value: unknown) => tryParse(deletionJobViewSchema, value);
export const parsePresenceView = (value: unknown) => tryParse(presenceViewSchema, value);
export const parseNativeSessions = (value: unknown) => tryParse(nativeSessionsSchema, value);
export const parseWebLink = (value: unknown) => tryParse(webLinkSchema, value);
export const parseOk = (value: unknown) => tryParse(okSchema, value);
