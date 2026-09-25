# 28 — Accessibility, Language and UX States

Scope: role-based UI states, keyboard/screen reader, languages, error/empty/stale/partial states, browser matrix.
References: PRD NFR-05; DPDPA Act §5(3), §6(3) (English or Eighth Schedule languages); acceptance BUILD-21, UX-01.
All cases start **NOT_RUN**. A quantitative conformance claim requires a separate assessment.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-487 | Every surface in every role | Signed-out, member, auditor, admin, principal | 1) Load each UI surface | Correct access/error/empty/stale/partial states | P0 | UX | BUILD-21 |
| TC-488 | Browser matrix | Windows, macOS, Linux browsers in supported list | 1) Run key journeys | Consistent behaviour and layout | P1 | UX | UX-01 |
| TC-489 | Eighth Schedule language rendering | Notices in Devanagari, Tamil, Bengali, Urdu (RTL), etc. as configured | 1) Render | Correct scripts, direction and fonts from local assets | P1 | UX | Act §6(3) |
| TC-490 | Plain-language outcome messages | Error/partial states | 1) Review wording | Understandable; no raw codes only; no false success | P1 | UX | NFR-05 |
| TC-491 | Colour not sole indicator | Status badges | 1) Check with greyscale | Status readable without colour | P2 | UX | NFR-05 |
| TC-492 | Zoom and reflow | 200% and 400% zoom | 1) Use portal | No loss of content/function | P2 | UX | NFR-05 |
| TC-493 | Timezone display | Users in different timezones | 1) View deadlines | Correct, labelled times | P1 | UX | NFR-05 |
| TC-494 | Mobile portal | Small screens | 1) Complete consent/request | Fully usable | P1 | UX | FR-M13-03 |
