$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$NodePath = "C:\Users\27915\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$LogsDir = Join-Path $ProjectRoot "logs"

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

if (-not (Test-Path $NodePath)) {
  throw "Bundled Node.js was not found at $NodePath"
}

function Start-CanvasProcess {
  param(
    [Parameter(Mandatory = $true)][string]$Arguments
  )

  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $NodePath
  $psi.Arguments = $Arguments
  $psi.WorkingDirectory = $ProjectRoot
  $psi.UseShellExecute = $true
  $psi.CreateNoWindow = $false
  $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $psi
  $process.Start() | Out-Null
  return $process.Id
}

$workerPid = Start-CanvasProcess -Arguments ".\node_modules\tsx\dist\cli.mjs src\worker.ts"
$nextPid = Start-CanvasProcess -Arguments ".\node_modules\next\dist\bin\next dev"

Write-Host "Started local AI canvas dev server and worker. Next PID: $nextPid Worker PID: $workerPid"
