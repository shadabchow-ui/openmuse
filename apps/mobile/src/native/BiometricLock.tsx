/** Biometric convenience lock: a local gate for the device-held token. */

import { useState, useMemo } from "react";
import { Text, View } from "react-native";
import { authenticateBiometric } from "./biometric";
import { Button, Card, ErrorNotice, useTheme, makeStyles } from "../ui";

export function BiometricLock({ onUnlocked, onSignOut }: { onUnlocked: () => void; onSignOut: () => void }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const unlock = async (): Promise<void> => {
    setBusy(true);
    try {
      if (await authenticateBiometric()) {
        setFailed(false);
        onUnlocked();
      } else {
        setFailed(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background, padding: 24 }}
    >
      <View style={{ width: "100%", maxWidth: 420 }}>
        <Card>
          <Text style={s.text}>Workspace is locked.</Text>
          <ErrorNotice error={failed ? "Couldn't unlock. Try again." : ""} />
          <Button primary onPress={() => void unlock()} busy={busy}>
            Unlock
          </Button>
          <Button onPress={onSignOut}>Sign out</Button>
        </Card>
      </View>
    </View>
  );
}
