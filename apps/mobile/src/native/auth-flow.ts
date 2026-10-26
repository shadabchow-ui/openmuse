/** Native authorization-code flow against MUSE_CLIENT_CONTRACT_V1 §10.3. */

import { z } from "zod";
import type { NativeConfig } from "./config";
import { AuthError } from "./errors";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const CODE_RE = /^[A-Za-z0-9_-]{20,100}$/;

function decodeComponent(value: string): string | null {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

/** Constant-time comparison once lengths match; different lengths never match. */
function equalState(actual: string, expected: string): boolean {
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function buildAuthorizeUrl(
  cfg: NativeConfig,
  opts: { challenge: string; state: string; label: string; platform: "ios" | "android" },
): string {
  const params = new URLSearchParams();
  params.set("client_id", cfg.clientId);
  params.set("redirect_uri", cfg.redirectUri);
  params.set("code_challenge", opts.challenge);
  params.set("code_challenge_method", "S256");
  params.set("state", opts.state);
  params.set("device_label", opts.label.slice(0, 60));
  params.set("platform", opts.platform);
  return `${cfg.apiUrl}${cfg.apiPrefix}/native/authorize?${params.toString()}`;
}

export type CallbackResult = { kind: "code"; code: string } | { kind: "denied" } | { kind: "invalid" };

export function parseCallback(url: string, expectedState: string, cfg: NativeConfig): CallbackResult {
  if (!url.startsWith(cfg.redirectUri)) return { kind: "invalid" };
  const rest = url.slice(cfg.redirectUri.length);
  if (!rest.startsWith("?")) return { kind: "invalid" };
  const seen = new Map<string, string>();
  for (const pair of rest.slice(1).split("&")) {
    const cut = pair.indexOf("=");
    const rawKey = cut < 0 ? pair : pair.slice(0, cut);
    const rawValue = cut < 0 ? "" : pair.slice(cut + 1);
    const key = decodeComponent(rawKey);
    const value = decodeComponent(rawValue);
    if (key === null || value === null) return { kind: "invalid" };
    if (seen.has(key)) return { kind: "invalid" };
    seen.set(key, value);
  }
  const state = seen.get("state");
  if (seen.get("error") === "access_denied" && state !== undefined && equalState(state, expectedState)) {
    return { kind: "denied" };
  }
  if (state === undefined || !equalState(state, expectedState)) return { kind: "invalid" };
  const code = seen.get("code");
  if (!code || !CODE_RE.test(code)) return { kind: "invalid" };
  return { kind: "code", code };
}

const tokenResponseSchema = z.object({
  token: z.string().min(40).max(200),
  expiresAt: z.string().datetime(),
  sessionPublicId: z.string().uuid(),
});

export interface ExchangedSession {
  token: string;
  expiresAtMs: number;
  publicId: string;
}

/** Validates a `native/token` or `native/renew` success body; null when unusable. */
export function parseTokenResponse(body: unknown): ExchangedSession | null {
  const parsed = tokenResponseSchema.safeParse(body);
  if (!parsed.success) return null;
  const expiresAtMs = Date.parse(parsed.data.expiresAt);
  if (!Number.isFinite(expiresAtMs)) return null;
  return { token: parsed.data.token, expiresAtMs, publicId: parsed.data.sessionPublicId };
}

export async function exchangeCode(
  fetchFn: FetchLike,
  cfg: NativeConfig,
  opts: { code: string; verifier: string; platform: "ios" | "android" },
): Promise<ExchangedSession> {
  let response: Response;
  try {
    response = await fetchFn(`${cfg.apiUrl}${cfg.apiPrefix}/native/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Muse-Client": opts.platform,
        "X-Muse-Api-Version": String(cfg.apiVersion),
        "X-Muse-App-Version": cfg.appVersion,
      },
      body: JSON.stringify({ code: opts.code, code_verifier: opts.verifier, redirect_uri: cfg.redirectUri }),
    });
  } catch {
    throw new AuthError("network");
  }
  if (response.status === 400) throw new AuthError("expired");
  if (response.status === 426) throw new AuthError("unsupported_version");
  if (response.status === 429 || response.status >= 500) throw new AuthError("network");
  if (response.status !== 200) throw new AuthError("invalid");
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AuthError("invalid");
  }
  const session = parseTokenResponse(body);
  if (!session) throw new AuthError("invalid");
  return session;
}
