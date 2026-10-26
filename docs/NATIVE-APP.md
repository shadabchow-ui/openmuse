# Native app (iOS and Android)

The same OpenMuse client code runs as a real iOS/Android app against the iBot
gateway with a native-grade session. The web build is unchanged: native code
lives in `apps/mobile/src/native/**` and `.native` / `.web` shims, and the web
build never runs native mode.

## Build-time environment

| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_AUTH_MODE` | `native` | Anything else keeps the web sign-in behaviour. |
| `EXPO_PUBLIC_API_URL` | `https://gateway.example.test` | Absolute `https` URL. `http` only for local hosts in dev builds. |
| `EXPO_PUBLIC_API_PREFIX` | `/api` | Must start with `/`. |
| `EXPO_PUBLIC_APP_SCHEME` | `openmuse` | Custom URL scheme for sign-in callback and deep links. |
| `EXPO_PUBLIC_APP_VERSION` | `0.1.0` | Semver; informational, never used for authorization. |
| `EXPO_PUBLIC_STORE_URL` | `https://apps.example.test/openmuse` | Optional; shown when the gateway reports the app is too old. |
| `EXPO_PUBLIC_TELEMETRY` | `off` | Always off; no analytics or crash-reporting SDK is added. |

## Sign-in sequence

1. The app opens the system browser at `native/authorize` with PKCE
   (`S256`), a 32-character state, and the device label.
2. The person signs in and consents on the gateway page (a WebView or password
   field in the app is never used).
3. The gateway redirects to `<scheme>://auth/callback?code=…&state=…`; the app
   accepts the callback only while a sign-in attempt is pending in memory.
4. The app exchanges the code for a session token (`native/token`) and stores
   the token only in the OS secure store (Keychain on iOS with
   `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, Keystore-backed storage on Android).
5. The token is restored on launch, renewed while it is fresh, and cleared on
   sign-out or revocation. A `401` signs out with "You were signed out. Sign in
   again." A `426` blocks with "Update the app to continue."

Every gateway request carries `Authorization: Bearer`, `X-Muse-Client`,
`X-Muse-Api-Version: 1`, and `X-Muse-App-Version`.

## Secure-store policy

The secure store holds one session token, an optional biometric flag, a push
snooze timestamp, and an install marker. No conversation or memory data is
persisted. The token is never logged, displayed, copied, or put in a URL.
Reinstalling deletes any stored session (Keychain survives uninstall).

## Lifecycle and offline

Returning from the background refreshes the workspace. Returning after 30
seconds away also reconnects the chat through the existing history path; a
chat reply is tied to the open connection, so a reply started before the app
was suspended shows as stopped text. When offline, a banner shows
"You're offline. Reconnect to send messages." and sending is disabled. Failed
messages are never resent implicitly.

## Push registration states

`unknown` (before first check), `registered:apns` / `registered:fcm`,
`denied`, `unavailable` (for example Android without Firebase configuration).
Registration never blocks sign-in or chat. Tapping a notification opens the
matching screen; anything unrecognized opens notifications at most.

## Deep links

| Link | Opens |
|---|---|
| `<scheme>://task/<uuid>` | The task |
| `<scheme>://approval/<uuid>` | Notifications, with unavailable guidance (below) |
| `<scheme>://chat` | Chat |
| `<scheme>://notifications` | Notifications |
| `<scheme>://auth/callback…` | Completes a pending sign-in, otherwise ignored |

Approval hand-off is not available in this app: approval entries are
read-only summaries, there is no approval button or hand-off link, and the app
says "Approval hand-off isn't available in this app. Open Robot OS to
decide." Approve and release stay in the Robot OS console.

## Biometric lock

An optional convenience lock (Face ID / fingerprint) over the device-held
token, toggled in Native settings (default off). It never authorizes anything:
approvals remain server-side. Failing or disabling it never traps the person;
a Sign out link always clears the session.

## Diagnostics (development builds only)

Native settings shows a development-only Diagnostics card: gateway
compatibility (`native/compat`), the signed-in session summary (label and
expiry, never the token), connectivity, and push status. The streaming probe
POSTs `[mock:slow]` to the runtime and is enabled only against a local server;
against any other host it reads "Streaming probe runs only against a local
server". Device installation, Keychain/Keystore behaviour, system-browser
redirect capture, push permission, streaming on a device, and biometric
prompts are `NOT_RUN` here; IOM-16 covers them on devices.

## Known limits

- A chat reply is tied to the open connection; suspending mid-reply records
  the reply as stopped, and the person sees the partial text after returning.
  Long work (missions) keeps running on the server.
- The theme module carries the fork's current colours in the shape the
  generated tokens will have; dark repeats light until the design system
  supplies dark values. The app's appearance is unchanged.
- Native settings live in the app's native section: the shared menu detail has
  no renderer in this fork, so the biometric switch and diagnostics row sit in
  the native settings card instead.
