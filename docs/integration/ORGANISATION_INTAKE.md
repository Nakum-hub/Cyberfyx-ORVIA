# Sending consent changes and privacy requests to ORVIA from your website or app

This guide is for the developers of an organisation that runs ORVIA. It shows how your application sends what your signed-in customers do on their privacy settings to your ORVIA installation. Your customers never visit ORVIA; they use your website or app. Rule 14(1) of the DPDP Rules, 2025 asks you to publish the means of making a request there.

Everything goes from your server to your own ORVIA installation. Nothing passes through Cyberfyx.

## 1. Before you start (in the ORVIA Workspace)

An organisation super administrator does this on **Website & app intake**:

1. Make sure your application is registered as a system, and that your customers are Data Principals whose reference in that system is the identifier your application uses for them. For example, your customer ID `cust_10492` is the reference in the system "Customer account site".
2. Create an intake key for the application. Answer truthfully whether your application signs customers in before it sends anything for them; this decides whether a rights request starts with identity established.
3. Copy the key. It is shown once. Store it as a server secret (for example in your secret manager), never in browser code or a mobile app binary.

You also need the ID of each processing activity whose consent you collect. It is shown on **Processing activities**.

## 2. Rules for every request

- **Base address:** your ORVIA installation's address, reachable from your application server only.
- **Headers:**
  - `Authorization: Bearer <key>`
  - `Content-Type: application/json`
  - `Idempotency-Key: <16–128 letters, digits, - or _>`: a new value for each submission. Resending with the same value returns the same submission, so a retry after a timeout is safe. The same value with a different body is refused with 409.
- **Do not** send an `Origin` header or cookies. Requests from a web browser are refused with 403, which keeps the key out of web pages.
- **202 Accepted means received, not done.** ORVIA applies the submission within about a minute. Check the result with the status call below.

## 3. Consent given or withdrawn

`POST /api/v1/intake/consents`

```json
{
  "customer_reference": "cust_10492",
  "activity_id": "3f0c6a8e-4d7b-4c1e-9d55-0b7f2f6a1e21",
  "decision": "WITHDRAWN",
  "occurred_at": "2026-10-01T09:30:00Z",
  "notice_version_id": null,
  "evidence_reference": "Account privacy page, event 88213"
}
```

- `decision`: `GRANTED` or `WITHDRAWN`.
- `occurred_at`: when the customer did it, in UTC.
- `evidence_reference`: your own record of the event (3–500 characters), so an auditor can trace it.
- `notice_version_id`: the ORVIA notice version the customer saw when giving consent, or `null`.

A withdrawal is propagated to every system linked to the activity and verified, exactly like a withdrawal staff record.

## 4. A privacy request

`POST /api/v1/intake/rights-requests`

```json
{
  "customer_reference": "cust_10492",
  "right_type": "ERASURE",
  "description": "Please delete my account and the data you hold about me.",
  "display_name": "A. Customer",
  "email": "customer@example.com"
}
```

- `right_type`: `ACCESS`, `CORRECTION`, `ERASURE`, `GRIEVANCE` or `NOMINATION`.
- `description`: the customer's own words (10–2000 characters).

The request appears on **Privacy requests** in the Workspace, marked as arriving through your website or app.

## 5. Checking the result

`GET /api/v1/intake/submissions/{submission_id}`, using the `submission_id` from the 202 response.

```json
{
  "submission_id": "…",
  "kind": "CONSENT",
  "status": "APPLIED",
  "received_at": "…",
  "processed_at": "…",
  "outcome_reason": null,
  "consent": { "record_id": "…", "current_status": "WITHDRAWN" },
  "rights_request": null,
  "receipt_is_not_completion": true
}
```

| `status` | Meaning |
|---|---|
| `RECEIVED` | Stored; not yet applied. |
| `APPLIED` | Applied. For consent, `consent.current_status` is the record's status now. For a request, `rights_request.state` is its current state. |
| `NEEDS_STAFF` | ORVIA could not apply it automatically. `outcome_reason` says why, for example an unknown customer identifier. Staff will handle it; nothing is lost. |
| `HANDLED` | Staff handled a submission that needed them. |

A key can read only its own submissions.

## 6. Errors

| Status | Meaning |
|---|---|
| 400 | The body or headers are invalid; `field_errors` names the fields. |
| 401 | Missing, wrong or revoked key, or cookies were sent. |
| 403 | A browser `Origin` was sent, or this key does not accept this kind of submission. |
| 409 | The same `Idempotency-Key` was reused with a different body. |
| 503 | Try again later with the same `Idempotency-Key`. |

## 7. If a key leaks

Revoke it on **Website & app intake** (it stops working at once), create a new one, and deploy it. Submissions already received are kept.
