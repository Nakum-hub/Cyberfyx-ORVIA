# Vendor commerce implementation

29 September 2026 update: the user selected **Razorpay only**. Vendor-internal contract 0.4.0 adds reviewed licence fulfilment and account-scoped retrieval. The separate vendor HTTP handler composes checkout, signed webhooks, independent order recovery and licence download. See [current setup and remaining dependencies](../../docs/engineering/razorpay-and-connectors.md). The implementation is not deployed or provider-sandbox qualified; vendor identity, browser checkout and production signing custody remain unfinished.

This is the separate vendor-side commercial core for expanded V1 EX13 / master WP23. It is not mounted in the customer Workspace or Privacy Centre. The customer's operational database and sessions are not vendor account authority.

## Implemented boundary

- `shared/contracts/src/commerce.ts` is the canonical vendor-internal contract, version 0.4.0. No public customer endpoint or duplicate frontend DTO is introduced. The unreleased 0.1.0 draft used cumulative refund snapshots; 0.2.0 introduced distinct processed refund identities and amounts. Old synthetic test databases are retained evidence, not a supported production migration target.
- `database/vendor/migrations/0001_commerce.sql` creates a separate commercial schema and refuses a database containing the customer `app` schema. `0002_checkout_attempts.sql` adds durable checkout reservations; `0003_licence_fulfilment.sql` adds immutable licence requests, approvals and signed documents and advances the vendor schema to version 3. Apply all three in order in the separate vendor store. Never add them to the customer migration runner.
- `CommerceStore` reads immutable approved catalogue prices, checks persisted account membership, records idempotent orders, binds the provider order, applies verified events, and atomically queues one entitlement request. It checks the database boundary on every transaction.
- Razorpay is the selected provider. Its webhook verifier checks HMAC-SHA256 against the exact raw body with bounded current/previous secrets, validates the configured merchant, and projects only minimum fields into immutable facts. Card/UPI collection remains provider-hosted. No PAN, CVV, UPI PIN, raw webhook or customer operational payload is stored here. Actual provider sandbox conformance is outstanding.
- Captures are distinct from authorization and issuance. Failed attempts cannot undo captured funds. Each processed refund is counted once by provider refund ID; pending/failed refunds do not count and contradictory amounts require review. Refunds before captures, mismatches and multiple payments remain visible. Refunds hold pending issuance or flag issued state for review; there is no remote customer action or automatic privacy-control relaxation.

Events lock event ID, payment ID, then order. Unique database constraints independently prevent duplicate issuance and reused provider payments. Event/order/outbox/audit updates commit together; an outbox write failure rolls the transaction back. The outbox is a durable PostgreSQL table, not an in-memory queue.

## Reviewed licence fulfilment

Fulfilment is explicit and manually reviewed; no edition, entitlement, price or validity period is inferred from a payment. `prepareLicence` requires persisted `LICENCE_PREPARE` membership and a paid, READY order in the configured provider/mode. It stores immutable canonical claims and a digest bound to the account, order, plan version and commercial terms. Changed claims cannot overwrite that request. Incorrect requests require a separately designed correction workflow; do not modify database history.

`reviewLicence` exposes that exact snapshot to a persisted `LICENCE_APPROVE` reviewer. `approveLicence` refuses self-approval and mismatched digests. Approval is immutable. `issueApprovedLicence` requires `LICENCE_ISSUE`, current active membership, a paid/READY order and independent approval. It uses a trusted vendor-side Ed25519 key supplied by service configuration, never an HTTP request. Local signing, signed-document persistence, outbox update and audit commit together under the same order lock used by refunds. No external signing request runs under that lock. A retry after a lost commit acknowledgment returns the existing signed document rather than making another licence.

Refunds before signing hold issuance. Refunds after signing retain the issued document and flag review; they do not remotely revoke customer controls. `readLicence` and `GET /vendor/api/orders/{id}/licence` require active account membership and record each download. Historical downloads remain available after refunds according to this continuity policy. The handler sends `Cache-Control: no-store`. No preparer, approval or signing HTTP endpoint is exposed. Vendor account/MFA integration, a review UI, automatic catalogue-to-claims mapping, expiry/correction workflows and production signing custody remain delivery work.

`checkout` reserves an attempt in PostgreSQL before sending a fixed-destination provider order request. Duplicate calls cannot repeat the provider create. A lost response or binding failure leaves durable UNKNOWN/STARTED work. `reconcileCheckout` verifies a candidate provider order through independent GET, matching the stored receipt, amount, currency and binding before recovery. A paid provider order snapshot or authentic browser callback cannot credit payment or issue a licence. Existing paid/failed commercial orders cannot restart checkout. Tests inject visibly synthetic provider responses; no provider API was contacted.

## Validation

```
./node_modules/.bin/tsx --test tests/unit/commerce.test.ts
./node_modules/.bin/tsx tests/integration/commerce/commerce.test.ts
```

The integration runner uses the existing local PostgreSQL instance only to create a new `orvia_vendor_test_<random-id>` database. It does not write customer tables, reset a database, grant permissions, start a service, bind a web port or make payment-provider requests. It leaves its synthetic database and a uniquely named artifact for inspection. The operator database identity is a test limitation, not production role qualification. Only a separately approved cleanup may remove retained databases.

## Work remaining before activation

Vendor-specific authenticated sessions/MFA for the mandatory handler authenticator; least-privilege production roles; approved catalogue lifecycle and finance interface; hosted checkout browser integration; provider sandbox conformance; deployment/rate limits for the bounded signed-webhook handler; reconciliation operator UI and missed-payment recovery; invoice/tax/refund/subscription rules; reviewed fulfilment UI and scheduling; vendor Account UI; key custody and production assessment.

Amounts in tests are synthetic, not ORVIA prices or tax policy. Razorpay with UPI/card is approved; commercial terms remain undecided. Test-mode signed fixtures are not real payment evidence. Tests may issue signed fixture licences using ephemeral keys, never production trust or real commercial entitlement. Nothing here charges money, certifies payment compliance or makes EX13 complete.

Adapter references checked 25 September 2026: [webhook validation](https://razorpay.com/docs/webhooks/validate-test/), [order creation](https://razorpay.com/docs/api/orders/create/), [payment events](https://razorpay.com/docs/webhooks/payments/), and [refund events](https://razorpay.com/docs/webhooks/refunds). The adapter supports `payment.authorized`, `payment.failed`, `payment.captured` and `refund.processed`. A processed partial refund can retain payment status `captured`; its own refund entity must be processed and refer to the same payment/currency. Unsupported events, including an assumed `payment.refunded` event, are explicitly refused.
