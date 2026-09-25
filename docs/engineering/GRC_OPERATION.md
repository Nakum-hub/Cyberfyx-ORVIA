# GRC operation and evidence limits

Customer-local workspaces: `/workspace/grc` and `/workspace/grc/audits`. Apply customer migrations through `0050_grc_audits.sql` with the existing installation procedure before using contract 0.27.0. The application role must already exist. These migrations add scoped, append-only tables and permissions; they do not bootstrap or broaden global roles.

Organisation administrators record frameworks, immutable control mappings, evidence references, risks, plans and audit requests. Organisation super administrators can independently review evidence, treatments and audit responses. Auditors read scoped records and histories. All roles come from server authority and require the existing authentication/MFA policy; form visibility does not grant access. No external auditor invitation or unscoped access is implied.

1. Record a framework version with its source and requirements, then map controls to that exact version. Changes require a new version; old mappings remain reproducible.
2. Submit the local evidence reference, declared SHA-256 digest and collection/expiry timestamps. The evidence file stays in the customer's evidence store. ORVIA does not fetch arbitrary references or verify a submitted digest against a file. An independent reviewer records the manual decision. The control review interval can expire evidence before its declared expiry.
3. Register risks and propose treatments. Risk acceptance requires an expiry. Reviewing a mitigation plan does not verify its execution or resolve the risk.
4. Plan an audit with 1 to 100 scoped controls and a deadline. Scope is immutable. Record up to 100 evidence requests with deadlines no later than the engagement deadline. An assignee reference records responsibility; it neither grants permission nor sends a message.
5. Respond using the control's current independently accepted manual evidence. Each response freezes the evidence reference, digest and validity as an immutable snapshot. An independent reviewer accepts or rejects the response. Replacement evidence or response requires a fresh review; old approvals remain historical.
6. Close the audit only when every scoped control has a request and every request has a current accepted response. Authors and responders cannot approve their own work. Closure binds the exact response identifiers and is immutable. Later evidence expiry affects current evidence standing, not the historical fact of closure. Closure is not certification.

For unavailable dependencies, reads show explicit retry. An unsettled mutation retains its original idempotency key; settle it before creating another decision. Never assume that a timeout means no change occurred. Request audit failure returns an unavailable response even if a business transaction committed, so use the original retry rather than a new mutation.

Evidence histories are paginated and restricted to their exact parent and tenant/entity/environment. Missing evidence is unknown, declared evidence is manual, and historical review is not a current external observation. No automatic evidence collector, audit issue lifecycle, policy lifecycle, regulator content feed or enterprise certification is delivered by these screens.

Validation scope and outstanding work are recorded in the dated V1-EXPANSION handoffs and `tracking/v1-expansion.json`. Full application packaging, browser acceptance of the new audit screen, broader GRC capabilities and release qualification remain separate gates.
