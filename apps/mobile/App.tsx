import { CopilotKitProvider } from "@copilotkit/react-native/headless";
import { StatusBar } from "expo-status-bar";
import {
  Bell,
  Check,
  Lightbulb,
  type LucideIcon,
  Menu,
  MessageCircle,
  PanelsTopLeft,
  Settings,
  Shapes,
  SquareCheck,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Section, Workspace } from "../../packages/domain/src";
import {
  AgentActivityScreen,
  AgentStatus,
  AppsScreen,
  GoalsScreen,
  IdeasScreen,
} from "./src/agent-ui";
import { AgentWorkspaceProvider, useAgentWorkspace } from "./src/agent-workspace";
import {
  API_URL,
  apiConfig,
  apiPath,
  createSession,
  ExternalAuthRequired,
  MuseApi,
  setApiHooks,
} from "./src/api";
import { brandName, hasCustomBrand } from "./src/brand";
import { visibleNav } from "./src/capabilities";
import { ChatScreen, WorkspaceTools } from "./src/chat";
import { ComputerEntry } from "./src/computer";
import { ComputerDraftProvider } from "./src/computer-drafts";
import { Details } from "./src/details";
import { BiometricLock } from "./src/native/BiometricLock";
import { biometricCapabilities } from "./src/native/biometric";
import { shouldLock } from "./src/native/biometric-policy";
import type { NativeConfig } from "./src/native/config";
import { Diagnostics } from "./src/native/Diagnostics";
import { parseDeepLink, type Route } from "./src/native/deep-link";
import { createForegroundTracker } from "./src/native/foreground";
import { nativeHeaders } from "./src/native/headers";
import { ensureFreshInstall } from "./src/native/install-guard";
import { NativeAuthGate, nativeConfigFromEnv } from "./src/native/NativeAuthGate";
import { subscribeConnectivity } from "./src/native/network";
import { OfflineBanner } from "./src/native/OfflineBanner";
import { PushPrompt } from "./src/native/PushPrompt";
import { addNotificationTapListener, registerForPush } from "./src/native/push";
import { createSessionManager, type SessionManager } from "./src/native/session-manager";
import {
  clearSecureSession,
  readSecureSession,
  readSecureString,
  writeSecureSession,
  writeSecureString,
} from "./src/native/token-store";
import type { TokenStore } from "./src/native/token-store-core";
import { BrowserScreen, CalendarScreen, FilesScreen, MailScreen } from "./src/screens";
import { safeSignInTarget } from "./src/surface-url";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { ThreadsProvider, ThreadsSheet, useMuseThread } from "./src/threads";
import {
  Button,
  Card,
  ErrorNotice,
  Field,
  IconButton,
  Mascot,
  makeStyles,
  useTheme,
} from "./src/ui";
import { type Detail, useWorkspace, WorkspaceContext } from "./src/workspace";

const nav: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "activity", label: "Activity", icon: PanelsTopLeft },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "goals", label: "Goals", icon: SquareCheck },
  { id: "apps", label: "Apps", icon: Shapes },
];
const titles: Partial<Record<Section, { title: string; subtitle: string }>> = {
  activity: { title: "Activity", subtitle: "Plans, progress, decisions and results." },
  ideas: { title: "Ideas", subtitle: "Useful next steps, grounded in your world." },
  goals: {
    title: "Goals",
    subtitle: "Longer-term goals and things to keep an eye on.",
  },
  apps: {
    title: "Apps",
    subtitle: "Connections, capabilities and what your agent remembers.",
  },
  connections: { title: "Apps", subtitle: "Connections and capabilities." },
  mail: { title: "Mail", subtitle: "The conversations behind your work." },
  calendar: { title: "Calendar", subtitle: "Time for what matters." },
  browser: { title: "Browser", subtitle: "Your connected browsing sessions." },
  files: { title: "Files", subtitle: "Documents, forms and filled copies." },
};
const nativeMode = process.env.EXPO_PUBLIC_AUTH_MODE === "native";
const PUSH_SNOOZE_KEY = "muse.push.snooze.v1";
const PUSH_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const BIOMETRIC_KEY = "muse.biometric.v1";
const APPROVAL_UNAVAILABLE =
  "Approval hand-off isn't available in this app. Open Robot OS to decide.";

const secureStore: TokenStore = {
  read: readSecureSession,
  write: writeSecureSession,
  clear: clearSecureSession,
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [token, setToken] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  // Only set in external auth mode, after the server asked for sign-in; null means no sign-in URL.
  const [signIn, setSignIn] = useState<{ url: string | null }>();
  const connect = useCallback(async (key?: string) => {
    setBusy(true);
    setError("");
    setSignIn(undefined);
    try {
      const session = await createSession(key);
      setToken(session.token);
    } catch (e) {
      if (e instanceof ExternalAuthRequired) setSignIn({ url: e.signInUrl });
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void connect();
  }, [connect]);
  if (nativeMode) return <NativeModeRoot />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {token ? (
        <CopilotKitProvider
          runtimeUrl={`${API_URL}${apiPath("/api/copilotkit")}`}
          headers={apiConfig.authMode === "external" ? {} : { Authorization: `Bearer ${token}` }}
          credentials={apiConfig.authMode === "external" ? "same-origin" : undefined}
        >
          <WorkspaceApp token={token} />
        </CopilotKitProvider>
      ) : (
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: theme.background,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View style={{ width: "100%", maxWidth: 420, gap: 22, alignItems: "center" }}>
            {!hasCustomBrand(undefined, apiConfig) && <Mascot size={72} />}
            <Text
              style={{
                fontSize: 32,
                color: theme.foreground,
                letterSpacing: -1,
                fontWeight: "500",
              }}
            >
              Welcome to {brandName(undefined, apiConfig)}.
            </Text>
            <Text style={[s.muted, { textAlign: "center" }]}>A little room for your day.</Text>
            {busy ? (
              <ActivityIndicator color={theme.link} />
            ) : signIn ? (
              <ExternalSignIn url={signIn.url} retry={() => void connect()} />
            ) : (
              <Card style={{ width: "100%" }}>
                <ErrorNotice error={error} />
                <Field
                  label="Workspace access key"
                  value={accessKey}
                  onChangeText={setAccessKey}
                  secureTextEntry
                  placeholder="Required for a live workspace"
                />
                <Button primary onPress={() => void connect(accessKey || undefined)}>
                  Open workspace
                </Button>
                <Text style={[s.small, { marginTop: 15 }]}>
                  Local workspaces open without a key. Make sure your OpenMuse server is running at{" "}
                  {API_URL}.
                </Text>
              </Card>
            )}
          </View>
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}
/** External auth mode: no key field. Navigates once to a validated sign-in target, else shows a fixed notice. */
function ExternalSignIn({ url, retry }: { url: string | null; retry: () => void }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const target = safeSignInTarget(url, apiConfig.signInOrigins);
  const navigated = useRef(false);
  const canNavigate = target !== null && Platform.OS === "web" && typeof window !== "undefined";
  useEffect(() => {
    if (canNavigate && !navigated.current) {
      navigated.current = true;
      window.location.assign(target);
    }
  }, [canNavigate, target]);
  if (canNavigate) return <ActivityIndicator color={theme.link} />;
  return (
    <Card style={{ width: "100%" }}>
      <Text style={s.text}>Sign-in is not configured.</Text>
      <Button onPress={retry}>Try again</Button>
    </Card>
  );
}
function WorkspaceApp({
  token,
  manager,
  cfg,
  onAuthCallbackUrl,
}: {
  token: string;
  manager?: SessionManager;
  cfg?: NativeConfig;
  onAuthCallbackUrl?: (url: string) => void;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const api = useMemo(() => new MuseApi(token), [token]);
  const [workspace, setWorkspace] = useState<Workspace>();
  const [section, setSection] = useState<Section>("chat");
  const [detail, setDetail] = useState<Detail>();
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState<{ id: number; text: string }>();
  const [offline, setOffline] = useState(false);
  const [reconnectEpoch, setReconnectEpoch] = useState(0);
  const [locked, setLocked] = useState(false);
  const [pushPrompt, setPushPrompt] = useState<"hidden" | "ask" | "busy">("hidden");
  const [biometricOn, setBiometricOn] = useState(false);
  const [pushStatus, setPushStatus] = useState("unknown");
  const foreground = useRef(createForegroundTracker({ now: () => Date.now() }));
  const awaySince = useRef<number | null>(null);
  const biometricCaps = useRef({ enabled: false, hasHardware: false, enrolled: false });
  const pushShown = useRef(false);
  const refresh = useCallback(async () => {
    const snapshot = await api.request<Workspace>("/api/workspace");
    setWorkspace(snapshot);
    setError("");
  }, [api]);
  useEffect(() => {
    void refresh().catch((e) => setError(String(e)));
  }, [refresh]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (!nativeMode || !manager) {
        if (state === "active") void refresh().catch((e) => setError(String(e)));
        return;
      }
      if (state !== "active" && state !== "background" && state !== "inactive") return;
      const decision = foreground.current.onChange(state);
      if (state !== "active") {
        if (awaySince.current === null) awaySince.current = Date.now();
        return;
      }
      const awayMs = awaySince.current === null ? 0 : Date.now() - awaySince.current;
      awaySince.current = null;
      void (async () => {
        if (decision.refresh) await refresh().catch((e) => setError(String(e)));
        await manager.ensureFresh().catch(() => {});
        if (decision.reconnect) setReconnectEpoch((n) => n + 1);
        if (shouldLock({ ...biometricCaps.current, awayMs })) setLocked(true);
      })();
    });
    return () => listener.remove();
  }, [refresh, manager]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = useCallback(
    (next: Section) =>
      setSection(next === "today" ? "chat" : next === "connections" ? "apps" : next),
    [],
  );
  const open = useCallback((next: Detail) => setDetail(next), []);
  const close = useCallback(() => setDetail(undefined), []);
  const ask = useCallback((text: string) => {
    setPrompt({ id: Date.now(), text });
    setSection("chat");
  }, []);
  useEffect(() => {
    if (!nativeMode) return;
    return subscribeConnectivity((event) => {
      setOffline(event.isConnected === false || event.isInternetReachable === false);
    });
  }, []);
  useEffect(() => {
    if (!nativeMode) return;
    void (async () => {
      try {
        const [caps, flag] = await Promise.all([
          biometricCapabilities(),
          readSecureString(BIOMETRIC_KEY),
        ]);
        biometricCaps.current = {
          enabled: flag === "1",
          hasHardware: caps.hasHardware,
          enrolled: caps.enrolled,
        };
        setBiometricOn(flag === "1");
      } catch {
        /* the lock stays off */
      }
    })();
  }, []);
  useEffect(() => {
    if (!nativeMode || !cfg) return;
    const handleRoute = (route: Route) => {
      if (route.kind === "task") open({ type: "task", taskId: route.taskId });
      else if (route.kind === "chat") navigate("chat");
      else if (route.kind === "approval") {
        open({ type: "notifications" });
        setToast(APPROVAL_UNAVAILABLE);
      } else if (route.kind === "authCallback") onAuthCallbackUrl?.(route.url);
      else open({ type: "notifications" });
    };
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const route = parseDeepLink(url, cfg);
      if (route) handleRoute(route);
    });
    void Linking.getInitialURL().then((url) => {
      if (!url) return;
      const route = parseDeepLink(url, cfg);
      if (route) handleRoute(route);
    });
    const stopPush = addNotificationTapListener(handleRoute);
    return () => {
      subscription.remove();
      stopPush();
    };
  }, [cfg, navigate, onAuthCallbackUrl, open]);
  useEffect(() => {
    if (!nativeMode || !workspace || pushShown.current) return;
    pushShown.current = true;
    void readSecureString(PUSH_SNOOZE_KEY)
      .then((snoozed) => {
        const at = snoozed === null ? NaN : Number(snoozed);
        if (!snoozed || !Number.isFinite(at) || Date.now() - at > PUSH_SNOOZE_MS)
          setPushPrompt("ask");
      })
      .catch(() => {});
  }, [workspace]);
  const turnOnPush = useCallback(async () => {
    setPushPrompt("busy");
    try {
      const registration = await registerForPush();
      setPushStatus(
        registration.status === "registered"
          ? `registered:${registration.kind}`
          : registration.status,
      );
      if (registration.status === "registered") {
        await api.request(
          "/api/native/push-token",
          { kind: registration.kind, token: registration.token },
          "POST",
        );
      }
    } catch {
      setPushStatus("unavailable");
    }
    setPushPrompt("hidden");
  }, [api]);
  const snoozePush = useCallback(async () => {
    await writeSecureString(PUSH_SNOOZE_KEY, String(Date.now())).catch(() => {});
    setPushPrompt("hidden");
  }, []);
  const toggleBiometric = useCallback(async (next: boolean) => {
    setBiometricOn(next);
    biometricCaps.current.enabled = next;
    await writeSecureString(BIOMETRIC_KEY, next ? "1" : "0").catch(() => {});
  }, []);
  if (!workspace)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 18,
        }}
      >
        <Mascot size={56} />
        {error ? (
          <>
            <ErrorNotice error={error} />
            <Button onPress={() => void refresh().catch((e) => setError(String(e)))}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <ActivityIndicator color={theme.link} />
            <Text style={s.muted}>Opening your workspace…</Text>
          </>
        )}
      </SafeAreaView>
    );
  return (
    <>
      {nativeMode ? <OfflineBanner offline={offline} /> : null}
      <WorkspaceContext.Provider
        value={{
          workspace,
          api,
          section,
          navigate,
          refresh,
          open,
          close,
          notify: setToast,
          ask,
          offline,
        }}
      >
        <AgentWorkspaceProvider>
          <ComputerDraftProvider key={token}>
            <ThreadsProvider>
              <WorkspaceShell
                detail={detail}
                toast={toast}
                clearToast={() => setToast("")}
                error={error}
                prompt={prompt}
                reconnectEpoch={nativeMode ? reconnectEpoch : undefined}
              />
            </ThreadsProvider>
          </ComputerDraftProvider>
        </AgentWorkspaceProvider>
      </WorkspaceContext.Provider>
      {nativeMode && manager && cfg ? (
        <NativeSettingsPanel
          manager={manager}
          cfg={cfg}
          api={api}
          offline={offline}
          pushStatus={pushStatus}
          pushPrompt={pushPrompt}
          onTurnOnPush={() => void turnOnPush()}
          onSnoozePush={() => void snoozePush()}
          biometricOn={biometricOn}
          onToggleBiometric={(next: boolean) => void toggleBiometric(next)}
          locked={locked}
          onUnlocked={() => setLocked(false)}
          onSignOut={() => void manager.signOut()}
        />
      ) : null}
    </>
  );
}
function WorkspaceShell({
  detail,
  toast,
  clearToast,
  error,
  prompt,
  reconnectEpoch,
}: {
  detail?: Detail;
  toast: string;
  clearToast: () => void;
  error: string;
  prompt?: { id: number; text: string };
  reconnectEpoch?: number;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { workspace, section, navigate, open } = useWorkspace();
  const { data } = useAgentWorkspace();
  const {
    selection,
    visited,
    mainId,
    loading: threadsLoading,
    error: threadsError,
    retry: retryThreads,
    enabled: richThreads,
  } = useMuseThread();
  const [threadsOpen, setThreadsOpen] = useState(false);
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const pending =
    (data?.notifications.filter((n) => !n.read).length || 0) +
    workspace.actions.filter((a) => a.status === "awaiting_review").length;
  const activeTask =
    data?.tasks.find(
      (task) => task.status === "waiting_approval" || task.status === "waiting_input",
    ) || data?.tasks.find((task) => task.status === "running");
  const agentName = data?.identity.name || brandName(workspace.runtime, apiConfig);
  const status = activeTask
    ? activeTask.status === "waiting_approval"
      ? `Ready to review · ${activeTask.title}`
      : activeTask.status === "waiting_input"
        ? `Needs your input · ${activeTask.title}`
        : activeTask.plan.find((step) => step.status === "running")?.title || activeTask.title
    : data?.tasks.some((task) => task.status === "queued")
      ? "Picking up your next task…"
      : "Here when you need me";
  const title = titles[section] || titles.apps;
  const Screen =
    section === "mail"
      ? MailScreen
      : section === "calendar"
        ? CalendarScreen
        : section === "browser"
          ? BrowserScreen
          : section === "files"
            ? FilesScreen
            : section === "activity"
              ? AgentActivityScreen
              : section === "ideas"
                ? IdeasScreen
                : section === "goals"
                  ? GoalsScreen
                  : AppsScreen;
  const utility = ["mail", "calendar", "browser", "files"].includes(section);
  return (
    <>
      <WorkspaceTools />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.background }}
        edges={["top", "bottom"]}
      >
        <View style={{ flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" }}>
          <View
            style={{
              height: desktop ? 146 : 122,
              paddingTop: desktop ? 14 : 2,
              marginHorizontal: 20,
            }}
          >
            <View style={{ position: "absolute", left: 0, top: 16 }}>
              <IconButton
                icon={Menu}
                label="Open conversations and menu"
                onPress={() => setThreadsOpen(true)}
              />
            </View>
            <View pointerEvents="box-none" style={{ alignItems: "center", gap: 1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${agentName} activity and approvals`}
                onPress={() => navigate("activity")}
                style={({ pressed }) => ({
                  alignItems: "center",
                  maxWidth: "70%",
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Mascot size={desktop ? 58 : 49} variant={data?.identity.avatar} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.foreground,
                    letterSpacing: -0.4,
                  }}
                >
                  {agentName}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, color: theme.mutedForeground, marginBottom: 6 }}
                >
                  {status}
                </Text>
              </Pressable>
              {section === "chat" && <ComputerEntry />}
            </View>
            <View style={{ position: "absolute", right: 0, top: 16 }}>
              <IconButton
                icon={Bell}
                label={`Notifications, ${pending} unread or pending`}
                onPress={() => open({ type: "notifications" })}
              />
              {pending > 0 && (
                <View
                  pointerEvents="none"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 4,
                    position: "absolute",
                    top: 7,
                    right: 9,
                    backgroundColor: theme.link,
                  }}
                />
              )}
            </View>
          </View>
          <View style={{ flex: 1, minHeight: 0 }}>
            {section !== "chat" && (
              <ScrollView
                key={section}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: desktop ? 42 : 22, paddingBottom: 28 }}
                keyboardShouldPersistTaps="handled"
              >
                {utility && (
                  <Button
                    small
                    style={{ alignSelf: "flex-start", marginBottom: 18 }}
                    onPress={() => navigate("apps")}
                  >
                    Back to Apps
                  </Button>
                )}
                <Text style={[s.title, { fontSize: 25, marginBottom: 22 }]}>{title?.title}</Text>
                <ErrorNotice error={error} />
                <Screen />
              </ScrollView>
            )}
            <View
              style={{
                display: section === "chat" ? "flex" : "none",
                flex: 1,
                paddingHorizontal: desktop ? 42 : 17,
              }}
            >
              <AgentStatus />
              {richThreads ? (
                <>
                  <ErrorNotice error={threadsError} />
                  {threadsError ? (
                    <Button onPress={retryThreads}>Retry main chat</Button>
                  ) : threadsLoading ? (
                    <ActivityIndicator color={theme.link} />
                  ) : null}
                  {!threadsLoading && selection.id !== mainId && (
                    <Text style={[s.small, { textAlign: "center", marginBottom: 8 }]}>
                      Side chat
                    </Text>
                  )}
                  {visited.map((thread) => (
                    <View
                      key={thread.id}
                      style={{ display: selection.id === thread.id ? "flex" : "none", flex: 1 }}
                    >
                      <ChatScreen
                        thread={thread}
                        active={section === "chat" && selection.id === thread.id}
                        prompt={selection.id === thread.id ? prompt : undefined}
                        reconnectEpoch={reconnectEpoch}
                      />
                    </View>
                  ))}
                </>
              ) : (
                <ChatScreen
                  prompt={prompt}
                  active={section === "chat"}
                  reconnectEpoch={reconnectEpoch}
                />
              )}
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: 22,
              paddingTop: 10,
              paddingBottom: desktop ? 22 : 7,
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                maxWidth: 370,
                padding: 5,
                backgroundColor: theme.card,
                borderRadius: 40,
                shadowColor: theme.scrim,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.07,
                shadowRadius: 18,
                elevation: 3,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              {visibleNav(nav, workspace.runtime).map((item) => {
                const active = section === item.id || (item.id === "apps" && utility);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="tab"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active }}
                    onPress={() => navigate(item.id)}
                    style={{
                      flex: 1,
                      height: 47,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? theme.secondary : "transparent",
                      borderRadius: 28,
                    }}
                  >
                    <item.icon size={23} strokeWidth={1.8} color={theme.foreground} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        {!!toast && (
          <View
            pointerEvents="box-none"
            style={{ position: "absolute", bottom: 94, left: 20, right: 20, alignItems: "center" }}
          >
            <View
              style={[
                s.row,
                {
                  gap: 10,
                  padding: 14,
                  backgroundColor: theme.foreground,
                  borderRadius: 20,
                  maxWidth: 560,
                },
              ]}
            >
              <Check size={16} color={theme.card} />
              <Text style={{ color: theme.card, fontSize: 13, flexShrink: 1 }}>{toast}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
                onPress={clearToast}
              >
                <X size={16} color={theme.card} />
              </Pressable>
            </View>
          </View>
        )}
        {threadsOpen && <ThreadsSheet onClose={() => setThreadsOpen(false)} />}
        {detail && (
          <Details
            key={
              detail.type === "task"
                ? detail.taskId
                : detail.type === "file"
                  ? detail.file.id
                  : detail.type === "surface"
                    ? detail.surface.id
                    : detail.type === "browser"
                      ? detail.browser.id
                      : detail.type === "mail"
                        ? detail.mail.id
                        : detail.type === "review"
                          ? detail.action.id
                          : detail.type === "email"
                            ? JSON.stringify(detail.draft)
                            : detail.type === "event"
                              ? detail.event?.id || "event-new"
                              : detail.type
            }
            detail={detail}
          />
        )}
      </SafeAreaView>
    </>
  );
}

/** Native-mode root and settings panel (IOM-12 Step 11). Only rendered when AUTH_MODE is native. */

function NativeModeRoot() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const cfg = useMemo(
    () =>
      nativeConfigFromEnv({
        EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
        EXPO_PUBLIC_API_PREFIX: process.env.EXPO_PUBLIC_API_PREFIX,
        EXPO_PUBLIC_AUTH_MODE: process.env.EXPO_PUBLIC_AUTH_MODE,
        EXPO_PUBLIC_APP_SCHEME: process.env.EXPO_PUBLIC_APP_SCHEME,
        EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
        EXPO_PUBLIC_STORE_URL: process.env.EXPO_PUBLIC_STORE_URL,
      }),
    [],
  );
  const devicePlatform = Platform.OS === "ios" ? "ios" : "android";
  const manager = useMemo<SessionManager | null>(() => {
    if (!cfg) return null;
    return createSessionManager({ store: secureStore, cfg, platform: devicePlatform });
  }, [cfg, devicePlatform]);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!manager) return;
    void ensureFreshInstall(secureStore)
      .catch(() => {})
      .then(() => manager.restore())
      .catch(() => {});
  }, [manager]);
  useEffect(() => {
    if (!manager) return;
    setApiHooks({
      onUnauthorized: () => manager.onUnauthorized(),
      onUnsupportedVersion: () => manager.onUnsupportedVersion(),
    });
    return () => setApiHooks({});
  }, [manager]);
  if (!cfg || !manager) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: theme.background,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Card style={{ width: "100%", maxWidth: 420 }}>
            <Text style={s.text}>Sign-in is not configured.</Text>
          </Card>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NativeAuthGate
        manager={manager}
        cfg={cfg}
        callbackUrl={callbackUrl}
        onCallbackConsumed={() => setCallbackUrl(null)}
      >
        {(token) => (
          <CopilotKitProvider
            runtimeUrl={`${API_URL}${apiPath("/api/copilotkit")}`}
            headers={{
              Authorization: `Bearer ${token}`,
              ...nativeHeaders({ apiVersion: 1, appVersion: cfg.appVersion }, devicePlatform),
            }}
          >
            <WorkspaceApp
              token={token}
              manager={manager}
              cfg={cfg}
              onAuthCallbackUrl={setCallbackUrl}
            />
          </CopilotKitProvider>
        )}
      </NativeAuthGate>
    </SafeAreaProvider>
  );
}

function NativeSettingsPanel({
  manager,
  cfg,
  api,
  offline,
  pushStatus,
  pushPrompt,
  onTurnOnPush,
  onSnoozePush,
  biometricOn,
  onToggleBiometric,
  locked,
  onUnlocked,
  onSignOut,
}: {
  manager: SessionManager;
  cfg: NativeConfig;
  api: MuseApi;
  offline: boolean;
  pushStatus: string;
  pushPrompt: "hidden" | "ask" | "busy";
  onTurnOnPush: () => void;
  onSnoozePush: () => void;
  biometricOn: boolean;
  onToggleBiometric: (next: boolean) => void;
  locked: boolean;
  onUnlocked: () => void;
  onSignOut: () => void;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [renderState, setRenderState] = useState(() => manager.state());
  useEffect(() => manager.subscribe(() => setRenderState(manager.state())), [manager]);
  const session =
    renderState.kind === "signedIn"
      ? { publicId: renderState.publicId, expiresAtMs: renderState.expiresAtMs }
      : null;
  return (
    <>
      <View style={{ position: "absolute", right: 16, top: 64 }}>
        <IconButton
          icon={Settings}
          label="Native settings"
          onPress={() => setPanelOpen((v) => !v)}
        />
      </View>
      {panelOpen ? (
        <View style={{ position: "absolute", top: 116, left: 20, right: 20 }}>
          <Card>
            <Text style={s.text}>Native settings</Text>
            <View style={[s.row, { justifyContent: "space-between", alignItems: "center" }]}>
              <Text style={s.text}>Lock with Face ID / fingerprint</Text>
              <Switch
                value={biometricOn}
                onValueChange={onToggleBiometric}
                accessibilityLabel="Lock with Face ID / fingerprint"
              />
            </View>
            {__DEV__ ? (
              <Diagnostics
                cfg={cfg}
                api={api}
                platform={Platform.OS === "ios" ? "ios" : "android"}
                session={session}
                offline={offline}
                pushStatus={pushStatus}
              />
            ) : null}
          </Card>
        </View>
      ) : null}
      {pushPrompt !== "hidden" ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 90 }}>
          <PushPrompt
            onTurnOn={onTurnOnPush}
            onNotNow={onSnoozePush}
            busy={pushPrompt === "busy"}
          />
        </View>
      ) : null}
      {locked ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <BiometricLock onUnlocked={onUnlocked} onSignOut={onSignOut} />
        </View>
      ) : null}
    </>
  );
}
