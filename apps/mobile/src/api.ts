import { Platform } from "react-native";
import {
  apiConfig,
  apiPath,
  ExternalAuthRequired,
  makeApiConfig,
  openSession,
  sendRequest,
} from "./api-config";

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

export class MuseApi {
  constructor(readonly token: string) {}
  async request<T>(path: string, body?: unknown, method?: string): Promise<T> {
    return sendRequest<T>(
      apiConfig,
      API_URL,
      (input, init) => fetch(input, init),
      this.token,
      path,
      body,
      method,
    );
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
