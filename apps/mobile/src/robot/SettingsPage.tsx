import { useMemo } from "react";
import { Switch, Text, View } from "react-native";
import { Button, Card, makeStyles, SectionHeading, useTheme } from "../ui";
import { useRobot } from "./RobotProvider";

export function SettingsPage() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { settings } = useRobot();
  return (
    <View style={{ gap: 14 }}>
      <SectionHeading title="Settings" />
      <Card style={{ gap: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text style={[s.text, { flex: 1 }]}>Lock with Face ID or fingerprint</Text>
          <Switch
            value={settings.biometricOn}
            onValueChange={settings.onToggleBiometric}
            accessibilityLabel="Lock with Face ID or fingerprint"
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text style={[s.text, { flex: 1 }]}>Notifications</Text>
          <Switch
            value={settings.notificationsOn}
            onValueChange={settings.onToggleNotifications}
            accessibilityLabel="Notifications"
          />
        </View>
      </Card>
      {settings.onSignOut ? (
        <Button danger onPress={settings.onSignOut}>
          Sign out of this phone
        </Button>
      ) : null}
      {settings.diagnostics}
    </View>
  );
}
