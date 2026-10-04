@echo off
chcp 65001 >nul
cd /d "%~dp0reader"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Please install Node.js 22.12+ or 24 LTS.
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)||(a===20&&b>=19)?0:1)"
if errorlevel 1 (
  echo Please upgrade Node.js to 22.12+ or 24 LTS.
  pause
  exit /b 1
)
if not exist "node_modules\.package-lock.json" (
  echo Installing the reader's locked dependencies for the first run...
  call npm.cmd ci --no-fund
  if errorlevel 1 (
    echo Installation failed. Check your connection and try again.
    pause
    exit /b 1
  )
)
node launch.mjs %*
if errorlevel 1 (
  pause
  exit /b 1
)
