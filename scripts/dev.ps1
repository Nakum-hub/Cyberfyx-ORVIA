# Workspace-local toolchain. Bootstrap once with ./scripts/bootstrap-tools.ps1.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskNodeDirectory = Join-Path $taskRoot '.local/tools/node-v24.21.0-win-x64'
$taskNode = Join-Path $taskNodeDirectory 'node.exe'
$taskPnpm = Join-Path $taskRoot '.local/tools/package-manager/node_modules/pnpm/bin/pnpm.mjs'
if (-not (Test-Path -LiteralPath $taskNode) -or -not (Test-Path -LiteralPath $taskPnpm)) { throw 'Run ./scripts/bootstrap-tools.ps1 first.' }
$env:PATH = "$taskNodeDirectory;$env:PATH"
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:DO_NOT_TRACK = '1'
$taskCa = Join-Path $taskRoot '.local/profiles/rehearsal/tls/ca-cert.pem'
if ($env:ORVIA_PROFILE -eq 'rehearsal' -and (Test-Path -LiteralPath $taskCa)) { $env:NODE_EXTRA_CA_CERTS = $taskCa }
Push-Location $taskRoot
try { & $taskNode $taskPnpm @args; $taskExit = $LASTEXITCODE } finally { Pop-Location }
exit $taskExit
