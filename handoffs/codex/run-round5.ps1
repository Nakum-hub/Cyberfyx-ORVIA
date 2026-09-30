$ErrorActionPreference = 'Continue'
$env:PATH='C:\Cyberfyx-projects\Cyberfyx_ORVIA\.local\tools\node-v24.21.0-win-x64;'+$env:PATH
$env:ORVIA_PROFILE='codex-a00'
$env:ORVIA_WORKSPACE_ROOT=(Get-Location).Path
$cases=@(
@('webkit','dpdpa-audit-local'),@('webkit','audit-mandate-local'),@('webkit','expansion-screens-local'),@('webkit','interface-crawl-local'),
@('webkit','sign-in-hydration-local'),@('firefox','sign-in-hydration-local'),
@('firefox','dpdpa-audit-local'),@('firefox','audit-mandate-local'),@('firefox','expansion-screens-local'),@('firefox','interface-crawl-local'))
foreach($case in $cases) {
  $browser=$case[0]; $suite=$case[1]
  $begin=(Get-Date).ToUniversalTime().ToString('o')
  $mem=Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory
  @{time=$begin;browser=$browser;suite=$suite;memory=$mem} | ConvertTo-Json -Compress | Add-Content handoffs/codex/artifacts/R5-host-memory.jsonl
  Write-Output "START $browser $suite $begin"
  & node node_modules/tsx/dist/cli.mjs handoffs/codex/run-browser-round5.mjs $browser $suite *> "handoffs/codex/artifacts/R5-$browser-$suite.log"
  $code=$LASTEXITCODE
  @{browser=$browser;suite=$suite;started=$begin;finished=(Get-Date).ToUniversalTime().ToString('o');exit=$code} | ConvertTo-Json -Compress | Add-Content handoffs/codex/artifacts/R5-results.jsonl
  Write-Output "END $browser $suite EXIT=$code"
}
