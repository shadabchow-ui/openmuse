import { ExternalLink, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { SpendView } from "../../../../packages/domain/src/muse-robot-contract";
import { Card, Chip, ErrorNotice, LinkRow, makeStyles, SectionHeading, useTheme } from "../ui";
import { useWorkspace } from "../workspace";
import { type ResourceStatus, useRobot } from "./RobotProvider";
import { getSpend, type RobotRequest } from "./robot-api";

function money(micros: string | null): string {
  if (micros === null) return "No limit set";
  const value = Number(micros);
  return Number.isFinite(value) ? `$${(value / 1_000_000).toFixed(2)}` : "No limit set";
}

export function SpendPage() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { api } = useWorkspace();
  const { openHandoff } = useRobot();
  const request = useMemo<RobotRequest>(
    () => (path, body, method) => api.request(path, body, method),
    [api],
  );
  const [spend, setSpend] = useState<SpendView | null>(null);
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const result = await getSpend(request);
    if (result.ok) {
      setSpend(result.value);
      setStatus("ready");
      setError("");
    } else if (result.kind === "unavailable") {
      setStatus("unavailable");
    } else {
      setStatus("error");
      setError(result.message);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={{ gap: 14 }}>
      <SectionHeading title="Spend and trust" />
      {status === "loading" ? <ActivityIndicator color={theme.link} /> : null}
      {status === "unavailable" ? <Text style={s.muted}>Not available yet.</Text> : null}
      <ErrorNotice error={status === "error" ? error : undefined} />
      {spend ? (
        <Card style={{ gap: 12 }}>
          <Text style={s.text}>Used so far: {money(spend.consumedMicros)}</Text>
          {spend.ceilings.map((ceiling) => {
            const percent =
              ceiling.consumedBps === null ? null : Math.round(ceiling.consumedBps / 100);
            return (
              <View key={ceiling.scope} style={{ gap: 5 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={s.text}>{ceiling.scope}</Text>
                  <Text style={s.small}>
                    {percent === null ? "No usage" : `${percent}% used`} ·{" "}
                    {money(ceiling.ceilingMicros)}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: 4,
                    backgroundColor: theme.border,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      width: `${Math.min(100, Math.max(0, percent ?? 0))}%`,
                      backgroundColor:
                        percent !== null && percent >= 90 ? theme.destructive : theme.link,
                    }}
                  />
                </View>
              </View>
            );
          })}
          <Chip>Read only on this phone</Chip>
        </Card>
      ) : null}
      <LinkRow
        title="Change spend limits"
        detail="Opens the console in your browser."
        icon={ExternalLink}
        onPress={() => void openHandoff("charge")}
      />
      <LinkRow
        title="Trust contract"
        detail="Opens the console in your browser."
        icon={Wallet}
        onPress={() => void openHandoff("trust")}
      />
    </View>
  );
}
