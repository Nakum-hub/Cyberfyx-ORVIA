$ErrorActionPreference = 'Stop'
$env:ORVIA_PROFILE = 'rehearsal'
$env:ORVIA_TASK_ID = 'A07'
$env:NODE_EXTRA_CA_CERTS = (Resolve-Path '.local/profiles/rehearsal/tls/ca-cert.pem').Path
$nodePath = (Resolve-Path '.local/tools/node-v24.21.0-win-x64/node.exe').Path
# Serial ownership: each existing suite must clean up before the next starts.
# Existing A07 recorders preserve exact source hashes, failures, dates and logs.
# This Work execution does not imply A07 self-acceptance or a human rehearsal.
$commands = @('test:evidence', 'test:expiry', 'test:auth', 'test:consent', 'test:workflows', 'test:enforcement', 'test:regression', 'test:tls', 'test:lifecycle', 'test:f07', 'hygiene:check')
foreach ($command in $commands) {
    if ($command -notin @('test:f07', 'hygiene:check')) {
        & $nodePath --import tsx --input-type=module -e 'import {loadProfile} from "./packages/testing/src/config.ts"; import {connectDatabase} from "./packages/db/src/index.ts"; import {waitForAuthWindow} from "./packages/testing/src/auth-window.ts"; const db=connectDatabase(loadProfile()).pool; try { await waitForAuthWindow(db); } finally { await db.end(); }'
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    & $nodePath scripts/record.mjs $command
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
