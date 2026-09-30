"""Split an already-redacted trace into Git-sized parts with a SHA256 manifest."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('trace', type=Path)
parser.add_argument('destination', type=Path)
args = parser.parse_args()
args.destination.mkdir(parents=True, exist_ok=True)
parts = []
digest = hashlib.sha256()
with args.trace.open('rb') as source:
    while chunk := source.read(40 * 1024 * 1024):
        name = f'{args.trace.name}.part{len(parts) + 1:03d}'
        (args.destination / name).write_bytes(chunk)
        digest.update(chunk)
        parts.append({'file': name, 'bytes': len(chunk), 'sha256': hashlib.sha256(chunk).hexdigest()})
manifest = {'archive': args.trace.name, 'sha256': digest.hexdigest(), 'parts': parts,
            'restore': 'Concatenate parts in listed order in binary mode; verify SHA256; open the resulting ZIP in the local Playwright trace viewer. No external upload is needed.'}
(args.destination / f'{args.trace.name}.manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'archive': args.trace.name, 'parts': len(parts), 'sha256': digest.hexdigest()}))
