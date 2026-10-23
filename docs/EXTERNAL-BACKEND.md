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
| `EXPO_PUBLIC_BRAND_NAME` | unset | Replaces the visible product name; the backend can also send a brand in its workspace snapshot |

## What the backend can send

`packages/domain/src/muse-contract.ts` holds the strict zod schemas for the extra fields: `runtime.capabilities` (fifteen booleans that only hide things), `runtime.surfaces` (same-origin views), `runtime.auth`, `runtime.brand`, the plan preview and `propose_mission` result, the `approval.catalog` data, and the start and error bodies. An absent `capabilities` object hides nothing.

## Screens added

- **Plan card.** Renders the result of the `propose_mission` tool from validated data and offers one "Start this mission" button (disabled when the preview failed its checks or has expired). Anything that does not match the schema shows "Could not show this plan." and no button.
- **Approval summary.** An action of kind `approval.catalog` is shown as a read-only summary. This client does not approve or deny it; it tells the person to use the console and, when the backend lists a console view, offers a button that opens it. Approvals are decided only on the backend's own signed-in approval page.
- **Embedded view.** Backend views listed in `runtime.surfaces` open in a same-origin iframe on the web (sandbox `allow-scripts allow-same-origin`, no referrer) and as a text fallback on native. Paths are validated by `safeSurfacePath`; sign-in targets by `safeSignInTarget`. Nothing else navigates to, or frames, a URL taken from server data.

## Guards

- `node scripts/check-patch-surface.mjs`: every path changed against `origin/main` is on its allow list, and no file under `apps/mobile/src` or `apps/mobile/App.tsx` imports a web-only UI library (`@radix-ui/*`, `radix-ui`, `tailwindcss`, `next-themes`, `lucide-react`, or a scoped `robot-ui` package). `lucide-react-native` is allowed.
- `node scripts/check-private-identifiers.mjs`: added lines must not contain private product names, hosts or flag keys. This repository is public.
- `.github/workflows/external-backend.yml` runs both with lint, typecheck, tests and two web exports.

## Changed files

`apps/mobile`: `index.js`, `App.tsx`, and in `src/` `api.ts`, `api-response.ts`, `chat.tsx`, `details.tsx`, `workspace.tsx`, `agent-ui.tsx`, `screens.tsx`, `threads.tsx`; new `api-config.ts`, `capabilities.ts`, `brand.ts`, `telemetry-off.ts`, `surface-url.ts`, `plan-proposal.ts`, `approval-catalog.ts`, `plan-card.tsx`, `embedded-surface.tsx`; new tests in `test/`. `packages/domain/src/index.ts` (additive) and `muse-contract.ts`. No server, worker, computer, backend package, dependency or lockfile change.

## Syncing with upstream

On `external-backend`: `git fetch upstream` then `git rebase upstream/main`, then run both guards, `pnpm lint`, `pnpm typecheck` and `pnpm test`. Fork `main` stays a mirror of upstream and is never edited.
