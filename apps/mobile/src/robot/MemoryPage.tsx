import { Brain } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { MemoryItem } from "../../../../packages/domain/src/muse-robot-contract";
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
import { createForgetFlow, type ForgetState, initialForgetState } from "./forget-flow";
import type { ResourceStatus } from "./RobotProvider";
import {
  forgetMemory,
  getDeletionJob,
  getMemory,
  type RobotRequest,
  type RobotResult,
} from "./robot-api";

function unwrap<T>(result: RobotResult<T>): T {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

export function MemoryPage() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { api } = useWorkspace();
  const request = useMemo<RobotRequest>(
    () => (path, body, method) => api.request(path, body, method),
    [api],
  );
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [scope, setScope] = useState<string | undefined>();
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MemoryItem | null>(null);
  const [flowState, setFlowState] = useState<ForgetState>(initialForgetState);

  const load = useCallback(async () => {
    setStatus("loading");
    const result = await getMemory(request, scope);
    if (result.ok) {
      setItems(result.value.items);
      setStatus("ready");
      setError("");
    } else if (result.kind === "unavailable") {
      setStatus("unavailable");
    } else {
      setStatus("error");
      setError(result.message);
    }
  }, [request, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const flow = useMemo(
    () =>
      createForgetFlow({
        forget: async (id) => unwrap(await forgetMemory(request, id)),
        getJob: async (id) => unwrap(await getDeletionJob(request, id)),
        onChange: setFlowState,
      }),
    [request],
  );

  useEffect(() => () => flow.stop(), [flow]);

  useEffect(() => {
    if (flowState.phase === "done") {
      setSelected(null);
      void load();
    }
  }, [flowState.phase, load]);

  const scopes = [...new Set(items.map((item) => item.scope))];

  return (
    <View style={{ gap: 14 }}>
      <SectionHeading title="Memory" />
      {scopes.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button small onPress={() => setScope(undefined)}>
            All
          </Button>
          {scopes.map((name) => (
            <Button key={name} small onPress={() => setScope(name)}>
              {name}
            </Button>
          ))}
        </View>
      ) : null}
      {status === "loading" ? <ActivityIndicator color={theme.link} /> : null}
      {status === "unavailable" ? <Text style={s.muted}>Not available yet.</Text> : null}
      <ErrorNotice error={status === "error" ? error : undefined} />
      <ErrorNotice error={flowState.error ?? undefined} />
      {flowState.note ? <Text style={s.small}>{flowState.note}</Text> : null}
      {status === "ready" && items.length === 0 ? (
        <Empty
          icon={Brain}
          title="No memories yet"
          detail="Things your robot remembers will appear here."
        />
      ) : null}
      {items.map((item) => (
        <Card key={item.id} style={{ gap: 8 }}>
          <Text style={s.text}>{item.preview ?? "Memory preview unavailable"}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Chip>{item.scope}</Chip>
            <Chip>{item.layer}</Chip>
            <Chip>{item.trust}</Chip>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <Text style={s.small}>{item.createdAt ? dateLabel(item.createdAt) : ""}</Text>
            <Button small danger onPress={() => setSelected(item)}>
              Forget
            </Button>
          </View>
        </Card>
      ))}
      {selected ? (
        <Sheet
          title="Forget this memory?"
          subtitle="It is removed from the robot's memory. This cannot be undone."
          onClose={() => setSelected(null)}
        >
          <Button
            danger
            onPress={() => {
              const id = selected.id;
              setSelected(null);
              void flow.start(id);
            }}
          >
            Forget this memory
          </Button>
          <Button onPress={() => setSelected(null)}>Cancel</Button>
        </Sheet>
      ) : null}
    </View>
  );
}
