/** Device connectivity via the community NetInfo module. */

import NetInfo from "@react-native-community/netinfo";
import type { ReachabilityEvent } from "./connectivity";

export function subscribeConnectivity(listener: (event: ReachabilityEvent) => void): () => void {
  const subscription = NetInfo.addEventListener((state) => {
    listener({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable ?? null,
    });
  });
  return () => subscription();
}
