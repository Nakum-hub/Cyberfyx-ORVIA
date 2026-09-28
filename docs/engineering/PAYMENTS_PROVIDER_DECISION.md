# Payments provider decision (EX13)

**Decision (product owner, 2026-09-28):** use Indian payment providers only, and use **Razorpay** (Razorpay Software Private Limited, Bengaluru) for UPI and card payments on the vendor website.

## Why Indian-only

- **RBI payment data localisation.** RBI's directive on *Storage of Payment System Data* (6 April 2018) requires payment system data to be stored only in India. This is the binding reason to use an RBI-regulated Indian payment aggregator.
- **DPDP Act 2023 caution.** Section 16 allows transfer of personal data outside India except to countries the Central Government restricts by notification. It is not a blanket ban on foreign processors. Keeping the vendor's payment and billing data in India avoids depending on future notifications and keeps one jurisdiction.
- The provider's current RBI payment-aggregator authorisation status must be confirmed against RBI's published list before activation. The verification sources could not be reached from the build environment (network policy); this remains a pre-activation check.

## What this means in the product

- **The customer installation is not involved.** Payment happens only on the vendor website and in the vendor account. No customer operational data goes to Razorpay or to the vendor.
- **Hosted checkout only.** Card numbers, CVV, UPI PIN and bank credentials are entered on Razorpay's hosted checkout and never touch ORVIA. The existing adapter (`backend/vendor/commerce/`) creates orders server-side and accepts only HMAC-verified webhooks (`payment.authorized`, `payment.captured`, `payment.failed`, `refund.processed`).
- **A licence is issued only after a verified capture,** never on the browser's "success" redirect.

## Activation checklist (not done)

1. Create a Razorpay merchant account and complete KYC. Start in **Test Mode**.
2. Put the keys in the vendor secret file `.local/vendor/commerce/razorpay.json` (`key_id`, `key_secret`, `webhook_secret`, `merchant_id`, `mode`), mode 0600. **Never paste keys into chat or commit them.** In production they go in the vendor's secret store.
3. Allow `api.razorpay.com` (and `checkout.razorpay.com` for the hosted page) in the vendor deployment's network policy.
4. Host the vendor database and services in an Indian region.
5. Approve prices, GST treatment, billing periods, renewal and refund terms (team decision), then load them as approved catalogue price snapshots.
6. Run Razorpay sandbox conformance: create order, authorize, capture, fail, duplicate webhook, out-of-order events, partial and full refund, and unknown-outcome reconciliation.
7. Build the vendor website and account screens (sign-up, plan selection, checkout, invoices, licence download). They do not exist yet.
