param(
    [ValidateSet('status', 'browser', 'database', 'off')]
    [string]$Mode = 'status'
)
$ErrorActionPreference = 'Stop'
# Only this named synthetic qualification stack; never delete containers or volumes.
$names = @('orvia-qualification-20260930-postgres', 'orvia-qualification-20260930-opa', 'orvia-qualification-20260930-loopback')
if ($Mode -in @('database', 'off')) {
    $active = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
        ($_.CommandLine -match 'round[78]-(matrix|browser|cmp-repro|vendor-session|form-pages)|tests[/\\]e2e') -and ($_.CommandLine -notmatch 'cli\.js test-server')
    }
    if ($active) { throw 'Acceptance is still running. Finish its process before stopping runtime dependencies.' }
}
$wanted = switch ($Mode) {
    'browser' { $names }
    # The loopback proxy publishes PostgreSQL's host port; the database itself
    # has no host binding. Keep that required dependency, but not OPA.
    'database' { @($names[0], $names[2]) }
    default { @() }
}
foreach ($name in $names) {
    $state = & docker inspect --format '{{.State.Running}}' $name
    if ($LASTEXITCODE -ne 0) { throw "Cannot inspect named synthetic container: $name" }
    if ($Mode -eq 'status') { Write-Output "$name running=$state"; continue }
    if ($state -eq 'true' -and $name -notin $wanted) {
        & docker stop --time 20 $name
        if ($LASTEXITCODE -ne 0) { throw "Failed to stop $name" }
    }
}
foreach ($name in $wanted) {
    & docker start $name
    if ($LASTEXITCODE -ne 0) { throw "Failed to start $name" }
}
Write-Output "Synthetic runtime mode: $Mode. Container limits and volumes unchanged."
