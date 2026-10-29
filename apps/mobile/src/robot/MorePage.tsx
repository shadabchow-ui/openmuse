import { ExternalLink } from "lucide-react-native";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { LinkRow, makeStyles, SectionHeading, useTheme } from "../ui";
import { HANDOFF_TARGETS } from "./handoff";
import { useRobot } from "./RobotProvider";

export function MorePage() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { openHandoff } = useRobot();
  return (
    <View style={{ gap: 8 }}>
      <SectionHeading title="More on the web" />
      <Text style={s.small}>
        These are temporary exceptions. Each opens the console in your browser through a one-time
        link.
      </Text>
      {HANDOFF_TARGETS.map((target) => (
        <LinkRow
          key={target.key}
          title={target.title}
          detail={target.reason}
          icon={ExternalLink}
          onPress={() => void openHandoff(target.key as Parameters<typeof openHandoff>[0])}
        />
      ))}
    </View>
  );
}
