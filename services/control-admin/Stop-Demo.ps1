$ErrorActionPreference = 'Stop'
$record = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'data\launcher.json') -Raw | ConvertFrom-Json
$process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
if (-not $process) { Write-Output 'El proceso local ya está detenido.'; exit 0 }
$details = Get-CimInstance Win32_Process -Filter ('ProcessId={0}' -f [int]$record.pid)
$expected = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'src\server.mjs'))
$recordedStart = ([DateTimeOffset]$record.started_at).UtcDateTime
$startDifference = [Math]::Abs(($process.StartTime.ToUniversalTime() - $recordedStart).TotalMilliseconds)
if ($record.entry -ne $expected -or $details.CommandLine -notmatch [regex]::Escape($expected) -or $startDifference -gt 1) { throw 'El proceso no coincide con el launcher; no se detuvo ningún proceso.' }
Stop-Process -Id $process.Id
Write-Output 'Panel local detenido. Se conservaron los datos de prueba.'
