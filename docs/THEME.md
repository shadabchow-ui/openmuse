# OpenMuse client theme (DS-05): token-driven Light / Dark / System

Public fork wording only. No private identifiers. Layout, component tree and
navigation are unchanged; only colour values and style construction changed.

## Token source (DS-01, committed into the fork)

- `apps/mobile/src/theme/generated/open-muse.ts` — byte copy of the DS-01
  generated fork output (active set `pearl-a-pure`), plus `radiusPx`/`spacePx`.
- Manifest: `ibot.tokens.manifest/0.1`, version `0.1.0`, active
  `pearl-a-pure`, output `dist/open-muse.ts` sha256
  `2388b37214c8de8b1c60ef06f873c25054ca461496a2ef935e7a2be91e4cfb5f`.
  Only the version is recorded here; no private source path is vendored.
- Light scheme = the fork`s pre-existing colours verbatim (pixel parity).
  Dark scheme = DS-01 token dark roles only. No value is invented in either
  scheme: every light value already shipped in the fork, every dark value is
  a DS-01 token value.

## Role map (old `colors` key -> theme role)

210 `colors.` references in 24 files and 114 colour literals in 17 files were
each read. Uniform keys map 1:1; split keys are listed with the split.

| Old key (light value) | Default role | Light value kept | Dark value (token) | Split uses |
|---|---|---|---|---|
| canvas `#FCFCFC` | background | `#FCFCFC` | `#0b0b0c` | none |
| card `#FFFFFF` | card | `#FFFFFF` | `#121214` | unread-card highlight (`agent-ui` read/unread) keeps card-vs-info contrast |
| text `#11191C` | foreground | `#11191C` | `#f3f3f4` | inverted banner bg (`OfflineBanner`) -> foreground (stays inverted in dark); user-bubble and primary-button text -> onPrimary (see pairs) |
| muted `#697176` | mutedForeground | `#697176` | `#a3a3ab` | typing dots bg (`chat`) -> mutedForeground (dots stay visible in dark); button label `blueDark`-vs-muted step state stays mutedForeground when idle |
| line `#EEEEF0` | border | `#EEEEF0` | `#26262b` | web `PdfReader` placeholder bg -> border (neutral wash, no border semantics) |
| blue `#C8E7FF` | primary | `#C8E7FF` | `#f3f3f4` | timeline rail (`agent-ui` borderLeft) -> primary (accent rail, both schemes) |
| blueDark `#1473C8` | link | `#1473C8` | `#f3f3f4` | none: every use is an icon, indicator, input affordance or text link, all of which take the link role in both schemes |
| sky `#EDF7FD` | info | `#EDF7FD` | `#26262a` | avatar-selected and unread-row highlights pair with canvas/card, unchanged logic |
| green `#E3F3E8` | success | `#E3F3E8` | `#3eb27c` | children text on success washes -> onSuccess (see pairs); status-dot fill keeps success |
| lavender `#F0EEFA` | accent | `#F0EEFA` | `#26262a` | children text on accent washes uses default foreground (readable both schemes) |
| orange `#FDF0DF` | warning | `#FDF0DF` | `#de963c` | children text on warning wash -> onWarning (see pairs) |
| danger `#AA4A45` | destructive | `#AA4A45` | `#f0605a` | run-status text (`computer-workspace`) keeps destructive; Button danger text keeps destructive |

## On-wash text pairs (new roles, no invented values)

Wash backgrounds turn saturated in dark, so descendants that used default
text need an explicit on-wash role. Each pair`s light value is the text
colour the site already used (light pixels byte-identical); each dark value
is the matching DS-01 token on-role.

| Pair | Light (fork value kept) | Dark (token value) | Used for |
|---|---|---|---|
| primaryForeground (existing) | `#11191C` (old button/bubble text) | `#0b0b0c` (dark primaryForeground) | primary Button text/icons, user chat-bubble text |
| onSuccess | `#11191C` (old card text) | `#0b0b0c` (dark successForeground) | children of success (green) wash Cards |
| onWarning | `#11191C` (old card text) | `#0b0b0c` (dark warningForeground) | children of warning (orange) wash Card |
| onInfo | `#11191C` (old card text) | `#f3f3f4` (dark infoForeground) | children of info (sky) wash Cards where muted text would wash out |
| onAccent | `#11191C` (old card text) | `#f3f3f4` (dark accentForeground) | children of accent (lavender) wash Cards where needed |
| successText | `#248258` (fork run-status literal) | `#3eb27c` (dark success value) | succeeded-status text and availability dot on default surfaces (a standalone saturated text colour needs its own pair; neither wash nor on-wash role fits both schemes) |

`mutedForeground` text (`#697176` -> `#a3a3ab`) stays readable on info,
accent and warning dark washes, so most secondary text is untouched; only
success-wash secondary text is lifted to onSuccess (contrast-checked).

`Chip` takes a `tone` (`info | success | accent | warning`) instead of a raw
tint colour and pairs it with ink per scheme: mutedForeground everywhere,
except success/warning tones in dark, which use onSuccess/onWarning (the
resolved theme carries its `scheme`, so the pairing stays declarative).
Light chip text is byte-identical gray in all tones.

## Literal colours (all converted to roles, none added)

`#FFF`/`#FFFFFF` -> card (offline-banner text uses background to stay
inverted); near-white surfaces `#F0F1F2`, `#F1F3F4`, `#F0EFF2`, `#FAFAFB`,
`#F3F5F6`, `#EEF0F2` -> secondary (all within a few percent of `#F1F2F3`;
tiny light shifts reported in AC-3); `#EEEEF0` -> border; `#E2E4E7`
(code bg) -> muted with foreground code text; `#9CB5C5` (idle send icon)
and `#949B9F` (placeholder) -> mutedForeground; `#248258` (run-status
and notice text) -> success; `#57AD85`/`#ACB0B5` (availability dot) ->
success / mutedForeground; `#6AAEE0` (progress fill) -> link; `#FC2359`
(PDF tile) -> destructive with destructiveForeground icon; `#E9F5FC`
(icon wash) -> info; `#C7E4F9` (focused input border) -> ring;
`#EEF0F2` (idle bubble) -> secondary; `#D8DBDE` (sheet handle) -> border;
chat shadow `#18384B` -> scrim; error banner `#FBEFED` -> `errorBackground` with
`errorForeground` text (light values byte-identical to the old wash; dark follows the `destructive` role). Nav/tab bar active pill `#F0F1F2` -> `secondary`; toast text/icon on the dark toast surface -> `card`.

## Settings storage (step 3 note)

No non-sensitive settings storage module exists in the client (only
SecureStore token stores, the wrong layer for a UX preference), so no
existing module could be reused and no package was added. The choice lives
in `ThemeProvider` state (default `system`, follows the OS), persisted
through the injectable `ThemeChoiceStorage` seam. The default store is
file-backed and platform-appropriate with no new dependencies: on web it
reads and writes `localStorage` (guarded try/catch for private contexts);
on native it reuses the existing SecureStore string helpers under a
namespaced `appearance.choice.v1` key carrying no session or credential
material. `MemoryThemeChoiceStorage` remains for tests and injection.
`useTheme()` returns the context theme, defaulting to light
with no provider mounted. The Apps screen settings area exposes a
Light / Dark / System radio group that persists the choice through this
seam.

## Scheme behaviour

- `choice: light | dark | system` (default `system`); system scheme from
  the `Appearance` API (react-native-web supports it for the export check; all hooks run unconditionally, availability is probed in an effect).
- `userInterfaceStyle` in `app.json` set to `automatic` (the one-line
  config change); no other config change.
- Deprecated `colors` alias keeps the exact old light values; a test pins
  equality with the pre-change object.

## Scheme-invariant artwork (not UI chrome)

Brand/artwork colours are preserved byte-identical in both schemes and live
in `apps/mobile/src/theme/artwork.ts` (inside the exempt theme dir), never
as literals in chrome code:

- Mascot disc palette: sky `#ECF5FA`, sand `#FAF0DF`, lilac `#F1ECF9`.
- Finance-tracker card artwork: base `#080B10`, gradient `#281066` /
  `#163BBF` / `#148CE8`, copy `#D4DCFC`, tiles `#1D2025`, labels `#A4A7AD`,
  sub-labels `#7E8289`, saved amount `#58D3AE`.
## App.tsx entrypoint (completed under the 2026-10-27 scope amendment)

The amendment added `apps/mobile/App.tsx` to the write set for the step-3/4
theme provider boundary, static colour/style conversion, and appearance
preference integration. Status after this job:

- The root renders `<ThemeProvider><AppContent /></ThemeProvider>`; every screen
  component consumes theme roles via `useTheme()` + `makeStyles(theme)`.
- No `colors.` references and no colour literals remain in `App.tsx`.
- The nav bar, toast, activity indicator and status text all render from
  theme roles in both schemes.
- The deprecated `s` snapshot and `colors` re-export were removed from
  `ui.tsx` once nothing imported them (verified by grep); the canonical
  alias lives on in `theme/legacy-colors.ts` with its pinning test.
- Navigation, layout, copy and component structure are unchanged (colour
  and style construction only). The only added UI is the Light / Dark /
  System radio group in the existing settings area, which is the required
  user-facing control for the persisted appearance preference.
