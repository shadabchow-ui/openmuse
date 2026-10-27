/** Development-only diagnostics: compatibility, session summary, streaming probe. */

import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { API_URL, apiPath, type MuseApi } from "../api";
import { isLocalGatewayUrl, type NativeConfig } from "./config";
import { nativeHeaders } from "./headers";
import { Button, Card, ErrorNotice, makeStyles, useTheme } from "../ui";

interface ProbeChunk {
  atMs: number;
  text: string;
}

async function runStreamingProbe(
  cfg: NativeConfig,
  token: string,
  platform: "ios" | "android",
): Promise<{ chunks: ProbeChunk[]; error: string }> {
  const started = Date.now();
  const url = `${API_URL}${apiPath("/api/copilotkit")}/agent/default/run`;
  let response: globalThis.Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...nativeHeaders(cfg, platform),
      },
      body: JSON.stringify({
        threadId: `diagnostics-${started}`,
        messages: [{ id: `diagnostics-${started}`, role: "user", content: "[mock:slow]" }],
      }),
    });
  } catch {
    return { chunks: [], error: "Probe request failed." };
  }
  if (!response.ok || !response.body) return { chunks: [], error: `Probe answered ${response.status}.` };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const chunks: ProbeChunk[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      for (const line of part.split("\n")) {
        const text = line.startsWith("data:") ? line.slice(5).trim() : "";
        if (text) chunks.push({ atMs: Date.now() - started, text: text.slice(0, 80) });
      }
    }
  }
  return { chunks, error: "" };
}

export function Diagnostics({
  cfg,
  api,
  platform,
  session,
  offline,
  pushStatus,
}: {
  cfg: NativeConfig;
  api: MuseApi;
  platform: "ios" | "android";
  session: { publicId: string; expiresAtMs: number } | null;
  offline: boolean;
  pushStatus: string;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  if (!__DEV__) return null;
  const localOnly = isLocalGatewayUrl(cfg.apiUrl);
  const [compat, setCompat] = useState("");
  const [probe, setProbe] = useState<{ chunks: ProbeChunk[]; error: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const checkCompat = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await api.request<{ ok: boolean; nativeEnabled: boolean; apiVersion: number }>(
        "/api/native/compat",
      );
      setCompat(JSON.stringify(result));
    } catch (error) {
      setCompat(`error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const checkStream = async (): Promise<void> => {
    if (!localOnly) return;
    setBusy(true);
    try {
      setProbe(await runStreamingProbe(cfg, api.token, platform));
    } finally {
      setBusy(false);
    }
  };

  const passed =
    probe !== null &&
    probe.error === "" &&
    probe.chunks.length >= 3 &&
    probe.chunks.slice(1).every((chunk, index) => chunk.atMs - probe.chunks[index]!.atMs > 50);

  return (
    <Card>
      <Text style={s.text}>Diagnostics (development only)</Text>
      <Text style={s.muted}>Session: {session ? `${session.publicId} until ${new Date(session.expiresAtMs).toISOString()}` : "none"}</Text>
      <Text style={s.muted}>Connectivity: {offline ? "offline" : "online"}</Text>
      <Text style={s.muted}>Push: {pushStatus}</Text>
      <Button onPress={() => void checkCompat()} busy={busy}>
        Check compatibility
      </Button>
      {compat ? <Text style={s.small}>{compat}</Text> : null}
      <Button onPress={() => void checkStream()} busy={busy} disabled={!localOnly}>
        Run streaming probe
      </Button>
      {!localOnly ? <Text style={s.muted}>Streaming probe runs only against a local server</Text> : null}
      {probe ? (
        <View>
          <ErrorNotice error={probe.error} />
          <Text style={s.small}>
            {probe.chunks.length} chunks{probe.chunks.length > 0 ? `, first at ${probe.chunks[0]!.atMs} ms` : ""} —{" "}
            {passed ? "pass" : "not passed"}
          </Text>
          {probe.chunks.map((chunk, index) => (
            <Text key={index} style={s.small}>
              +{chunk.atMs} ms {chunk.text}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
