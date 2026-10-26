/** Revocable device session: restore, single-flight renew, revocation, sign-out. */

import { parseTokenResponse } from "./auth-flow";
import type { NativeConfig } from "./config";
import { AuthError } from "./errors";
import { parseStoredSession, type StoredSession, type TokenStore } from "./token-store";

export type SessionState =
  | { kind: "restoring" }
  | { kind: "signedOut"; reason: "none" | "revoked" | "expired" | "denied" }
  | { kind: "signingIn" }
  | { kind: "signedIn"; expiresAtMs: number; publicId: string }
  | { kind: "unsupportedVersion" };

export interface SessionManager {
  state(): SessionState;
  subscribe(listener: () => void): () => void;
  getToken(): string | null;
  restore(): Promise<void>;
  completeSignIn(session: StoredSession): Promise<void>;
  ensureFresh(): Promise<void>;
  onUnauthorized(): Promise<void>;
  onUnsupportedVersion(): void;
  signOut(): Promise<void>;
}

export interface SessionManagerDeps {
  store: TokenStore;
  cfg: NativeConfig;
  platform: "ios" | "android";
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  now?: () => number;
  renew?: (token: string) => Promise<StoredSession | null>;
  logout?: (token: string) => Promise<void>;
}

const RENEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function sameState(a: SessionState, b: SessionState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createSessionManager(deps: SessionManagerDeps): SessionManager {
  const now = deps.now ?? (() => Date.now());
  const fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  let current: SessionState = { kind: "restoring" };
  let token: string | null = null;
  let freshPromise: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function setState(next: SessionState): void {
    if (sameState(current, next)) return;
    current = next;
    for (const listener of [...listeners]) listener();
  }

  const defaultRenew = async (presented: string): Promise<StoredSession | null> => {
    let response: Response;
    try {
      response = await fetchImpl(`${deps.cfg.apiUrl}${deps.cfg.apiPrefix}/native/renew`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${presented}`,
          "X-Muse-Client": deps.platform,
          "X-Muse-Api-Version": String(deps.cfg.apiVersion),
          "X-Muse-App-Version": deps.cfg.appVersion,
        },
      });
    } catch {
      throw new AuthError("network");
    }
    if (response.status === 401) throw new AuthError("revoked");
    if (response.status === 426) throw new AuthError("unsupported_version");
    if (response.status === 429 || response.status >= 500) throw new AuthError("network");
    if (response.status !== 200) throw new AuthError("invalid");
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new AuthError("invalid");
    }
    if (typeof body === "object" && body !== null && (body as { renewed?: unknown }).renewed === false) {
      return null;
    }
    const session = parseTokenResponse(body);
    if (!session) throw new AuthError("invalid");
    return session;
  };

  const renew = deps.renew ?? defaultRenew;
  const logout =
    deps.logout ??
    (async (presented: string): Promise<void> => {
      try {
        await fetchImpl(`${deps.cfg.apiUrl}${deps.cfg.apiPrefix}/native/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${presented}`,
            "X-Muse-Client": deps.platform,
            "X-Muse-Api-Version": String(deps.cfg.apiVersion),
            "X-Muse-App-Version": deps.cfg.appVersion,
          },
        });
      } catch {
        /* best-effort: sign-out always clears the local session */
      }
    });

  async function clearTo(reason: "none" | "revoked" | "expired" | "denied"): Promise<void> {
    if (current.kind === "signedOut" && current.reason === reason) return;
    token = null;
    try {
      await deps.store.clear();
    } catch {
      /* a failing store still signs out in memory */
    }
    setState({ kind: "signedOut", reason });
  }

  const manager: SessionManager = {
    state: () => current,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getToken: () => (current.kind === "signedIn" ? token : null),

    restore: async (): Promise<void> => {
      let raw: unknown = null;
      try {
        raw = await deps.store.read();
      } catch {
        raw = null;
      }
      const session = parseStoredSession(raw);
      if (!session) {
        await clearTo("none");
        return;
      }
      if (session.expiresAtMs <= now()) {
        await clearTo("expired");
        return;
      }
      token = session.token;
      setState({ kind: "signedIn", expiresAtMs: session.expiresAtMs, publicId: session.publicId });
    },

    completeSignIn: async (session: StoredSession): Promise<void> => {
      await deps.store.write(session);
      token = session.token;
      setState({ kind: "signedIn", expiresAtMs: session.expiresAtMs, publicId: session.publicId });
    },

    ensureFresh: (): Promise<void> => {
      if (freshPromise) return freshPromise;
      freshPromise = (async (): Promise<void> => {
        if (current.kind !== "signedIn" || token === null) return;
        if (current.expiresAtMs - now() >= RENEW_WINDOW_MS) return;
        const presented = token;
        let renewed: StoredSession | null;
        try {
          renewed = await renew(presented);
        } catch (error) {
          if (error instanceof AuthError && error.code === "revoked") {
            await manager.onUnauthorized();
            return;
          }
          if (error instanceof AuthError && error.code === "unsupported_version") {
            manager.onUnsupportedVersion();
            return;
          }
          return;
        }
        if (renewed === null) return;
        await deps.store.write(renewed);
        token = renewed.token;
        setState({ kind: "signedIn", expiresAtMs: renewed.expiresAtMs, publicId: renewed.publicId });
      })().finally(() => {
        freshPromise = null;
      });
      return freshPromise;
    },

    onUnauthorized: async (): Promise<void> => {
      await clearTo("revoked");
    },

    onUnsupportedVersion: (): void => {
      setState({ kind: "unsupportedVersion" });
    },

    signOut: async (): Promise<void> => {
      if (token !== null) {
        const presented = token;
        try {
          await logout(presented);
        } catch {
          /* best-effort: clearing still happens */
        }
      }
      await clearTo("none");
    },
  };
  return manager;
}
