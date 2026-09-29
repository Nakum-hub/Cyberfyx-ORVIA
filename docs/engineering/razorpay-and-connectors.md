# Razorpay and customer-local connectors

Razorpay is the sole payment provider selected by the user on 28 September 2026. The user subsequently confirmed that the project uses synthetic data only and no Razorpay account exists yet; continue with this project's systems rather than inventing CRM/storage integrations. PostgreSQL matches the project's existing database technology. Real-provider conformance remains a future activation gate, not a claim from local fixtures.

## Implemented vendor boundary

`backend/vendor/commerce/http.ts` exports a Fetch Request/Response handler for the separate vendor site. It requires a vendor-session authenticator; there is no default identity. `CommerceStore` additionally checks persisted account membership. The handler is not deployed or mounted on the customer application.

| Method/path | Behavior |
|---|---|
| POST `/vendor/api/orders` | Approved plan, UPI/CARD and idempotency key; database supplies price/terms |
| GET `/vendor/api/orders/:id` | Account-scoped durable order |
| POST `/vendor/api/orders/:id/checkout` | Empty JSON object; checked provider order and public checkout configuration |
| POST `/vendor/api/orders/:id/callback` | Verify Razorpay signature against the stored order; await capture |
| POST `/vendor/api/orders/:id/reconcile` | Provider order ID; independent GET validates receipt/amount/currency and restores unknown binding |
| POST `/vendor/api/razorpay/webhook` | Verify unchanged raw body, signature/event headers; ingest durable payment fact |

Browser mutations require the exact configured HTTPS Origin and bounded JSON. Webhooks use raw-body HMAC and a separate body limit. Provider calls use a fixed HTTPS destination, no redirects, bounded responses, timeout and no automatic POST retry. Callback authenticity and paid order snapshots never enqueue licences; verified captures can enqueue one outbox item. The reviewed fulfilment service now signs and persists an independently approved claim snapshot atomically with the outbox and audit. It does not infer commercial terms or expose a signing HTTP endpoint. See [vendor fulfilment setup](../../backend/vendor/README.md#reviewed-licence-fulfilment).

Keep merchant ID, mode, API secret and webhook secrets in protected vendor configuration. Only the API public key reaches checkout UI. Never send credentials in chat. Actual TEST-mode UPI/card conformance must precede live activation. No provider keys or real provider calls were used here. Hosted checkout scripts belong exclusively on the vendor site.

References: [checkout and callback verification](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [order retrieval](https://razorpay.com/docs/api/orders/fetch-with-id/), [webhook validation](https://razorpay.com/docs/webhooks/validate-test/).

## PostgreSQL adapter requirements

`connectors/src/postgres-records/adapter.ts` implements parameterized CORRECT/SUPPRESS and independent readback, with no synthetic fallback. It is not registered in the customer workflow dispatcher: that contract lacks generation/version and belongs to the active shared lane. Workflow approval/hold gates and machine authentication must precede dispatch. Never accept mappings, pools or Authority objects from an HTTP caller.

Installation-managed mappings require a direct table, separate limited writer/observer roles, UUID tenant/entity/environment columns, principal reference, UUID generation, monotonic integer version, last-operation UUID/digest, boolean suppression and allowlisted string/nullable correction columns. A unique constraint must cover scope/reference. Every external writer must advance version; replacement records need a new generation. Receipts must survive restart. Pools require configured TLS and connection timeouts. No schema changes or permissions are applied automatically.

Writes lock the scoped record and compare generation/version. Same-action replay does not repeat an UPDATE. Correction cannot clear suppression. Lost commit acknowledgement is EFFECT_UNKNOWN. Independent verification checks receipt and actual state; absent, changed or unreadable records remain INCONCLUSIVE. Verification returns no personal values. Target owners/privileged roles and writable observers are refused. Existing RLS remains in force; target policies must be compatible with approved installation configuration.

ERASE, ANONYMISE, bulk, disclosure/export and downstream-copy verification remain unsupported. Target mappings, triggers, RLS, external writers and retention rules require customer-specific qualification. Unit SQL doubles are not proof of real mapped-target connectivity.

## Remaining dependencies

Razorpay needs vendor identity/MFA integration, checkout/account/review UI, approved prices/terms, protected test configuration once an account exists, actual provider sandbox evidence, fulfilment scheduling, production signing custody and deployment/rate limits. The account-scoped persisted licence download API exists; customer/vendor UI integration remains unfinished. For now, use only the project's labelled synthetic fixtures. Additional customer systems require a future explicit target choice. No connector catalogue or full-V1 production acceptance is inferred from these changes.
