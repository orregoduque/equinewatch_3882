$ErrorActionPreference = 'Stop'
$controlRoot = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:ProgramFiles 'nodejs\node.exe' }
if (-not (Test-Path -LiteralPath $nodeExecutable)) { throw 'Instala Node.js 22.16 o posterior.' }
if (-not (Test-Path -LiteralPath (Join-Path $controlRoot 'node_modules'))) { throw 'Ejecuta npm ci --ignore-scripts primero.' }
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8899/health' -TimeoutSec 2
    if ($health.mode -eq 'demo' -and $health.production_authority_enabled -eq $false) { Write-Output 'Panel ya disponible en http://127.0.0.1:8899/'; exit 0 }
    throw 'El puerto ya lo usa otro servicio.'
} catch { if ($_.Exception.Message -eq 'El puerto ya lo usa otro servicio.') { throw } }
$controlData = Join-Path $controlRoot 'data'
New-Item -ItemType Directory -Force -Path $controlData | Out-Null
$controlEntry = Join-Path $controlRoot 'src\server.mjs'
$oldControlEnvironment = @{}
$demoEnvironment = @{CONTROL_MODE='demo';CONTROL_HOST='127.0.0.1';CONTROL_PORT='8899';CONTROL_DATABASE_URL=$null}
try {
    foreach ($entry in $demoEnvironment.GetEnumerator()) {
        $oldControlEnvironment[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, 'Process')
        [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
    }
    $process = Start-Process -FilePath $nodeExecutable -ArgumentList @(('"{0}"' -f $controlEntry)) -WorkingDirectory $controlRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $controlData 'server.stdout.log') -RedirectStandardError (Join-Path $controlData 'server.stderr.log') -PassThru
} finally {
    foreach ($entry in $oldControlEnvironment.GetEnumerator()) { [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process') }
}
@{pid=$process.Id;entry=$controlEntry;started_at=$process.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $controlData 'launcher.json')
Write-Output 'Panel local preparado: http://127.0.0.1:8899/'
