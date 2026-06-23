$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

$distDir = Join-Path (Get-Location) "dist"
$package = Join-Path $distDir "ai-canvas-deploy.zip"
$staging = Join-Path $distDir "ai-canvas-deploy"

if (Test-Path $staging) {
  Remove-Item -LiteralPath $staging -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $staging | Out-Null

$excludeDirs = @(".git", ".next", "node_modules", "logs", "dist", "storage")
$excludeFiles = @(".env", "next-build-debug.log", "tsconfig.tsbuildinfo")

Get-ChildItem -Force | ForEach-Object {
  if ($excludeDirs -contains $_.Name) { return }
  if ($excludeFiles -contains $_.Name) { return }
  Copy-Item -LiteralPath $_.FullName -Destination $staging -Recurse -Force
}

if (Test-Path $package) {
  Remove-Item -LiteralPath $package -Force
}
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $package -Force

Write-Host "Deployment package created: $package"
