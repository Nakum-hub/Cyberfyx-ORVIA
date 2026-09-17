# DOCUMENT-TOOL TEST DATA

Everything in this folder is synthetic data for testing Cowork's document tools (`build_pack.py` and `validate_docs.py`).

- It is **not** ORVIA acceptance evidence.
- It describes no real run, build, commit or screenshot.
- The tests copy it into a temporary checkout and never write it into `docs/demo/EVIDENCE_INDEX.json`.
- The validator rejects this label if it ever appears in the real evidence index.

The commit value `d0c0...` and the build ID `doc-tool-fixture` are deliberately artificial.

## r4 fixtures

All synthetic reports, source observations, approval mutations and rehearsal/start-state logs are DOCUMENT-TOOL TEST DATA. Tests build disposable copies, preserve the current real index and require both valid positive controls and specific invalid-state failures. `synthetic_report.json` is the original fixture report whose hash/fields are checked by `synthetic_record.json`. No fixture is application evidence or a real rehearsal.
