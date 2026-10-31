import { useMemo } from "react";
import { Text, View } from "react-native";
import { makeStyles, useTheme } from "../ui";
import { resolveAvatarViewerUrl } from "./avatar-viewer-url";

/** The model is a review-only avatar preview, not a verified source of agent activity. */
export function RobotAvatarPreview() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const development = typeof __DEV__ !== "undefined" && __DEV__;
  const url = resolveAvatarViewerUrl(
    process.env.EXPO_PUBLIC_AVATAR_PREVIEW_URL,
    "web",
    development,
  );
  if (!url) return null;

  return (
    <View style={{ gap: 6 }}>
      <Text style={s.heading}>Robot avatar · review preview</Text>
      <View
        style={{ height: 320, borderRadius: 14, overflow: "hidden", backgroundColor: "#E9E9E7" }}
      >
        <iframe
          title="Robot avatar preview"
          src={url}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      </View>
      <Text style={s.small}>
        Review-only 3D viewer. Animation controls are a preview, not evidence that the agent is
        working.
      </Text>
    </View>
  );
}
