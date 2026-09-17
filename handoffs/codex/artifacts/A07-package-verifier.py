import hashlib, json, pathlib, subprocess, datetime, zipfile

root = pathlib.Path.cwd()
manifest = json.loads((root/'artifacts/release-manifest.json').read_text(encoding='utf-8'))
commit = manifest['source_commit']
directory = root/'.local/releases'/commit
clone = root/'.local'/('A07-final-package-'+commit[:12])
assert not clone.exists(), 'Preserve existing validation checkout'
commands = []
def run(args, cwd=root):
    result = subprocess.run(args, cwd=cwd, capture_output=True, check=True)
    commands.append({'command': args, 'cwd': str(cwd), 'exit_code': result.returncode})
    return result.stdout
def digest(path):
    value = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b''):
            value.update(chunk)
    return value.hexdigest()
checksums = []
for artifact in manifest['package_artifacts']:
    path = root/artifact['path']
    actual = digest(path)
    assert actual == artifact['sha256'], path.name
    checksums.append({'path': artifact['path'], 'sha256': actual, 'bytes': path.stat().st_size})
run(['git','bundle','verify',str(directory/'orvia-source.bundle')])
run(['git','clone','--config','core.autocrlf=false','--branch',manifest['source_branch'],str(directory/'orvia-source.bundle'),str(clone)])
assert run(['git','rev-parse','HEAD'],clone).decode().strip() == commit
run(['git','fsck','--full','--no-reflogs'],clone)
tree = run(['git','ls-tree','-r','-z',commit],clone).split(b'\0')
files = []
for line in tree:
    if line:
        meta, path = line.split(b'\t',1)
        mode, kind, oid = meta.split()
        assert kind == b'blob'
        files.append((path.decode(), oid.decode()))
batch = subprocess.run(['git','cat-file','--batch'],cwd=clone,input=('\n'.join(oid for _,oid in files)+'\n').encode(),capture_output=True,check=True)
commands.append({'command':['git','cat-file','--batch'],'cwd':str(clone),'exit_code':batch.returncode})
data = batch.stdout
cursor = 0
with zipfile.ZipFile(directory/'orvia-source.zip') as archive:
    assert sorted(n for n in archive.namelist() if not n.endswith('/')) == sorted(path for path,_ in files)
    for path, oid in files:
        end = data.index(b'\n',cursor)
        actual_oid, kind, size = data[cursor:end].split()
        assert actual_oid.decode() == oid and kind == b'blob'
        size = int(size)
        content = data[end+1:end+1+size]
        cursor = end+size+2
        assert (clone/path).read_bytes() == content, path
        assert archive.read(path) == content, path
with zipfile.ZipFile(directory/'orvia-evidence.zip') as archive:
    evidence = [name for name in archive.namelist() if not name.endswith('/')]
    for name in evidence:
        assert name.startswith('handoffs/codex/artifacts/A07-')
        assert archive.read(name) == (root/name).read_bytes(), name
preserved = json.loads((root/'handoffs/codex/A07-ui-preservation.json').read_text(encoding='utf-8'))
for entry in preserved['files']:
    assert digest(root/entry['path']) == entry['sha256']
    assert digest(clone/entry['path']) == entry['sha256']
    assert digest(pathlib.Path(preserved['source_worktree'])/entry['path']) == entry['sha256']
assert not (clone/'.local/profiles').exists()
report = {'task_id':'A07','result':'PASS','source_commit':commit,'recorded_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commands':commands,'package_artifacts':checksums,'tracked_files_byte_verified':len(files),'source_archive_files_byte_verified':len(files),'evidence_archive_files_byte_verified':len(evidence),'preserved_ui_files_byte_verified':len(preserved['files']),'profile_directory_exists':False,'limitations':['Final offline bundle cloned and Git-fsck/byte-verified against its source ZIP. Fresh install/build reports from the earlier bfa81e5 bundle retain that exact earlier identity; final host/image build and relevant test reruns are separately recorded. No customer stores or private credentials are imported into this clone.']}
target = root/'handoffs/codex/artifacts/A07-final-package-verification.json'
assert not target.exists()
target.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['commands','package_artifacts','limitations']},indent=2))
