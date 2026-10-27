/** Polite offline banner: shown when offline, hidden otherwise, never animated. */

import { Text, View } from "react-native";
import { useTheme } from "../ui";

export function OfflineBanner({ offline }: { offline: boolean }) {
  const theme = useTheme();
  if (!offline) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        backgroundColor: theme.foreground,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: "center",
      }}
    >
      <Text style={{ color: theme.background, fontSize: 13 }}>
        You&apos;re offline. Reconnect to send messages.
      </Text>
    </View>
  );
}
