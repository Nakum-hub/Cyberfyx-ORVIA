# A07-C01 — verified rehearsal transport

Producer/consumer coordination: Codex; semantic acceptance: Work. Prior transport 0.4.0; proposed generated transport **0.4.1**. Signed command schema stays **0.3.0**. No migration, business DTO, command binding, endpoint path or seed/reset name changes.

The `rehearsal` application origin is now fixed to `https://127.0.0.1:4330`. Staff/principal auth mounts remain `/api/auth/staff` and `/api/auth/principal`. Better Auth enables secure cookies for this origin, using its `__Secure-` naming convention. Canonical AUTH metadata gains `secure_cookie_prefix` for both domains; OpenAPI explicitly describes secure and development cookie alternatives. Existing `cookie_prefix` remains the development HTTP name for codex-a00/ui-b00. The HTTPS listener provides no plaintext fallback.

Generated clients and preserved UI use same-origin fetch and browser-managed cookies, so no independent DTO or cookie parser is added. Protected test/agent clients trust only the local CA via process configuration; certificate verification is never disabled. The CA/leaf/private key are locally generated outside Git; the one-use CA key is not persisted. No OS/browser trust change is performed.

Required executable checks: generated drift, real trusted-chain success, untrusted/wrong-host rejection, plaintext refusal, secure cookie names/attributes, staff MFA/principal separation, then existing backend regressions over HTTPS. Browser trust and B-task acceptance remain separate. The final A07 handoff names actual results and source/build identities; this change request alone is not test evidence or acceptance.
