# Vendor commerce implementation

This is the separate vendor-side commercial core for expanded V1 EX13 / master WP23. It is not mounted in the customer Workspace or Privacy Centre. The customer's operational database and sessions are not vendor account authority.

## Implemented boundary

- `shared/contracts/src/commerce.ts` is the canonical vendor-internal contract, version 0.2.0. No public customer endpoint or duplicate frontend DTO is introduced. The unreleased 0.1.0 draft used cumulative refund snapshots; 0.2.0 records distinct processed refund identities and amounts. Old synthetic test databases are retained evidence, not a supported production migration target.
- `database/vendor/migrations/0001_commerce.sql` creates a separate commercial schema and refuses a database containing the customer `app` schema. `0002_checkout_attempts.sql` adds durable checkout reservations and advances its schema to version 2. Apply both in order in the separate vendor store. Never add them to the customer migration runner.
- `CommerceStore` reads immutable approved catalogue prices, checks persisted account membership, records idempotent orders, binds the provider order, applies verified events, and atomically queues one entitlement request. It checks the database boundary on every transaction.
- The Razorpay webhook verifier is a dormant adapter candidate, not a provider selection or a live integration. It verifies HMAC-SHA256 against the exact raw body with bounded current/previous secrets, validates the configured merchant, and projects only minimum fields into immutable facts. Card/UPI collection is intended to remain provider-hosted. No PAN, CVV, UPI PIN, raw webhook or customer operational payload is stored here.
- Captures are distinct from authorization and issuance. Failed attempts cannot undo captured funds. Each processed refund is counted once by provider refund ID; pending/failed refunds do not count and contradictory amounts require review. Refunds before captures, mismatches and multiple payments remain visible. Refunds hold pending issuance or flag issued state for review; there is no remote customer action or automatic privacy-control relaxation.

Events lock event ID, payment ID, then order. Unique database constraints independently prevent duplicate issuance and reused provider payments. Event/order/outbox/audit updates commit together; an outbox write failure rolls the transaction back. The outbox is a durable PostgreSQL table, not an in-memory queue. It is not yet consumed by a licence signer.

`checkout` reserves an attempt in PostgreSQL before sending a fixed-destination provider order request. The adapter validates returned amount, currency, receipt and created state before binding the opaque order ID. Duplicate calls cannot repeat the provider create. A lost response or binding failure leaves durable UNKNOWN/STARTED work that cannot be blindly retried, including after restart. Payment attempt retries need a new commercial order; an existing paid/failed order is not handed back for checkout. Reconciliation of unknown work is a remaining operator flow. The current tests inject visibly synthetic provider responses; no provider API was contacted.

## Validation

```
./node_modules/.bin/tsx --test tests/unit/commerce.test.ts
./node_modules/.bin/tsx tests/integration/commerce/commerce.test.ts
```

The integration runner uses the existing local PostgreSQL instance only to create a new `orvia_vendor_test_<random-id>` database. It does not write customer tables, reset a database, grant permissions, start a service, bind a web port or make payment-provider requests. It leaves its synthetic database and a uniquely named artifact for inspection. The operator database identity is a test limitation, not production role qualification. Only a separately approved cleanup may remove retained databases.

## Work remaining before activation

Vendor-specific authenticated sessions/MFA and server-derived actor contexts; a least-privilege production role/RLS deployment; approved catalogue lifecycle and finance interface; actual provider selection and hosted checkout browser integration; provider sandbox conformance; authenticated webhook ingress with bounded body/rate limits; reconciliation of unknown checkout/payment work; invoice/tax/refund/subscription rules; signer consumption with claimed-work/recovery semantics; vendor Account UI and download entitlements; key custody and production assessment.

Amounts in tests are synthetic, not ORVIA prices or tax policy. UPI/card selection is approved; vendor choice and commercial terms are not inferred. Test-mode signed fixtures are not real payment evidence. Nothing here charges money, issues a licence, certifies payment compliance or makes EX13 complete.

Adapter references checked 25 September 2026: [webhook validation](https://razorpay.com/docs/webhooks/validate-test/), [order creation](https://razorpay.com/docs/api/orders/create/), [payment events](https://razorpay.com/docs/webhooks/payments/), and [refund events](https://razorpay.com/docs/webhooks/refunds). The adapter supports `payment.authorized`, `payment.failed`, `payment.captured` and `refund.processed`. A processed partial refund can retain payment status `captured`; its own refund entity must be processed and refer to the same payment/currency. Unsupported events, including an assumed `payment.refunded` event, are explicitly refused.
