import { ApiError, readApiPayload } from "./api-response";

export interface ApiConfig {
  apiUrl: string;
  prefix: string;
  authMode: "accessKey" | "external";
  telemetryOff: boolean;
  brandName: string | undefined;
}

type Env = Record<string, string | undefined>;

export function makeApiConfig(env: Env, isAndroid = false): ApiConfig {
  const authMode = env.EXPO_PUBLIC_AUTH_MODE === "external" ? "external" : "accessKey";
  const prefixValue = env.EXPO_PUBLIC_API_PREFIX?.trim() ?? "";
  const prefix = prefixValue.startsWith("/") ? prefixValue.replace(/\/+$/, "") || "/api" : "/api";
  const configuredUrl = env.EXPO_PUBLIC_API_URL;
  const apiUrl = (
    configuredUrl ||
    (authMode === "external" ? "" : isAndroid ? "http://10.0.2.2:8787" : "http://localhost:8787")
  ).replace(/\/$/, "");
  const telemetry = env.EXPO_PUBLIC_TELEMETRY;
  const brandName = env.EXPO_PUBLIC_BRAND_NAME?.trim();
  return {
    apiUrl,
    prefix,
    authMode,
    telemetryOff: telemetry === "off" || (authMode === "external" && !telemetry),
    brandName: brandName ? brandName : undefined,
  };
}

/** `/api/x` becomes `${prefix}/x`; any other path is returned unchanged. */
export function mapApiPath(config: ApiConfig, path: string): string {
  if (path === "/api") return config.prefix;
  return path.startsWith("/api/") ? `${config.prefix}${path.slice(4)}` : path;
}

// Metro inlines only literal `process.env.EXPO_PUBLIC_*` accesses, so each one is spelled out.
export const apiConfig: ApiConfig = makeApiConfig(
  {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_API_PREFIX: process.env.EXPO_PUBLIC_API_PREFIX,
    EXPO_PUBLIC_AUTH_MODE: process.env.EXPO_PUBLIC_AUTH_MODE,
    EXPO_PUBLIC_TELEMETRY: process.env.EXPO_PUBLIC_TELEMETRY,
    EXPO_PUBLIC_BRAND_NAME: process.env.EXPO_PUBLIC_BRAND_NAME,
  },
  false,
);

export const apiPath = (path: string) => mapApiPath(apiConfig, path);

/** Thrown in external auth mode when the server answers 401; `signInUrl` is untrusted until `safeSignInTarget`. */
export class ExternalAuthRequired extends Error {
  constructor(readonly signInUrl: string | null) {
    super("Sign-in is required.");
    this.name = "ExternalAuthRequired";
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Fetch options shared by every request. External mode sends no bearer token and only same-origin credentials. */
export function requestInit(
  config: ApiConfig,
  token: string,
  method: string,
  body?: unknown,
): RequestInit {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  return {
    method,
    headers: {
      ...(config.authMode === "external" ? {} : { Authorization: `Bearer ${token}` }),
      ...(body === undefined || isForm ? {} : { "Content-Type": "application/json" }),
    },
    ...(config.authMode === "external" ? { credentials: "same-origin" as const } : {}),
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  };
}

export async function openSession(
  config: ApiConfig,
  apiUrl: string,
  accessKey: string | undefined,
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): Promise<{ token: string; mode: "sample" | "live" }> {
  const external = config.authMode === "external";
  const response = await fetchImpl(`${apiUrl}${mapApiPath(config, "/api/session")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(external ? { credentials: "same-origin" as const } : {}),
    body: JSON.stringify(external ? {} : { accessKey }),
  });
  try {
    return await readApiPayload<{ token: string; mode: "sample" | "live" }>(
      response,
      "Could not open your workspace.",
    );
  } catch (error) {
    if (external && error instanceof ApiError && error.status === 401) {
      const body = error.body as { signInUrl?: unknown } | null;
      throw new ExternalAuthRequired(
        body && typeof body.signInUrl === "string" ? body.signInUrl : null,
      );
    }
    throw error;
  }
}
