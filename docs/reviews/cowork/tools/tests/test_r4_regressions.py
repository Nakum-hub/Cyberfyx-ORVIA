"""Paired r4 regressions. All records/approvals/logs are DOCUMENT-TOOL TEST DATA.

Positive controls prove progress can qualify; negatives mutate one relevant fact at a time.
The disposable copy never writes to the application's real evidence index.
"""
import copy
import hashlib
import json
from pathlib import Path
import test_document_tools as legacy
from test_document_tools import EV, COPY
import build_pack
import evidence_rules as rules

ST='docs/reviews/cowork/DELIVERY_STATUS.json'


class R4Tests(legacy.DocToolCase):
    # Avoid rerunning the inherited test methods; retain its fixture helpers.
    def candidate(self):
        self.set_candidate('d0c0000000000000000000000000000000000000')
        return self.jload(EV)['frozen_candidate']

    def put(self, path, value):
        f=self.root/path;f.parent.mkdir(parents=True,exist_ok=True)
        f.write_text(json.dumps(value,indent=2)+'\n')
        return hashlib.sha256(f.read_bytes()).hexdigest()

    def record(self, ident='R1', test='T21', result='PASS', role='NORMAL', minute=0):
        candidate=self.candidate()
        p=f'docs/reviews/cowork/tools/tests/fixtures/{ident}.json'
        r={'_label':'DOCUMENT-TOOL TEST DATA','record_id':ident,'test_id':test,'task_id':'B06',
           'producing_lane':'document fixture','run_role':role,'command':['document-fixture',ident],
           'exit_code':0 if result=='PASS' else 1,'started_at':f'2000-01-01T00:{minute:02d}:00Z',
           'finished_at':f'2000-01-01T00:{minute:02d}:10Z','reviewed_at':f'2000-01-01T00:{minute:02d}:11Z',
           'code_under_test_commit':candidate['commit'],**{k:candidate[k] for k in rules.IDENTITY},
           'observed_result':result,'review_status':'INSPECTED','reviewed_by':'document fixture',
           'source_handoff':'docs/reviews/cowork/tools/tests/fixtures/README.md','limitations':['DOCUMENT-TOOL TEST DATA'],
           'availability':'VERIFIED_LOCAL','report_path':p,'artifact_paths':[p]}
        raw={**r,'kind':'APPLICATION_ACCEPTANCE','coverage':'FULL_SCENARIO','test_ids':[test],
             'assertions':[{'id':'DOC_ASSERT','expected':'synthetic control','actual':'synthetic result','result':result}]}
        if role=='EXPECTED_DETECTION':
            r['fault_fixture_id']='deliberately-broken-doc-fixture';raw.update(fault_fixture_id=r['fault_fixture_id'],deliberate_fault=True)
        r['artifact_sha256']={p:self.put(p,raw)}
        ev=self.jload(EV);next(t for t in ev['test_evidence'] if t['test_id']==test)['records'].append(r);self.jsave(EV,ev)
        return r

    def edit_record(self, ident, **values):
        ev=self.jload(EV)
        r=next(r for t in ev['test_evidence'] for r in t['records'] if r['record_id']==ident)
        r.update(values);self.jsave(EV,ev);return r

    def test_readiness_only_value_mismatch_and_positive(self):
        st=self.jload(ST)
        for k in ('canonical_readiness','production_readiness'):
            with self.subTest(k=k):
                self.assertEqual(rules.readiness_errors(self.root,k,st[k]),[])
                altered=dict(st[k],value='READY')
                self.assertIn('readiness value disagrees with authoritative field',rules.readiness_errors(self.root,k,altered))
                d=copy.deepcopy(st);d[k]=altered;self.jsave(ST,d);self.rebuild()
                self.assertIn(k+' value and source revision agree',self.failed('fixture'))
                html=(self.root/'docs/demo/index.html').read_text()
                self.assertIn('INVALID_SOURCE',html)
                self.jsave(ST,st)

    def test_readiness_revision_time_and_positive(self):
        r=self.jload(ST)['canonical_readiness']
        for key,value in [('source_sha256','a'*64),('observed_at','tomorrow'),('source_commit','main'),('source_path','../outside')]:
            with self.subTest(key=key): self.assertTrue(rules.readiness_errors(self.root,'canonical_readiness',dict(r,**{key:value})))
        self.assertFalse(rules.readiness_errors(self.root,'canonical_readiness',r))

    def test_candidate_dimensions_and_positive(self):
        self.record();c=self.jload(EV)['frozen_candidate'];self.set_claim_status('CL-13','EVIDENCED')
        self.rebuild();self.assertEqual(self.failed('fixture'),{})
        for k in rules.IDENTITY:
            with self.subTest(k=k):
                ev=self.jload(EV);ev['frozen_candidate']=dict(c,**{k:'different'});self.jsave(EV,ev)
                st=self.jload(ST);st['candidate']=ev['frozen_candidate'].copy();self.jsave(ST,st);self.rebuild()
                self.assertEqual(self.jload(EV)['summary']['p0_with_inspected_pass_on_candidate'],0)
                self.assertIn('Every EVIDENCED claim is supported by candidate-matched inspected evidence',self.failed('fixture'))

    def test_candidate_cross_file_contradiction(self):
        self.record();st=self.jload(ST);st['candidate']['status']='NOT_IDENTIFIED';self.jsave(ST,st)
        self.assertIn('Candidate identities agree across status and evidence',self.failed('fixture'))

    def test_missing_candidate_dimension_is_rejected(self):
        c=self.candidate()
        for key in rules.IDENTITY:
            with self.subTest(key=key):self.assertTrue(rules.candidate_errors(dict(c,**{key:None})))
        self.assertEqual(rules.candidate_errors(c),[])

    def test_later_failure_or_unreviewed_run_blocks_older_pass(self):
        self.record('OLD',minute=0);self.record('NEW',result='FAIL',minute=1)
        self.set_claim_status('CL-13','EVIDENCED');self.rebuild()
        self.assertEqual(self.jload(EV)['summary']['p0_with_inspected_pass_on_candidate'],0)
        self.assertIn('Every EVIDENCED claim is supported by candidate-matched inspected evidence',self.failed('fixture'))
        self.record('HEALTHY',role='HEALTHY_RERUN',minute=2);self.rebuild();self.assertEqual(self.failed('fixture'),{})
        self.edit_record('HEALTHY',review_status='REPORTED_NOT_INSPECTED');self.rebuild()
        self.assertEqual(self.jload(EV)['summary']['p0_with_inspected_pass_on_candidate'],0)

    def test_t24_requires_real_failed_assertion_and_both_controls(self):
        self.record('DETECTION','T24','FAIL','EXPECTED_DETECTION',1)
        self.record('RERUN','T24','PASS','HEALTHY_RERUN',2)
        ev=self.jload(EV);t=next(t for t in ev['test_evidence'] if t['test_id']=='T24')
        self.assertFalse(rules.test_qualifies(self.root,t,ev['frozen_candidate']))
        self.record('CONTROL','T24','PASS','NORMAL',0);self.rebuild()
        self.assertEqual(self.jload(EV)['summary']['p0_with_inspected_pass_on_candidate'],1)
        r=self.edit_record('DETECTION',fault_fixture_id=None)
        self.assertTrue(rules.record_errors(self.root,r));self.rebuild()
        self.assertEqual(self.jload(EV)['summary']['p0_with_inspected_pass_on_candidate'],0)

    def test_artifact_missing_hash_absent_reference_and_positive(self):
        r=self.record();self.assertEqual(rules.record_errors(self.root,r),[])
        for change in [{'artifact_paths':[]},{'artifact_sha256':{}},{'report_path':'missing.json'},
                       {'artifact_paths':['missing.json'],'artifact_sha256':{'missing.json':'a'*64}},
                       {'artifact_sha256':{r['report_path']:'a'*64}}]:
            with self.subTest(change=change):self.assertTrue(rules.record_errors(self.root,dict(r,**change)))
        raw=self.jload(r['report_path']);raw['build_id']='different';r['artifact_sha256'][r['report_path']]=self.put(r['report_path'],raw)
        self.assertIn('report content mismatch: build_id',rules.record_errors(self.root,r))

    def test_artifact_roots_reject_traversal_absolute_url_symlink(self):
        r=self.record();target=self.root.parent/'outside.json';target.write_text('{}')
        link=self.root/'escape.json';link.symlink_to(target)
        for p in ['../outside.json',str(target),'https://example.invalid/test','escape.json','C:\\secret']:
            with self.subTest(path=p):
                with self.assertRaises(ValueError):rules.local_file(self.root,p)
        self.assertTrue(rules.local_file(self.root,r['report_path']).is_file())

    def test_historical_unavailable_retained_but_not_qualified(self):
        r=self.record();r=self.edit_record('R1',availability='HISTORICAL_UNAVAILABLE',review_status='HISTORICAL_INSPECTION',
            availability_note='Original artifact no longer supplied',availability_observed_at='2000-01-02T00:00:00Z')
        (self.root/r['report_path']).unlink()
        self.assertEqual(rules.record_errors(self.root,r),[])
        self.assertFalse(rules.qualified(self.root,r,self.jload(EV)['frozen_candidate']))

    def test_engineering_missing_reference_file_hash_content_and_control(self):
        r=self.jload(EV)['engineering_reports']['records'][0]
        self.assertEqual(rules.engineering_errors(self.root,r),[])
        for altered in [dict(r,artifact_paths=[]),dict(r,report_path='missing.json'),dict(r,exit_code=999),dict(r,artifact_sha256={})]:
            with self.subTest(altered=altered.get('exit_code')):self.assertTrue(rules.engineering_errors(self.root,altered))
        (self.root/r['artifact_paths'][0]).unlink();self.assertTrue(rules.engineering_errors(self.root,r))

    def test_screen_unknown_and_source_only_browser_claim_fail(self):
        st=self.jload(ST);ev=self.jload(EV);self.assertEqual(rules.screen_errors(self.root,st['screens'],ev),[])
        for values in [dict(evidence='UNKNOWN'),dict(tested='PASS'),dict(implementation='IMPLEMENTED')]:
            with self.subTest(values=values):
                screens=copy.deepcopy(st['screens']);screens[0].update(values)
                self.assertTrue(rules.screen_errors(self.root,screens,ev))
        screens=[dict(st['screens'][0],implementation='UNKNOWN',evidence=None,tested='NOT_RUN')]
        self.assertEqual(rules.screen_errors(self.root,screens,ev),[])

    def test_screen_browser_positive_requires_scope(self):
        r=self.record(test='T29');raw=self.jload(r['report_path']);raw.update(kind='BROWSER_ACCEPTANCE',screen_ids=['W-SIGNIN'])
        digest=self.put(r['report_path'],raw);self.edit_record('R1',artifact_sha256={r['report_path']:digest})
        st=self.jload(ST);screen=dict(st['screens'][0],implementation='IMPLEMENTED',tested='PASS',browser_evidence_ref='R1')
        ev=self.jload(EV);src=next(s for s in ev['source_inspections'] if s['evidence_id']==screen['evidence'])
        src['commit']=ev['frozen_candidate']['commit'];src['observed']['screens'][screen['id']]['implementation']='IMPLEMENTED'
        self.jsave(EV,ev)
        self.assertEqual(rules.screen_errors(self.root,[screen],self.jload(EV)),[])
        screen['implementation']='NOT_IMPLEMENTED';self.assertTrue(rules.screen_errors(self.root,[screen],self.jload(EV)))
        screen['implementation']='IMPLEMENTED'
        screen['id']='P-CHOICES';self.assertTrue(rules.screen_errors(self.root,[screen],self.jload(EV)))

    def test_approval_pair_for_reconciliation_and_other_proposal(self):
        cp=self.jload(COPY)
        for ident in ('state.reconciliation.RECONCILING.label','permission.both_sessions'):
            e=next(e for e in cp['entries'] if e['id']==ident)
            self.assertEqual(rules.approval_errors(self.root,dict(cp,entries=[e])),[])
            for change in [dict(approval_ref=None),dict(binding_version='0.3.0'),dict(binding_status='CONTRACT_DESIGN_0.1.0')]:
                with self.subTest(ident=ident,change=change):
                    self.assertTrue(rules.approval_errors(self.root,dict(cp,entries=[dict(e,**change)])))
            pending=dict(e,binding_status='UNRESOLVED',unresolved_binding='DOCUMENT-TOOL TEST DATA pending decision',approval_ref=None)
            self.assertEqual(rules.approval_errors(self.root,dict(cp,entries=[pending])),[])

    def rehearsal(self, ident='RH1', minute=1):
        c=self.candidate();p=f'docs/reviews/cowork/tools/tests/fixtures/{ident}-log.json'
        state=f'docs/reviews/cowork/tools/tests/fixtures/{ident}-start.json'
        r={'_label':'DOCUMENT-TOOL TEST DATA','rehearsal_id':ident,'code_under_test_commit':c['commit'],
           **{k:c[k] for k in rules.IDENTITY},'status':'COMPLETED','result':'PASS','issues':[],
           'started_at':f'2000-01-01T01:{minute:02d}:00Z','finished_at':f'2000-01-01T01:{minute:02d}:30Z',
           'reviewed_at':f'2000-01-01T01:{minute:02d}:31Z','performed_by':'doc fixture operator','review_status':'INSPECTED',
           'reviewed_by':'doc fixture reviewer','start_state_ref':state,'log_path':p,'artifact_paths':[p,state],
           'availability':'VERIFIED_LOCAL','media_paths':[]}
        log={**r,'kind':'REHEARSAL_EXECUTION','steps':[{'step':i,'actual':'DOCUMENT-TOOL TEST DATA','result':'PASS'} for i in range(1,13)]}
        r['artifact_sha256']={p:self.put(p,log),state:self.put(state,{'label':'DOCUMENT-TOOL TEST DATA','documented_start':'synthetic controlled start'})}
        return r

    def test_rehearsal_two_genuine_controls_and_counters(self):
        a=self.rehearsal('RH1',1);b=self.rehearsal('RH2',2);ev=self.jload(EV);ev['rehearsals']=[a,b]
        self.assertEqual(rules.rehearsal_counts(self.root,ev)['rehearsals_candidate_qualifying'],2)
        self.assertEqual(rules.rehearsal_counts(self.root,ev)['rehearsals_completed'],2)
        ev['rehearsals'].append(dict(a,status='PLANNED',rehearsal_id='PLAN',started_at=None,finished_at=None,result=None))
        cnt=rules.rehearsal_counts(self.root,ev);self.assertEqual(cnt['rehearsals_indexed'],3);self.assertEqual(cnt['rehearsals_candidate_qualifying'],2)

    def test_rehearsal_invalid_dates_abort_wrong_candidate_profile_and_duplicates(self):
        r=self.rehearsal();c=self.jload(EV)['frozen_candidate']
        self.assertTrue(rules.rehearsal_qualifies(self.root,r,c))
        for change in [dict(started_at='invalid'),dict(finished_at='1999-01-01T00:00:00Z'),dict(status='ABORTED'),
                       dict(result='UNSUPPORTED'),dict(review_status='MADE_UP'),
                       dict(code_under_test_commit='e'*40),dict(profile='other'),dict(build_id='other'),dict(review_status='REPORTED_NOT_INSPECTED'),dict(issues=['defect'])]:
            with self.subTest(change=change):self.assertFalse(rules.rehearsal_qualifies(self.root,dict(r,**change),c))
        ev=self.jload(EV);ev['rehearsals']=[r,copy.deepcopy(r)];self.jsave(EV,ev)
        self.assertEqual(rules.rehearsal_counts(self.root,ev)['rehearsals_candidate_qualifying'],0)
        self.assertIn('Media and rehearsal entries are complete',self.failed('fixture'))
        (self.root/r['log_path']).unlink();self.assertTrue(rules.rehearsal_errors(self.root,r))

    def test_rehearsal_completed_with_issues_retains_history(self):
        r=self.rehearsal();r.update(status='COMPLETED_WITH_ISSUES',result='FAIL',issues=['observed defect'])
        log=self.jload(r['log_path']);log.update(status=r['status'],result=r['result'],issues=r['issues']);log['steps'][0]['result']='FAIL'
        r['artifact_sha256'][r['log_path']]=self.put(r['log_path'],log)
        ev=self.jload(EV);ev['rehearsals']=[r];cnt=rules.rehearsal_counts(self.root,ev)
        self.assertEqual(cnt['rehearsals_completed'],1);self.assertEqual(cnt['rehearsals_completed_with_issues'],1)
        self.assertEqual(cnt['rehearsals_candidate_qualifying'],0)

    def test_remaining_copy_safety(self):
        c={e['id']:e for e in self.jload(COPY)['entries']}
        self.assertEqual(c['state.decision.INDETERMINATE.label']['text'],'Decision unavailable')
        self.assertNotIn('nothing was sent',c['state.decision.INDETERMINATE.detail']['text'])
        self.assertIn('does not authorise processing',c['state.decision.INDETERMINATE.detail']['text'])
        self.assertNotIn('separate browser window',c['permission.both_sessions']['text'])
        self.assertIn('independent browser profile',c['permission.both_sessions']['text'])
        self.assertIn('assertions and failures already recorded',c['state.test.ERROR.detail']['text'])


# Inherit setup/helpers only, avoiding duplicate execution/count inflation of r3 tests.
for _name in list(legacy.DocToolCase.__dict__):
    if _name.startswith('test_') and _name not in R4Tests.__dict__:
        setattr(R4Tests,_name,None)
