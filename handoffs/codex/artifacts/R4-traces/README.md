# Round-4 failing-journey traces

Application/test base: `e42f573`. Synthetic installations only. These are credential-redacted diagnostic copies; raw originals are retained only in the protected local synthetic profile under `auth/round4-traces`.

| Directory | Trace | Observation |
|---|---|---|
| baseline-firefox-interface-crawl-local | context-2.zip (3 parts) | Seven owner-route API 503 observations |
| baseline-firefox-interface-crawl-local | context-5.zip (2 parts) | Member failures-list API 503 |
| baseline-webkit-dpdpa-audit-local | context-1.zip | Vendor sign-in loses email before submission |
| baseline-webkit-audit-mandate-local | context-1.zip | Same vendor sign-in failure |
| baseline-webkit-expansion-screens-local | context-1.zip | Staff sign-in loses email before submission |
| baseline-webkit-interface-crawl-local | context-1.zip, context-2.zip | Signed-out privacy page still loading; staff sign-in failure |
| hydration-probe-webkit-expansion-screens-local | context-1.zip | Input-binding probe: email entered before React bindings, cleared by password entry |

Each directory includes the complete `events.jsonl` console/network journal for its run and masked final screenshots. Cookie/authorization values and long filled values are redacted; cookie attributes, status codes, request IDs and timing remain. The original console errors are not filtered out. No sign-in POST occurs in the four WebKit baseline failures.

Small traces are ordinary ZIPs. Large Firefox traces are split to stay below Git's per-file limit. Restore one by concatenating the `parts` listed in its `*.zip.manifest.json` in that order, in binary mode; verify the manifest's SHA-256 before opening. For example, from a directory containing the manifest:

```python
import hashlib, json
from pathlib import Path
m = json.loads(Path('context-2.zip.manifest.json').read_text())
out = Path(m['archive'])
with out.open('wb') as f:
    for p in m['parts']:
        data = Path(p['file']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == p['sha256']
        f.write(data)
assert hashlib.sha256(out.read_bytes()).hexdigest() == m['sha256']
```

Use the locally installed Playwright CLI's `show-trace <path-to-zip>` to inspect it. No external trace-upload service is needed. Internal resource names are retained so snapshots resolve after credential redaction; the new archive checksums describe the published copies.

Results and limitations are in `../../2026-10-01-cross-browser.md`. The separate idle-host and repeat-save handoffs do not replace failed baseline results.
