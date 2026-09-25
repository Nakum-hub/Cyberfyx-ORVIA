"""Shared r4 document evidence rules. No network, runtime execution or acceptance writes."""
import hashlib
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path, PurePosixPath

IDENTITY = ('build_id', 'contract_version', 'profile', 'fixture_id', 'scenario_scope')
HEX40 = re.compile(r'^[a-f0-9]{40}$')
HEX64 = re.compile(r'^[a-f0-9]{64}$')
AVAILABLE = 'VERIFIED_LOCAL'
UNAVAILABLE = {'HISTORICAL_UNAVAILABLE', 'REPORTED_NOT_INSPECTED'}


def date(value):
    try:
        d = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return d if d.tzinfo is not None else None
    except (ValueError, TypeError, AttributeError):
        return None


def ordered(start, finish):
    a, b = date(start), date(finish)
    return a is not None and b is not None and a <= b


def local_file(root, value):
    """Only existing regular files inside the checkout; no URL, traversal or symlink escape."""
    if not isinstance(value, str) or not value or '\\' in value or ':' in value:
        raise ValueError('unsafe or absent local reference')
    p = PurePosixPath(value)
    if p.is_absolute() or '..' in p.parts or str(p) != value:
        raise ValueError('unsafe local reference')
    root = Path(root).resolve()
    f = (root / value).resolve()
    if not f.is_relative_to(root) or not f.is_file():
        raise ValueError('missing or out-of-root artifact: ' + value)
    return f


def committed_bytes(root, path, commit):
    """Read a pinned historical source without relabelling today's moved file.

    Git is called with an argument vector, and both the commit and repository
    path are validated before the lookup. The caller must still compare the
    recorded hash or exact quotation.
    """
    if not HEX40.fullmatch(str(commit)) or not isinstance(path, str) or not path or '\\' in path or ':' in path:
        raise ValueError('unsafe historical source reference')
    candidate = PurePosixPath(path)
    if candidate.is_absolute() or '..' in candidate.parts or str(candidate) != path:
        raise ValueError('unsafe historical source reference')
    result = subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=root, capture_output=True, check=False)
    if result.returncode != 0:
        raise ValueError('historical source absent at recorded commit: ' + path)
    return result.stdout


def source_bytes(root, path, commit, expected_hash=None):
    """Prefer a matching live source; otherwise verify the pinned Git source."""
    try:
        current = local_file(root, path).read_bytes()
        if expected_hash is None or hashlib.sha256(current).hexdigest() == expected_hash:
            return current
    except (ValueError, OSError):
        pass
    return committed_bytes(root, path, commit)


def identity(record, candidate=False):
    return (record.get('commit' if candidate else 'code_under_test_commit'),
            *(record.get(k) for k in IDENTITY))


def candidate_errors(c):
    if c.get('status') == 'NOT_IDENTIFIED':
        return [] if all(x is None for x in identity(c, True)) else ['unidentified candidate carries identity']
    if c.get('status') != 'IDENTIFIED' or not HEX40.fullmatch(str(c.get('commit', ''))):
        return ['invalid candidate status/commit']
    if not all(isinstance(c.get(k), str) and c[k].strip() for k in IDENTITY) or not c.get('source'):
        return ['incomplete candidate build/contract/profile/fixture/scenario provenance']
    return []


def matches(record, candidate):
    return (candidate.get('status') == 'IDENTIFIED' and not candidate_errors(candidate)
            and identity(record) == identity(candidate, True))


def artifacts(root, record):
    paths, hashes = record.get('artifact_paths'), record.get('artifact_sha256')
    if not isinstance(paths, list) or not paths or len(set(paths)) != len(paths) or not isinstance(hashes, dict):
        return ['absent or duplicate required artifact references']
    if set(paths) != set(hashes):
        return ['artifact references and hash keys disagree']
    errors = []
    for p in paths:
        try:
            f = local_file(root, p)
            if not HEX64.fullmatch(str(hashes[p])) or hashlib.sha256(f.read_bytes()).hexdigest() != hashes[p]:
                errors.append('artifact hash mismatch: ' + p)
        except (ValueError, OSError) as e:
            errors.append(str(e))
    return errors


def available_record(root, r):
    classification = r.get('availability', AVAILABLE)
    if classification in UNAVAILABLE:
        if not r.get('availability_note') or not date(r.get('availability_observed_at')):
            return ['unavailable evidence needs dated classification and limitation']
        if r.get('review_status') == 'INSPECTED':
            return ['unavailable record cannot claim current INSPECTED status']
        # Retain safe references, but never resolve arbitrary URLs or call them verified.
        for p in r.get('artifact_paths', []):
            if not isinstance(p, str) or ':' in p or '\\' in p or PurePosixPath(p).is_absolute() or '..' in PurePosixPath(p).parts:
                return ['unsafe unavailable artifact reference']
        return []
    if classification != AVAILABLE:
        return ['unknown availability classification']
    return artifacts(root, r)


def record_errors(root, r):
    errors = available_record(root, r)
    for k in ('record_id', 'test_id', 'task_id', 'producing_lane', 'command', 'source_handoff', *IDENTITY):
        if not r.get(k): errors.append('incomplete provenance: ' + k)
    if not HEX40.fullmatch(str(r.get('code_under_test_commit', ''))): errors.append('invalid source commit')
    if not date(r.get('started_at')): errors.append('invalid start date')
    if r.get('observed_result') != 'RUNNING' and not ordered(r.get('started_at'), r.get('finished_at')):
        errors.append('invalid execution interval')
    if r.get('review_status', '').startswith('INSPECTED'):
        if not r.get('reviewed_by') or not ordered(r.get('finished_at'), r.get('reviewed_at')):
            errors.append('invalid review provenance')
    if r.get('observed_result') == 'PASS' and r.get('exit_code') != 0: errors.append('PASS with nonzero exit')
    if r.get('run_role') == 'EXPECTED_DETECTION' and r.get('observed_result') != 'FAIL':
        errors.append('expected detection must retain actual FAIL')
    if r.get('availability', AVAILABLE) in UNAVAILABLE:
        return errors
    try:
        local_file(root, r.get('source_handoff'))
        report_path = r.get('report_path')
        if report_path not in r.get('artifact_paths', []): raise ValueError('report absent from required artifacts')
        report = json.loads(local_file(root, report_path).read_text())
        for k in ('record_id', 'task_id', 'producing_lane', 'source_handoff', 'code_under_test_commit', *IDENTITY, 'command', 'started_at', 'finished_at', 'exit_code', 'observed_result', 'run_role'):
            if report.get(k) != r.get(k): errors.append('report content mismatch: ' + k)
        children = report.get('artifact_paths', [])
        if not isinstance(children, list) or not all(isinstance(p, str) for p in children) or not set(children).issubset(r.get('artifact_paths', [])):
            errors.append('report required child artifact not indexed')
        if r.get('test_id') not in report.get('test_ids', []): errors.append('report test scope mismatch')
        if report.get('kind') not in ('APPLICATION_ACCEPTANCE', 'BROWSER_ACCEPTANCE') or report.get('coverage') != 'FULL_SCENARIO':
            errors.append('report is not full application/browser scenario evidence')
        assertions = report.get('assertions')
        if not isinstance(assertions, list) or not assertions or not all(isinstance(a, dict) and all(k in a for k in ('id','expected','actual','result')) for a in assertions):
            errors.append('missing recorded assertions')
        elif r.get('observed_result') == 'PASS' and any(a['result'] != 'PASS' for a in assertions):
            errors.append('PASS conceals failed/incomplete assertion')
        elif r.get('observed_result') == 'FAIL' and not any(a['result'] == 'FAIL' for a in assertions):
            errors.append('FAIL without failed assertion')
        if r.get('run_role') == 'EXPECTED_DETECTION' and (not report.get('deliberate_fault') or not r.get('fault_fixture_id') or report.get('fault_fixture_id') != r.get('fault_fixture_id')):
            errors.append('expected detection lacks deliberate fixture identity')
    except (ValueError, OSError, TypeError) as e:
        errors.append(str(e))
    return errors


def qualified(root, r, candidate):
    return (matches(r, candidate) and r.get('availability', AVAILABLE) == AVAILABLE
            and r.get('review_status') == 'INSPECTED' and r.get('observed_result') == 'PASS'
            and r.get('run_role') in ('NORMAL', 'HEALTHY_RERUN') and not record_errors(root, r))


def test_qualifies(root, test, candidate, all_tests=None):
    records = test.get('records', [])
    # Generation uses this rule too, before the full validator runs. Fail closed on
    # misfiled or ambiguous records instead of rendering a misleading green count.
    if not test.get('test_id') or any(r.get('test_id') != test['test_id'] for r in records): return False
    indexed = all_tests if all_tests is not None else [test]
    if sum(t.get('test_id') == test['test_id'] for t in indexed) != 1: return False
    ids = [r.get('record_id') for t in indexed for r in t.get('records', [])]
    if any(not r.get('record_id') or ids.count(r['record_id']) != 1 for r in records): return False
    recs = [r for r in test.get('records', []) if matches(r, candidate)]
    normal = [r for r in recs if r.get('run_role') != 'EXPECTED_DETECTION']
    if not normal or any(not date(r.get('started_at')) or not date(r.get('finished_at')) for r in normal): return False
    # A later failure, error or unreviewed run cannot be hidden behind an older PASS.
    latest_time = max(date(r['finished_at']) for r in normal)
    latest = [r for r in normal if date(r['finished_at']) == latest_time]
    if not all(qualified(root, r, candidate) for r in latest): return False
    if test.get('test_id') == 'T24':
        detections = [r for r in recs if r.get('run_role') == 'EXPECTED_DETECTION' and r.get('observed_result') == 'FAIL'
                      and r.get('review_status') == 'INSPECTED' and r.get('availability', AVAILABLE) == AVAILABLE
                      and not record_errors(root, r)]
        all_detections = [r for r in recs if r.get('run_role') == 'EXPECTED_DETECTION']
        if not all_detections or any(not date(r.get('finished_at')) for r in all_detections): return False
        newest = max(date(r['finished_at']) for r in all_detections)
        detections = [r for r in detections if date(r['finished_at']) == newest]
        return any(any(qualified(root, a, candidate) and a.get('run_role') == 'NORMAL' and date(a['finished_at']) <= date(d['started_at']) for a in recs)
                   and any(qualified(root, a, candidate) and a.get('run_role') == 'HEALTHY_RERUN' and date(d['finished_at']) <= date(a['started_at']) for a in latest)
                   for d in detections)
    return True


def engineering_errors(root, r):
    errors = available_record(root, r)
    if r.get('counts_as_acceptance') is not False: errors.append('engineering report cannot count as acceptance')
    if r.get('availability', AVAILABLE) in UNAVAILABLE: return errors
    try:
        report_path = r.get('report_path')
        if report_path not in r.get('artifact_paths', []): raise ValueError('engineering report reference missing')
        report = json.loads(local_file(root, report_path).read_text())
        for k in ('exit_code', 'source_commit', 'profile', 'started_at', 'finished_at'):
            if report.get(k) != r.get(k): errors.append('engineering report content mismatch: ' + k)
        cmd = report.get('command')
        if (' '.join(cmd) if isinstance(cmd, list) else cmd) != r.get('command'): errors.append('engineering command mismatch')
        if report.get('result') != r.get('reported_result'): errors.append('engineering result mismatch')
        if not set(report.get('artifact_paths', [])).issubset(r.get('artifact_paths', [])): errors.append('engineering required child artifact not indexed')
    except (ValueError, OSError, TypeError) as e:
        errors.append(str(e))
    return errors


def readiness_errors(root, key, r):
    errors = []
    try:
        if r.get('source_path') != 'CURRENT_STATE.md': raise ValueError('readiness authority must be CURRENT_STATE.md')
        data = local_file(root, r['source_path']).read_bytes()
        if hashlib.sha256(data).hexdigest() != r.get('source_sha256'): errors.append('readiness source revision hash mismatch')
        if not HEX40.fullmatch(str(r.get('source_commit',''))) or not date(r.get('observed_at')): errors.append('missing source revision/observation time')
        rows = re.findall(r'^\| Readiness \| (.+) \|\r?$', data.decode(), re.M)
        if len(rows) != 1: raise ValueError('ambiguous readiness field')
        pattern = (r'^Internal-demo (NOT_READY|PARTIAL|READY);' if key == 'canonical_readiness'
                   else r'Production security/legal/supply-chain/full recovery (NOT_ASSESSED|NOT_READY|PARTIAL|READY)\b')
        m = re.search(pattern, rows[0])
        if not m or r.get('value') != m[1]: errors.append('readiness value disagrees with authoritative field')
        quote = r.get('quoted_text', '')
        if not quote or quote not in rows[0] or not m or m[0].rstrip(';') not in quote:
            errors.append('readiness quotation does not identify the mapped authoritative value')
    except (ValueError, OSError) as e:
        errors.append(str(e))
    return errors


def consumer_evidence_errors(root, entry):
    """A reference alone is not proof that a consumer was tested."""
    try:
        ev = json.loads(local_file(root, 'docs/demo/EVIDENCE_INDEX.json').read_text())
        records = [(t, r) for t in ev.get('test_evidence', []) for r in t.get('records', [])
                   if r.get('record_id') == entry.get('consumer_evidence_ref')]
        if len(records) != 1: raise ValueError('tested consumer lacks unique execution evidence')
        test, rec = records[0]
        candidate = ev.get('frozen_candidate', {})
        if not qualified(root, rec, candidate) or not test_qualifies(root, test, candidate, ev['test_evidence']):
            raise ValueError('tested consumer lacks current candidate-qualified execution')
        raw = json.loads(local_file(root, rec['report_path']).read_text())
        if entry['id'] not in raw.get('copy_ids', []): raise ValueError('consumer evidence does not cover this copy ID')
    except (ValueError, OSError, TypeError) as err:
        return [str(err)]
    return []


def approval_errors(root, copy):
    approvals = {a.get('id'): a for a in copy.get('contract_approvals', [])}
    errors = []
    for e in copy.get('entries', []):
        # Execution evidence is required independently of semantic approval state.
        if e.get('consumer_binding') == 'TESTED':
            errors.extend(e['id'] + ': ' + p for p in consumer_evidence_errors(root, e))
        accepted = e.get('binding_status') == 'ACCEPTED_CONTRACT'
        if e.get('contract_proposal_ref') and not accepted and e.get('binding_status') != 'UNRESOLVED':
            errors.append(e['id'] + ': proposal bypasses approval lifecycle')
        if not accepted: continue
        a = approvals.get(e.get('approval_ref'))
        if not a or a.get('version') != e.get('binding_version') or e['id'] not in a.get('copy_ids', []):
            errors.append(e['id'] + ': missing or wrong-version scoped approval'); continue
        try:
            data = local_file(root, a.get('decision_path')).read_bytes()
            if hashlib.sha256(data).hexdigest() != a.get('decision_sha256'): raise ValueError('approval source hash mismatch')
            quote = a.get('quoted_text', '')
            if not quote or quote not in data.decode() or a['version'] not in quote or not re.search(r'accept', quote, re.I):
                raise ValueError('approval source does not accept exact version')
            if not HEX40.fullmatch(str(a.get('accepted_commit',''))) or a['accepted_commit'] not in data.decode():
                raise ValueError('approval lacks exact accepted source commit')
            if not e.get('accepted_field_ref'): raise ValueError('accepted field source absent')
            field = e['accepted_field_ref']
            content = source_bytes(root, field.get('path'), a['accepted_commit']).decode('utf-8')
            if not field.get('quote') or field['quote'] not in content: raise ValueError('accepted field source mismatch')
            if e.get('consumer_binding') not in ('NOT_IMPLEMENTED','NOT_INSPECTED','IMPLEMENTED_UNTESTED','TESTED'):
                raise ValueError('consumer binding fact absent')
        except (ValueError, OSError, TypeError) as err:
            errors.append(e['id'] + ': ' + str(err))
    return errors


def display_rules_digest(copy):
    """Bind the exact authored mappings/predicates to their scoped review."""
    payload = {key: copy.get(key) for key in ('reason_mappings', 'overview_bindings')}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def copy_safety_errors(root, copy):
    """Check Work's display contract, never infer application implementation."""
    errors = []
    review = copy.get('display_rules_review', {})
    try:
        data = local_file(root, review.get('path')).read_bytes()
        if hashlib.sha256(data).hexdigest() != review.get('sha256'):
            errors.append('display-rule review hash mismatch')
        if 'Reviewed display-rule SHA-256: `' + display_rules_digest(copy) + '`' not in data.decode():
            errors.append('reason mappings or overview predicates disagree with their scoped review')
    except (ValueError, OSError, TypeError) as err:
        errors.append('display-rule review: ' + str(err))
    entries = {e['id']: e for e in copy.get('entries', [])}
    for ident in ('error.staff.503', 'error.staff.network_change', 'error.portal.503'):
        entry = entries.get(ident, {})
        if re.search(r'\b(?:reload|refresh)\b', entry.get('text', ''), re.I):
            errors.append(ident + ': uncertain write must not instruct page reload')
        if 'SAME_TAB_ORIGINAL_REQUEST' not in entry.get('recovery_rule', ''):
            errors.append(ident + ': original-request recovery rule missing')
    for ident in ('error.portal.409_epoch.reloaded', 'recovery.portal.resolved_conflict'):
        guard = entries.get(ident, {}).get('display_guard', {})
        if guard != {'response_error_code': 'EPOCH_CONFLICT',
                     'authenticated_current_choice_read': 'SUCCEEDED', 'same_principal_and_scope': True}:
            errors.append(ident + ': loaded-current claim lacks conflict/read/scope guard')
    if entries.get('state.workflow.ACCEPTED.detail', {}).get('display_guard') != {
            'receipt_consent_status': 'WITHDRAWN', 'receipt_workflow_id_matches': True,
            'workflow_state': 'ACCEPTED'}:
        errors.append('withdrawal detail lacks receipt/workflow trigger guard')
    for kind in ('decision', 'command', 'reconciliation'):
        mapping = copy.get('reason_mappings', {}).get(kind, {})
        if mapping.get('fallback_copy_id') not in entries or mapping.get('unknown_code_policy') != 'NO_AUTHORITY_NO_RETRY_NO_OBSERVATION_INFERENCE':
            errors.append(kind + ': safe unknown-code fallback missing')
        seen = set()
        for row in mapping.get('records', []):
            code = row.get('code')
            if code in seen or row.get('copy_id') not in entries or not row.get('required_state'):
                errors.append(kind + ': duplicate/unbound reason or absent state guard')
            seen.add(code)
            try:
                data = source_bytes(root, row.get('source_path'), row.get('source_commit'), row.get('source_sha256'))
                if hashlib.sha256(data).hexdigest() != row.get('source_sha256') or not isinstance(code, str) or code not in data.decode():
                    errors.append(kind + ': reason source/hash mismatch')
                if not HEX40.fullmatch(str(row.get('source_commit', ''))):
                    errors.append(kind + ': reason source revision missing')
            except (ValueError, OSError, TypeError) as err:
                errors.append(kind + ': ' + str(err))
        if not seen: errors.append(kind + ': source-backed reason catalogue missing')
    overview = copy.get('overview_bindings', {})
    expected = {**{k: 'WORKFLOWS' for k in ('accepted', 'running', 'needs_attention', 'completed')},
                **{k: 'OBLIGATIONS' for k in ('effect_unknown', 'manual_required', 'failed', 'unverified')}}
    if overview.get('count_units') != expected or overview.get('may_sum_cards') is not False:
        errors.append('overview mixes count units or permits an unsupported total')
    for path_key, hash_key in (('source_path', 'source_sha256'), ('source_predicate_path', 'source_predicate_sha256')):
        try:
            if hashlib.sha256(source_bytes(root, overview.get(path_key), overview.get('source_commit'), overview.get(hash_key))).hexdigest() != overview.get(hash_key):
                errors.append('overview source predicate changed; display definition needs review')
        except (ValueError, OSError, TypeError) as err:
            errors.append('overview: ' + str(err))
    return errors


def screen_errors(root, screens, ev):
    errors = []
    inspections = {s['evidence_id']: s for s in ev.get('source_inspections', [])}
    records = {r['record_id']: r for t in ev.get('test_evidence', []) for r in t.get('records', [])}
    candidate = ev.get('frozen_candidate', {})
    for s in screens:
        ref, sid = s.get('evidence'), s.get('id')
        source = inspections.get(ref)
        rec = records.get(ref)
        if s.get('implementation') not in ('UNKNOWN','NOT_IMPLEMENTED','IMPLEMENTED') or s.get('tested') not in ('NOT_RUN','RUNNING','PASS','FAIL','ERROR','SKIPPED'):
            errors.append(str(sid) + ': invalid implementation/browser state')
        if ref and not source and not rec: errors.append(str(sid) + ': unknown screen evidence reference')
        if s.get('implementation') != 'UNKNOWN':
            observed = source and source.get('observed', {}).get('screens', {}).get(sid)
            if not observed or observed.get('implementation') != s.get('implementation'):
                errors.append(str(sid) + ': implementation statement unsupported by source inspection')
            elif not observed.get('source_paths') or not observed.get('scope'):
                errors.append(str(sid) + ': source inspection lacks paths/scope')
            else:
                hashes = observed.get('source_sha256', {})
                if set(hashes) != set(observed['source_paths']): errors.append(str(sid) + ': source hashes absent')
                for path in observed['source_paths']:
                    try:
                        data = source_bytes(root, path, source.get('commit'), hashes.get(path))
                        if hashlib.sha256(data).hexdigest() != hashes.get(path): errors.append(str(sid) + ': source inspection hash mismatch')
                    except ValueError as err: errors.append(str(err))
        if s.get('tested') not in ('NOT_RUN', 'SKIPPED'):
            r = records.get(s.get('browser_evidence_ref')) or rec
            try:
                if not r or r.get('observed_result') != s['tested'] or not matches(r,candidate) or record_errors(root,r):
                    raise ValueError('screen browser result lacks valid candidate record')
                if s['tested']=='PASS' and (s.get('implementation')!='IMPLEMENTED' or not source or source.get('commit')!=candidate.get('commit')):
                    raise ValueError('browser PASS contradicts implementation or inspected candidate source')
                raw = json.loads(local_file(root,r['report_path']).read_text())
                if raw.get('kind') != 'BROWSER_ACCEPTANCE' or sid not in raw.get('screen_ids',[]): raise ValueError('source-only or unrelated screen record cannot support browser result')
                t = next(t for t in ev['test_evidence'] if t['test_id']==r['test_id'])
                if s['tested']=='PASS' and not test_qualifies(root,t,candidate,ev['test_evidence']): raise ValueError('screen PASS superseded or unqualified')
            except (ValueError, OSError, StopIteration) as err:
                errors.append(str(sid)+': '+str(err))
    return errors


def rehearsal_errors(root, r):
    errors = []
    if not r.get('rehearsal_id') or not r.get('performed_by'): errors.append('missing rehearsal identity/operator')
    state = r.get('status')
    if state not in ('PLANNED','STARTED','ABORTED','COMPLETED','COMPLETED_WITH_ISSUES'): errors.append('invalid rehearsal state')
    if state == 'PLANNED':
        if r.get('started_at') or r.get('finished_at') or r.get('result') not in (None,'NOT_RUN'): errors.append('plan claims execution/completion')
        return errors
    if not date(r.get('started_at')): errors.append('invalid rehearsal start')
    if state == 'STARTED':
        if r.get('finished_at') or r.get('result') not in (None,'RUNNING'): errors.append('started run claims completion')
        return errors
    if not ordered(r.get('started_at'), r.get('finished_at')): errors.append('invalid rehearsal interval')
    errors += available_record(root,r)
    if not isinstance(r.get('issues'), list): errors.append('rehearsal issues not recorded')
    if r.get('result') not in ('PASS','FAIL','ERROR','ABORTED'): errors.append('invalid rehearsal result')
    if r.get('review_status') not in ('INSPECTED','REPORTED_NOT_INSPECTED','HISTORICAL_INSPECTION'): errors.append('invalid rehearsal review status')
    if r.get('review_status')=='INSPECTED' and (not r.get('reviewed_by') or not ordered(r.get('finished_at'),r.get('reviewed_at'))): errors.append('invalid rehearsal review provenance')
    if state=='COMPLETED' and (r.get('result')!='PASS' or r.get('issues')!=[]): errors.append('completed run with issues needs explicit issues state')
    if state == 'ABORTED' and r.get('result') == 'PASS': errors.append('aborted rehearsal claims PASS')
    if state == 'COMPLETED_WITH_ISSUES' and not r.get('issues'): errors.append('issues state without issues')
    if r.get('availability', AVAILABLE) in UNAVAILABLE: return errors
    try:
        if r.get('log_path') not in r.get('artifact_paths',[]): raise ValueError('rehearsal log is not a required artifact')
        if r.get('start_state_ref') not in r.get('artifact_paths',[]): raise ValueError('documented rehearsal start state is not integrity checked')
        log=json.loads(local_file(root,r.get('log_path')).read_text())
        for key in ('rehearsal_id','code_under_test_commit',*IDENTITY,'started_at','finished_at','result','status','issues','start_state_ref','performed_by'):
            if r.get(key) != log.get(key): errors.append('rehearsal log content mismatch: '+key)
        if not set(log.get('artifact_paths', [])).issubset(r.get('artifact_paths', [])):
            errors.append('rehearsal required child artifact not indexed')
        start = json.loads(local_file(root, r['start_state_ref']).read_text())
        for key in ('rehearsal_id', 'code_under_test_commit', *IDENTITY):
            if r.get(key) != start.get(key): errors.append('rehearsal start state content mismatch: ' + key)
        if start.get('kind') != 'REHEARSAL_START_STATE' or not start.get('documented_start'):
            errors.append('documented rehearsal start state absent')
        if not ordered(start.get('captured_at'), r.get('started_at')):
            errors.append('rehearsal start state must be recorded before execution')
        if not set(start.get('artifact_paths', [])).issubset(r.get('artifact_paths', [])):
            errors.append('rehearsal start-state child artifact not indexed')
        if log.get('kind') != 'REHEARSAL_EXECUTION': errors.append('not a rehearsal execution log')
        if not log.get('steps') or not all(isinstance(s,dict) and s.get('actual') and s.get('result') for s in log['steps']): errors.append('rehearsal actual steps absent')
        if r.get('result')=='PASS' and [s.get('step') for s in log.get('steps',[])] != list(range(1,13)):
            errors.append('qualifying rehearsal does not cover the documented twelve-step sequence')
        if r.get('result')=='PASS' and any(s.get('result')!='PASS' for s in log.get('steps',[])): errors.append('rehearsal PASS conceals issues')
        for p in r.get('media_paths',[]):
            if p not in r.get('artifact_paths',[]): errors.append('rehearsal media not integrity checked')
    except (ValueError,OSError,TypeError) as e: errors.append(str(e))
    return errors


def rehearsal_qualifies(root,r,candidate):
    return (matches(r,candidate) and r.get('status')=='COMPLETED' and r.get('result')=='PASS'
            and r.get('issues')==[] and r.get('review_status')=='INSPECTED' and r.get('reviewed_by')
            and ordered(r.get('finished_at'),r.get('reviewed_at')) and r.get('start_state_ref')
            and r.get('availability',AVAILABLE)==AVAILABLE and not rehearsal_errors(root,r))


def rehearsal_counts(root,ev):
    runs=ev.get('rehearsals',[]); candidate=ev.get('frozen_candidate',{})
    ids=[r.get('rehearsal_id') for r in runs]
    qualified_runs=[r for r in runs if ids.count(r.get('rehearsal_id'))==1 and rehearsal_qualifies(root,r,candidate)]
    # Reusing one log or overlapping intervals is not independent repeatability.
    logs=[r.get('log_path') for r in qualified_runs]
    qualified_runs=[r for r in qualified_runs if logs.count(r['log_path'])==1 and not any(
        q is not r and date(r['started_at'])<date(q['finished_at']) and date(q['started_at'])<date(r['finished_at']) for q in qualified_runs)]
    # A newer unsuccessful attempt on this candidate invalidates an older convenient pair.
    bad=[r for r in runs if matches(r,candidate) and r.get('status')!='PLANNED' and not rehearsal_qualifies(root,r,candidate)]
    if bad:
        if any(not date(r.get('started_at')) for r in bad): qualified_runs=[]
        else: qualified_runs=[r for r in qualified_runs if date(r['started_at'])>max(date(b['started_at']) for b in bad)]
    return {'rehearsals_indexed':len(runs), 'rehearsals_started':sum(date(r.get('started_at')) is not None for r in runs),
            'rehearsals_aborted':sum(r.get('status')=='ABORTED' for r in runs),
            'rehearsals_completed':sum(r.get('status') in ('COMPLETED','COMPLETED_WITH_ISSUES') and not rehearsal_errors(root,r) and r.get('availability',AVAILABLE)==AVAILABLE and ids.count(r.get('rehearsal_id'))==1 for r in runs),
            'rehearsals_completed_with_issues':sum(r.get('status')=='COMPLETED_WITH_ISSUES' and not rehearsal_errors(root,r) and r.get('availability',AVAILABLE)==AVAILABLE and ids.count(r.get('rehearsal_id'))==1 for r in runs),
            'rehearsals_candidate_qualifying':len(qualified_runs)}
