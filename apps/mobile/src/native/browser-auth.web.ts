/** Web sign-in: native mode never runs here. */

import { AuthError } from "./errors";

export type SignInResult = { type: "success"; url: string } | { type: "cancel" };

export async function openSignIn(_url: string, _redirectUri: string): Promise<SignInResult> {
  void _url;
  void _redirectUri;
  throw new AuthError("invalid");
}
