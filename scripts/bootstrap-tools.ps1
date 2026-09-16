$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskTools = Join-Path $taskRoot '.local/tools'
$taskNodeVersion = '24.21.0'
$taskPnpmVersion = '12.4.2'
New-Item -ItemType Directory -Force -Path $taskTools | Out-Null
$taskArchiveName = "node-v$taskNodeVersion-win-x64.zip"
$taskNodeDirectory = Join-Path $taskTools "node-v$taskNodeVersion-win-x64"
$taskNodeExecutable = Join-Path $taskNodeDirectory 'node.exe'
if (-not (Test-Path -LiteralPath $taskNodeExecutable)) {
  $taskArchivePath = Join-Path $taskTools $taskArchiveName
  $taskChecksums = (Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/v$taskNodeVersion/SHASUMS256.txt").Content
  $taskExpected = ($taskChecksums -split "`n" | Where-Object { $_.Trim().EndsWith($taskArchiveName) } | Select-Object -First 1) -split '\s+'
  if (-not $taskExpected -or $taskExpected[0] -notmatch '^[a-f0-9]{64}$') { throw 'Node checksum unavailable' }
  Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/v$taskNodeVersion/$taskArchiveName" -OutFile $taskArchivePath
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $taskArchivePath).Hash.ToLowerInvariant() -ne $taskExpected[0]) { throw 'Node checksum mismatch' }
  Expand-Archive -LiteralPath $taskArchivePath -DestinationPath $taskTools
}
$env:PATH = "$taskNodeDirectory;$env:PATH"
$taskPnpmDirectory = Join-Path $taskTools 'package-manager'
$taskPnpmEntry = Join-Path $taskPnpmDirectory 'node_modules/pnpm/bin/pnpm.mjs'
if (-not (Test-Path -LiteralPath $taskPnpmEntry)) {
  & $taskNodeExecutable (Join-Path $taskNodeDirectory 'node_modules/npm/bin/npm-cli.js') install --prefix $taskPnpmDirectory --ignore-scripts --no-audit --no-fund "pnpm@$taskPnpmVersion"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& $taskNodeExecutable --version
& $taskNodeExecutable $taskPnpmEntry --version
exit $LASTEXITCODE
