@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PORTFOLIO_NODE="
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined PORTFOLIO_NODE set "PORTFOLIO_NODE=%%I"
if not defined PORTFOLIO_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "PORTFOLIO_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined PORTFOLIO_NODE (
  echo 需要安装 Node.js 20 或更新版本才能启动本地预览。
  echo 发布到网站后，访客只需要浏览器，不需要安装 Node.js。
  pause
  exit /b 1
)
echo 正在启动作品集静态网页预览，请保持此窗口打开。
echo 按 Ctrl+C 可以关闭预览服务。
"%PORTFOLIO_NODE%" "%~dp0preview-server.mjs" --host 0.0.0.0 --port 4173
pause
