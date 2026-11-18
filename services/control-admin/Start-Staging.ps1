$ErrorActionPreference='Stop'
$controlRoot=$PSScriptRoot
$nodeCommand=Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable=if($nodeCommand){$nodeCommand.Source}else{Join-Path $env:ProgramFiles 'nodejs\node.exe'}
if(-not(Test-Path -LiteralPath (Join-Path $controlRoot 'private\staging.private.json'))){throw 'Prepara primero la configuración privada de staging.'}
try {$health=Invoke-RestMethod -Uri 'http://127.0.0.1:8898/health' -TimeoutSec 2; if($health.mode -eq 'staging'){Write-Output 'Staging ya está disponible en http://127.0.0.1:8898/';exit 0};throw 'El puerto lo usa otro servicio.'}catch{if($_.Exception.Message -eq 'El puerto lo usa otro servicio.'){throw}}
$entry=Join-Path $controlRoot 'tools\start-staging.mjs'
New-Item -ItemType Directory -Path (Join-Path $controlRoot 'data') -Force | Out-Null
$process=Start-Process -FilePath $nodeExecutable -ArgumentList @(('"{0}"' -f $entry)) -WorkingDirectory $controlRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $controlRoot 'data\staging.stdout.log') -RedirectStandardError (Join-Path $controlRoot 'data\staging.stderr.log') -PassThru
@{pid=$process.Id;entry=$entry;started_at=$process.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $controlRoot 'private\launcher-staging.json')
Write-Output 'Staging local preparado: http://127.0.0.1:8898/'
