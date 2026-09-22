# M12 Notice Management — Act §5 languages and change classification (FR-M12-03, FR-M12-04)

**Status: built, applied and qualified on the `codex-a00` profile.**

This pass began as a vocabulary tidy-up and turned into a status correction.

## What prompted it

A check of whether the build had drifted from its DPDP Act frame found the code
overwhelmingly faithful: the rights vocabulary is the Act's (`ACCESS`,
`CORRECTION`, `ERASURE`, `GRIEVANCE`, `NOMINATION`), representation is
`NOMINATION | GUARDIAN` per §§9 and 14, and there are zero occurrences of
`data subject`, `legitimate interest`, `portability`, `DPIA` or
`supervisory authority` anywhere in the tree. The incidents module refuses to
ship statutory hours at all — *"Every deadline comes from a rule the customer
recorded and activated, naming its own source"* — which is what the master's
DPDP legal baseline instructs.

Two things did not match, and the second was the serious one.

## Finding 1: a status that was not true

`M12 Notice Management` was recorded as `IMPLEMENTED_SANDBOX_SUBSET` with the
limitation "Single language; no notice translation."

But FR-M12-04 reads *"English-first administration must not erase required
principal language choices"* and FR-M12-03 requires classifying a notice change
as *"editorial, translation or material scope change"* with a stored
consent decision. Neither had any code — a grep for `EDITORIAL`,
`MATERIAL_SCOPE`, `preferred_language` returned nothing. "Single language" was
not a depth limit inside a built requirement; it was the negation of one.

Two of M12's four requirements were being counted as built. The register entry
now says so in as many words, and the earlier 89% completion figure was
overstated by two requirements as a result.

A scan of the other 21 implemented modules did not find the same pattern: their
limitations describe depth limits within built behaviour ("no real vendor
connectors", "no workflow designer"), which is what the status means.

## Finding 2: one enum in another regime's words

`ProcessorRole` carried `JOINT_CONTROLLER` and `INDEPENDENT_CONTROLLER`. The
DPDP Act has Data Fiduciaries and Data Processors and no "controller" at all.
Renamed to `JOINT_FIDUCIARY` and `INDEPENDENT_FIDUCIARY`, which are grounded in
§2(i) — a Data Fiduciary determines purpose and means *"alone or in conjunction
with other persons"*, which is where the joint case comes from — and §2(k).

## What was built

| Requirement | How it is met |
|---|---|
| FR-M12-04 | `NoticeLanguage` is English plus the twenty-two Eighth Schedule languages, the set Act §5 permits, closed in the contract and again by a database check. A principal records their own choice and only they may set it. Everywhere a notice is presented, `requested_language` and `served_language` are separate fields and `available_in_requested_language` is true only when they match — serving English to somebody who asked for Tamil is expressible; reporting that as having met the request is refused at parse time. |
| FR-M12-03 | A change is classified `EDITORIAL`, `TRANSLATION` or `MATERIAL_SCOPE_CHANGE`. An editorial fix or translation cannot carry a consent decision; a material change cannot be recorded without one; a translation must name the version it translates and differ from it in language. `affected_grants` is counted from the consent records at the moment of the decision, and `affected_grants_were_counted` is a literal `true`, so the figure can never be asserted. One classification per version, append-only. |

The `language` column on `app.notice_versions` is **generated** from the notice
document rather than stored beside it, so the two cannot drift.

## Evidence

Commit under test: working tree on `prototype/claude/v1-modules-wp04-wp25`,
parent `22c16b9`, profile `codex-a00`, contract 0.13.0.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | clean, exit 0 |
| Lint | `npm run lint` | 0 findings, exit 0 |
| Unit tests | `npm test` | **137 passed, 0 failed** (9 of them M12) |
| Contract check | `npm run contracts:check` | 141 route examples validated, contract 0.13.0 |
| Hygiene | `npm run hygiene:check` | 0 findings, 2979 files examined |
| Tracking | `npm run tracking:check` | 33 capability modules validated; no results promoted |
| Migrations | `npm run db:migrate` | `0030_notice_languages`, then `0031_generated_language_immutability` |
| M12 integration | `npm run test:languages` | **19 assertions, 0 failures**, run twice against the same database |
| Consent regression | `npm run test:consent` | PASS, 0 failures |
| Processor regression | `npm run test:processors` | 35 assertions, 0 failures — confirms the role rename against real rows |
| Core regression | `npm run test:regression` | 70 assertions, 0 failures |
| Web smoke | `npm run web:smoke` | PASS |
| Runtime image | `npm run runtime:build` | PASS from the committed source |

## What running it actually found

**The generated column broke every notice publication, and the schema caught
it.** Two separate failures, both instructive.

The first attempt added a plain column and backfilled it with an `UPDATE`. That
was refused outright — `app.notice_versions` carries an immutability trigger,
and it was right to refuse. Deriving the column instead removed the need for a
backfill and made drift impossible, which is the better design anyway.

The second was subtler and only surfaced by running the consent suite. In a
`BEFORE UPDATE` trigger a `STORED` generated column is not yet computed, so
`NEW.language` is `NULL` while `OLD.language` holds its value. The immutability
trigger compares the whole row minus the two fields a publication may move, saw
`"en"` become `null`, and refused every publication with *"Configuration version
is immutable"*. Migration `0031` leaves `language` out of that comparison, which
costs nothing: it is generated from `document`, and `document` is still
compared, so a real change to the language is still caught. Comparing a derived
value separately from what it derives from can only add false positives.

This is the reason `runtime:build` and the full suite run matter. The unit tests,
the typecheck and the contract check were all green while every notice
publication in the product was broken.

## What is not done, plainly

- **This product does not translate.** A notice in a language is one somebody
  authored in that language. There is no machine translation and no claim of one.
- **No translation-staleness detector.** A translation records the version it
  came from; nothing yet reports that the source has since moved on.
- **Requiring fresh consent records a decision and does not act on it.** Nothing
  withdraws or invalidates a grant as a consequence.
- **FR-M12-03 is API-only.** There is no workspace screen for classifying a
  change; the portal side of FR-M12-04 is on screen, the administrative side is
  not.
- **Notice delivery management is still absent**, as it was before this pass.
