/** Web push: unavailable. Push registration is a native-mode feature. */

import type { Route } from "./deep-link";

export type PushRegistration =
  | { status: "registered"; kind: "apns" | "fcm"; token: string }
  | { status: "denied" | "unavailable" };

export async function registerForPush(): Promise<PushRegistration> {
  return { status: "unavailable" };
}

export function addNotificationTapListener(_listener: (route: Route) => void): () => void {
  void _listener;
  return () => {};
}
