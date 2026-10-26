/** Native error types with fixed, non-secret messages. */

export type AuthErrorCode =
  | "denied"
  | "invalid"
  | "expired"
  | "network"
  | "unsupported_version"
  | "revoked";

const AUTH_MESSAGES: Record<AuthErrorCode, string> = {
  denied: "This sign-in link expired. Try again.",
  invalid: "That request could not be read.",
  expired: "This sign-in link expired. Try again.",
  network: "Something went wrong.",
  unsupported_version: "Update the app to continue.",
  revoked: "You were signed out. Sign in again.",
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? AUTH_MESSAGES[code]);
    this.name = "AuthError";
    this.code = code;
  }
}

export class NativeConfigError extends Error {
  constructor(message = "native builds need an absolute https gateway URL") {
    super(message);
    this.name = "NativeConfigError";
  }
}
