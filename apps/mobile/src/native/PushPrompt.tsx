/** In-app push prompt: permission is requested only when the person turns it on. */

import { Text, View } from "react-native";
import { Button, Card, s } from "../ui";

export function PushPrompt({
  onTurnOn,
  onNotNow,
  busy,
}: {
  onTurnOn: () => void;
  onNotNow: () => void;
  busy?: boolean;
}) {
  return (
    <View style={{ paddingHorizontal: 22, paddingBottom: 8 }}>
      <Card>
        <Text style={s.text}>Get a heads-up when your robot needs you</Text>
        <Text style={s.muted}>Turn on notifications to hear about approvals and finished work.</Text>
        <Button primary onPress={onTurnOn} busy={busy} disabled={busy}>
          Turn on
        </Button>
        <Button onPress={onNotNow}>Not now</Button>
      </Card>
    </View>
  );
}
