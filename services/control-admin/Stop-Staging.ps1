$ErrorActionPreference='Stop'
$record=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'private\launcher-staging.json') -Raw | ConvertFrom-Json
$process=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
if(-not $process){Write-Output 'Staging ya está detenido.';exit 0}
$details=Get-CimInstance Win32_Process -Filter ('ProcessId={0}' -f [int]$record.pid)
$expected=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'tools\start-staging.mjs'))
$recordedStart=([DateTimeOffset]$record.started_at).UtcDateTime
if($record.entry -ne $expected -or $details.CommandLine -notmatch [regex]::Escape($expected) -or [Math]::Abs(($process.StartTime.ToUniversalTime()-$recordedStart).TotalMilliseconds) -gt 1){throw 'El proceso no coincide con el launcher; no se detuvo.'}
Stop-Process -Id $process.Id
Write-Output 'Staging local detenido. La base aislada se conserva.'
