/** Session token storage: interface plus the in-memory implementation for web/test. */

import { z } from "zod";

export interface StoredSession {
  token: string;
  expiresAtMs: number;
  publicId: string;
}

export interface TokenStore {
  read(): Promise<StoredSession | null>;
  write(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryTokenStore implements TokenStore {
  private current: StoredSession | null = null;

  async read(): Promise<StoredSession | null> {
    return this.current === null ? null : { ...this.current };
  }

  async write(session: StoredSession): Promise<void> {
    this.current = { ...session };
  }

  async clear(): Promise<void> {
    this.current = null;
  }
}

const storedSessionSchema = z.object({
  token: z.string().min(1),
  expiresAtMs: z.number().int().nonnegative(),
  publicId: z.string().min(1),
});

/** Accepts a parsed object or a JSON string; anything else is not a session. */
export function parseStoredSession(value: unknown): StoredSession | null {
  let candidate: unknown = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return null;
    }
  }
  const parsed = storedSessionSchema.safeParse(candidate);
  if (!parsed.success) return null;
  return { token: parsed.data.token, expiresAtMs: parsed.data.expiresAtMs, publicId: parsed.data.publicId };
}
