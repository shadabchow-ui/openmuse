import { Platform } from "react-native";
import {
  apiConfig,
  apiPath,
  ExternalAuthRequired,
  makeApiConfig,
  openSession,
  sendRequest,
} from "./api-config";
import { ApiError } from "./api-response";
import { nativeHeaders } from "./native/headers";

export { apiConfig, apiPath, ExternalAuthRequired };

// Same literal env accesses as `apiConfig` so Metro can inline them; only the Android default differs.
export const API_URL = makeApiConfig(
  {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_API_PREFIX: process.env.EXPO_PUBLIC_API_PREFIX,
    EXPO_PUBLIC_AUTH_MODE: process.env.EXPO_PUBLIC_AUTH_MODE,
    EXPO_PUBLIC_TELEMETRY: process.env.EXPO_PUBLIC_TELEMETRY,
    EXPO_PUBLIC_BRAND_NAME: process.env.EXPO_PUBLIC_BRAND_NAME,
  },
  Platform.OS === "android",
).apiUrl;

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? "0.0.0";

export interface ApiHooks {
  onUnauthorized?: () => void | Promise<void>;
  onUnsupportedVersion?: () => void;
}

let apiHooks: ApiHooks = {};

/** Native-mode hooks for 401/426. Unset hooks are no-ops, so other modes are unchanged. */
export function setApiHooks(next: ApiHooks): void {
  apiHooks = next;
}

function nativeFetch(input: string, init?: RequestInit): Promise<Response> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  return fetch(input, {
    ...init,
    headers: {
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
      ...nativeHeaders({ apiVersion: 1, appVersion: APP_VERSION }, platform),
    },
  });
}

const passthroughFetch = (input: string, init?: RequestInit): Promise<Response> => fetch(input, init);

export class MuseApi {
  constructor(readonly token: string) {}
  async request<T>(path: string, body?: unknown, method?: string): Promise<T> {
    const native = AUTH_MODE === "native";
    try {
      return await sendRequest<T>(
        apiConfig,
        API_URL,
        native ? nativeFetch : passthroughFetch,
        this.token,
        path,
        body,
        method,
      );
    } catch (error) {
      if (native && error instanceof ApiError) {
        if (error.status === 401) await apiHooks.onUnauthorized?.();
        else if (error.status === 426) apiHooks.onUnsupportedVersion?.();
      }
      throw error;
    }
  }
  url(path: string) {
    return path.startsWith("http") ? path : `${API_URL}${apiPath(path)}`;
  }
}

export async function createSession(
  accessKey?: string,
): Promise<{ token: string; mode: "sample" | "live" }> {
  return openSession(apiConfig, API_URL, accessKey);
}
