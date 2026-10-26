/** Secure-store token persistence: Keychain / Keystore, this device only, no backup. */

import * as SecureStore from "expo-secure-store";
import { parseStoredSession, type StoredSession } from "./token-store-core";

const KEY = "muse.session.v1";
const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function readSecureSession(): Promise<StoredSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY, OPTIONS);
    if (!raw) return null;
    return parseStoredSession(raw);
  } catch {
    return null;
  }
}

export async function writeSecureSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session), OPTIONS);
}

export async function clearSecureSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY, OPTIONS);
  } catch {
    /* clearing is idempotent */
  }
}
