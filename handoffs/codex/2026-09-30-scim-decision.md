# Handoff — R3-SCIM-DECISION — Codex

**Base commit:** 3fa7081aa9ce49d92dd6c724b35b3f5ffa3a79d8 (Claude branch).
**New commit:** this handoff's commit on `codex/scim-decision-20260930`.
**Source master:** revision 1.4 and approved addenda, unchanged. **Contract:** 0.46.0 unchanged.
**Scope/profile:** decision record only; no runtime or schema changes.

## Delivered

SCIM implementation remains paused exactly as the round-3 instruction requires. The owner must choose V1 scope and the identity provider to qualify against.

Options:

1. Include SCIM provisioning in V1 and nominate one initial provider (for example Microsoft Entra ID, Okta, or a customer-local provider). Define user lifecycle operations, group/role mapping, deprovisioning and session revocation behavior, supported authentication, and the synthetic test tenant available for qualification. Other providers remain unqualified until separately tested.
2. Exclude SCIM from V1 and record a baseline decision that manual user administration remains the V1 path; place SCIM in a later delivery target. This option changes scope only after owner approval, not by this handoff.

SAML/OIDC login and SCIM provisioning are distinct decisions. Naming a login provider alone does not define provisioning behavior. No real credentials, production tenant records or customer identities are requested.

## Commands actually executed

`git worktree add .worktrees/scim-round3 codex/scim-decision-20260930` — exit 0. Documentation-only review of the supplied round-3 instruction; no test execution applies.

## Acceptance

SCIM implementation and provider qualification NOT_RUN / awaiting owner decision. No claim that V1 scope is already settled and no acceptance promotion.

## Contract / dependency / ownership changes

None. No migration or contract version reserved for an unspecified SCIM implementation.

## Remaining limitations and blockers

Needs the owner: include/exclude decision, initial identity provider, supported lifecycle behavior and a synthetic qualification environment. If included, coordination for authentication/authorization and canonical contracts precedes implementation.

## Next integration action

Owner records the decision; then create bounded implementation and provider-qualification tasks. Only this handoff is changed.
