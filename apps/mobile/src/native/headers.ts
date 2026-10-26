/** Exact request headers every native gateway request carries. */

import type { NativeConfig } from "./config";

export function nativeHeaders(
  cfg: Pick<NativeConfig, "apiVersion" | "appVersion">,
  platform: "ios" | "android",
): Record<string, string> {
  return {
    "X-Muse-Client": platform,
    "X-Muse-Api-Version": String(cfg.apiVersion),
    "X-Muse-App-Version": cfg.appVersion,
  };
}
