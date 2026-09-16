"""Read-only source/provenance retest for the exact A00 integration candidate."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys

candidate = '58ceddcd73b9b9f0717553bbd1e2fff3f7389abe'
submission = 'aa831cdfc2051599ab812e20287664c34f30a15c'
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
git = lambda *args: subprocess.check_output(['git', *args])
blob = lambda path: git('show', candidate + ':' + path)
sha = lambda data: hashlib.sha256(data).hexdigest()
assert git('rev-parse', 'HEAD').decode().strip() == candidate
master_path = 'docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md'
master_hash = sha(blob(master_path))
assert master_hash == '527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6'
assert sha(Path(master_path).read_bytes()) == master_hash
assert not git('diff', '--name-only', submission, candidate).strip()
manifest = json.loads(blob('packages/contracts/generated/manifest.json'))
assert manifest['contract_version'] == '0.2.1'
artifact_checks = []
for name, expected in manifest['artifacts'].items():
    actual = sha(blob('packages/contracts/generated/' + name))
    assert actual == expected, name
    artifact_checks.append({'path': name, 'sha256': actual, 'result': 'PASS'})
producer = json.loads(blob('handoffs/codex/A00-F07-results.json'))
assert producer['pre_fix']['exit_code'] == 1
assert producer['reproducer']['sha256'] == sha(blob(producer['reproducer']['local_path']))
comparisons = []
for check in producer['checks']:
    report = json.loads(blob(check['artifact']))
    assert report['source_commit'] == producer['fix_commit']
    assert report['dirty'] is False and report['exit_code'] == 0
    mismatches = [f['path'] for f in report['source_files'] if sha(blob(f['path'])) != f['sha256']]
    assert not mismatches, mismatches
    for path in report['artifact_paths']:
        blob(path)
    comparisons.append({'report': check['artifact'], 'source_commit': report['source_commit'],
                        'source_files_matched': len(report['source_files']), 'result': 'PASS'})
out = Path('docs/reviews/work/artifacts/W00-A00-58ceddc/source-audit.json')
report = {'kind': 'WORK_SOURCE_PROVENANCE_CHECK', 'task_id': 'W00', 'source_commit': candidate,
          'submission_head': submission, 'fix_commit': producer['fix_commit'],
          'command': [sys.executable, str(Path(__file__).relative_to(Path.cwd()))],
          'cwd': str(Path.cwd()), 'started_at': started,
          'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'exit_code': 0, 'result': 'PASS', 'contract_version': '0.2.1',
          'master_path': master_path, 'master_sha256': master_hash,
          'submission_and_merge_tree_equal': True, 'generated_artifacts': artifact_checks,
          'producer_comparisons': comparisons,
          'limitations': ['Hash/source checks are not application or service execution.',
                          'Producer checks retain their own fix-commit identity; Work reruns have separate reports.']}
out.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'result': 'PASS', 'master_sha256': master_hash,
                  'artifact_hashes': len(artifact_checks), 'producer_reports': len(comparisons)}))
