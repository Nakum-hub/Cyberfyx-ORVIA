# Audit channel: engineering semantics and integrity limits

**Scope.** This is how the revision 1.6 audit mandate channel between a client's `CUSTOMER_INSTALLATION` and the vendor's `VENDOR_SERVICE` installation behaves as built. It covers task AUDIT-PRACTICE-01's hardening and round trip.

**Status.** It describes code, not an owner decision. The owner decisions are in `V1_BASELINE_REV_1_6_AUDIT_MANDATE.md`. Legal review of the engagement letter and the processing agreement is still pending before any real use.

**Code.**

| Side | Files |
|---|---|
| Client | `backend/domain/src/dpdpa-audit/channel.ts`, `mandate.ts` |
| Vendor | `backend/vendor/audit/channel.ts` |
| Protocol | `shared/contracts/src/audit-channel.ts` |
| Migrations | customer 0068–0069; vendor 0006, 0008, 0010 |

## Direction and addressing

- **Outbound only.** Every call is made by the client installation's background worker. It goes to the single audit address in the client's trust file.
- **Address rule.** HTTPS is required. Plain HTTP is accepted only to loopback, and an address may carry no credentials, query or fragment.
- **No inbound path.** The vendor has no way to call, sign in to or read a client installation. Vendor requests and signed documents reach the client only in the answer to a check-in the client made.

## Authentication and binding

1. **Channel key.** Each request is authenticated with HMAC-SHA256 under a key derived from the one-time engagement code.
   - The client keeps the key readable only by the worker.
   - The vendor keeps it sealed under its vault key.
   - Neither side keeps the code itself.
   - A request older or newer than 300 seconds is refused.
2. **Engagement binding.** The engagement is found from the code digest header, and every vendor action runs bound to that engagement (`vendor.channel_caller()`). A request cannot act on another engagement's records.
3. **Installation key pinning.**
   - At the first check-in, the vendor pins the installation's Ed25519 evidence key.
   - A later check-in presenting a different key gets `INSTALLATION_KEY_CHANGED`; nothing is accepted.
   - Mandates, deliveries and management responses must verify against the pinned key.
4. **Vendor signatures.** Instructions, requests, receipts and offered documents are signed with the vendor audit key. The client verifies each one against the audit key in its trust file. An answer that does not verify is ignored, and the mandate shows `CHECK_IN_ANSWER_NOT_SIGNED_BY_TRUSTED_AUDIT_KEY`.

## Replay, idempotency and recovery

- **Deliveries.**
  - A repeated delivery with the same id and digest gets the original receipt and is stored once.
  - The same id with a different digest is refused as an idempotency conflict.
- **Management responses.** A repeated response with the same digest gets an ACCEPTED receipt and is stored once.
- **Outcome states.** A send whose outcome is not known (timeout, reset, oversized answer, 5xx, 429) is `UNKNOWN`.
  - The same signed item is sent again, and the vendor's receipt settles it.
  - A clear refusal before anything could have left is `FAILED`. Examples: connection refused, DNS failure, certificate rejection, a redirect, an invalid address.
  - After 20 attempts an item is `FAILED`.
- **Receipt limit.** The client reads at most 1 MiB of any answer. More than that is `UNKNOWN (RESPONSE_TOO_LARGE)`, never success.
- **Redirects.** A redirect is never followed. It is `FAILED (REDIRECT_NOT_FOLLOWED)`, so evidence cannot be steered to another host.
- **Body limits.** The vendor accepts channel bodies up to 4 MiB and sealed packages up to 64 MiB.
- **Rate limit.** The vendor accepts 120 calls per 10 minutes per engagement.

## Chain

Each delivery names its sequence and the digest of the previous accepted delivery.

- A gap is accepted, but the vendor marks the chain `BROKEN` for good and records the problem.
- The report treats the gap as a limitation.
- The chain covers deliveries only. The client's own audit-event table is not hash-chained.

## Requests

A request from the auditor is decided by the client:

| Condition | Decision |
|---|---|
| Inside the mandate, personal-data-free category, not past due | Answered automatically |
| Any document request | Left for a client approver |
| Outside the mandate | Refused, with the reason |
| Past its due date | Refused as `PAST_DUE`, never answered |

The vendor refuses to issue a request that is already past due.

## Lease: one worker per mandate

- **Taking the lease.** Before servicing a mandate, a worker takes a lease on the mandate row with an atomic conditional update. The lease lasts five minutes.
- **Contention.** Another worker finding a live lease leaves the mandate alone and makes no calls.
- **Release.** The lease is released at the end of the cycle. If the worker dies, the lease lapses on its own.

## Suspension, revocation and end: propagation

**On the client (effective at the next send boundary).** The worker re-reads the mandate before every generation and before every send: delivery, package and response.

- **Suspended.** Nothing further is generated or sent. Queued items stay queued and are sent after the mandate is resumed.
- **Revoked, ended or expired.**
  - Queued deliveries, packages and responses become `FAILED` with `MANDATE_<STATE>_BEFORE_SENDING`, without being sent.
  - Items already `UNKNOWN` stay `UNKNOWN` with `MANDATE_<STATE>_OUTCOME_UNKNOWN`. Their effect at the vendor cannot be known, and they are never shown as delivered.
- **In-flight sends.** A send already in flight when a person changes the state completes, or becomes `UNKNOWN`. This window is inherent: the state change and the network call are not one transaction.

**On the vendor (effective at the next check-in).**

- The vendor learns of a changed state only from the next check-in, which presents the mandate signed in its new state.
  - The client makes that check-in once for a suspended, revoked or ended mandate, to report the state.
  - After that it makes no further calls for a suspended mandate.
- Until then, the vendor's stored copy is what it checks. It refuses deliveries whose stored mandate is not open.
- Requests and documents are offered only while the stored mandate is open.
- Closing the engagement on the client ends its mandate. The vendor records the end at the next check-in and refuses later deliveries.

## Continuous assurance

Continuous assurance uses its own mandate kind (`CONTINUOUS_ASSURANCE`), with its own dual approval, schedule, categories and a validity of at most 400 days. It never rides on an engagement mandate.

**Not built:** a vendor workflow separate from engagements, and pricing.

## Round trip: findings out, responses back

1. **Findings out.**
   - A signed findings file, request list or report is offered at the next check-in when the engagement has a channel. A report carries its PDF.
   - The worker verifies each document against the audit key, the engagement digest and the PDF hash, then only stages it.
   - A person imports it through the same verified import as a file.
   - Staged documents are acknowledged at the following check-in and are not offered again.
2. **Responses back.**
   - A management response to a finding in an imported findings file is screened for contact details before storage.
   - It carries the state of any GRC issue tracking the finding, as a reference only.
   - It is approved by an owner or administrator other than the preparer.
   - The worker then signs it with the installation key and sends it while a mandate is open.
   - The vendor records it once on the finding, which moves to `CLIENT_RESPONDED` with source `CHANNEL`, and returns a signed receipt.
3. **File fallback.** The auditor records a response received another way, citing its reference (source `RECORDED_BY_AUDITOR`).

## Integrity limits (stated, not solved)

1. **ORVIA's records, not ground truth.** The evidence proves what ORVIA's records held when it was generated, signed by the installation. It does not prove those records are complete or true.
   - A person with database superuser rights on the client could alter source records before generation.
   - Completeness of a population needs separate evidence. A seed proves only the selection.
2. **Trust on first use.** The installation key is pinned at the first check-in.
   - Anyone holding the engagement code before the client's first check-in could pin a key of their own.
   - The client would then see `INSTALLATION_KEY_CHANGED` and a problem on its mandate, and the engagement must be re-issued.
   - Hand the engagement code over privately.
3. **No hash chain on the client audit trail.** The client audit-event table is not hash-chained. The chain covers deliveries only.
4. **Development key.** The audit key in development is a development key (`orvia-audit-dev-…`).
   - Every signed output is marked as such.
   - The practice cannot record the production-key activation gate while it is in use.
5. **Clocks.** Freshness and due dates rely on each installation's clock. The 300-second skew check limits replay, not clock tampering.
6. **Transport.** Every run so far used loopback HTTP. The channel over real TLS to a separately hosted vendor installation is `NOT_RUN`.
