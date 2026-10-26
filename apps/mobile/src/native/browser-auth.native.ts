/** System-browser sign-in: never a WebView, never a password field in the app. */

import { modelName } from "expo-device";
import * as WebBrowser from "expo-web-browser";

/** Best-effort device label for the authorize URL; never a secret. */
export async function deviceLabel(): Promise<string> {
  try {
    return modelName ?? "Phone";
  } catch {
    return "Phone";
  }
}

WebBrowser.maybeCompleteAuthSession();

export type SignInResult = { type: "success"; url: string } | { type: "cancel" };

export async function openSignIn(url: string, redirectUri: string): Promise<SignInResult> {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri, {
    preferEphemeralSession: false,
  });
  if (result.type === "success") return { type: "success", url: result.url };
  return { type: "cancel" };
}
