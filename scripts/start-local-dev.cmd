@echo off
setlocal
cd /d "%~dp0.."

set "NODE=C:\Users\27915\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist logs mkdir logs

start "ai-canvas-worker" /min cmd /c ""%NODE%" ".\node_modules\tsx\dist\cli.mjs" "src\worker.ts" 1>>"logs\worker.out.log" 2>>"logs\worker.err.log""
start "ai-canvas-next" /min cmd /c ""%NODE%" ".\node_modules\next\dist\bin\next" dev 1>>"logs\next.out.log" 2>>"logs\next.err.log""

echo Started AI canvas local dev processes. Check logs\next.err.log and logs\worker.err.log if it exits.
