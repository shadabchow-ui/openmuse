import type { PresenceView } from "../../../../packages/domain/src/muse-robot-contract";

export type StageTone = "neutral" | "active" | "attention" | "stopped" | "degraded" | "offline";
export type StageGlyph = "idle" | "active" | "awaiting" | "stopped" | "degraded" | "offline";
export type StageMotion = "none" | "pulse_once" | "progress";

export interface StageCue {
  slot: string;
  label: string;
}

export interface StageView {
  tone: StageTone;
  glyph: StageGlyph;
  title: string;
  statusText: string;
  cues: StageCue[];
  showRecording: boolean;
  showListening: boolean;
  showUncertainty: boolean;
  motion: StageMotion;
  accessibilityLabel: string;
  announce: string | null;
}

export const NO_PRESENCE: PresenceView = {
  state: "degraded",
  animation: null,
  text: "No presence signal yet.",
  reason: null,
  rung: "text",
  asOf: null,
  source: "none",
  frame: null,
  scene: null,
};

export const OFFLINE_TEXT = "You're offline. Showing the last known state.";

const TITLES: Record<PresenceView["state"], string> = {
  idle: "Idle",
  active: "Working",
  awaiting_owner: "Needs you",
  stopped: "Stopped",
  degraded: "Degraded",
  offline: "Offline",
};

const TONES: Record<PresenceView["state"], StageTone> = {
  idle: "neutral",
  active: "active",
  awaiting_owner: "attention",
  stopped: "stopped",
  degraded: "degraded",
  offline: "offline",
};

const GLYPHS: Record<PresenceView["state"], StageGlyph> = {
  idle: "idle",
  active: "active",
  awaiting_owner: "awaiting",
  stopped: "stopped",
  degraded: "degraded",
  offline: "offline",
};

const ANNOUNCE_STATES = new Set<PresenceView["state"]>([
  "awaiting_owner",
  "stopped",
  "degraded",
  "offline",
]);

function motionFor(presence: PresenceView, reducedMotion: boolean): StageMotion {
  if (reducedMotion || presence.animation === null) return "none";
  switch (presence.animation) {
    case "attention_pulse_once":
      return "pulse_once";
    case "progress_step":
      return "progress";
    case "transition_fade":
      return "none";
    default:
      return "none";
  }
}

export function stageViewFor(
  presence: PresenceView,
  options: { reducedMotion: boolean; offline: boolean },
): StageView {
  const frame = presence.frame;
  const base: StageView = {
    tone: TONES[presence.state],
    glyph: GLYPHS[presence.state],
    title: TITLES[presence.state],
    statusText: presence.text,
    cues: frame ? frame.cues.map((cue) => ({ slot: cue.slot, label: cue.label })) : [],
    showRecording: frame?.recording_visible ?? false,
    showListening: frame?.listening_visible ?? false,
    showUncertainty: frame?.uncertainty_visible ?? false,
    motion: motionFor(presence, options.reducedMotion),
    accessibilityLabel: frame?.screen_reader_text ?? presence.text,
    announce: ANNOUNCE_STATES.has(presence.state)
      ? (frame?.screen_reader_text ?? presence.text)
      : null,
  };
  if (!options.offline) return base;
  return {
    ...base,
    tone: "offline",
    glyph: "offline",
    title: TITLES.offline,
    statusText: `${OFFLINE_TEXT} ${presence.text}`,
    motion: "none",
    accessibilityLabel: `${OFFLINE_TEXT} ${presence.text}`,
    announce: OFFLINE_TEXT,
  };
}
