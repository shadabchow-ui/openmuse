# Native robot console

The iOS and Android apps render the robot's server-side view models. They do
not derive robot state locally: health, stop state, presence, spend and
approval counts all come from the gateway. The phone holds the current response
in memory only.

## Screens

| Screen | View model | Notes |
|---|---|---|
| Overview | `GET robot/summary`, `GET presence` | Name, age, health, spend line, counts, presence stage, page links |
| Memory | `GET robot/memory`, `POST robot/memory/:id/forget`, `GET robot/deletion-jobs/:id` | Forget asks for confirmation and polls the deletion job at most ten times, three seconds apart |
| Skills | `GET robot/skills` | Read only; changes open the console |
| Devices and health | `GET robot/devices`, `POST robot/devices/:id/lost` | Robot devices, not the owner's phones; mark-lost asks for confirmation |
| Spend and trust | `GET robot/spend` | Read only; ceilings and consumption; changing limits opens the console |
| Phone sessions | `GET native/sessions`, `POST native/sessions/:publicId/revoke`, `POST native/logout` | This phone is marked; removing another phone asks for confirmation |
| More on the web | `POST native/web-link` | The fixed sixteen temporary exceptions |
| Settings | IOM-12 stores and push registration | Biometric lock, notifications, sign out, development diagnostics |

The layout is a single column on phones and a split view (page list left,
content right) from 900 points. The six native tabs keep 44-point targets at
320 points (6 x 44 = 264).

## STOP semantics

The STOP bar is present on every native screen. Engaging is deliberate: open
the sheet, then press "Stop now". While the request is in flight the action is
disabled, so a double tap cannot send twice. The bar shows "Stop requested…"
until the summary reports `engaged: true`, then "Robot is stopped" with the
time and a "Resume in console" link. A release seen from the web returns the
bar to its running state.

The phone has no release control. Resuming is a console action reached through
the `killswitch` web hand-off.

## Web hand-off

`handoff.ts` holds the sixteen fixed targets from the client contract. Each
item states that it opens the console in the browser. The app asks the gateway
for a one-time link, accepts it only when it is an origin-matching
`/native/web-link/consume` URL with exactly one well-formed `code`, and opens
it in the system browser. The URL and its code are never displayed, logged or
stored.

Approvals stay read-only. The overview shows the pending count and a read-only
summary list; the app offers no approve, deny or decide control and mints no
approval hand-off link. The owner uses Robot OS on the web.

## Polling

The summary poller runs every 15 seconds. The presence poller runs every 5
seconds only while the stage is mounted and the app is active and online. Both
keep one request in flight, back off exponentially to 60 seconds after an
error, reset after a success, and stop on unmount. A manual refresh coalesces
with an in-flight request.

## Accessibility

Every interactive control has a role and a label and a 44-point touch target.
The stage is a polite live region, announces state changes, and exposes the
server's screen-reader text. Reduced motion removes the pulse and progress
animation; the static frame is fully legible without motion.

## Theme

Every colour comes from `useTheme()`. The robot files contain no literal
colour, and `robot-no-literal-colours.test.ts` fails if one is added.

## Fixtures

The nine server fixtures were copied verbatim from the IOM-13 output under
`docs/robot/integration/openmuse/fixtures/robot/`. Their SHA-256 values at copy
time:

```
400f0ff421dcbf210e8a78eb62ba6d3d06fa6a012edfcb9ed9d1ab2934538377  deletion-job.json
e93dde40272ba38cbd5280b4692328d33689701b260117635e9e04a378540e22  devices.json
e2c87a4b2668b347115cf834a65aa284c6dc3bcabb9af77a243c3b43617dfe92  dna.json
1bcb3a5015642fd5669518209b0b5d4b4d0c45403563c5546e8a8f6cc49d36f8  memory-forget.json
2d94fd725ff015f04847b5749a6f465a5b432e7a6a0d732969993a784f543210  memory.json
63f6b87a9ec5adaaef7b06e2f28f80a0a44fff637ed1631db503b1c1fe1e6bc0  skills.json
d0a787320d03d0583d62ff61a617a4dd7976926e73999000ff4582c2ae0313d6  spend.json
609c1902f71585acee603cb30765c47c854650f9fda509709d08b2269a3821c0  stop.json
bdf2de684fb04ccbe935f60fb41bd9ae01f7851fa063f13fced8f52a730ffd62  summary.json
```

The seven presence examples are written by this job: the six presence states
plus the no-event answer. To refresh the server fixtures, copy the nine files
again and update the hashes here; do not edit a fixture to make a schema pass.
