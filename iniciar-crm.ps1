# Doble clic o ejecutar en PowerShell para encender el CRM
$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
$dockerCli = "C:\Program Files\Docker\cli-plugins"
if (Test-Path $dockerBin) {
    $env:Path = "$dockerBin;$dockerCli;" + $env:Path
}

Set-Location $PSScriptRoot

if (Test-Path ".env") {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        node scripts/generate-config.js 2>$null | Out-Host
    }
}

Write-Host "Comprobando Docker..." -ForegroundColor Cyan
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Abre Docker Desktop y espera a que este en marcha. Luego vuelve a ejecutar este script." -ForegroundColor Yellow
    exit 1
}

Write-Host "Encendiendo CRM y base de datos..." -ForegroundColor Cyan
docker compose up -d

Write-Host ""
Write-Host "Listo." -ForegroundColor Green
Write-Host "  CRM (funcionarios):  http://localhost:8080" -ForegroundColor Green
Write-Host "  Formulario (reportes): http://localhost:8082" -ForegroundColor Green
Write-Host "  Usuario CRM: admin / admin_local_2026" -ForegroundColor Green
Write-Host "  Guia: PASOS-CASOS.txt en esta carpeta" -ForegroundColor Cyan
