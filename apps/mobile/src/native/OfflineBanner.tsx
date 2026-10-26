/** Polite offline banner: shown when offline, hidden otherwise, never animated. */

import { Text, View } from "react-native";
import { colors } from "../ui";

export function OfflineBanner({ offline }: { offline: boolean }) {
  if (!offline) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.text,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#FFF", fontSize: 13 }}>You&apos;re offline. Reconnect to send messages.</Text>
    </View>
  );
}
