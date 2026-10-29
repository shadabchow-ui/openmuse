import {
  Activity,
  Bell,
  Bot,
  type LucideIcon,
  OctagonX,
  TriangleAlert,
  WifiOff,
} from "lucide-react-native";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { Circle, Svg } from "react-native-svg";
import type { PresenceView } from "../../../../packages/domain/src/muse-robot-contract";
import type { ThemeRoles } from "../theme/theme";
import { Chip, makeStyles, useTheme } from "../ui";
import { announce } from "./announce";
import { isReduceMotionEnabled, subscribeReduceMotion } from "./reduce-motion";
import {
  NO_PRESENCE,
  type StageGlyph,
  type StageTone,
  type StageView,
  stageViewFor,
} from "./stage-model";

const GLYPHS: Record<StageGlyph, LucideIcon> = {
  idle: Bot,
  active: Activity,
  awaiting: Bell,
  stopped: OctagonX,
  degraded: TriangleAlert,
  offline: WifiOff,
};

function toneColor(theme: ThemeRoles, tone: StageTone): string {
  switch (tone) {
    case "active":
      return theme.successText;
    case "attention":
      return theme.link;
    case "stopped":
      return theme.destructive;
    case "degraded":
      return theme.destructive;
    case "offline":
      return theme.mutedForeground;
    case "neutral":
      return theme.mutedForeground;
  }
}

export function RobotStage({
  presence,
  offline,
  size = 152,
  renderCenter,
}: {
  presence: PresenceView | null;
  offline: boolean;
  size?: number;
  renderCenter?: (view: StageView) => ReactNode;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [step, setStep] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const lastAnnounce = useRef<string | null>(null);
  const view = stageViewFor(presence ?? NO_PRESENCE, { reducedMotion, offline });
  const color = toneColor(theme, view.tone);
  const Glyph = GLYPHS[view.glyph];

  useEffect(() => {
    let live = true;
    void isReduceMotionEnabled().then((enabled) => {
      if (live) setReducedMotion(enabled);
    });
    const unsubscribe = subscribeReduceMotion(setReducedMotion);
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (view.announce && view.announce !== lastAnnounce.current) {
      lastAnnounce.current = view.announce;
      announce(view.announce);
    }
  }, [view.announce]);

  useEffect(() => {
    if (view.motion !== "pulse_once" || reducedMotion) return;
    pulse.setValue(0.55);
    const animation = Animated.timing(pulse, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [view.motion, reducedMotion, pulse]);

  useEffect(() => {
    if (view.motion !== "progress" || reducedMotion) return;
    const timer = setInterval(() => setStep((value) => (value + 1) % 3), 900);
    return () => clearInterval(timer);
  }, [view.motion, reducedMotion]);

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={view.accessibilityLabel}
      accessibilityLiveRegion="polite"
      style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}
    >
      <Animated.View style={{ opacity: pulse }}>
        <Svg width={size} height={size} accessibilityElementsHidden>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 4}
            stroke={color}
            strokeWidth={2}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 16}
            stroke={theme.border}
            strokeWidth={1}
            fill="transparent"
          />
        </Svg>
        <View
          style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}
        >
          {renderCenter ? renderCenter(view) : <Glyph size={size * 0.28} color={color} />}
        </View>
      </Animated.View>
      <Text style={s.heading}>{view.title}</Text>
      <Text style={[s.muted, { textAlign: "center" }]}>{view.statusText}</Text>
      {view.motion === "progress" && !reducedMotion ? (
        <View style={{ flexDirection: "row", gap: 5 }} accessibilityElementsHidden>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: index === step ? color : theme.border,
              }}
            />
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {view.showRecording ? <Chip tone="destructive">Recording</Chip> : null}
        {view.showListening ? <Chip tone="info">Listening</Chip> : null}
        {view.showUncertainty ? <Chip tone="warning">Needs attention</Chip> : null}
        {view.cues.map((cue) => (
          <Chip key={cue.slot}>{cue.label}</Chip>
        ))}
      </View>
    </View>
  );
}
