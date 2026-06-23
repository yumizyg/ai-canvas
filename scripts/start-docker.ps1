$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Stopping host-side Next/worker processes for this project..."
$projectRoot = (Get-Location).Path
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object {
    ($_.CommandLine -like "*$projectRoot*") -and
    (
      $_.CommandLine -like "*next*" -or
      $_.CommandLine -like "*server.js*" -or
      $_.CommandLine -like "*src\worker.ts*"
    )
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Write-Host "Building and starting Docker services..."
docker compose -p ai-canvas up -d --build app worker postgres redis

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
