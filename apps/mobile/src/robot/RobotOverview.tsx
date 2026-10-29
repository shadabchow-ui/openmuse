import { Brain, ExternalLink, HardDrive, Puzzle, Smartphone, Wallet } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  ErrorNotice,
  LinkRow,
  makeStyles,
  SectionHeading,
  useTheme,
} from "../ui";
import { useWorkspace } from "../workspace";
import type { PageId } from "./pages";
import { useRobot } from "./RobotProvider";
import { RobotStage } from "./RobotStage";

function healthTone(status: string): "success" | "warning" | "info" {
  if (status === "ok") return "success";
  if (status === "attention") return "warning";
  return "info";
}

export function RobotOverview({ onOpenPage }: { onOpenPage: (page: PageId) => void }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { workspace } = useWorkspace();
  const robot = useRobot();
  const {
    summary,
    summaryStatus,
    summaryError,
    presence,
    presenceStatus,
    offline,
    setStageVisible,
  } = robot;
  const [details, setDetails] = useState(false);

  useEffect(() => {
    setStageVisible(true);
    return () => setStageVisible(false);
  }, [setStageVisible]);

  const approvals = workspace.actions
    .filter((action) => action.status === "awaiting_review")
    .slice(0, 5);
  const spent = summary
    ? summary.spend.ceilings
        .filter((ceiling) => ceiling.consumedBps !== null)
        .map((ceiling) => `${ceiling.scope}: ${Math.round((ceiling.consumedBps ?? 0) / 100)}% used`)
    : [];

  return (
    <View style={{ gap: 14 }}>
      {summaryStatus === "loading" ? <ActivityIndicator color={theme.link} /> : null}
      {summaryStatus === "unavailable" ? <Text style={s.muted}>Not available yet.</Text> : null}
      <ErrorNotice error={summaryStatus === "error" ? summaryError : undefined} />
      {summary ? (
        <Card style={{ gap: 12 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.heading}>{summary.robot.name ?? "Your robot"}</Text>
              <Text style={s.small}>
                {summary.robot.ageDays === null
                  ? "Activation pending"
                  : `Active for ${summary.robot.ageDays} days`}
              </Text>
            </View>
            <Chip tone={healthTone(summary.health.status)}>{summary.health.status}</Chip>
          </View>
          {summary.health.signals.length > 0 ? (
            <Button small onPress={() => setDetails((value) => !value)}>
              {details ? "Hide details" : "Details"}
            </Button>
          ) : null}
          {details
            ? summary.health.signals.map((signal) => (
                <View key={signal.key} style={{ gap: 2 }}>
                  <Text style={[s.small, { color: theme.foreground }]}>{signal.key}</Text>
                  <Text style={s.small}>{signal.detail}</Text>
                </View>
              ))
            : null}
          <Text style={s.small}>{spent.length > 0 ? spent.join(" · ") : "No limits set"}</Text>
          <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
            <Text style={s.small}>Approvals waiting: {summary.counts.pendingApprovals}</Text>
            <Text style={s.small}>Tasks running: {summary.counts.activeMissions}</Text>
            <Text style={s.small}>Needs review: {summary.counts.unresolved}</Text>
          </View>
        </Card>
      ) : null}

      <Card style={{ gap: 8 }}>
        <RobotStage presence={presence} offline={offline} />
        {presenceStatus === "unavailable" ? <Text style={s.muted}>Not available yet.</Text> : null}
        <ErrorNotice error={presenceStatus === "error" ? robot.presenceError : undefined} />
      </Card>

      <Card style={{ gap: 8 }}>
        <SectionHeading title="Approvals" />
        <Text style={s.small}>
          Approval hand-off is not available in this app. Open Robot OS on the web to review it.
        </Text>
        {approvals.length === 0 ? <Text style={s.muted}>No approvals waiting.</Text> : null}
        {approvals.map((action) => {
          const tier = typeof action.data.tier === "string" ? action.data.tier : "Tier unknown";
          return (
            <View key={action.id} style={{ gap: 2 }}>
              <Text style={s.text}>{action.title}</Text>
              <Text style={s.small}>
                {tier} · {action.status.replace("_", " ")}
              </Text>
            </View>
          );
        })}
      </Card>

      <LinkRow
        title="Memory"
        detail="What your robot remembers."
        icon={Brain}
        onPress={() => onOpenPage("memory")}
      />
      <LinkRow
        title="Skills"
        detail="Installed skills, read only."
        icon={Puzzle}
        onPress={() => onOpenPage("skills")}
      />
      <LinkRow
        title="Devices and health"
        detail="Robot devices and their state."
        icon={HardDrive}
        onPress={() => onOpenPage("devices")}
      />
      <LinkRow
        title="Spend and trust"
        detail="Ceilings and what has been used."
        icon={Wallet}
        onPress={() => onOpenPage("spend")}
      />
      <LinkRow
        title="Phone sessions"
        detail="Phones linked to this robot."
        icon={Smartphone}
        onPress={() => onOpenPage("phones")}
      />
      <LinkRow
        title="More on the web"
        detail="Temporary console exceptions."
        icon={ExternalLink}
        onPress={() => onOpenPage("more")}
      />
    </View>
  );
}
