@echo off
setlocal
title NexaServe
cd /d "%~dp0"
echo ======================================
echo       NEXASERVE - RESTAURANT APP
echo ======================================
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 18+ is required. Install it from https://nodejs.org/
 pause
 exit /b 1
)
for /f "tokens=1" %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 18 (
 echo Please install Node.js 18 or newer.
 pause
 exit /b 1
)
if not exist node_modules call npm install
if errorlevel 1 goto failed
if not exist server\node_modules call npm install --prefix server
if errorlevel 1 goto failed
if not exist client\node_modules call npm install --prefix client
if errorlevel 1 goto failed
echo Starting NexaServe. Keep this window open.
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:5173"
call npm run dev
goto end
:failed
echo Setup failed. Check your internet connection and retry.
pause
:end
endlocal