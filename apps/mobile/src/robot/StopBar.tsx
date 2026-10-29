import { ExternalLink, OctagonX } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, ErrorNotice, LinkRow, makeStyles, timeLabel, useTheme } from "../ui";
import { useRobot } from "./RobotProvider";
import { StopSheet } from "./StopSheet";
import { STOP_STALE_SENTENCE } from "./stop-flow";

export function StopBar() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const robot = useRobot();
  const { summary, stop, openStop, cancelStop, confirmStop, dismissStopError, openHandoff } = robot;
  const engaged = stop.phase === "engaged" || summary?.stop.engaged === true;
  const sending = stop.phase === "sending";
  const engagedAt = summary?.stop.engagedAt;

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
      {engaged ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.destructive,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <OctagonX size={16} color={theme.destructive} />
            <Text style={[s.text, { fontWeight: "600", color: theme.destructive }]}>
              Robot is stopped
            </Text>
            {engagedAt ? <Text style={s.small}>{timeLabel(engagedAt)}</Text> : null}
          </View>
          <LinkRow
            title="Resume in console"
            detail="Stopping is instant on your phone; resuming is done in the console."
            icon={ExternalLink}
            onPress={() => void openHandoff("killswitch")}
          />
        </View>
      ) : (
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={s.small}>
            {stop.phase === "requested"
              ? stop.stale
                ? STOP_STALE_SENTENCE
                : "Stop requested…"
              : stop.phase === "failed"
                ? stop.error
                : "Robot is running"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop the robot"
            accessibilityHint="Opens a confirmation"
            onPress={openStop}
            style={({ pressed }) => ({
              minHeight: 44,
              minWidth: 44,
              paddingHorizontal: 16,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 22,
              opacity: pressed ? 0.7 : 1,
              backgroundColor: theme.errorBackground,
            })}
          >
            <Text style={[s.buttonText, { color: theme.destructive }]}>Stop</Text>
          </Pressable>
        </View>
      )}

      {stop.phase === "failed" ? (
        <View style={{ gap: 4 }}>
          <ErrorNotice error={stop.error ?? undefined} />
          <Button
            small
            onPress={() => {
              dismissStopError();
              openStop();
            }}
          >
            Try again
          </Button>
        </View>
      ) : null}

      {stop.phase === "confirming" || sending ? (
        <StopSheet sending={sending} onConfirm={() => void confirmStop()} onCancel={cancelStop} />
      ) : null}
    </View>
  );
}
