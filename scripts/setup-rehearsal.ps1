# Fresh local synthetic installation. Never resets or replaces an existing profile.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location $taskRoot
if (Test-Path -LiteralPath '.local/profiles/rehearsal') { throw 'Rehearsal already exists; preserve it and use the explicit resume commands in local-packaging-and-operation.md.' }
$env:ORVIA_PROFILE = 'rehearsal'
$env:ORVIA_TASK_ID = 'A07'
& "$PSScriptRoot/bootstrap-tools.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$taskNode = Join-Path $taskRoot '.local/tools/node-v24.21.0-win-x64/node.exe'
function Invoke-Orvia([string[]] $Command) {
  & $taskNode scripts/record.mjs @Command
  if ($LASTEXITCODE -ne 0) { throw "Setup stopped at $($Command[0]) with exit $LASTEXITCODE; previous state retained." }
}
Invoke-Orvia @('install','--frozen-lockfile')
Invoke-Orvia @('profile:init','rehearsal')
Invoke-Orvia @('tls:init','confirm:rehearsal')
Invoke-Orvia @('services','up')
Invoke-Orvia @('roles:init','confirm:rehearsal')
Invoke-Orvia @('db:migrate')
Invoke-Orvia @('preflight')
Invoke-Orvia @('auth:init','confirm:rehearsal')
Invoke-Orvia @('auth:bootstrap','confirm:rehearsal')
Invoke-Orvia @('seed:auth','confirm:rehearsal')
Invoke-Orvia @('machine:init','confirm:rehearsal')
Invoke-Orvia @('seed:orders','confirm:rehearsal')
Invoke-Orvia @('regression:init','confirm:rehearsal')
Invoke-Orvia @('contracts:check')
Invoke-Orvia @('build')
Invoke-Orvia @('test:tls')
Write-Output 'Fresh rehearsal setup complete. Credentials and TLS material remain in protected .local/profiles/rehearsal. Read docs/engineering/local-packaging-and-operation.md for tested commands and current limits.'
