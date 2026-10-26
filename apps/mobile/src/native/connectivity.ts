/** Connectivity: pure offline reducer over platform reachability events. */

export interface ConnectivityState {
  offline: boolean;
}

export interface ReachabilityEvent {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

export function reduceConnectivity(
  prev: ConnectivityState,
  event: ReachabilityEvent,
): { offline: boolean; changedToOnline: boolean } {
  const offline = event.isConnected === false || event.isInternetReachable === false;
  return { offline, changedToOnline: prev.offline && !offline };
}
