@echo off
REM Anime Buddy — dev launcher.
REM Loads Rust env vars (in case they aren't set globally) and starts Tauri dev server.

if "%RUSTUP_HOME%"=="" set RUSTUP_HOME=D:\rust\rustup
if "%CARGO_HOME%"=="" set CARGO_HOME=D:\rust\cargo
set PATH=%CARGO_HOME%\bin;%PATH%

echo === Anime Buddy dev ===
echo RUSTUP_HOME=%RUSTUP_HOME%
echo CARGO_HOME=%CARGO_HOME%
echo.

cd /d "%~dp0\.."
pnpm tauri dev
