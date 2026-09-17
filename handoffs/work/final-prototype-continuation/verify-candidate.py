"""Independent read-only verification of the frozen final candidate.

Recomputes every hash in artifacts/release-manifest.json from the working tree
and the package directory, re-verifies the Git bundle, compares the source
archive byte-for-byte against the candidate commit, checks the evidence and
browser-evidence archive inventories, and confirms the runtime image label.
Promotes no acceptance and changes nothing.
"""
import datetime
import hashlib
import json
import pathlib
import subprocess
import zipfile

root = pathlib.Path.cwd()
output = root / 'handoffs/work/final-prototype-continuation/candidate-verification-c383b9d.json'
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
report = {
    'kind': 'INDEPENDENT_FINAL_CANDIDATE_VERIFICATION',
    'started_at': started,
    'review_base': git('rev-parse', 'HEAD'),
    'candidate': manifest['source_commit'],
    'candidate_tree': git('rev-parse', manifest['source_commit'] + '^{tree}'),
    'candidate_branch': manifest['source_branch'],
    'manifest_sha256': sha(manifest_path),
    'contract': manifest['contract'],
    'build': manifest['build'],
    'gates': manifest['gates'],
    'checks': [],
    'limitations': [
        'Package/source/archive integrity and identity only.',
        'Not Work acceptance, not canonical scenario acceptance, not a human rehearsal, not release approval.',
        'Development SHA-256 checksums only; no production release signing is verified or claimed.',
    ],
}


def check(name, expected, actual):
    report['checks'].append({'name': name, 'expected': expected, 'actual': actual,
                             'result': 'PASS' if expected == actual else 'FAIL'})


try:
    for entry in manifest['source_files']:
        check('current source ' + entry['path'], entry['sha256'], sha(root / entry['path']))
    for entry in manifest['package_artifacts']:
        check('package archive ' + entry['path'], entry['sha256'], sha(root / entry['path']))

    directory = root / '.local/releases' / manifest['source_commit']
    verified = subprocess.run(['git', 'bundle', 'verify', str(directory / 'orvia-source.bundle')],
                              capture_output=True, text=True)
    check('git bundle verify exit', 0, verified.returncode)

    tree = git('ls-tree', '-r', '--name-only', manifest['source_commit']).splitlines()
    with zipfile.ZipFile(directory / 'orvia-source.zip') as archive:
        check('source archive exact tracked paths', sorted(tree),
              sorted(n for n in archive.namelist() if not n.endswith('/')))
        mismatches = []
        for path in tree:
            original = subprocess.check_output(['git', 'show', manifest['source_commit'] + ':' + path])
            if archive.read(path) != original:
                mismatches.append(path)
        check('source archive exact candidate bytes', [], mismatches)

    # Evidence archives must list exactly what their own listing files declare.
    for archive_name, listing_name in (('orvia-evidence.zip', 'evidence-files.txt'),
                                       ('orvia-browser-evidence.zip', 'browser-evidence-files.txt')):
        declared = [line for line in (directory / listing_name).read_text(encoding='utf-8').splitlines() if line]
        with zipfile.ZipFile(directory / archive_name) as archive:
            check(archive_name + ' inventory matches its listing', sorted(declared),
                  sorted(n for n in archive.namelist() if not n.endswith('/')))
        missing = [p for p in declared if not (root / p).exists()]
        check(archive_name + ' every declared file present in tree', [], missing)

    check('no runtime change since candidate', '',
          git('diff', manifest['source_commit'], 'HEAD', '--', 'apps', 'packages', 'scripts', 'tests',
              'infrastructure', 'policy', 'pnpm-lock.yaml', 'package.json'))
    check('manifest source tree equals current source tree', manifest['source_tree_sha256'],
          json.loads(subprocess.check_output(
              ['node', '--import', 'tsx', '-e',
               "import('./scripts/source-state.ts').then(m=>process.stdout.write(JSON.stringify(m.sourceState().sha256)))"],
              text=True)))

    label = subprocess.check_output(
        ['docker', 'image', 'inspect', manifest['build']['runtime_image_id'],
         '--format', '{{index .Config.Labels "orvia.source-tree"}}'], text=True).strip()
    check('runtime image label matches candidate source tree', manifest['source_tree_sha256'], label)
    revision = subprocess.check_output(
        ['docker', 'image', 'inspect', manifest['build']['runtime_image_id'],
         '--format', '{{index .Config.Labels "org.opencontainers.image.revision"}}'], text=True).strip()
    check('runtime image revision matches candidate commit', manifest['source_commit'], revision)

    check('lockfile unchanged since checkpoint',
          'b2694da120310a26a6ae377ebecbd4dafcac6711b60377c4ff308fe4fc91a5c8', manifest['lockfile_sha256'])
    check('approved master unchanged',
          '527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6', manifest['master']['sha256'])
except Exception as error:  # noqa: BLE001 - the failure itself is the recorded result
    report['error'] = str(error)
finally:
    report['finished_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report['result'] = 'PASS' if 'error' not in report and all(c['result'] == 'PASS' for c in report['checks']) else 'FAIL'
    report['failed_checks'] = [c for c in report['checks'] if c['result'] != 'PASS']
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'result': report['result'], 'checks': len(report['checks']),
                      'failed': len(report['failed_checks']), 'artifact': str(output)}))
raise SystemExit(0 if report['result'] == 'PASS' else 1)
