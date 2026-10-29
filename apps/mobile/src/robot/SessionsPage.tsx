import { Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { NativeSessionItem } from "../../../../packages/domain/src/muse-robot-contract";
import {
  Button,
  Card,
  Chip,
  dateLabel,
  Empty,
  ErrorNotice,
  makeStyles,
  SectionHeading,
  Sheet,
  useTheme,
} from "../ui";
import { useWorkspace } from "../workspace";
import { type ResourceStatus, useRobot } from "./RobotProvider";
import { getSessions, type RobotRequest, revokeSession } from "./robot-api";

export function SessionsPage() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { api } = useWorkspace();
  const { settings, openHandoff } = useRobot();
  const request = useMemo<RobotRequest>(
    () => (path, body, method) => api.request(path, body, method),
    [api],
  );
  const [sessions, setSessions] = useState<NativeSessionItem[]>([]);
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<NativeSessionItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await getSessions(request);
    if (result.ok) {
      setSessions(result.value.sessions);
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

  async function remove(session: NativeSessionItem) {
    setBusy(true);
    const result = await revokeSession(request, session.publicId);
    setBusy(false);
    setSelected(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    void load();
  }

  return (
    <View style={{ gap: 14 }}>
      <SectionHeading title="Phone sessions" />
      {status === "loading" ? <ActivityIndicator color={theme.link} /> : null}
      {status === "unavailable" ? <Text style={s.muted}>Not available yet.</Text> : null}
      <ErrorNotice error={status === "error" || error ? error : undefined} />
      {status === "ready" && sessions.length === 0 ? (
        <Empty
          icon={Smartphone}
          title="No linked phones"
          detail="Phones signed in to this robot appear here."
        />
      ) : null}
      {sessions.map((session) => (
        <Card key={session.publicId} style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Text style={s.text}>{session.label}</Text>
            {session.current ? <Chip tone="success">This phone</Chip> : null}
          </View>
          <Text style={s.small}>
            {session.platform} · Last seen {dateLabel(session.lastSeenAt)}
          </Text>
          {session.current ? null : (
            <Button small danger onPress={() => setSelected(session)}>
              Remove
            </Button>
          )}
        </Card>
      ))}
      {selected ? (
        <Sheet
          title="Remove this phone?"
          subtitle="It will be signed out and must be set up again to reconnect."
          onClose={() => setSelected(null)}
        >
          <Button danger busy={busy} onPress={() => void remove(selected)}>
            Remove this phone
          </Button>
          <Button onPress={() => setSelected(null)}>Cancel</Button>
        </Sheet>
      ) : null}
      <Button onPress={() => void openHandoff("devices")}>Open device settings on the web</Button>
      {settings.onSignOut ? (
        <Button onPress={settings.onSignOut}>Sign out of this phone</Button>
      ) : null}
    </View>
  );
}
