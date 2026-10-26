/** Web token persistence: in-memory only. The web build uses cookie mode, never this. */

import { MemoryTokenStore, type StoredSession } from "./token-store-core";

const memory = new MemoryTokenStore();

export async function readSecureSession(): Promise<StoredSession | null> {
  return memory.read();
}

export async function writeSecureSession(session: StoredSession): Promise<void> {
  return memory.write(session);
}

export async function clearSecureSession(): Promise<void> {
  return memory.clear();
}
