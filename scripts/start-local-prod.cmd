@echo off
setlocal
cd /d "%~dp0.."

set "NODE=C:\Users\27915\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "PROJECT_ROOT=%CD%"
set "HOSTNAME=0.0.0.0"
set "PORT=3000"
set "NODE_ENV=production"
set "DATABASE_URL=postgresql://canvas:canvas@localhost:15432/canvas?schema=public"
set "REDIS_URL=redis://localhost:6379"
set "JWT_SECRET=dev-local-secret-change-before-production"
set "ASSET_STORAGE_DIR=%PROJECT_ROOT%\storage\assets"
set "COOKIE_SECURE=false"

if not exist logs mkdir logs

if not exist ".next\standalone\server.js" (
  echo Missing .next\standalone\server.js. Build output is missing.
  echo Ask Codex to run the build again, or run: node .\node_modules\next\dist\bin\next build
  exit /b 1
)

if not exist ".next\standalone\.next" mkdir ".next\standalone\.next"
xcopy ".next\static" ".next\standalone\.next\static" /E /I /Y >nul
if exist "public" xcopy "public" ".next\standalone\public" /E /I /Y >nul

start "ai-canvas-worker" /min cmd /k ""%NODE%" ".\node_modules\tsx\dist\cli.mjs" "src\worker.ts" 1>>"logs\worker.out.log" 2>>"logs\worker.err.log""
start "ai-canvas-next-prod" /min cmd /k "cd /d "%PROJECT_ROOT%\.next\standalone" && "%NODE%" "server.js" 1>>"%PROJECT_ROOT%\logs\next-prod.out.log" 2>>"%PROJECT_ROOT%\logs\next-prod.err.log""

echo Started AI canvas production server on http://127.0.0.1:3000
