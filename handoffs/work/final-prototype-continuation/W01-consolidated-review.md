# W01 — consolidated authority and consent review

**Reviewer:** Work integration/review lane (this session). **Date:** 2026-09-17.
**Candidate source:** `81431d64afb8dd613c96d942402d8c0d8cc07ac0`, source tree
`e949d8c43c0dfffcea2e332eb7baa7eb2a052f0524709e6d533dcd566304e437`.
**Contract:** transport 0.5.0, signed command 0.3.0. **Profile:** `rehearsal`, fixture `aster-birch-v1`,
installation `b4a58f9b-7f5e-4e7b-b057-2fa6d68352f4`, origin `https://127.0.0.1:4330`.
**Product profile:** `CUSTOMER_LOCAL_SYNTHETIC`.

This reviewer also performed the authorized bounded harness corrections in this session. It is Work-lane
acceptance of executed evidence, **not** an independent penetration test, not human sign-off and not
release approval.

## Decision

**W01 — ACCEPTED at this candidate source.** The historical MEDIUM finding W01-A02-F01
(publication/consent freshness not enforced at consumption after lock waits) is **CLOSED**: corrected in
source and requalified by real HTTP + PostgreSQL lock-wait execution on this candidate. No W01-scope
finding remains open.

## Source conclusions carried forward

The source review recorded in `handoffs/work/final-prototype-7bc7780/W01-source-review.md` is retained and
still holds against this candidate:

- `packages/domain/src/consent.ts` takes the consent advisory/aggregate row lock, the interaction row lock
  and the shared publication lock before a single-use guarded update using materialized
  `clock_timestamp()`, then writes epoch/event/receipt/workflow/outbox inside the same transaction.
- `packages/domain/src/configuration.ts` consumes the exact publication proof after its relevant locks
  using advancing server time.
- `transaction.ts` returns an authorized identical replay's saved response **before** any new-operation
  consumption check, so replay stability and freshness enforcement do not conflict.
- `business.ts` validates server-derived domain/capability/scope, bounded input, same-origin JSON writes
  and idempotency keys, and rechecks authority after transaction entry.
- `authorityFor` rejects ambiguous simultaneous staff/principal sessions, bearer-shaped human requests,
  inactive authority and privileged sessions without the recorded MFA ceremony.
- `scopedTransaction` verifies the database role is neither superuser nor BYPASSRLS and sets
  transaction-local scope.

## Executed evidence at this candidate

All commands were recorded through the existing recorder `tests/e2e/record.mjs` (lane B06), which pins the
toolchain, sets `NODE_EXTRA_CA_CERTS` per process and captures source identity for every run. Suites were
run serially against the exclusive rehearsal database and ports.

| W01 closure check | Command | Result | Evidence |
|---|---|---|---|
| Server authority, domain separation, MFA, scope isolation, RLS, role boundaries (T02–T05) | `tsx tests/security/auth.test.ts` | **PASS**, exit 0, 87/87 assertions | `handoffs/codex/browser/B06-exec-2026-09-17T11-48-52.399Z/command.json`; artifact `handoffs/codex/artifacts/A07-auth-security-1789645754389-e1e3e132-9c26-4b6d-b878-c4e5b976e732.json` |
| Grant, immutable receipt, atomic withdrawal, history, restart persistence (T07–T08) | `tsx tests/integration/consent/consent.test.ts` | **PASS**, exit 0 | `handoffs/codex/browser/B06-exec-2026-09-17T11-50-49.858Z/command.json`; artifact `A07-consent-integration-1789645869949-967a9fd6-3087-45da-9b39-0c8e54ae981d.json` |
| **W01-A02-F01 freshness/expiry at consumption after lock waits** (T09–T10) | `tsx tests/integration/consent/expiry.test.ts` | **PASS**, exit 0, 87/87 assertions including **15 actual "transaction and wait began before expiry" controls** | `handoffs/codex/browser/B06-exec-2026-09-17T11-52-38.674Z/command.json`; artifact `A07-expiry-integration-1789646017958-1f369060-4bc5-4689-8500-3fcf40b1045b.json` |
| Trusted TLS chain, wrong-host/untrusted rejection, no plaintext fallback, secure cookie namespaces, cross-domain read denial | `tsx tests/security/tls.test.ts` | **PASS**, exit 0 | `handoffs/codex/browser/B06-exec-2026-09-17T12-06-43.711Z/command.json`; artifact `A07-tls-integration-1789646809053-59dbc67f-e9e8-4344-bf56-442cf000284a.json` |
| Browser authority journeys: MFA, refresh, actor separation, logout; rejected login and read-only authority; expired session recheck | `playwright test auth.spec.ts` (within the complete suite) | **PASS** 3/3 | complete-suite run below |
| Browser distinct-reviewer configuration publication persistence | `playwright test configuration.spec.ts` | **PASS** 1/1 | complete-suite run below |
| Browser consent, immutable receipt, withdrawal, history, refresh; lost committed response; stale interaction denial | `playwright test consent.spec.ts` | **PASS** 3/3 | complete-suite run below |

### W01-A02-F01 specific closure

`tests/integration/consent/expiry.test.ts` drives real HTTP requests that block on real PostgreSQL row and
advisory locks, confirms the transaction and its wait began **before** expiry, releases after the expiry is
actually observed, and then compares committed rows. For each of the aggregate, interaction, publication
and idempotency wait modes it asserts the HTTP status and that
`aggregate / interaction / event / receipt / workflow / outbox / idempotency` rows are **unchanged**. Fresh
paths, committed replay after expiry, replay response identity, replay row preservation and
still-required authentication are asserted separately. 87 assertions, 0 failures.

The finding is therefore closed on executed evidence, not on the fact that the correction was merged. The
original finding record and its historical failures remain in place and are not erased.

### Retained failure

`handoffs/codex/browser/B06-exec-2026-09-17T11-46-50.057Z` is an **auth suite FAIL, exit 1**: assertion
`wrong MFA code rejected` expected 401, actual **429**. Cause: the authentication rate-limit window had
been consumed by the immediately preceding operator execution in the same profile; the product correctly
rate-limited. This is a test-sequencing artefact, not a W01 defect, and it is **retained, not overwritten**.
The rerun after the window cleared is the PASS recorded above. Suites are now spaced for that window.

## Limitations

- Synthetic Aster/Birch fixture data only; no customer data, no real messaging, no public deployment.
- Engineering execution and Work-lane acceptance. Human rehearsal, release approval and final sign-off are
  separate and remain open.
- `tests/security/fixture-isolation.ts` is pinned to the `codex-a00` profile and is **NOT_RUN** here; it
  qualifies a different profile's environment and is out of scope for this rehearsal candidate.
- Normal Chromium HTTPS depended on a temporary, human-approved CurrentUser CA trust recorded in
  `certificate-trust.json`; no validation bypass was used.
