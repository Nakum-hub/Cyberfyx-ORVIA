# Scenarios SC-161 – SC-200 — Operational, Adversarial, Platform Lifecycle and Vendor Boundary

These scenarios test ORVIA itself under stress, attack, lifecycle change and vendor-boundary pressure, independent of industry. All scenarios start **NOT_RUN**.

| ID | Business context | Scenario flow | Must hold (pass criteria) | Must NOT happen | DPDPA / ORVIA refs | Linked TCs |
|---|---|---|---|---|---|---|
| SC-161 | First day: fresh install at a mid-size company | IT installs signed ZIP, claims owner, sets MFA/recovery, invites 3 admins, connects CRM in Observe mode, runs first withdrawal slice | One owner; MFA; invites scoped; Observe-only; withdrawal evidence produced; no model/GPU needed | Default credentials; enforcement active without approval | M29, V1-01 | TC-001..TC-004, TC-112, TC-405 |
| SC-162 | Two IT staff race to claim setup | Concurrent claims | One owner | Two owners | BUILD-01 | TC-002 |
| SC-163 | Owner loses phone (MFA) on holiday | Recovery with customer-held material | Recovered locally; audited | Vendor resets owner | M01 | TC-018 |
| SC-164 | Owner leaves company | Ownership transfer | Exactly one owner after transfer; old owner demoted | Two owners or zero | VM-13 | TC-012, TC-011 |
| SC-165 | Disgruntled admin tries self-elevation before exit | Self-grant super admin | Denied and audited | Elevated | ROLE-03 | TC-010 |
| SC-166 | Compromised member account used to export data | Attacker session exports | Export permission required; audited; revocation stops queued exports | Mass export unaudited | FR-M08-03 | TC-154, TC-013 |
| SC-167 | Attacker scans portal request references | Enumeration | Non-enumerating; rate limited | Existence oracle | FR-M13-02 | TC-246 |
| SC-168 | Attacker uploads polyglot file as ID proof | Upload | Blocked | Stored | M13 | TC-254 |
| SC-169 | Attacker injects XSS in grievance text | Admin views grievance | Escaped | Script runs | NFR-03 | TC-472 |
| SC-170 | SSRF via connector host field | Admin (or compromised admin) enters metadata IP | Blocked | Internal metadata fetched | M06 | TC-122 |
| SC-171 | Replayed signed deletion command | Attacker captures and replays | Rejected | Duplicate deletion | T15 | TC-115 |
| SC-172 | Agent receives command for another tenant | Misrouted command | Rejected | Executed | T14 | TC-114 |
| SC-173 | Worker crash mid-deletion across 3 systems | Crash after system 2 effect | Unknown reconciled; no duplicate destructive effect | Blind retry | T12 | TC-089, TC-105 |
| SC-174 | Network partition between API and DB | Partition during consent writes | Accepted requests durable or clearly failed; no half-state | Accepted-but-lost withdrawal | NFR-02 | TC-087 |
| SC-175 | Clock skew across servers | 5-minute skew | Ordering by authoritative epoch/version; clocks labelled | Old grant wins due to timestamp | FR-M11-02 | TC-199 |
| SC-176 | Full-disk on evidence volume | Disk fills | Safe failure; alerts; no corruption | Silent evidence loss | M32 | TC-446 |
| SC-177 | Secret store outage | Vault down | Fail closed | Plaintext fallback | M32 | TC-447 |
| SC-178 | Ransomware restore drill | Restore from older backup | Quarantine; reconciliation; measured RPO/RTO | Resurrected privileges/consents | T30 | TC-443, TC-444 |
| SC-179 | Upgrade from V1.0 to V1.1 | Signed update with migration | Data, roles, epochs, evidence intact; boundary suite rerun | Silent egress or telemetry | M31 | TC-433..TC-435 |
| SC-180 | Update interrupted by power cut | Migration interrupted | Tested recovery path | Corrupted DB, false rollback claim | FR-M31-03 | TC-432 |
| SC-181 | Tampered update from compromised mirror | Bad signature | Rejected | Applied | T43 | TC-429 |
| SC-182 | Licence expires during month-end rights backlog | Expiry mid-workflow | Continuity; restrictions preserved; export available | BLOCK becomes ALLOW; data destroyed | T29, T55 | TC-398, TC-399 |
| SC-183 | Customer downgrades edition | Enterprise to Foundation | Accepted work handed off; child safeguard still present | Safety floor weakened | FR-M28-03 | TC-403, TC-311 |
| SC-184 | Customer tries to buy "remote support" | Premium request | Not available in any edition | Enabled | FR-M28-04 | TC-401, TC-423 |
| SC-185 | Vendor engineer asks for screen share of production | Support pressure | Refused by product design; synthetic reproduction path | Remote session | T52 | TC-423 |
| SC-186 | Vendor console shows customer health | No reports sent | "Not reported" | "Healthy" | SUP-01 | TC-427 |
| SC-187 | Support fix delivered; case closed | Local gap unverified | Gap remains open | Closed as verified | SUP-09 | TC-425 |
| SC-188 | Customer edits approved diagnostic | Digest mismatch | New approval required | Sent | SUP-03 | TC-419 |
| SC-189 | Vendor staff tries customer runtime with vendor token | Token | Denied | Access | ROLE-01 | TC-015 |
| SC-190 | Commercial contact password reset | Reset | Runtime unaffected | Runtime unlocked | UX-18 | TC-020 |
| SC-191 | Mass regulatory change: new pack version | Pack updates a deadline and a notice item | Future-effective items scheduled; review before activation; historic decisions keep version | Immediate silent change | T04, T05 | TC-070, TC-071, TC-078 |
| SC-192 | Merger: two companies combine tenants | Legal entity merge | No automatic consent sharing; migration decisions reviewed | Consents pooled | FR-M02-01 | TC-035 |
| SC-193 | Divestiture: subtenant sold | Export/offboard subtenant | Local export; integrations revoked; evidence preserved | Data lost or remotely erased | FR-X-05 | TC-039, TC-403 |
| SC-194 | Board/regulator inquiry on a specific principal | Produce consent + request + evidence history | Complete chronology, versions, integrity-verifiable export | Missing receipts | Act §6(10) | TC-164, TC-155 |
| SC-195 | Privacy officer weekly review | Coverage center, gaps, overdue tasks | Accurate numerator/denominator; owners; no compliance score | Green dashboard with unknowns | M18 | TC-375..TC-381 |
| SC-196 | Internal auditor reviews last quarter | Auditor role read-only | Can read/export permitted; cannot change | Auditor edits | ROLE-08 | TC-021, TC-453 |
| SC-197 | Canary sweep across full platform | Insert canaries in every entry point; run all workflows | No canary in vendor stores, telemetry, logs, support bundles | Any leak | T47 | TC-459, TC-441 |
| SC-198 | Full offline week | Vendor unreachable 7 days | All core work continues | Any hidden dependency | T45 | TC-461 |
| SC-199 | Chaos hour on production-like env | Random kills + latency | No lost accepted work; unknowns reconciled | Duplicate deletions | NFR-02 | TC-500 |
| SC-200 | Release sign-off rehearsal | Collect evidence for all P0 cases | Every P0 has real result or explicit NOT_RUN/BLOCKED with cause; DEFERRED_V2 not counted | Unrun tests counted as passed | V1-18 | All P0 |
