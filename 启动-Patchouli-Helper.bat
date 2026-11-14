@echo off
chcp 65001 >nul
rem ============================================================
rem  Patchouli Helper launcher
rem  Keep WebView2Loader.dll next to the exe - the GNU build
rem  loads it at runtime, otherwise Windows reports
rem  "WebView2Loader.dll not found".
rem ============================================================
cd /d "%~dp0"

set "EXE=dist\Patchouli-Helper-0.1.0-win64.exe"
if not exist "%EXE%" set "EXE=src-tauri\target\release\patchouli-helper.exe"

if not exist "%EXE%" (
  echo [x] Executable not found. Build it first:
  echo     powershell -ExecutionPolicy Bypass -File scripts\package-windows.ps1
  pause
  exit /b 1
)

for %%F in ("%EXE%") do set "DIR=%%~dpF"
if not exist "%DIR%WebView2Loader.dll" (
  echo [x] WebView2Loader.dll is missing next to:
  echo     %EXE%
  echo     Copy it from dist\ or src-tauri\target\release\ and retry.
  pause
  exit /b 1
)

echo [i] Launching %EXE%
start "" "%EXE%"
exit /b 0
