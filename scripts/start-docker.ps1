$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

$env:COMPOSE_BAKE = "false"
$sourceRoot = (Get-Location).Path
$dockerRoot = "C:\Users\27915\.cache\ai-canvas-docker-context"

Write-Host "Stopping host-side Next/worker processes for this project..."
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object {
    ($_.CommandLine -like "*$sourceRoot*" -or $_.CommandLine -like "*$dockerRoot*") -and
    (
      $_.CommandLine -like "*next*" -or
      $_.CommandLine -like "*server.js*" -or
      $_.CommandLine -like "*src\worker.ts*"
    )
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Write-Host "Syncing Docker build context to ASCII-only path..."
New-Item -ItemType Directory -Force -Path $dockerRoot | Out-Null
robocopy $sourceRoot $dockerRoot /MIR /XD .git node_modules .next logs storage /XF tsconfig.tsbuildinfo next-build-debug.log /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Host
if ($LASTEXITCODE -gt 7) {
  throw "Failed to sync Docker build context to $dockerRoot."
}
Set-Location $dockerRoot

Write-Host "Building and starting Docker services..."
docker compose -p ai-canvas up -d --build app worker postgres redis
if ($LASTEXITCODE -ne 0) {
  throw "docker compose up failed before the app container was created."
}

Write-Host "Waiting for app health..."
$deadline = (Get-Date).AddMinutes(4)
do {
  Start-Sleep -Seconds 5
  $status = docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" ai-canvas-app-1 2>$null
  Write-Host "app health: $status"
  if ($status -eq "healthy") {
    powershell -ExecutionPolicy Bypass -File .\scripts\verify-local-prod.ps1
    exit 0
  }
} while ((Get-Date) -lt $deadline)

docker compose -p ai-canvas ps
docker compose -p ai-canvas logs --tail=120 app
throw "Docker app did not become healthy. See logs above."
