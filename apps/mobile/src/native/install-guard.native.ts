/** Reinstall hygiene: Keychain survives uninstall, so drop any stored session on first launch. */

import { File, Paths } from "expo-file-system";
import type { TokenStore } from "./token-store-core";

const MARKER = "muse-installed";

let checked = false;

/** Run once per process before restore. Clears the store only when the marker file is absent. */
export async function ensureFreshInstall(store: TokenStore): Promise<void> {
  if (checked) return;
  checked = true;
  const marker = new File(Paths.document, MARKER);
  if (marker.exists) return;
  await store.clear();
  marker.create();
  marker.write("installed");
}
