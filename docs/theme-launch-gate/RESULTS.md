# Local theme launch gate results

Composite: **FAIL**. Local sandboxed Chromium with existing in-memory workspace fixtures only. This is computed-style/viewport evidence, not device testing, independent review or a production-readiness claim.

96 cells: 20 PASS, 68 FAIL, 8 NOT_RUN. Both actual negative controls failed as expected. No product styling or native navigation was edited.

| Surface | Preference | Width | Result |
|---|---|---:|---|
| chat | light | 1280 | FAIL |
| activity | light | 1280 | PASS |
| ideas | light | 1280 | PASS |
| goals | light | 1280 | PASS |
| apps | light | 1280 | FAIL |
| threads | light | 1280 | FAIL |
| settings | light | 1280 | FAIL |
| mail | light | 1280 | PASS |
| calendar | light | 1280 | FAIL |
| browser | light | 1280 | FAIL |
| files | light | 1280 | PASS |
| robot | light | 1280 | NOT_RUN |
| chat | dark | 1280 | FAIL |
| activity | dark | 1280 | FAIL |
| ideas | dark | 1280 | FAIL |
| goals | dark | 1280 | FAIL |
| apps | dark | 1280 | FAIL |
| threads | dark | 1280 | FAIL |
| settings | dark | 1280 | FAIL |
| mail | dark | 1280 | FAIL |
| calendar | dark | 1280 | FAIL |
| browser | dark | 1280 | FAIL |
| files | dark | 1280 | FAIL |
| robot | dark | 1280 | NOT_RUN |
| chat | system-light | 1280 | FAIL |
| activity | system-light | 1280 | PASS |
| ideas | system-light | 1280 | PASS |
| goals | system-light | 1280 | PASS |
| apps | system-light | 1280 | FAIL |
| threads | system-light | 1280 | FAIL |
| settings | system-light | 1280 | FAIL |
| mail | system-light | 1280 | PASS |
| calendar | system-light | 1280 | FAIL |
| browser | system-light | 1280 | FAIL |
| files | system-light | 1280 | PASS |
| robot | system-light | 1280 | NOT_RUN |
| chat | system-dark | 1280 | FAIL |
| activity | system-dark | 1280 | FAIL |
| ideas | system-dark | 1280 | FAIL |
| goals | system-dark | 1280 | FAIL |
| apps | system-dark | 1280 | FAIL |
| threads | system-dark | 1280 | FAIL |
| settings | system-dark | 1280 | FAIL |
| mail | system-dark | 1280 | FAIL |
| calendar | system-dark | 1280 | FAIL |
| browser | system-dark | 1280 | FAIL |
| files | system-dark | 1280 | FAIL |
| robot | system-dark | 1280 | NOT_RUN |
| chat | light | 390 | FAIL |
| activity | light | 390 | PASS |
| ideas | light | 390 | PASS |
| goals | light | 390 | PASS |
| apps | light | 390 | FAIL |
| threads | light | 390 | FAIL |
| settings | light | 390 | FAIL |
| mail | light | 390 | PASS |
| calendar | light | 390 | FAIL |
| browser | light | 390 | FAIL |
| files | light | 390 | PASS |
| robot | light | 390 | NOT_RUN |
| chat | dark | 390 | FAIL |
| activity | dark | 390 | FAIL |
| ideas | dark | 390 | FAIL |
| goals | dark | 390 | FAIL |
| apps | dark | 390 | FAIL |
| threads | dark | 390 | FAIL |
| settings | dark | 390 | FAIL |
| mail | dark | 390 | FAIL |
| calendar | dark | 390 | FAIL |
| browser | dark | 390 | FAIL |
| files | dark | 390 | FAIL |
| robot | dark | 390 | NOT_RUN |
| chat | system-light | 390 | FAIL |
| activity | system-light | 390 | PASS |
| ideas | system-light | 390 | PASS |
| goals | system-light | 390 | PASS |
| apps | system-light | 390 | FAIL |
| threads | system-light | 390 | FAIL |
| settings | system-light | 390 | FAIL |
| mail | system-light | 390 | PASS |
| calendar | system-light | 390 | FAIL |
| browser | system-light | 390 | FAIL |
| files | system-light | 390 | PASS |
| robot | system-light | 390 | NOT_RUN |
| chat | system-dark | 390 | FAIL |
| activity | system-dark | 390 | FAIL |
| ideas | system-dark | 390 | FAIL |
| goals | system-dark | 390 | FAIL |
| apps | system-dark | 390 | FAIL |
| threads | system-dark | 390 | FAIL |
| settings | system-dark | 390 | FAIL |
| mail | system-dark | 390 | FAIL |
| calendar | system-dark | 390 | FAIL |
| browser | system-dark | 390 | FAIL |
| files | system-dark | 390 | FAIL |
| robot | system-dark | 390 | NOT_RUN |

Findings: light Computer/offline text ratio4.435 below4.5; default computed dark focus outlines can be about1.02 against dark controls, below3. These are local computed-style findings, not a physical-display certification. Browser auto-outline painting and assistive technology still need independent validation.

Robot is native-only in the external-auth web navigation: all8Robot cells NOT_RUN. Screenshots and full measurements remain in private execution evidence. Native devices, data-bearing production states, other browsers and release are NOT_RUN.

The literal inventory includes the root App.tsx, source TSX and emitted CSS. It is an inventory, not a blanket exemption for existing colors. Immutable accepted source baseline and import/declared-package guards remain active.
