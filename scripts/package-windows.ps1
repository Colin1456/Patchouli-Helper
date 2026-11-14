# Builds the Windows release binary and stages everything that must ship with it.
#
# IMPORTANT: with the GNU toolchain (no Windows SDK on this machine) Tauri links
# against `WebView2Loader.dll` as a *dynamic* library, so the DLL has to sit next
# to the exe. Missing it gives the classic
#   "找不到 WebView2Loader.dll" / "The code execution cannot proceed" dialog.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\package-windows.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$exeName = 'Patchouli-Helper-0.1.0-win64.exe'

$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
if (Test-Path $cargoBin) { $env:PATH = "$cargoBin;$env:PATH" }

# Use the portable MinGW toolchain when no MSVC linker is available.
$mingwGcc = Join-Path $env:LOCALAPPDATA 'ph-tools\mingw\mingw64\bin\x86_64-w64-mingw32-gcc.exe'
if ((Test-Path $mingwGcc) -and -not $env:CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER) {
    $env:CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER = $mingwGcc
    $env:PATH = "$(Split-Path $mingwGcc);$env:PATH"
    Write-Host "[i] Using MinGW toolchain: $mingwGcc"
}

Push-Location (Join-Path $root 'src-tauri')
try {
    Write-Host '[i] cargo build --release'
    cargo build --release
    if ($LASTEXITCODE -ne 0) { throw "cargo build failed ($LASTEXITCODE)" }
} finally {
    Pop-Location
}

$releaseDir = Join-Path $root 'src-tauri\target\release'
$distDir = Join-Path $root 'dist'
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

Copy-Item (Join-Path $releaseDir 'patchouli-helper.exe') (Join-Path $distDir $exeName) -Force
Copy-Item (Join-Path $releaseDir 'WebView2Loader.dll') (Join-Path $distDir 'WebView2Loader.dll') -Force

$exe = Get-Item (Join-Path $distDir $exeName)
$dll = Get-Item (Join-Path $distDir 'WebView2Loader.dll')
Write-Host ''
Write-Host "[ok] $($exe.FullName)  ($([math]::Round($exe.Length/1MB,2)) MB)"
Write-Host "[ok] $($dll.FullName)  ($([math]::Round($dll.Length/1KB,0)) KB)"
Write-Host '[i] Ship the whole dist\ folder: the exe alone will not start.'
