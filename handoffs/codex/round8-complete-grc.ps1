$ErrorActionPreference = 'Stop'
$taskNode = 'C:\Cyberfyx-projects\Cyberfyx_ORVIA\.local\tools\node-v24.21.0-win-x64\node.exe'
$env:PATH = (Split-Path $taskNode) + ';' + $env:PATH
$taskArtifact = Join-Path $PWD 'handoffs/codex/artifacts/R8-kappa-runtime-completion.json'
if (Test-Path -LiteralPath $taskArtifact) { throw 'Completion evidence already exists' }
$taskOriginal = Get-Content -LiteralPath 'handoffs/codex/artifacts/R8-frozen-iota-integrations.json' -Raw | ConvertFrom-Json
if ($taskOriginal.results.Count -ne 44) { throw 'Original battery has not finished' }
$taskCommands = [Collections.Generic.List[object]]::new()
$taskFailure = $null
$taskStarted = [DateTime]::UtcNow.ToString('o')
$env:ORVIA_GRC_OPA_PORT = '58281'
$env:R8_CUSTODY_LABEL = 'grc-completion-kappa'
$env:NODE_OPTIONS = '--import=file:///C:/Cyberfyx-projects/Cyberfyx_ORVIA/.worktrees/round8/handoffs/codex/round8-child-custody-observer.mjs'
try {
    & ./handoffs/codex/round7-runtime.ps1 database
    $taskCommands.Add(@{ command = @('round7-runtime.ps1', 'database'); exit_code = 0; ended_at = [DateTime]::UtcNow.ToString('o') })
    & $taskNode handoffs/codex/round8-run.mjs final-kappa-grc-prerequisite-completion --import tsx handoffs/codex/round8-grc-prerequisite-completion.mjs grc-completion-kappa 3caf3b7cba1703e42018e6ba43af80ab4206287e O3vGd-z4HGBxaLp-Fdqh3
    $taskSuiteExit = $LASTEXITCODE
    $taskCommands.Add(@{ command = @('round8-run.mjs', 'final-kappa-grc-prerequisite-completion'); exit_code = $taskSuiteExit; ended_at = [DateTime]::UtcNow.ToString('o') })
    Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
    & $taskNode handoffs/codex/round8-run.mjs final-kappa-postinit-after-grc --import tsx handoffs/codex/round8-postinit0087-metadata.ts kappa-after-grc
    $taskMetadataExit = $LASTEXITCODE
    $taskCommands.Add(@{ command = @('round8-run.mjs', 'final-kappa-postinit-after-grc'); exit_code = $taskMetadataExit; ended_at = [DateTime]::UtcNow.ToString('o') })
    if ($taskSuiteExit -ne 0 -or $taskMetadataExit -ne 0) { throw 'Completion or metadata failed; original evidence retained' }
} catch {
    $taskFailure = $_.Exception.Message
} finally {
    Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
    Remove-Item Env:ORVIA_GRC_OPA_PORT -ErrorAction SilentlyContinue
    Remove-Item Env:R8_CUSTODY_LABEL -ErrorAction SilentlyContinue
    try {
        & ./handoffs/codex/round7-runtime.ps1 off
        $taskCommands.Add(@{ command = @('round7-runtime.ps1', 'off'); exit_code = 0; ended_at = [DateTime]::UtcNow.ToString('o') })
    } catch {
        $taskCommands.Add(@{ command = @('round7-runtime.ps1', 'off'); exit_code = 1; ended_at = [DateTime]::UtcNow.ToString('o') })
        $taskFailure = 'Owned runtime cleanup failed'
    }
    $taskDocket = @{ started_at = $taskStarted; ended_at = [DateTime]::UtcNow.ToString('o'); commands = $taskCommands.ToArray(); exit_code = $(if ($taskFailure) { 1 } else { 0 }); failure = $taskFailure; source = '3caf3b7cba1703e42018e6ba43af80ab4206287e'; build = 'O3vGd-z4HGBxaLp-Fdqh3' } | ConvertTo-Json -Depth 8
    $taskStream = [IO.File]::Open($taskArtifact, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try { $taskBytes = [Text.UTF8Encoding]::new($false).GetBytes($taskDocket); $taskStream.Write($taskBytes, 0, $taskBytes.Length) } finally { $taskStream.Dispose() }
}
if ($taskFailure) { throw $taskFailure }
