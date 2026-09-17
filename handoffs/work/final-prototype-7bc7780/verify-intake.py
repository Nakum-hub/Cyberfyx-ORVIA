"""Read-only package/source reconciliation; never promotes acceptance."""
import datetime
import hashlib
import json
import pathlib
import subprocess
import zipfile

root = pathlib.Path.cwd()
output = root / 'handoffs/work/final-prototype-7bc7780/intake-verification.json'
if output.exists():
    raise RuntimeError('Preserve the previous execution report')
started = datetime.datetime.now(datetime.timezone.utc).isoformat()

def sha(path):
    value = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()

def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

manifest_path = root / 'artifacts/release-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
report = {'started_at': started, 'review_base': git('rev-parse', 'HEAD'),
          'review_tree': git('rev-parse', 'HEAD^{tree}'),
          'candidate': manifest['source_commit'],
          'candidate_tree': git('rev-parse', manifest['source_commit'] + '^{tree}'),
          'manifest_sha256': sha(manifest_path), 'checks': [],
          'limitations': ['Existing engineering package integrity only, not final candidate qualification or full canonical acceptance.']}

def check(name, expected, actual):
    report['checks'].append({'name': name, 'expected': expected, 'actual': actual,
                             'result': 'PASS' if expected == actual else 'FAIL'})

try:
    for entry in manifest['source_files']:
        check('current source ' + entry['path'], entry['sha256'], sha(root / entry['path']))
    for entry in manifest['package_artifacts']:
        check('package archive ' + entry['path'], entry['sha256'], sha(root / entry['path']))
    directory = root / '.local/releases' / manifest['source_commit']
    verified = subprocess.run(['git', 'bundle', 'verify', str(directory / 'orvia-source.bundle')], capture_output=True, text=True)
    check('git bundle verify exit', 0, verified.returncode)
    tree = git('ls-tree', '-r', '--name-only', manifest['source_commit']).splitlines()
    with zipfile.ZipFile(directory / 'orvia-source.zip') as archive:
        check('source archive exact tracked paths', sorted(tree), sorted(n for n in archive.namelist() if not n.endswith('/')))
        mismatches = []
        for path in tree:
            original = subprocess.check_output(['git', 'show', manifest['source_commit'] + ':' + path])
            if archive.read(path) != original:
                mismatches.append(path)
        check('source archive exact candidate bytes', [], mismatches)
    check('runtime changes since candidate', '', git('diff', manifest['source_commit'], 'HEAD', '--', 'apps', 'packages', 'scripts', 'tests', 'infrastructure', 'policy', 'pnpm-lock.yaml', 'package.json'))
except Exception as error:
    report['error'] = str(error)
finally:
    report['finished_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report['result'] = 'PASS' if 'error' not in report and all(c['result'] == 'PASS' for c in report['checks']) else 'FAIL'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'result': report['result'], 'checks': len(report['checks']), 'artifact': str(output)}))
raise SystemExit(0 if report['result'] == 'PASS' else 1)
