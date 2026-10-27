/** Native sign-in gate: system-browser PKCE flow, revocation-aware, update-blocking. */

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Text, View } from "react-native";
import { Button, Card, ErrorNotice, Mascot, makeStyles, useTheme } from "../ui";
import { buildAuthorizeUrl, exchangeCode, parseCallback } from "./auth-flow";
import { deviceLabel, openSignIn } from "./browser-auth";
import { type NativeConfig, readNativeConfig } from "./config";
import { random, sha256 } from "./crypto";
import { AuthError } from "./errors";
import { createPkce } from "./pkce";
import type { SessionManager } from "./session-manager";

const platform = Platform.OS === "ios" ? "ios" : "android";

export function nativeConfigFromEnv(env: Record<string, string | undefined>): NativeConfig | null {
  try {
    return readNativeConfig(env, { dev: __DEV__, platform });
  } catch {
    return null;
  }
}

export function NativeAuthGate({
  manager,
  cfg,
  callbackUrl,
  onCallbackConsumed,
  children,
}: {
  manager: SessionManager;
  cfg: NativeConfig;
  callbackUrl?: string | null;
  onCallbackConsumed?: () => void;
  children: (token: string) => ReactNode;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [renderState, setRenderState] = useState(() => manager.state());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const attempt = useRef<{ state: string; verifier: string } | null>(null);

  useEffect(() => manager.subscribe(() => setRenderState(manager.state())), [manager]);

  const handleCallback = useCallback(
    async (url: string): Promise<void> => {
      const pending = attempt.current;
      if (!pending) return;
      attempt.current = null;
      const parsed = parseCallback(url, pending.state, cfg);
      if (parsed.kind === "denied") {
        setMessage("This sign-in link expired. Try again.");
        return;
      }
      if (parsed.kind === "invalid") {
        setMessage("That request could not be read.");
        return;
      }
      try {
        const session = await exchangeCode(fetch, cfg, {
          code: parsed.code,
          verifier: pending.verifier,
          platform,
        });
        setMessage("");
        await manager.completeSignIn(session);
      } catch (error) {
        setMessage(error instanceof AuthError ? error.message : "Something went wrong.");
      }
    },
    [cfg, manager],
  );

  useEffect(() => {
    if (callbackUrl) {
      void handleCallback(callbackUrl).finally(() => onCallbackConsumed?.());
    }
  }, [callbackUrl, handleCallback, onCallbackConsumed]);

  const startSignIn = useCallback(async (): Promise<void> => {
    if (attempt.current) return;
    setMessage("");
    setBusy(true);
    try {
      const pkce = await createPkce({ random, sha256 });
      attempt.current = { state: pkce.state, verifier: pkce.verifier };
      const url = buildAuthorizeUrl(cfg, {
        challenge: pkce.challenge,
        state: pkce.state,
        label: await deviceLabel(),
        platform,
      });
      const result = await openSignIn(url, cfg.redirectUri);
      if (result.type === "success") await handleCallback(result.url);
      else attempt.current = null;
    } finally {
      setBusy(false);
    }
  }, [cfg, handleCallback]);

  if (renderState.kind === "restoring") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <Mascot size={56} />
        <ActivityIndicator color={theme.link} />
        <Text style={s.muted}>Opening your workspace…</Text>
      </View>
    );
  }

  if (renderState.kind === "unsupportedVersion") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
          padding: 24,
        }}
      >
        <View style={{ width: "100%", maxWidth: 420 }}>
          <Card>
            <Text style={s.text}>Update the app to continue.</Text>
            {cfg.storeUrl ? (
              <Button primary onPress={() => void Linking.openURL(cfg.storeUrl!)}>
                Open the store
              </Button>
            ) : null}
          </Card>
        </View>
      </View>
    );
  }

  if (renderState.kind === "signedIn") {
    const token = manager.getToken();
    if (token) return <>{children(token)}</>;
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.background,
        padding: 24,
      }}
    >
      <View style={{ width: "100%", maxWidth: 420, gap: 22, alignItems: "center" }}>
        <Mascot size={72} />
        <Text
          style={{ fontSize: 32, color: theme.foreground, letterSpacing: -1, fontWeight: "500" }}
        >
          Welcome.
        </Text>
        <Text style={[s.muted, { textAlign: "center" }]}>Sign in to open your workspace.</Text>
        <Card style={{ width: "100%" }}>
          <ErrorNotice error={message} />
          <Button primary onPress={() => void startSignIn()} busy={busy}>
            Sign in
          </Button>
        </Card>
      </View>
    </View>
  );
}
