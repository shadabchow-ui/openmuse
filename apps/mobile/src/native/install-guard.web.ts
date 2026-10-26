/** Web install guard: no-op. Web builds never hold a native session. */

import type { TokenStore } from "./token-store-core";

export async function ensureFreshInstall(_store: TokenStore): Promise<void> {
  void _store;
}
