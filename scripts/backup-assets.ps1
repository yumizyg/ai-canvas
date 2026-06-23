$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "storage/assets"
$target = Join-Path $root "storage/backups/assets-$timestamp.zip"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
Compress-Archive -Path (Join-Path $source "*") -DestinationPath $target -Force
Write-Host "Assets backup written to $target"
