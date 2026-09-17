"""Read-only audit of the exact A01 candidate and its producer evidence.

Run from the repository root. This verifies provenance, not application behavior.
"""
import collections
import hashlib
import json
from pathlib import Path
import subprocess

BASE = 'e1fa052c6c419e90c4783ce220dee2ef247472dc'
IMPLEMENTATION = '3be3fd09c358ac851b97a381f9a856f8f0a92177'
SUBMISSION = '2686474a56ed774780e84179ac60457943dc075d'
CANDIDATE = '50cb4daeded9253c4f7cca4f742cb212c10aa5b7'
MASTER = 'docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md'
MASTER_HASH = '527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6'


def git(*args):
    return subprocess.check_output(['git', *args])


def digest(data):
    return hashlib.sha256(data).hexdigest()


def committed(path, revision=CANDIDATE):
    return git('show', f'{revision}:{path}')


publication = json.loads(committed('handoffs/codex/A01-publication.json'))
assert publication['source_commit'] == IMPLEMENTATION
assert publication['base_commit'] == BASE
assert git('rev-parse', f'{SUBMISSION}^{{tree}}') == git('rev-parse', f'{CANDIDATE}^{{tree}}')
assert digest(committed(MASTER)) == MASTER_HASH == digest(Path(MASTER).read_bytes())
assert committed('pnpm-lock.yaml') == committed('pnpm-lock.yaml', BASE)
assert publication['lockfile_sha256'] == digest(committed('pnpm-lock.yaml'))
assert publication['contract_manifest_sha256'] == digest(committed('packages/contracts/generated/manifest.json'))

artifact_checks = []
for item in publication['artifacts']:
    actual = digest(committed(item['path']))
    assert actual == item['sha256'], item['path']
    artifact_checks.append({'path': item['path'], 'sha256': actual})

reports = []
for path in publication['exact_commit_reports']:
    report = json.loads(committed(path))
    assert report['source_commit'] == IMPLEMENTATION and report['dirty'] is False
    assert report['exit_code'] == 0 and report['result'] == 'PASS'
    assert report['contract_version'] == '0.2.1'
    for item in report['source_files']:
        source = committed(item['path'])
        assert digest(source) == item['sha256'], (path, item['path'])
        assert source == committed(item['path'], IMPLEMENTATION), item['path']
        assert source == Path(item['path']).read_bytes(), ('checkout drift', item['path'])
    for artifact in report['artifact_paths']:
        assert committed(artifact), artifact
    reports.append({'path': path, 'source_commit': report['source_commit'], 'source_files_verified': len(report['source_files']), 'exit_code': report['exit_code']})

security = json.loads(committed(publication['security']['path']))
assert security['build_id'] == publication['build_id']
assert len(security['assertions']) == 87
assert all(a['result'] == 'PASS' and a['actual'] == a['expected'] for a in security['assertions'])
assert security['result'] == 'PASS'
security_log = committed('handoffs/codex/artifacts/A01-test-auth-2026-09-16T14-29-46.339Z.log').decode()
assert Path(publication['security']['path']).name in security_log
for assertion in security['assertions']:
    assert f"PASS {assertion['name']}" in security_log

evidence_only_delta = git('diff', '--name-only', IMPLEMENTATION, SUBMISSION).decode().splitlines()
assert all(p.startswith('handoffs/codex/') for p in evidence_only_delta)
owned_paths = ['AGENTS.md', 'CURRENT_STATE.md', 'docs/source', 'docs/prototype', 'docs/decisions', 'docs/reviews/work', 'tracking/tasks.json', 'tracking/acceptance.json', 'apps/web/src/app/workspace', 'apps/web/src/app/privacy', 'apps/web/src/app/layout.tsx', 'apps/web/src/app/page.tsx', 'packages/ui']
assert not git('diff', '--name-only', BASE, CANDIDATE, '--', *owned_paths)

manifest = json.loads(committed('packages/contracts/generated/manifest.json'))
for path, expected in manifest['artifacts'].items():
    assert digest(committed('packages/contracts/generated/' + path)) == expected
assert committed('tracking/contract_seed.json') == committed('packages/contracts/generated/contract-seed.proposed.json')

print(json.dumps({
    'kind': 'SOURCE_PROVENANCE_AUDIT', 'coverage': 'DOCUMENT_ONLY', 'result': 'PASS',
    'candidate_commit': CANDIDATE, 'implementation_commit': IMPLEMENTATION,
    'submission_commit': SUBMISSION, 'base_commit': BASE,
    'candidate_tree': git('rev-parse', f'{CANDIDATE}^{{tree}}').decode().strip(),
    'submission_tree_matches_candidate': True, 'implementation_to_submission_evidence_only': True,
    'master_sha256': MASTER_HASH, 'contract_version': manifest['contract_version'],
    'generated_artifacts_verified': len(manifest['artifacts']), 'accepted_seed_matches': True,
    'lockfile_unchanged': True, 'cross_lane_changes': [],
    'reports': reports, 'producer_assertions_reviewed': len(security['assertions']),
    'producer_build_id': security['build_id'],
    'producer_command_exit_counts': dict(collections.Counter(str(c['exit_code']) for c in publication['commands'])),
    'artifact_hashes': artifact_checks,
    'limitations': ['Producer execution evidence was reviewed; this audit does not rerun HTTP, PostgreSQL, MFA, OPA or Docker.', 'All full prototype acceptance scenarios retain their separate gates.']
}, indent=2))
