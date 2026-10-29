import { ExternalLink, HardDrive } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { DeviceItem } from "../../../../packages/domain/src/muse-robot-contract";
import {
  Button,
  Card,
  Chip,
  dateLabel,
  Empty,
  ErrorNotice,
  LinkRow,
  makeStyles,
  SectionHeading,
  Sheet,
  useTheme,
} from "../ui";
import { useWorkspace } from "../workspace";
import { type ResourceStatus, useRobot } from "./RobotProvider";
import { getDevices, markDeviceLost, type RobotRequest } from "./robot-api";

export function DevicesPage() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { api } = useWorkspace();
  const { openHandoff } = useRobot();
  const request = useMemo<RobotRequest>(
    () => (path, body, method) => api.request(path, body, method),
    [api],
  );
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<DeviceItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await getDevices(request);
    if (result.ok) {
      setDevices(result.value.devices);
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

  async function markLost(device: DeviceItem) {
    setBusy(true);
    const result = await markDeviceLost(request, device.id);
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
      <SectionHeading title="Devices and health" />
      {status === "loading" ? <ActivityIndicator color={theme.link} /> : null}
      {status === "unavailable" ? <Text style={s.muted}>Not available yet.</Text> : null}
      <ErrorNotice error={status === "error" || error ? error : undefined} />
      {status === "ready" && devices.length === 0 ? (
        <Empty icon={HardDrive} title="No robot devices" detail="Robot devices appear here." />
      ) : null}
      {devices.map((device) => (
        <Card key={device.id} style={{ gap: 8 }}>
          <Text style={s.text}>{device.label ?? device.id}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Chip tone={device.state === "active" ? "success" : "info"}>{device.state}</Chip>
            <Text style={s.small}>
              {device.lastSeenAt ? `Last seen ${dateLabel(device.lastSeenAt)}` : "Never seen"}
            </Text>
          </View>
          <Button small danger onPress={() => setSelected(device)}>
            Mark as lost
          </Button>
        </Card>
      ))}
      <LinkRow
        title="Open robot devices on the web"
        detail="Opens the console in your browser."
        icon={ExternalLink}
        onPress={() => void openHandoff("devices")}
      />
      {selected ? (
        <Sheet
          title="Mark this device as lost?"
          subtitle="The robot will stop trusting this device until you review it in the console."
          onClose={() => setSelected(null)}
        >
          <Button danger busy={busy} onPress={() => void markLost(selected)}>
            Mark as lost
          </Button>
          <Button onPress={() => setSelected(null)}>Cancel</Button>
        </Sheet>
      ) : null}
    </View>
  );
}
