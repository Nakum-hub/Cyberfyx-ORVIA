# DPDP operations runbook

Operator procedures for the DPDP operational extension. Design and code map:
[docs/engineering/dpdp-operations.md](../engineering/dpdp-operations.md).

## 1. Install or upgrade

1. `pnpm run db:migrate` applies migrations 0037–0039 (and the synthetic target
   migration 0004 through `machine:init` on synthetic profiles).
2. `pnpm run machine:init confirm:<profile>` re-enrols the worker, which now
   carries `operations.execute` for the background runner.
3. Reload OPA after upgrading: the admin policy gained `registry.sensitive.read`,
   `registry.sensitive.write`, `operations.approve`, `regulatory.manage` and
   `sdf.manage` as super-admin-only capabilities.
4. `pnpm run build`, then start the stack as usual.

Until an approved regulatory package is in effect, material workflows (runs,
breach registration, case profiles) are refused with `no_active_regulatory_package`
and Attention shows `NO_ACTIVE_PACKAGE`.

## 2. Regulatory packages

Building a production package (vendor side, needs permission to download the
official PDFs):

```
node --import tsx scripts/regulatory-package.ts retrieve confirm:official-download
node --import tsx scripts/regulatory-package.ts build <version> <effective-from-ISO> [previous-version]
```

`build` refuses unless every official source was retrieved and its SHA-256
recorded. Review `openVerificationItems` in `scripts/regulatory/dpdp-baseline.ts`
against the retrieved text before release.

Installing: a super admin imports the signed package
(`POST /api/v1/admin/regulatory/packages`); a *different* super admin approves it
on **Regulatory packages**. It governs from its effective date. Review the impact
items on **Package change impact**.

## 3. Onboarding an existing estate

1. `POST /api/v1/admin/bulk-jobs` with `source_label` and `mapping_version`.
2. Upload rows in chunks of ≤500 to `/bulk-jobs/{id}/rows` with `first_ordinal`.
   Re-sending a chunk with identical content is accepted; different content for
   a received ordinal is refused.
3. Apply with `/bulk-jobs/{id}/processing` (`limit` ≤ 1000) or leave it to the
   runner. Failed rows are listed by code on **Existing-data onboarding**;
   **Queue failed rows again** replays only those.

Missing consent or notice history is imported as missing — do not supply
placeholder values.

## 4. Running the background runner

```
pnpm run operations:runner          # every 30 seconds until stopped
pnpm run operations:runner -- --once
```

Each pass prints one JSON line per scope with counts and error codes. A non-empty
`errors` array sets exit code 1. The runner never approves a run and does not
execute runs tied to a V1 rights request (staff execute those from the run page).

## 5. Destructive runs

1. Evaluate (retention rule → **Evaluate**, or create a rights run through the API).
2. Read the dry run on the run page: eligible, blocked (with hold ids),
   unresolved, unsupported, verifiable, irreversible warning.
3. A second person with `operations.approve` approves with the shown scope hash.
4. Send batches (or let the runner). Failed or inconclusive actions keep the run
   `PARTIALLY_FAILED`; cancel it with a reason and evaluate again to create a
   follow-up run that picks up only what is still outstanding.
5. Export the evidence package from the run page.

## 6. Breaches

Register a V1 incident as a breach on the API (`POST /personal-data-breaches`).
Record awareness on the incident: without it the 72-hour deadline is shown as
unresolved. Complete each task with the actual communication reference.
Deadline alerts need a `DPDP_OPERATIONS_ALERT` notification template and a DPO or
grievance contact on the organisation profile; otherwise the sweep reports them
unresolved and sends nothing.

## 7. Significant Data Fiduciary

Record SDF status on the organisation profile (`sdf.manage`). Designation needs
the Government reference and opens the obligations of the package in force.
Ending the designation closes open obligations as not applicable with a reason;
history is kept.

## 8. Tests

```
pnpm run test:operations                     # all 13 operations suites
pnpm run test:operations -- rights breach    # a subset (others reported NOT_RUN)
pnpm exec tsx --test tests/unit/operations.test.ts
```

The suites run against the built application on a named test profile and use
the synthetic records TEST ADAPTER only.
