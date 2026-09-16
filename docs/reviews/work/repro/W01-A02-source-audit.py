"""Audit committed A02 evidence; this does not execute application scenarios."""
import collections
import hashlib
import json
from pathlib import Path
import subprocess

BASE = '50cb4daeded9253c4f7cca4f742cb212c10aa5b7'
IMPLEMENTATION = '3242521e59966885d8053747a82d96cb92ea55d5'
SUBMISSION = '2e01b7a36d663382d82ec9310bd707f1c2d405ef'
INTEGRATION = '004fe3dc43e3a278caeb9c4e4983e7e58a825b9f'
INSPECTED = 'a5b6ff73c4fca4aa02e110ee5f11a121b1a7563b'


def git(*args):
    return subprocess.check_output(['git', *args])


def content(path, ref=INSPECTED):
    return git('show', ref + ':' + path)


def sha(data):
    return hashlib.sha256(data).hexdigest()


publication = json.loads(content('handoffs/codex/A02-publication.json'))
assert publication['implementation_commit'] == IMPLEMENTATION
master = 'docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md'
assert sha(content(master)) == publication['master_sha256'] == sha(Path(master).read_bytes())
assert git('rev-parse', SUBMISSION + '^{tree}') == git('rev-parse', INTEGRATION + '^{tree}')
assert content('pnpm-lock.yaml') == content('pnpm-lock.yaml', BASE)
assert all(p.startswith('handoffs/codex/') for p in git('diff', '--name-only', IMPLEMENTATION, SUBMISSION).decode().splitlines())
artifacts = []
for path, expected in publication['artifacts'].items():
    actual = sha(content(path))
    assert actual == expected, path
    artifacts.append({'path': path, 'sha256': actual})

reports = []
for command in publication['commands']:
    report = json.loads(content(command['path']))
    assert report['exit_code'] == command['exit_code']
    mismatch = []
    for item in report['source_files']:
        if sha(content(item['path'])) != item['sha256']:
            mismatch.append(item['path'])
    exact = report['source_commit'] == IMPLEMENTATION and not report['dirty']
    if exact:
        assert not mismatch and report['exit_code'] == 0
        for item in report['source_files']:
            assert content(item['path']) == content(item['path'], IMPLEMENTATION) == Path(item['path']).read_bytes()
    reports.append({'path': command['path'], 'source_commit': report['source_commit'], 'dirty': report['dirty'], 'exit_code': report['exit_code'], 'source_files': len(report['source_files']), 'mismatches_vs_inspected': mismatch, 'exact_implementation_report': exact})

assert sum(r['exact_implementation_report'] for r in reports) == 2
checks = {}
for name, report_path, log_path, count in [
    ('consent', 'handoffs/codex/artifacts/A02-consent-integration-1789572708381-865b6d53-c8fe-431a-931b-f905ae4ada96.json', 'handoffs/codex/artifacts/A02-test-consent-2026-09-16T15-31-31.521Z.log', 49),
    ('auth', 'handoffs/codex/artifacts/A02-auth-security-1789572592713-f6cd3c7b-9205-4a35-a412-cf87a935afa3.json', 'handoffs/codex/artifacts/A02-test-auth-2026-09-16T15-29-26.081Z.log', 87),
]:
    assert report_path in publication['artifacts']
    report = json.loads(content(report_path))
    log = content(log_path).decode()
    assert report['result'] == 'PASS' and len(report['assertions']) == count
    assert Path(report_path).name in log
    for assertion in report['assertions']:
        assert assertion['result'] == 'PASS' and assertion['actual'] == assertion['expected']
        assert 'PASS ' + assertion['name'] in log
    checks[name] = {'report': report_path, 'log': log_path, 'assertions': count, 'rerun_by_work': False}

manifest = json.loads(content('packages/contracts/generated/manifest.json'))
for name, expected in manifest['artifacts'].items():
    assert sha(content('packages/contracts/generated/' + name)) == expected
assert content('tracking/contract_seed.json') == content('packages/contracts/generated/contract-seed.proposed.json')
assert not git('diff', '--name-only', BASE, INTEGRATION, '--', 'AGENTS.md', 'CURRENT_STATE.md', 'docs/source', 'docs/prototype', 'docs/reviews/work', 'tracking/tasks.json', 'tracking/acceptance.json', 'apps/web/src/app/workspace', 'apps/web/src/app/privacy')
print(json.dumps({
    'kind': 'SOURCE_PROVENANCE_AUDIT', 'coverage': 'DOCUMENT_ONLY', 'result': 'PASS',
    'base_commit': BASE, 'implementation_commit': IMPLEMENTATION, 'submission_commit': SUBMISSION,
    'integration_commit': INTEGRATION, 'inspected_commit': INSPECTED,
    'submission_tree_matches_integration': True, 'contract_version': '0.3.0',
    'master_sha256': publication['master_sha256'], 'lockfile_unchanged': True,
    'generated_artifacts_verified': len(manifest['artifacts']), 'seed_matches': True,
    'command_exit_counts': dict(collections.Counter(str(r['exit_code']) for r in reports)),
    'reports': reports, 'artifact_hashes': artifacts, 'producer_assertions_reviewed': checks,
    'integration_to_inspected_delta': git('diff', '--name-only', INTEGRATION, INSPECTED).decode().splitlines(),
    'limitations': ['Only the final contract and 49-check consent reports are exact committed-source executions. Earlier build/auth/unit/lint/hygiene reports retain their actual dirty source snapshots and mismatches.', 'This audit does not execute HTTP/PostgreSQL/MFA/OPA behavior or the W01-A02-F01 reproduction.']
}, indent=2))
