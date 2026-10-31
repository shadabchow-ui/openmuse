import { useMemo } from "react";
import { Text, View } from "react-native";
import WebView from "react-native-webview";
import { makeStyles, useTheme } from "../ui";
import { resolveAvatarViewerUrl } from "./avatar-viewer-url";

/** Native app only embeds an owner-configured HTTPS preview, never localhost. */
export function RobotAvatarPreview() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const url = resolveAvatarViewerUrl(
    process.env.EXPO_PUBLIC_AVATAR_PREVIEW_URL,
    "native",
    typeof __DEV__ !== "undefined" && __DEV__,
  );
  if (!url) return null;
  const origin = new URL(url).origin;

  return (
    <View style={{ gap: 6 }}>
      <Text style={s.heading}>Robot avatar · review preview</Text>
      <View style={{ height: 320, borderRadius: 14, overflow: "hidden" }}>
        <WebView
          source={{ uri: url }}
          originWhitelist={[origin]}
          onShouldStartLoadWithRequest={(request) => {
            try {
              return new URL(request.url).origin === origin;
            } catch {
              return false;
            }
          }}
          javaScriptEnabled
          domStorageEnabled={false}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          setSupportMultipleWindows={false}
          allowsInlineMediaPlayback
        />
      </View>
      <Text style={s.small}>
        Review-only 3D viewer. This animation is not linked to live robot activity.
      </Text>
    </View>
  );
}
