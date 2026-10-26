/** Native app configuration, read once from build-time environment. */

import { NativeConfigError } from "./errors";

export interface NativeConfig {
  authMode: "native";
  apiUrl: string;
  apiPrefix: string;
  scheme: string;
  redirectUri: string;
  clientId: "muse-native";
  apiVersion: 1;
  appVersion: string;
  storeUrl: string | null;
}

const SCHEME_RE = /^[a-z][a-z0-9+.-]{1,31}$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "127.0.0.1" || host === "10.0.2.2") return true;
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    const n = parts.map(Number);
    if (n[0] === 10) return true;
    if (n[0] === 172 && n[1]! >= 16 && n[1]! <= 31) return true;
    if (n[0] === 192 && n[1] === 168) return true;
  }
  return false;
}

export function readNativeConfig(
  env: Record<string, string | undefined>,
  opts: { dev: boolean; platform: "ios" | "android" },
): NativeConfig {
  void opts.platform;
  const rawUrl = env.EXPO_PUBLIC_API_URL;
  let apiUrl: string;
  try {
    if (!rawUrl) throw new NativeConfigError();
    const parsed = new URL(rawUrl);
    if (parsed.username || parsed.password) throw new NativeConfigError();
    if (parsed.protocol === "https:") {
      apiUrl = parsed.toString().replace(/\/+$/, "");
    } else if (parsed.protocol === "http:" && opts.dev && isLocalHostname(parsed.hostname)) {
      apiUrl = parsed.toString().replace(/\/+$/, "");
    } else {
      throw new NativeConfigError();
    }
  } catch (error) {
    if (error instanceof NativeConfigError) throw error;
    throw new NativeConfigError();
  }

  const rawPrefix = env.EXPO_PUBLIC_API_PREFIX ?? "/api";
  if (!rawPrefix.startsWith("/")) {
    throw new NativeConfigError("native api prefix must start with /");
  }
  const apiPrefix = rawPrefix;

  const scheme = env.EXPO_PUBLIC_APP_SCHEME ?? "openmuse";
  if (!SCHEME_RE.test(scheme)) {
    throw new NativeConfigError("native app scheme is not a valid custom scheme");
  }

  const appVersion = env.EXPO_PUBLIC_APP_VERSION ?? "0.0.0";
  if (!SEMVER_RE.test(appVersion)) {
    throw new NativeConfigError("native app version must be semver");
  }

  const rawStore = env.EXPO_PUBLIC_STORE_URL;
  const storeUrl = rawStore && rawStore.startsWith("https://") ? rawStore : null;

  return {
    authMode: "native",
    apiUrl,
    apiPrefix,
    scheme,
    redirectUri: `${scheme}://auth/callback`,
    clientId: "muse-native",
    apiVersion: 1,
    appVersion,
    storeUrl,
  };
}
