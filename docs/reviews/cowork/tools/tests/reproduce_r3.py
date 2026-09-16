#!/usr/bin/env python3
"""Reproduce inherited r3 defects in a disposable DOCUMENT-TOOL TEST DATA checkout.

Uses the exact imported baseline, never writes real application evidence. Run from repo root.
"""
import io, json, subprocess, sys, tarfile, tempfile
from pathlib import Path

BASE = '0a2671640223087626d8e422396efb1363981ed9'
REPO = Path(__file__).resolve().parents[5]
EV = 'docs/demo/EVIDENCE_INDEX.json'
ST = 'docs/reviews/cowork/DELIVERY_STATUS.json'
CP = 'docs/ux/UI_COPY.json'

with tempfile.TemporaryDirectory(prefix='orvia-r3-document-fixture-') as td:
    root = Path(td)
    data = subprocess.check_output(['git', 'archive', BASE], cwd=REPO)
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        archive.extractall(root, filter='data')
    sys.path.insert(0, str(root / 'docs/reviews/cowork/tools'))
    import build_pack as b
    import validate_docs as v
    read = lambda p: json.loads((root / p).read_text())
    def save(p, d):
        (root / p).write_text(json.dumps(d, indent=2) + '\n')
    # Only fixture source citations are refreshed to the authentic inspected-base wording.
    st = read(ST)
    st['canonical_readiness']['quoted_text'] = 'Internal-demo NOT_READY'
    st['production_readiness']['quoted_text'] = 'Production security/legal/supply-chain/full recovery NOT_ASSESSED'
    save(ST, st)
    initial = {p: (root / p).read_bytes() for p in (EV, ST, CP)}
    results = []
    def run(label, mutate):
        for p, content in initial.items(): (root / p).write_bytes(content)
        mutate()
        ev = read(EV); ev['summary'] = b.summary_counts(ev); save(EV, ev)
        for p, content in b.build(root).items(): (root / p).write_text(content)
        r = v.validate(root, 'fixture')
        results.append({'case': label, 'passed': len(r.items)-len(r.failed),
                        'total': len(r.items), 'failures': r.failed, 'summary': ev['summary']})
    def change(p, fn):
        d = read(p); fn(d); save(p, d)
    run('positive inherited fixture control', lambda: None)
    run('readiness value ONLY changed, authentic quotation retained',
        lambda: change(ST, lambda d: d['canonical_readiness'].update(value='READY')))
    def mismatched_candidate():
        rec = read('docs/reviews/cowork/tools/tests/fixtures/synthetic_record.json')
        def update(d):
            d['frozen_candidate'] = {'status':'IDENTIFIED','commit':rec['code_under_test_commit'],
                'build_id':'different-build','profile':'different-profile','contract_version':'9.9.9','source':'DOCUMENT-TOOL TEST DATA'}
            next(t for t in d['test_evidence'] if t['test_id']=='T21')['records'] = [rec]
        change(EV, update)
    run('same SHA but different build/profile/contract; inconsistent status identity', mismatched_candidate)
    run('screen browser PASS backed only by source inspection',
        lambda: change(ST, lambda d: d['screens'][0].update(implementation='IMPLEMENTED',tested='PASS')))
    run('screen browser PASS with unknown reference',
        lambda: change(ST, lambda d: d['screens'][0].update(implementation='IMPLEMENTED',tested='PASS',evidence='UNKNOWN')))
    def missing_artifact():
        d=read(EV); r=d['engineering_reports']['records'][0]
        r['artifact_paths']=['nonexistent-document-fixture.json'];r['artifact_sha256']={r['artifact_paths'][0]:'a'*64};save(EV,d)
    run('missing engineering artifact treated as verified', missing_artifact)
    def false_rehearsals():
        d=read(EV); r={'rehearsal_id':'DUPLICATE','code_under_test_commit':'d'*40,'build_id':'wrong',
            'profile':'wrong','started_at':'invalid','finished_at':'invalid','log_path':'nonexistent.log',
            'issues':[],'performed_by':'DOCUMENT-TOOL TEST DATA','status':'ABORTED'}
        d['rehearsals']=[r,r.copy()];save(EV,d)
    run('duplicate aborted rehearsals with invalid dates and missing logs', false_rehearsals)
    def proposal(ident):
        change(CP, lambda d: next(e for e in d['entries'] if e['id']==ident).update(binding_status='ACCEPTED_CONTRACT',unresolved_binding=None))
    run('non-reconciliation proposal accepted without decision',lambda:proposal('permission.both_sessions'))
    run('reconciliation accepted state permanently rejected by old rule',lambda:proposal('state.reconciliation.RECONCILING.label'))
    print(json.dumps({'label':'DOCUMENT-TOOL TEST DATA; failures demonstrate inherited defects, not application results',
        'base':BASE,'fixture_normalisation':'Authentic readiness quotations refreshed; generated outputs rebuilt only inside disposable fixture.',
        'cases':results},indent=2))
