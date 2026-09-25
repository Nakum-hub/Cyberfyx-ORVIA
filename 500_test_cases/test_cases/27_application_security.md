# 27 — Application Security (cross-cutting)

Scope: input handling, injection, XSS, CSRF, auth tokens, headers, secrets, file handling, dependency scanning, security gates.
References: PRD NFR-03; DPDPA Act §8(5) (reasonable security safeguards), Rule 6 (security safeguards incl. encryption/obfuscation/masking, access control, logs — per pack); acceptance T57, T58, T61, T63.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-471 | SQL injection on all inputs | Every API parameter and search box | 1) Fuzz with SQLi payloads | No injection; parameterised queries; safe errors | P0 | SEC | NFR-03 |
| TC-472 | Stored XSS in names/notes | Principal name `<script>` / SVG onload | 1) Save; 2) View in admin, portal, PDF | Escaped everywhere | P0 | SEC | NFR-03 |
| TC-473 | CSRF on state-changing endpoints | Logged-in admin visits attacker page | 1) Cross-site POST (withdraw, role grant) | Rejected | P0 | SEC | NFR-03 |
| TC-474 | Strict schema rejects unknown fields | Licence, command, diagnostic APIs | 1) Add unknown fields | Rejected | P0 | SEC | API contracts |
| TC-475 | Oversized payloads | 100 MB JSON, deeply nested JSON | 1) Submit | Rejected quickly; no memory exhaustion | P1 | SEC | NFR-09 |
| TC-476 | Security headers | All UI responses | 1) Inspect | CSP, frame-ancestors, HSTS (where TLS), nosniff, referrer policy set | P1 | SEC | NFR-03 |
| TC-477 | Cookie flags | Session cookies | 1) Inspect | HttpOnly, Secure, SameSite appropriate | P1 | SEC | NFR-03 |
| TC-478 | Secrets not in repo/package/logs | Built package | 1) Secret scan | No secrets | P0 | SEC | NFR-03 |
| TC-479 | Encryption at rest for personal payloads | DB/object store | 1) Inspect storage | Protected payload encryption/masking per approved design and pack | P0 | LEGAL | Act §8(5), Rule 6 |
| TC-480 | TLS in transit | All internal/external links | 1) Scan | TLS where required; no plaintext credentials | P0 | SEC | Rule 6 |
| TC-481 | Access log retention for security | Security logs | 1) Check retention config | Retained at least the pack-specified period (Rule 6: one year) | P1 | LEGAL | Rule 6 |
| TC-482 | Critical/High finding blocks release | Inject known Critical finding in scan | 1) Run release gate | Promotion blocked; evidence retained | P0 | SEC | T57 |
| TC-483 | Scanner unavailable / suppression without rationale | Remove scanner or add unexplained suppression | 1) Run gate | No false pass; gate blocked | P0 | SEC | T58 |
| TC-484 | Fix tracked and retested | Reported flaw | 1) Submit fix | Finding tracked, retested, regression test added | P1 | SEC | T61 |
| TC-485 | No false security claims | Security centre with unassessed build | 1) View | NOT_ASSESSED shown; no "zero vulnerabilities" badge | P1 | UX | T63 |
| TC-486 | IDOR sweep | All resource endpoints | 1) Automated ID swap across roles/tenants | No unauthorised access anywhere | P0 | SEC | T01, NFR-01 |
