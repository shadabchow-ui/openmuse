import { useRef, useState, useMemo } from "react";
import { Text, View } from "react-native";
import { startPlanResponseSchema } from "../../../packages/domain/src/muse-contract";
import { parseProposal } from "./plan-proposal";
import { Button, Card, ErrorNotice, useTheme, makeStyles } from "./ui";
import { useWorkspace } from "./workspace";

/**
 * First-party card for a proposed mission. It is fed only by data that passed `parseProposal`; the single
 * "Start this mission" button exists nowhere else, and nothing in the tool output can add a control.
 */
export function PlanCard({ result, loading }: { result: unknown; loading: boolean }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { api, refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const pressed = useRef(false);
  if (loading) return <Text style={s.muted}>Preparing a plan…</Text>;
  const parsed = parseProposal(result);
  if (!parsed.ok) return <Text style={s.muted}>Could not show this plan.</Text>;
  const { view } = parsed;

  async function start() {
    if (pressed.current) return;
    pressed.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await api.request<unknown>(
        `/api/plans/${encodeURIComponent(view.proposalId)}/start`,
        {},
      );
      if (!startPlanResponseSchema.safeParse(response).success) {
        throw new Error("Could not start this mission.");
      }
      setStarted(true);
      await refresh();
    } catch (e) {
      pressed.current = false;
      setError(e instanceof Error ? e.message : "Could not start this mission.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 12 }}>
      <Text style={s.heading}>{view.title}</Text>
      {view.steps.map((step, index) => (
        <View key={step.nodeId} style={{ gap: 2 }}>
          <Text style={s.text}>
            {index + 1}. {step.goal}
          </Text>
          <Text style={s.small}>
            {step.operations} · level {step.tier}
            {step.needsApproval ? " · needs your approval" : ""}
          </Text>
        </View>
      ))}
      <View style={{ gap: 2 }}>
        <Text style={s.small}>Estimated cost: {view.estimateText}</Text>
        <Text style={s.small}>Most it can cost: {view.worstCaseText}</Text>
        <Text style={s.small}>
          Offer expires{" "}
          {new Date(view.expiresAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <ErrorNotice error={error} />
      {started ? (
        <Text style={[s.text, { color: theme.foreground }]}>Started</Text>
      ) : (
        <Button primary busy={busy} disabled={!view.startable} onPress={() => void start()}>
          Start this mission
        </Button>
      )}
    </Card>
  );
}
