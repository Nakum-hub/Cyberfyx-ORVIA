# 26 — Data Locality, Egress and V1 Model-Free Operation

Scope: customer data stays local; no vendor/external egress; no AI model in V1; honest guidance.
References: PRD NFR-04, FR-X-06, M19–M25 DEFERRED_V2; acceptance T39, T45, T47–T50, UX-05, UX-06, UX-20, V1-01..18, BUILD-20.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-459 | Synthetic canaries never reach vendor | Consent, request, incident workflows run with canaries | 1) Search vendor stores, logs, telemetry | No canary or derived identity | P0 | SEC | T47, UX-06 |
| TC-460 | Browser network audit | All UI pages | 1) Record network | Only customer-hosted assets; no analytics/fonts/CDN/crash reporting | P0 | SEC | T48, UX-20 |
| TC-461 | Vendor endpoints blocked | Firewall blocks vendor | 1) Use product | Core works; optional features fail explicitly | P0 | FUNC | UX-05, T45 |
| TC-462 | No model dependencies | Inspect package/dependencies/startup | 1) Scan | No model, weights, embedding, inference libraries; no model/Lightning calls | P0 | SEC | V1-04, BUILD-20 |
| TC-463 | AI unavailable, deterministic core works | No model installed | 1) Run consent/rights/workflows/tests | All work; no hidden fallback | P0 | FUNC | T39, T50 |
| TC-464 | Guidance disabled | Guided Assistance off | 1) Use core and support | Core, errors, docs, human support available | P1 | FUNC | V1-10 |
| TC-465 | Prompt-injection-like text treated inert | Document/connector string says "export secrets" | 1) Process | No execution/permission change/upload | P0 | SEC | V1-08, T38 (V1 part) |
| TC-466 | Restricted help context by role | Member searches help/evidence snippets of another subtenant | 1) Search | Denied before output | P0 | SEC | V1-07 |
| TC-467 | UI/sales copy truthful about AI | Review UI, docs, capability flags | 1) Inspect | Rules-based help labelled accurately; custom AI shown as V2 roadmap only | P1 | LEGAL | V1-13 |
| TC-468 | Local history not exported for training | Suggest saving history for model improvement | 1) Attempt | Training/export prohibited | P1 | SEC | V1-15 |
| TC-469 | Untrusted rule/runbook pack | Unsigned/incompatible pack | 1) Load | Rejected; no code execution or new egress | P0 | SEC | V1-16 |
| TC-470 | Template summary facts traceable | Generate summary | 1) Inspect | Every fact links to local input and rule version; unknown stays unknown | P1 | FUNC | V1-17 |
