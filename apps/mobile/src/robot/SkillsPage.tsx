import { ExternalLink, Puzzle } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { SkillItem } from "../../../../packages/domain/src/muse-robot-contract";
import {
  Card,
  Chip,
  dateLabel,
  Empty,
  ErrorNotice,
  LinkRow,
  makeStyles,
  SectionHeading,
  useTheme,
} from "../ui";
import { useWorkspace } from "../workspace";
import { type ResourceStatus, useRobot } from "./RobotProvider";
import { getSkills, type RobotRequest } from "./robot-api";

export function SkillsPage() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { api } = useWorkspace();
  const { openHandoff } = useRobot();
  const request = useMemo<RobotRequest>(
    () => (path, body, method) => api.request(path, body, method),
    [api],
  );
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const result = await getSkills(request);
    if (result.ok) {
      setSkills(result.value.skills);
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
      <SectionHeading title="Skills" />
      {status === "loading" ? <ActivityIndicator color={theme.link} /> : null}
      {status === "unavailable" ? <Text style={s.muted}>Not available yet.</Text> : null}
      <ErrorNotice error={status === "error" ? error : undefined} />
      {status === "ready" && skills.length === 0 ? (
        <Empty icon={Puzzle} title="No skills installed" detail="Installed skills appear here." />
      ) : null}
      {skills.map((skill) => (
        <Card key={skill.installId} style={{ gap: 8 }}>
          <Text style={s.text}>{skill.name}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Chip>{skill.version}</Chip>
            <Chip tone={skill.state === "installed" ? "success" : "info"}>{skill.state}</Chip>
            <Text style={s.small}>{skill.installedAt ? dateLabel(skill.installedAt) : ""}</Text>
          </View>
        </Card>
      ))}
      <LinkRow
        title="Change skills on the web"
        detail="Opens the console in your browser."
        icon={ExternalLink}
        onPress={() => void openHandoff("skills")}
      />
    </View>
  );
}
