# Work-maintained document tools (former Cowork lane)

Run from the repository root with Python 3. These tools read documents and produce the offline pack; they never execute ORVIA or change task/acceptance results.

```sh
python3 docs/reviews/cowork/tools/build_pack.py
python3 docs/reviews/cowork/tools/build_pack.py --check
python3 docs/reviews/cowork/tools/validate_docs.py --json
python3 -m unittest discover -s docs/reviews/cowork/tools/tests -v
```

`current` is the validation lifecycle. `historical-no-evidence` only validates deliberately empty historical snapshots; it must never be used to suppress real evidence. The test-only fixture mode permits clearly labelled synthetic records in isolated temporary copies. Nothing synthetic may enter the real evidence index.

`evidence_rules.py` is shared by builder and validator so displayed qualifying counts use the same rules as claims. `EVIDENCE_INDEX.json` includes the required record schema, and synthetic fixtures demonstrate shape, not real evidence. Existing engineering records keep their original source/dirty/profile/command/result metadata and `counts_as_acceptance: false`.

Evidence identity is the exact tuple `(commit, build_id, contract_version, profile, fixture_id, scenario_scope)`. There is no implicit profile or commit equivalence. Unidentified means every identity value is null. A later relevant failed, incomplete or unreviewed run blocks an older convenient PASS. T24 requires actual normal PASS, deliberate broken-control FAIL and a later healthy PASS, with original assertions and fixture identity; expected failure is not relabelled PASS.

Current inspected evidence requires safe existing repository-relative files and matching SHA-256 for every required artifact, including original JSON reports and child logs. JSON identity, command, dates, exit/result and scope must match the index. `HISTORICAL_UNAVAILABLE` and `REPORTED_NOT_INSPECTED` availability need a dated reason; they retain historical metadata but cannot claim current INSPECTED or qualify. Missing files never silently pass hash verification. Media and required rehearsal logs/start-state references use the same path/hash boundary.

Screen implementation needs a known source inspection with source paths, hashes and scope. Browser PASS additionally needs actual matching candidate browser evidence covering that screen and an IMPLEMENTED source observation at that candidate. Unknown or absent implementation is never inferred as implemented from a mockup, screenshot name or source-only record.

Readiness comes from the exact `Readiness` row in `CURRENT_STATE.md`, with content hash and observed revision/time. A documentary revision may name its inspected base plus exact working-document SHA-256; it does not assert that changed bytes existed at the base. Mismatches fail and the builder renders INVALID_SOURCE.

Proposal acceptance is independent of consumer implementation. An accepted copy binding names exact version, scoped approval, accepted commit, decision-file hash/quote and field source. Reconciliation follows the same rule as every other proposal. Existing W00 acceptance is historical authority; r4 does not accept executable 0.3.0. Consumer NOT_IMPLEMENTED/NOT_RUN remains explicit even when semantics are accepted.

Rehearsal counters distinguish indexed entries from actual starts, aborts, completed runs, issues and candidate-qualifying completion. Qualifying runs require matching identity, inspected original execution log, documented starting state, all twelve actual step results, valid ordered times, no issues, independent unique logs/IDs and nonoverlap. A newer unsuccessful attempt prevents an old pair qualifying. Two qualifying runs are required for C02/T30, together with its other dependencies; the counter never automatically completes a task.

To reproduce inherited defects without altering the current checkout:

```sh
python3 docs/reviews/cowork/tools/tests/reproduce_r3.py
```

This requires the pinned imported base in Git history. It archives that revision into disposable fixtures and reports both positive control and misleading states accepted by the inherited validator. It is not a live evidence conversion tool. Original r3 records and author history remain intact in Git and VALIDATION.md.
