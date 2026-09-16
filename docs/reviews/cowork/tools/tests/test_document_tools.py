#!/usr/bin/env python3
"""Regression tests for Cowork's document tools. DOCUMENT-TOOL TEST DATA only.

Each test copies the repository into a temporary directory and mutates only that copy. Nothing
here is ORVIA acceptance evidence, and no fixture is ever written into the real evidence index.

Run from the repository root:
    python3 -m unittest discover -s docs/reviews/cowork/tools/tests -v
"""
import copy, csv, hashlib, io, json, re, shutil, sys, tempfile, unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
REPO = TOOLS.parents[3]
FIXTURES = Path(__file__).resolve().parent / "fixtures"
sys.path.insert(0, str(TOOLS))
import build_pack  # noqa: E402
import validate_docs  # noqa: E402

EV = "docs/demo/EVIDENCE_INDEX.json"
COPY = "docs/ux/UI_COPY.json"


class DocToolCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory(prefix="doctool-")
        self.root = Path(self._tmp.name) / "repo"
        shutil.copytree(REPO, self.root, ignore=shutil.ignore_patterns(".git", "node_modules", ".local", "__pycache__"))

    def tearDown(self):
        self._tmp.cleanup()

    # helpers
    def jload(self, rel):
        return json.loads((self.root / rel).read_text(encoding="utf-8"))

    def jsave(self, rel, data):
        (self.root / rel).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    def rebuild(self):
        ev = self.jload(EV)
        ev['summary'] = build_pack.summary_counts(ev, self.root)
        self.jsave(EV, ev)
        for p, c in build_pack.build(self.root).items():
            (self.root / p).write_text(c, encoding="utf-8")

    def failed(self, mode="current"):
        return {i["check"]: i["detail"] for i in validate_docs.validate(self.root, mode).failed}

    def add_record(self, **over):
        ev = self.jload(EV)
        rec = json.loads((FIXTURES / "synthetic_record.json").read_text(encoding="utf-8"))
        rec.update(over)
        raw = self.jload(rec['report_path'])
        for key in ('code_under_test_commit','build_id','contract_version','profile','fixture_id','scenario_scope','command','started_at','finished_at','exit_code','observed_result','run_role'):
            raw[key] = rec[key]
        raw['test_ids'] = [rec['test_id']]
        raw['assertions'][0]['result'] = 'FAIL' if rec['observed_result']=='FAIL' else 'PASS'
        self.jsave(rec['report_path'],raw)
        rec['artifact_sha256'][rec['report_path']] = hashlib.sha256((self.root/rec['report_path']).read_bytes()).hexdigest()
        test = next(t for t in ev["test_evidence"] if t["test_id"] == rec["test_id"])
        test["records"].append(rec)
        ev["summary"] = build_pack.summary_counts(ev, self.root)
        self.jsave(EV, ev)
        return ev

    def set_candidate(self, commit):
        ev = self.jload(EV)
        ev["frozen_candidate"] = {"status": "IDENTIFIED", "commit": commit, "build_id": "doc-tool-fixture",
                                  "contract_version": "0.0.0-fixture", "profile": "doc-tool-fixture",
                                  "source": "DOCUMENT-TOOL TEST DATA", "fixture_id":"doc-tool-fixture", "scenario_scope":"DOCUMENT_FIXTURE_SCOPE"}
        ev["summary"] = build_pack.summary_counts(ev, self.root)
        self.jsave(EV, ev)
        st=self.jload('docs/reviews/cowork/DELIVERY_STATUS.json')
        st['candidate']=ev['frozen_candidate'].copy()
        self.jsave('docs/reviews/cowork/DELIVERY_STATUS.json',st)

    def set_claim_status(self, claim_id, status):
        p = self.root / "docs/demo/CLAIMS_REGISTER.md"
        lines = p.read_text(encoding="utf-8").split("\n")
        for i, line in enumerate(lines):
            if line.startswith(f"| {claim_id} |"):
                cells = line.split(" | ")
                cells[5] = status
                lines[i] = " | ".join(cells)
        p.write_text("\n".join(lines), encoding="utf-8")

    # ---- baseline
    def test_repository_copy_passes_current_mode(self):
        self.assertEqual(self.failed(), {})

    def test_explicit_no_evidence_snapshot_passes_historical_mode(self):
        (self.root/'HISTORICAL_FIXTURE.txt').write_text('Deliberately preserved no-application-evidence document-test snapshot; never the current checkout.')
        self.assertEqual(self.failed("historical-no-evidence"), {})

    # ---- copy traceability
    def test_unresolved_copy_without_finding_fails(self):
        d = self.jload(COPY)
        # A specific label can legitimately become accepted after a real decision.
        # Exercise the unresolved lifecycle, not an obsolete permanent label state.
        e = next(x for x in d["entries"] if x["binding_status"] == "UNRESOLVED")
        self.assertTrue(e["finding_ref"])
        e["finding_ref"] = None
        self.jsave(COPY, d)
        self.assertIn("Every UNRESOLVED entry names a finding", self.failed())

    def test_dangling_finding_reference_fails(self):
        d = self.jload(COPY)
        next(x for x in d["entries"] if x["id"] == "error.portal.503")["finding_ref"] = "F-999"
        self.jsave(COPY, d)
        f = self.failed()
        self.assertIn("Every copy finding_ref exists in FINDINGS.csv", f)
        self.assertIn("Every referenced finding ID exists", f)

    def test_unresolved_entry_pointing_to_resolved_finding_fails(self):
        d = self.jload(COPY)
        next(x for x in d["entries"] if x["id"] == "error.portal.503")["finding_ref"] = "F-004"  # RESOLVED
        self.jsave(COPY, d)
        self.assertIn("UNRESOLVED entries point to open findings", self.failed())

    def test_marking_binding_resolved_without_decision_is_caught(self):
        d = self.jload(COPY)
        e = next(x for x in d["entries"] if x["id"] == "state.reconciliation.RECONCILING.label")
        e["binding_status"], e["unresolved_binding"] = "CONTRACT_DESIGN_0.1.0", None
        self.jsave(COPY, d)
        self.assertIn("All accepted bindings have exact source-backed scoped approval", self.failed())

    def test_invented_state_value_fails(self):
        d = self.jload(COPY)
        d["entries"].append(dict(id="state.action.QUARANTINED.label", screen="STATUS", element="badge", semantic_state="QUARANTINED",
                                 audience="STAFF", text="Quarantined", placeholders=[], source_ref="x", binding_status="UNRESOLVED",
                                 unresolved_binding="test", finding_ref="F-008", contract_proposal_ref=None, error_code=None))
        self.jsave(COPY, d)
        self.assertIn("No state value outside the design contract or the cited executable proposal", self.failed())

    def test_unconditional_no_change_assurance_fails(self):
        d = self.jload(COPY)
        next(x for x in d["entries"] if x["id"] == "error.portal.503")["text"] = "We can't save choices right now. Your previous choice is unchanged."
        self.jsave(COPY, d)
        self.assertIn("No unconditional 'nothing changed' assurance in error copy", self.failed())

    # ---- generated freshness
    def test_changed_copy_makes_generated_output_stale_until_rebuilt(self):
        d = self.jload(COPY)
        next(x for x in d["entries"] if x["id"] == "state.action.PENDING.label")["text"] = "Pending (changed)"
        self.jsave(COPY, d)
        stale = build_pack.stale(self.root)
        self.assertIn("docs/prototype/UX_BRIEF.md", stale)
        self.assertIn("docs/demo/index.html", stale)
        self.assertIn("Generated sections, pack and manifest are current (build_pack --check)", self.failed())
        self.assertEqual(build_pack.main(["--root", str(self.root), "--check"]), 1)
        self.rebuild()
        self.assertEqual(build_pack.stale(self.root), [])
        self.assertEqual(self.failed(), {})
        self.assertIn("Pending (changed)", (self.root / "docs/demo/index.html").read_text(encoding="utf-8"))

    def test_hand_edited_html_is_detected(self):
        p = self.root / "docs/demo/index.html"
        p.write_text(p.read_text(encoding="utf-8").replace("NOT_READY", "READY", 1), encoding="utf-8")
        self.assertIn("docs/demo/index.html", build_pack.stale(self.root))

    def test_build_is_deterministic(self):
        a = build_pack.build(self.root)
        b = build_pack.build(self.root)
        self.assertEqual(a, b)

    # ---- structure
    def test_malformed_json_is_reported_not_crashed(self):
        (self.root / COPY).write_text("{", encoding="utf-8")
        f = self.failed()
        self.assertIn(f"JSON parses: {COPY}", f)

    def test_missing_required_field_fails(self):
        ev = self.jload(EV)
        del ev["frozen_candidate"]
        self.jsave(EV, ev)
        self.assertIn("Required fields present: EVIDENCE_INDEX.json", self.failed())

    def test_inconsistent_media_and_rehearsal_counts_fail(self):
        ev = self.jload(EV)
        ev["summary"]["screenshots"] = 2
        ev["summary"]["rehearsals_completed"] = 2
        self.jsave(EV, ev)
        self.assertIn("EVIDENCE_INDEX summary equals counts derived from its records", self.failed())

    def test_incomplete_media_entry_fails(self):
        ev = self.jload(EV)
        ev["media"].append({"media_id": "DOCTOOL-M1", "kind": "SCREENSHOT", "path": "missing.png"})
        ev["summary"] = build_pack.summary_counts(ev, self.root)
        self.jsave(EV, ev)
        self.assertIn("Media and rehearsal entries are complete", self.failed("fixture"))

    # ---- lifecycle: real progress is accepted, unsupported assertions are not
    def test_supported_nonempty_record_is_accepted(self):
        self.add_record()
        self.rebuild()
        self.assertEqual(self.failed("fixture"), {})

    def test_fixture_data_in_real_index_is_rejected(self):
        self.add_record()
        self.rebuild()
        self.assertIn("No document-tool test fixture data in the real evidence index", self.failed("current"))

    def test_recorded_failure_is_kept_as_a_result(self):
        self.add_record(observed_result="FAIL", exit_code=1)
        self.rebuild()
        self.assertEqual(self.failed("fixture"), {})
        ev = self.jload(EV)
        self.assertEqual(ev["summary"]["p0_with_inspected_pass_on_candidate"], 0)

    def test_expected_detection_recorded_as_pass_fails(self):
        self.add_record(test_id="T24", run_role="EXPECTED_DETECTION", observed_result="PASS")
        self.rebuild()
        self.assertIn("Evidence records are complete, provenance-backed and hash-matched", self.failed("fixture"))

    def test_incomplete_provenance_fails(self):
        self.add_record(build_id="")
        self.rebuild()
        self.assertIn("Evidence records are complete, provenance-backed and hash-matched", self.failed("fixture"))

    def test_artifact_hash_mismatch_fails(self):
        self.add_record()
        self.rebuild()
        art = self.root / "docs/reviews/cowork/tools/tests/fixtures/synthetic_artifact.txt"
        art.write_text("tampered\n", encoding="utf-8")
        self.assertIn("Evidence records are complete, provenance-backed and hash-matched", self.failed("fixture"))

    def test_historical_mode_rejects_results(self):
        self.add_record()
        self.rebuild()
        f = self.failed("historical-no-evidence")
        self.assertIn("[historical] no test records", f)

    # ---- claims
    def test_unsupported_evidenced_claim_fails(self):
        self.set_claim_status("CL-13", "EVIDENCED")
        self.rebuild()
        self.assertIn("Every EVIDENCED claim is supported by candidate-matched inspected evidence", self.failed())

    def test_claim_with_candidate_mismatch_fails(self):
        self.add_record()  # record commit d0c0...
        self.set_candidate("e" * 40)
        self.set_claim_status("CL-13", "EVIDENCED")  # CL-13 needs T21
        self.rebuild()
        self.assertIn("Every EVIDENCED claim is supported by candidate-matched inspected evidence", self.failed("fixture"))

    def test_claim_supported_on_matching_candidate_passes(self):
        self.add_record()
        self.set_candidate("d0c0000000000000000000000000000000000000")
        self.set_claim_status("CL-13", "EVIDENCED")
        self.rebuild()
        self.assertEqual(self.failed("fixture"), {})
        ev = self.jload(EV)
        self.assertEqual(ev["summary"]["p0_with_inspected_pass_on_candidate"], 1)

    # ---- readiness and wording
    def test_readiness_must_be_quoted_from_its_source(self):
        p = self.root / "docs/reviews/cowork/DELIVERY_STATUS.json"
        d = json.loads(p.read_text(encoding="utf-8"))
        d["canonical_readiness"]["value"] = "READY"
        d["canonical_readiness"]["quoted_text"] = "Internal demo READY"
        p.write_text(json.dumps(d, indent=2) + "\n", encoding="utf-8")
        self.rebuild()
        self.assertIn("canonical_readiness quotation appears in its source file", self.failed())

    def test_self_accepted_ticket_status_fails(self):
        p = self.root / "docs/reviews/cowork/DELIVERY_STATUS.json"
        d = json.loads(p.read_text(encoding="utf-8"))
        d["tickets"][0]["proposed_status"] = "ACCEPTED"
        p.write_text(json.dumps(d, indent=2) + "\n", encoding="utf-8")
        self.rebuild()
        f = self.failed()
        self.assertIn("Cowork never proposes accepted/complete for its own tickets", f)

    def test_optional_p0_wording_fails(self):
        p = self.root / "docs/prototype/RELEASE_CHECKLIST.md"
        p.write_text(p.read_text(encoding="utf-8") + "\nT18/T19 are optional variants.\n", encoding="utf-8")
        self.assertIn("No P0 test is described as optional", self.failed())

    def test_journey_result_must_match_canonical(self):
        p = self.root / "docs/ux/ACCEPTANCE_JOURNEYS.md"
        t = p.read_text(encoding="utf-8")
        t = re.sub(r"(\| J01 \|.*\| )NOT_RUN( \|)", r"\1PASS\2", t, count=1)
        p.write_text(t, encoding="utf-8")
        self.assertIn("Journey results match Work's canonical status", self.failed())


if __name__ == "__main__":
    unittest.main(verbosity=2)
