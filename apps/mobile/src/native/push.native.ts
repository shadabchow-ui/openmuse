/** Push registration (not delivery): permission, device token, tap routing. */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { routeForNotification } from "./push-routing";
import type { Route } from "./deep-link";

export type PushRegistration =
  | { status: "registered"; kind: "apns" | "fcm"; token: string }
  | { status: "denied" | "unavailable" };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Asks permission only when called — never at launch. Never blocks sign-in or chat. */
export async function registerForPush(): Promise<PushRegistration> {
  try {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return { status: "denied" };
    const pushToken = await Notifications.getDevicePushTokenAsync();
    if (!pushToken.data) return { status: "unavailable" };
    return {
      status: "registered",
      kind: Platform.OS === "ios" ? "apns" : "fcm",
      token: pushToken.data,
    };
  } catch {
    return { status: "unavailable" };
  }
}

/** Taps route through the closed route set; also delivers a cold-start tap once. */
export function addNotificationTapListener(listener: (route: Route) => void): () => void {
  let stopped = false;
  void Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (stopped || !response) return;
      const route = routeForNotification(response.notification.request.content.data);
      if (route) listener(route);
    })
    .catch(() => {});
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = routeForNotification(response.notification.request.content.data);
    if (route) listener(route);
  });
  return () => {
    stopped = true;
    subscription.remove();
  };
}
