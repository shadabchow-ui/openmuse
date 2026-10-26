/** System-browser sign-in: never a WebView, never a password field in the app. */

import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export type SignInResult = { type: "success"; url: string } | { type: "cancel" };

export async function openSignIn(url: string, redirectUri: string): Promise<SignInResult> {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri, {
    preferEphemeralSession: false,
  });
  if (result.type === "success") return { type: "success", url: result.url };
  return { type: "cancel" };
}
