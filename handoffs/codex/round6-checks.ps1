param([string]$RunLabel = 'final')
$ErrorActionPreference = 'Continue'
$env:PATH='C:\Cyberfyx-projects\Cyberfyx_ORVIA\.local\tools\node-v24.21.0-win-x64;'+$env:PATH
$env:ORVIA_PROFILE='codex-a00'
$env:ORVIA_WORKSPACE_ROOT=(Get-Location).Path
$failed = $false
foreach ($suite in @('dpdpa-audit-local','audit-mandate-local','expansion-screens-local','sign-in-hydration-local','interface-crawl-local')) {
  $begin=(Get-Date).ToUniversalTime().ToString('o')
  Write-Output "START chromium $suite $begin"
  & node node_modules/tsx/dist/cli.mjs handoffs/codex/round6-browser.mjs chromium $suite *> "handoffs/codex/artifacts/R6-$RunLabel-chromium-$suite.log"
  $code=$LASTEXITCODE
  if ($code -ne 0) { $failed = $true }
  @{run=$RunLabel;build=[System.IO.File]::ReadAllText((Join-Path (Get-Location) 'frontend/.next/BUILD_ID')).Trim();engine='chromium';suite=$suite;started=$begin;finished=(Get-Date).ToUniversalTime().ToString('o');exit=$code} | ConvertTo-Json -Compress | Add-Content handoffs/codex/artifacts/R6-results.jsonl
  Write-Output "END chromium $suite EXIT=$code"
}
if ($failed) { exit 1 }
exit 0
