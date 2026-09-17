"""Cross-verification regressions: DOCUMENT-TOOL TEST DATA in disposable copies only."""
import copy
import test_r4_regressions as r4
from test_document_tools import COPY, EV
import build_pack
import evidence_rules as rules


class DeliveryAuditTests(r4.R4Tests):
    def test_enclosing_scenario_cannot_borrow_another_scenarios_pass(self):
        r = self.record()
        c = self.jload(EV)['frozen_candidate']
        self.assertTrue(rules.test_qualifies(self.root, {'test_id': 'T21', 'records': [r]}, c))
        self.assertFalse(rules.test_qualifies(self.root, {'test_id': 'T22', 'records': [r]}, c))

    def test_duplicate_record_cannot_increase_candidate_count(self):
        self.record()
        ev = self.jload(EV)
        self.assertEqual(build_pack.summary_counts(ev, self.root)['p0_with_inspected_pass_on_candidate'], 1)
        t = next(t for t in ev['test_evidence'] if t['test_id'] == 'T21')
        t['records'].append(copy.deepcopy(t['records'][0]))
        self.assertEqual(build_pack.summary_counts(ev, self.root)['p0_with_inspected_pass_on_candidate'], 0)

    def test_generated_claim_fails_closed_and_allows_supported_control(self):
        self.set_claim_status('CL-13', 'EVIDENCED')
        self.rebuild()
        self.assertIn('UNSUPPORTED_EVIDENCED_CLAIM', (self.root / 'docs/demo/index.html').read_text())
        self.record()
        self.rebuild()
        self.assertNotIn('UNSUPPORTED_EVIDENCED_CLAIM', (self.root / 'docs/demo/index.html').read_text())

    def test_raw_report_identity_cannot_disagree_with_index(self):
        r = self.record()
        self.assertEqual(rules.record_errors(self.root, r), [])
        raw = self.jload(r['report_path'])
        for key in ('record_id', 'task_id', 'producing_lane', 'source_handoff'):
            with self.subTest(key=key):
                altered = dict(raw, **{key: 'different'})
                r['artifact_sha256'][r['report_path']] = self.put(r['report_path'], altered)
                self.assertIn('report content mismatch: ' + key, rules.record_errors(self.root, r))

    def test_raw_required_child_artifact_must_be_indexed_and_verified(self):
        r = self.record()
        child = 'docs/reviews/cowork/tools/tests/fixtures/child.json'
        raw = self.jload(r['report_path'])
        raw['artifact_paths'].append(child)
        r['artifact_sha256'][r['report_path']] = self.put(r['report_path'], raw)
        self.assertIn('report required child artifact not indexed', rules.record_errors(self.root, r))
        r['artifact_paths'].append(child)
        r['artifact_sha256'][child] = self.put(child, {'label': 'DOCUMENT-TOOL TEST DATA'})
        self.assertEqual(rules.record_errors(self.root, r), [])
        (self.root / child).unlink()
        self.assertTrue(rules.record_errors(self.root, r))

    def test_tested_consumer_needs_scoped_candidate_execution(self):
        cp = self.jload(COPY)
        for state in ('UNRESOLVED', 'CONTRACT_DESIGN_0.1.0'):
            other = copy.deepcopy(cp)
            entry = next(e for e in other['entries'] if e['binding_status'] == state)
            entry.update(consumer_binding='TESTED', consumer_evidence_ref='does-not-exist')
            self.assertTrue(rules.approval_errors(self.root, other))
        e = next(e for e in cp['entries'] if e['binding_status'] == 'ACCEPTED_CONTRACT')
        e.update(consumer_binding='TESTED', consumer_evidence_ref='does-not-exist')
        self.assertTrue(rules.approval_errors(self.root, cp))
        r = self.record(test='T29')
        raw = self.jload(r['report_path'])
        raw.update(kind='BROWSER_ACCEPTANCE', copy_ids=[e['id']])
        digest = self.put(r['report_path'], raw)
        self.edit_record(r['record_id'], artifact_sha256={r['report_path']: digest})
        e['consumer_evidence_ref'] = r['record_id']
        self.assertEqual(rules.approval_errors(self.root, cp), [])
        raw['copy_ids'] = ['unrelated.copy']
        digest = self.put(r['report_path'], raw)
        self.edit_record(r['record_id'], artifact_sha256={r['report_path']: digest})
        self.assertTrue(rules.approval_errors(self.root, cp))

    def test_reason_state_and_copy_association_match_reviewed_source(self):
        original = self.jload(COPY)
        self.assertEqual(rules.copy_safety_errors(self.root, original), [])
        for kind in ('decision', 'command', 'reconciliation'):
            for field, value in (('required_state', 'WRONG_STATE'), ('copy_id', 'signin.staff.heading')):
                with self.subTest(kind=kind, field=field):
                    bad = copy.deepcopy(original)
                    bad['reason_mappings'][kind]['records'][0][field] = value
                    self.assertTrue(rules.copy_safety_errors(self.root, bad))

    def test_overview_predicate_and_unresolved_claim_match_reviewed_source(self):
        original = self.jload(COPY)
        self.assertEqual(rules.copy_safety_errors(self.root, original), [])
        for key, value in (('unverified_predicate', 'any historical successful read'),
                           ('execution_counts_are_unresolved_counts', True)):
            with self.subTest(key=key):
                bad = copy.deepcopy(original)
                bad['overview_bindings'][key] = value
                self.assertTrue(rules.copy_safety_errors(self.root, bad))

    def test_rehearsal_start_document_must_match_candidate_and_run(self):
        r = self.rehearsal()
        c = self.jload(EV)['frozen_candidate']
        self.assertTrue(rules.rehearsal_qualifies(self.root, r, c))
        original = self.jload(r['start_state_ref'])
        for key in ('rehearsal_id', 'code_under_test_commit', *rules.IDENTITY):
            with self.subTest(key=key):
                altered = dict(original, **{key: 'different'})
                r['artifact_sha256'][r['start_state_ref']] = self.put(r['start_state_ref'], altered)
                self.assertFalse(rules.rehearsal_qualifies(self.root, r, c))

    def test_rehearsal_log_must_name_actual_performer(self):
        r = self.rehearsal()
        self.assertEqual(rules.rehearsal_errors(self.root, r), [])
        raw = self.jload(r['log_path'])
        raw['performed_by'] = 'someone else'
        r['artifact_sha256'][r['log_path']] = self.put(r['log_path'], raw)
        self.assertIn('rehearsal log content mismatch: performed_by', rules.rehearsal_errors(self.root, r))


# Reuse helpers without counting inherited r3/r4 tests a second time.
for _cls in (r4.R4Tests, r4.legacy.DocToolCase):
    for _name in _cls.__dict__:
        if _name.startswith('test_') and _name not in DeliveryAuditTests.__dict__:
            setattr(DeliveryAuditTests, _name, None)
del _cls
