# Anime Buddy — dev launcher (PowerShell).
# Loads Rust env vars (in case not set globally) and starts Tauri dev server.

if (-not $env:RUSTUP_HOME) { $env:RUSTUP_HOME = "D:\rust\rustup" }
if (-not $env:CARGO_HOME) { $env:CARGO_HOME = "D:\rust\cargo" }
$env:PATH = "$env:CARGO_HOME\bin;$env:PATH"

Write-Host "=== Anime Buddy dev ===" -ForegroundColor Cyan
Write-Host "RUSTUP_HOME=$env:RUSTUP_HOME"
Write-Host "CARGO_HOME=$env:CARGO_HOME"
Write-Host ""

Set-Location (Join-Path $PSScriptRoot "..")
pnpm tauri dev
