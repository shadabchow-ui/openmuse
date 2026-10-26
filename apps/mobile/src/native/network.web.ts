/** Web connectivity via online/offline events. */

import type { ReachabilityEvent } from "./connectivity";

export function subscribeConnectivity(listener: (event: ReachabilityEvent) => void): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => {};
  }
  const online = (): void => listener({ isConnected: true, isInternetReachable: true });
  const offline = (): void => listener({ isConnected: false, isInternetReachable: false });
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  return () => {
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
  };
}
