@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-preview.ps1"
set "PORTFOLIO_EXIT=%ERRORLEVEL%"
echo.
pause
exit /b %PORTFOLIO_EXIT%
