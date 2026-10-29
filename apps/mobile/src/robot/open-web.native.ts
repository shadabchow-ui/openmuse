import { Linking } from "react-native";

/**
 * Opens a validated one-time console link in the system browser.
 *
 * The native build uses the platform URL handler, not an in-app web view, so
 * the console session it mints belongs to the owner's browser.
 */
export async function openWeb(url: string): Promise<void> {
  await Linking.openURL(url);
}
