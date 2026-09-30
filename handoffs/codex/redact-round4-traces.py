"""Publish diagnostic copies, retaining raw traces only in ignored local storage.

Removes credential/header values without dropping console/network records.
No test source, assertion, fixture or result is modified.
"""
import argparse
import json
import re
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('destination', type=Path)
parser.add_argument('--profiles', type=Path, required=True)
parser.add_argument('--contexts', nargs='*', help='Only these context numbers; full event log is retained.')
args = parser.parse_args()
secrets = set()
secret_keys = {'password', 'secret', 'token', 'sessiontoken', 'accesstoken', 'refreshtoken',
               'totp', 'totpuri', 'private', 'privatekey', 'setupcode', 'engagementcode',
               'invitationcode', 'recoverycodes', 'backupcodes'}


def sensitive(key):
    return re.sub(r'[^a-z]', '', str(key).lower()) in secret_keys


def collect(value):
    if isinstance(value, dict):
        # A journey may rotate a synthetic login after an earlier trace was made.
        # Also learn long filled values from that trace, so old passwords are
        # removed from snapshots even when absent from the current private journal.
        if value.get('method') == 'fill' and isinstance(value.get('params'), dict):
            filled = value['params'].get('value')
            if isinstance(filled, str) and len(filled) >= 16:
                secrets.add(filled)
        for key, item in value.items():
            if sensitive(key):
                for candidate in item if isinstance(item, list) else [item]:
                    if isinstance(candidate, str) and len(candidate) >= 6:
                        secrets.add(candidate)
                        if candidate.startswith('otpauth:'):
                            from urllib.parse import urlparse, parse_qs
                            secrets.update(parse_qs(urlparse(candidate).query).get('secret', []))
            if str(value.get('name', '')).lower() in ['cookie', 'set-cookie', 'authorization'] and key == 'value' and isinstance(item, str):
                for part in re.split(r'[;\n]', item):
                    if '=' in part:
                        name, content = part.split('=', 1)
                        if any(s in name.lower() for s in ['session', 'token', 'auth', 'csrf', 'factor']) and len(content) >= 6:
                            secrets.add(content)
            if key == 'value' and isinstance(item, str) and any(s in str(value.get('name', '')).lower() for s in ['session', 'token', 'csrf', 'factor']) and len(item) >= 6:
                secrets.add(item)
            collect(item)
    elif isinstance(value, list):
        for item in value:
            collect(item)


for path in args.profiles.glob('*/auth/*.json'):
    try:
        collect(json.loads(path.read_text(encoding='utf-8-sig')))
    except (ValueError, OSError):
        pass


def parsed_lines(data):
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        return None
    values = []
    for line in text.splitlines():
        try:
            values.append(json.loads(line))
        except ValueError:
            return None
    return values


archives = list(args.source.glob('*.zip'))
if args.contexts:
    archives = [p for p in archives if p.stem.removeprefix('context-') in args.contexts]
for path in archives:
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if name.endswith(('.png', '.jpeg', '.jpg')):
                continue
            if name.endswith(('.trace', '.network')):
                with archive.open(name) as stream:
                    for line in stream:
                        try:
                            collect(json.loads(line))
                        except ValueError:
                            pass
                continue
            data = archive.read(name)
            values = parsed_lines(data)
            if values is not None:
                for value in values:
                    collect(value)
            else:
                try:
                    collect(json.loads(data))
                except (ValueError, UnicodeDecodeError):
                    pass


def redact(value):
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, dict):
        result = {key: '[REDACTED]' if sensitive(key) else redact(item) for key, item in value.items()}
        if str(value.get('name', '')).lower() in ['cookie', 'set-cookie', 'authorization'] and 'value' in result:
            content = str(value['value'])
            result['value'] = re.sub(r'(^|\n)([^=;]+)=([^;\n]*)', r'\1\2=[REDACTED]', content) if str(value['name']).lower() == 'set-cookie' else '[REDACTED]'
        if value.get('method') == 'fill' and isinstance(result.get('params'), dict):
            result['params']['value'] = '[REDACTED INPUT]'
        return result
    return value


def clean(data):
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        return data
    values = parsed_lines(data)
    if values is not None:
        text = '\n'.join(json.dumps(redact(v), separators=(',', ':'), ensure_ascii=False) for v in values) + '\n'
    else:
        try:
            text = json.dumps(redact(json.loads(text)), separators=(',', ':'), ensure_ascii=False)
        except ValueError:
            pass
    for secret in sorted(secrets, key=len, reverse=True):
        text = text.replace(secret, '[REDACTED]').replace(json.dumps(secret)[1:-1], '[REDACTED]')
    return text.encode('utf-8')


args.destination.mkdir(parents=True, exist_ok=True)
for path in archives:
    with zipfile.ZipFile(path) as original, zipfile.ZipFile(args.destination / path.name, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for info in original.infolist():
            if info.filename.endswith(('.trace', '.network')):
                with original.open(info.filename) as source, output.open(info.filename, 'w') as target:
                    for line in source:
                        target.write(clean(line))
            else:
                output.writestr(info.filename, clean(original.read(info.filename)))
for path in args.source.glob('*.jsonl'):
    (args.destination / path.name).write_bytes(clean(path.read_bytes()))
print(json.dumps({'archives': len(archives), 'credential_values_redacted': len(secrets), 'destination': str(args.destination)}))
