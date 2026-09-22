# WP03 / WP34 — Customer Onboarding (M29), FR-M29-03

**Status: built, applied and qualified on the `codex-a00` profile. M29 stays at
`PARTIAL_SANDBOX`, deliberately.**

One of the module's four requirements is now built. Three are not, and the
register says so in as many words. `test_status` was already
`COVERED_AT_CANDIDATE` and stays there on the strength of a new suite;
`implementation_status` does not move, because FR-M29-01, FR-M29-02 and
FR-M29-04 have no code.

## What was built

The nine-step guided connection from the master's §84 table, run in the customer
workspace. Two design decisions carry the whole module.

**A step is not a tick.** Four of the nine record a decision the customer
actually made. The other five are answered by reading evidence that exists for
its own reasons elsewhere in the product:

| Step | Answered from |
|---|---|
| 1. Select system and environment | The connection row itself — it cannot exist without a configured system and a stated `TEST`/`PRODUCTION` kind. Production scope is never inferred from an omission. |
| 2. Choose required capabilities | The requested set, closed to `DISCOVER`, `READ`, `VERIFY`. There is no value in the vocabulary meaning update or delete, so step 2's check cannot be failed by asking nicely. |
| 3. Configure local connectivity | An endpoint reference **and** what its certificate did, recorded together. An unverified certificate does not complete the step, and the outstanding text says verification is not switched off to make it pass. |
| 4. Supply a scoped service identity | A reference to where the customer keeps the secret. |
| 5. Test permissions | `app.system_checks` — the most recent recorded capability check. |
| 6. Select resources | `app.connection_resources` — an explicit allowlist. |
| 7. Review mappings | `app.target_mappings` for this system. |
| 8. Preview and test | `app.processing_decisions` with `preview_only`. |
| 9. Enable progressively | The enablement stage, which is only `done` at approved enforcement. |

Because five steps are measured rather than stored, a step that was done stops
being done when the evidence behind it is withdrawn. The suite proves this
directly: it deletes the approved resource row and watches step 6 turn back to
outstanding, then restores it.

**Connected is not safe to mutate.** `requested_capabilities` and
`observed_read`/`observed_restrict` are separate fields and never merge.
`connection_is_not_permission_to_mutate` is a literal `true`.
`enablement_stage` climbs one rung at a time and never descends. Approved
enforcement is refused outright for a system no recorded check found able to
restrict — in the application, and again in a trigger, so a role that bypasses
row-level security cannot set it by hand either. Enabling is
`connection.enable`, held by the owner alone; an organisation administrator can
configure a connection all the way to step 8 and cannot enable it.

An unchecked system reports both observations as `null`, not `false`. "We have
not looked" and "we looked and it cannot" are different facts and the schema
refuses to let them share a shape — a connection reporting one observation and
not the other will not parse.

**The secret never arrives.** `secret_reference` is behind a pattern that
refuses whitespace and anything over 120 characters, and the suite asserts via
`information_schema` that there is no `password`, `token`, `credential` or
`secret` column on the table at all.

## Evidence

Commit under test: working tree on `prototype/claude/v1-modules-wp04-wp25`,
parent `c01facd`, profile `codex-a00`.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | clean, exit 0 |
| Lint | `npm run lint` | 0 findings, exit 0 |
| Unit tests | `npm test` | **128 passed, 0 failed** (6 of them M29) |
| Contract check | `npm run contracts:check` | 137 route examples and 7 error examples validated, contract 0.12.0 |
| Hygiene | `npm run hygiene:check` | 0 findings, 2962 files examined |
| Tracking | `npm run tracking:check` | 33 capability modules validated; no results promoted |
| Migration | `npm run db:migrate` | `0029_guided_connection` applied; artifact `A00-migration-1790059714169-*` |
| Policy | OPA restarted and queried directly | `connection.enable` true for `ORG_SUPER_ADMIN`, false for `ORG_ADMIN` |
| M29 integration | `npm run test:onboarding` | **33 assertions, 0 failures**, run twice against the same database; artifacts `A00-onboarding-integration-1790059968343-*`, `A00-onboarding-integration-1790063790722-*` |
| M33 regression | `npm run test:audit` | 51 assertions, 0 failures |
| Core regression | `npm run test:regression` | 70 assertions, 0 failures |
| Web smoke | `npm run web:smoke` | PASS |
| Runtime image | `npm run runtime:build` | PASS; the M29 sources are in the `git ls-files` context, so what was built is what is committed |
| Screens | driven through the real fixture with an authenticated owner | `/workspace/connections` and `/workspace/connections/{id}` both 200; both endpoints 200 |

## What running it actually found

Two things worth recording.

1. **The generated example sampler produced a secret reference containing a
   space**, which the reference pattern refused. That is the pattern doing its
   job — it is what stops a pasted credential block fitting in the field — so the
   fix was an explicit example rather than a looser pattern.

2. **The suite has to branch on what the capability check actually observed.**
   Whether the synthetic connector reports itself able to restrict is a property
   of the fixture, not something this suite should assert. So it reads the
   recorded check and asserts the correct outcome for what was observed, and
   then proves the guarantee that holds either way — the database refuses
   enforcement for a freshly created system nothing has checked at all.

## What is not done, plainly

- **FR-M29-01 has no code.** Package verification before privileged setup is not
  built. Release trust verification exists in M31 for updates; the install-time
  equivalent does not.
- **FR-M29-02 has no code.** There is no preflight gate over runtime, profile,
  architecture, TLS, storage, identity, keys, backups or egress. The protected
  bootstrap still creates one owner, as it did before this pass, but the
  customer-held recovery route and the gates are unbuilt.
- **FR-M29-04 has no code**, and `OPEN-11` leaves the supported import formats
  undecided. Nothing here imports, quarantines, previews, reconciles, traces
  provenance or purges, and nothing claims to.
- **The earlier wizard steps do not exist.** Organisation, industry, admins and
  deployment are not screens; this is the guided *connection*, which is one part
  of §84's thirteen.
- **Connectivity and certificate verification are recorded, not observed.** The
  customer states what happened; this product did not reach the network to
  confirm it, and the connection's own limits say so.
