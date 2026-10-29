import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  PresenceView,
  RobotSummary,
} from "../../../../packages/domain/src/muse-robot-contract";
import { apiConfig } from "../api";
import { useWorkspace } from "../workspace";
import { type HandoffKey, isSafeHandoffUrl } from "./handoff";
import { openWeb } from "./open-web";
import { createPoller } from "./poller";
import { createWebLink, engageStop, getPresence, getSummary, type RobotRequest } from "./robot-api";
import { initialStopState, type StopState, stopReducer } from "./stop-flow";

export type ResourceStatus = "loading" | "ready" | "unavailable" | "error";

export interface RobotSettings {
  biometricOn: boolean;
  onToggleBiometric: (next: boolean) => void;
  notificationsOn: boolean;
  onToggleNotifications: (next: boolean) => void;
  onSignOut?: () => void;
  diagnostics?: ReactNode;
}

export interface RobotContextValue {
  summary: RobotSummary | null;
  summaryStatus: ResourceStatus;
  summaryError: string;
  presence: PresenceView | null;
  presenceStatus: ResourceStatus;
  presenceError: string;
  offline: boolean;
  stop: StopState;
  openStop: () => void;
  cancelStop: () => void;
  confirmStop: () => Promise<void>;
  dismissStopError: () => void;
  refreshSummary: () => Promise<void>;
  refreshPresence: () => Promise<void>;
  setStageVisible: (visible: boolean) => void;
  openHandoff: (key: HandoffKey) => Promise<void>;
  settings: RobotSettings;
}

const defaultSettings: RobotSettings = {
  biometricOn: false,
  onToggleBiometric: () => {},
  notificationsOn: false,
  onToggleNotifications: () => {},
};

const RobotContext = createContext<RobotContextValue | null>(null);

export function useRobot(): RobotContextValue {
  const value = useContext(RobotContext);
  if (!value) throw new Error("Robot console is unavailable");
  return value;
}

const HANDBACK_FAILED = "Could not open the console. Try again.";

export function RobotProvider({
  children,
  enabled = true,
  settings = defaultSettings,
}: {
  children: ReactNode;
  enabled?: boolean;
  settings?: RobotSettings;
}) {
  const { api, offline, notify } = useWorkspace();
  const request = useMemo<RobotRequest>(
    () => (path, body, method) => api.request(path, body, method),
    [api],
  );
  const [summary, setSummary] = useState<RobotSummary | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<ResourceStatus>("loading");
  const [summaryError, setSummaryError] = useState("");
  const [presence, setPresence] = useState<PresenceView | null>(null);
  const [presenceStatus, setPresenceStatus] = useState<ResourceStatus>("loading");
  const [presenceError, setPresenceError] = useState("");
  const [stageVisible, setStageVisible] = useState(false);
  const [stop, dispatch] = useReducer(stopReducer, initialStopState);
  const sending = useRef(false);
  const dev = typeof __DEV__ !== "undefined" && __DEV__;

  const summaryPoller = useMemo(
    () =>
      createPoller({
        fetchOnce: async () => {
          const result = await getSummary(request);
          if (result.ok) {
            setSummary(result.value);
            setSummaryStatus("ready");
            setSummaryError("");
          } else if (result.kind === "unavailable") {
            setSummaryStatus("unavailable");
            setSummaryError("");
          } else {
            setSummaryStatus("error");
            setSummaryError(result.message);
          }
        },
        intervalMs: 15000,
        maxBackoffMs: 60000,
        isActive: () => enabled && !offline,
      }),
    [request, enabled, offline],
  );

  const presencePoller = useMemo(
    () =>
      createPoller({
        fetchOnce: async () => {
          const result = await getPresence(request);
          if (result.ok) {
            setPresence(result.value);
            setPresenceStatus("ready");
            setPresenceError("");
          } else if (result.kind === "unavailable") {
            setPresenceStatus("unavailable");
            setPresenceError("");
          } else {
            setPresenceStatus("error");
            setPresenceError(result.message);
          }
        },
        intervalMs: 5000,
        maxBackoffMs: 60000,
        isActive: () => enabled && !offline && stageVisible,
      }),
    [request, enabled, offline, stageVisible],
  );

  useEffect(() => {
    if (!enabled) return;
    summaryPoller.start();
    return () => summaryPoller.stop();
  }, [summaryPoller, enabled]);

  useEffect(() => {
    if (!enabled || !stageVisible) return;
    presencePoller.start();
    return () => presencePoller.stop();
  }, [presencePoller, enabled, stageVisible]);

  useEffect(() => {
    if (summary) dispatch({ type: "summary", engaged: summary.stop.engaged });
  }, [summary]);

  const confirmStop = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    dispatch({ type: "confirm" });
    try {
      const result = await engageStop(request);
      dispatch(result.ok ? { type: "sent" } : { type: "sendFailed" });
    } catch {
      dispatch({ type: "sendFailed" });
    } finally {
      sending.current = false;
      void summaryPoller.refreshNow();
    }
  }, [request, summaryPoller]);

  const openHandoff = useCallback(
    async (key: HandoffKey) => {
      const result = await createWebLink(request, key);
      if (!result.ok || !isSafeHandoffUrl(result.value.url, apiConfig.apiUrl, dev)) {
        notify(HANDBACK_FAILED);
        return;
      }
      await openWeb(result.value.url);
    },
    [request, notify, dev],
  );

  const value = useMemo<RobotContextValue>(
    () => ({
      summary,
      summaryStatus,
      summaryError,
      presence,
      presenceStatus,
      presenceError,
      offline,
      stop,
      openStop: () => dispatch({ type: "open" }),
      cancelStop: () => dispatch({ type: "cancel" }),
      confirmStop,
      dismissStopError: () => dispatch({ type: "dismissError" }),
      refreshSummary: () => summaryPoller.refreshNow(),
      refreshPresence: () => presencePoller.refreshNow(),
      setStageVisible,
      openHandoff,
      settings,
    }),
    [
      summary,
      summaryStatus,
      summaryError,
      presence,
      presenceStatus,
      presenceError,
      offline,
      stop,
      confirmStop,
      summaryPoller,
      presencePoller,
      openHandoff,
      settings,
    ],
  );

  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>;
}
