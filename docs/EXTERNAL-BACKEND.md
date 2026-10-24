# Running the client against an external backend

The client can talk to a backend other than the OpenMuse server. With none of the settings below present, behaviour is unchanged. This page lists the settings, what changed, and how to keep the branch in step with upstream. Nothing here names a particular backend.

## Environment variables

All are read as literal `process.env.EXPO_PUBLIC_*` accesses in `apps/mobile/src/api-config.ts` so the bundler can inline them.

| Variable | Default | Effect |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8787` (`http://10.0.2.2:8787` on Android); empty in external mode | Backend origin. In external mode an empty value means the page's own origin |
| `EXPO_PUBLIC_API_PREFIX` | `/api` | Replaces the leading `/api` of every request path, including the runtime URL and the upload URL. Must start with `/`; a trailing slash is removed; anything else falls back to `/api` |
| `EXPO_PUBLIC_AUTH_MODE` | `accessKey` | `external` uses a cookie session: no access-key form, no `Authorization` header, `credentials: "same-origin"` on every request. A 401 carrying a sign-in URL navigates there once (absolute `https:` URL or a same-origin path only); otherwise a fixed "Sign-in is not configured." screen is shown |
| `EXPO_PUBLIC_TELEMETRY` | on; `off` in external mode unless set | `off` sets `COPILOTKIT_TELEMETRY_DISABLED=true` and `DO_NOT_TRACK=1` before the CopilotKit packages load |
| `EXPO_PUBLIC_SIGN_IN_ORIGINS` | none | Comma-separated `https:` origins (no credentials, no path) that a sign-in redirect may name. Same-origin paths are always allowed; any other absolute URL is refused, including credential forms and mixed case |
| `EXPO_PUBLIC_EMBED_PATH_PREFIXES` | none | Comma-separated same-origin path prefixes that may be framed. With none set, no backend view is framed. Matches whole path segments |
| `EXPO_PUBLIC_BRAND_NAME` | unset | Replaces the visible product name; the backend can also send a brand in its workspace snapshot |

## What the backend can send

`packages/domain/src/muse-contract.ts` holds the strict zod schemas for the extra fields: `runtime.capabilities` (fifteen booleans that only hide things), `runtime.surfaces` (same-origin views), `runtime.auth`, `runtime.brand`, the plan preview and `propose_mission` result, the `approval.catalog` data, and the start and error bodies. An absent `capabilities` object hides nothing.

## Screens added

- **Plan card.** Renders the result of the `propose_mission` tool from validated data and offers one "Start this mission" button (disabled when the preview failed its checks or has expired). Anything that does not match the schema shows "Could not show this plan." and no button.
- **Approval summary.** An action of kind `approval.catalog` is shown as a read-only summary. This client does not approve or deny it; it tells the person to use the console and, when the backend lists a console view, offers a button that opens it. Approvals are decided only on the backend's own signed-in approval page.
- **Embedded view.** Backend views listed in `runtime.surfaces` are handled by `surfaceMode`. A `presence` view is framed on the web only when its path starts with a prefix in `EXPO_PUBLIC_EMBED_PATH_PREFIXES` (default none, so nothing is framed). The frame is sandboxed with `allow-scripts` alone: no `allow-same-origin` (it gets an opaque origin and cannot reach the page or lift its own sandbox), and no navigation, forms, popups, modals or downloads. It gets no referrer and no browser permissions. A `console` view is opened by top-level navigation, never framed; native shows a text fallback. Paths are validated by `safeSurfacePath`, sign-in targets by `safeSignInTarget`, and nothing else navigates to or frames a URL taken from server data.
- **Messages from a framed view.** The page sends the frame nothing. It accepts a message from the frame only if all of these hold (`embed-messages.ts`): the sender is this frame's own window, the origin is the opaque origin `null` (a named origin, or the page's own origin, means the sandbox is not in force), the message matches a strict schema (version 1, `ready` or `resize` with an integer height from 120 to 2000, no other field), and it carries this embed's random 128-bit nonce, which was handed to the frame in the URL fragment. Anything else is dropped without effect. A framed page gets no cookie-authenticated requests, so it must be self-contained or use these messages. Using `allow-same-origin` instead needs an independently reviewed isolation design.
- **Approvals in external mode.** Only an `approval.catalog` summary is shown, with a hand-off to the backend's own signed-in page. Any other kind, and any kind written differently (case, spaces, suffixes), shows a fixed notice. The client also refuses to send the upstream approve and deny call in this mode, in any path spelling (`sendRequest`), so no decision path remains.
- **Building.** Export with `--clear`. The workflow builds each configuration in its own job on a fresh checkout and runs `scripts/check-bundle-config.mjs`, which fails if the external bundle lacks the configured prefix or the default bundle carries it.

## Guards

- `node scripts/check-patch-surface.mjs`: every path changed against `origin/main` is on its allow list; no file under `apps/mobile/src` or `apps/mobile/App.tsx` imports a web-only UI library (`@radix-ui/*`, `radix-ui`, `tailwindcss`, `next-themes`, `lucide-react`; `lucide-react-native` is allowed); and every package imported on a line the branch adds is a declared dependency of `apps/mobile`.
- `node scripts/check-private-identifiers.mjs`: this repository is public, so added lines must not look like a credential, a URL with credentials, an internal hostname or a private network address. These checks are structural and the script holds no list of names. A protected pattern list kept outside this repository can be supplied at run time with `PRIVATE_IDENTIFIER_PATTERNS_FILE` (the workflow writes it from a secret when one is set).
- `scripts/check-bundle-config.mjs`: see Building.
- `.github/workflows/external-backend.yml` runs the guards with lint, typecheck and tests, and one export job per configuration.

## Changed files

`apps/mobile`: `index.js`, `App.tsx`, and in `src/` `api.ts`, `api-response.ts`, `chat.tsx`, `details.tsx`, `workspace.tsx`, `agent-ui.tsx`, `screens.tsx`, `threads.tsx`; new `api-config.ts`, `embed-messages.ts`, `capabilities.ts`, `brand.ts`, `telemetry-off.ts`, `surface-url.ts`, `plan-proposal.ts`, `approval-catalog.ts`, `plan-card.tsx`, `embedded-surface.tsx`; new tests in `test/`. `packages/domain/src/index.ts` (additive) and `muse-contract.ts`. No server, worker, computer, backend package, dependency or lockfile change.

## Syncing with upstream

On `external-backend`: `git fetch upstream` then `git rebase upstream/main`, then run both guards, `pnpm lint`, `pnpm typecheck` and `pnpm test`. Fork `main` stays a mirror of upstream and is never edited.
