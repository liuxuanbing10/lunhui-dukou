# Lunhui Dukou - Windows package sign script (reusable)
# ------------------------------------------------------------------
# Usage:  powershell -ExecutionPolicy Bypass -File app/scripts/distribute/sign.ps1
# This script finds/creates a "Lunhui Dukou" self-signed code-signing cert
# and signs the exported exe with SDK signtool.
# NOTE: self-signed cert only helps dev/internal distribution; for public
# release use an OV/EV cert (see docs/ANTIVIRUS.md).
# (ASCII-only on purpose so it runs under Windows PowerShell 5.1 / pwsh alike.)
param(
    [string]$Exe = ""
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrEmpty($Exe)) {
    # Default points to <repo>/app/build/LunhuiDukou.exe
    $app = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # scripts/distribute -> scripts -> app
    $Exe = Join-Path $app 'build/LunhuiDukou.exe'
}

function Get-SignTool {
    $cand = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter 'signtool.exe' -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '\\x64\\' } | Select-Object -First 1
    if ($cand) { return $cand.FullName }
    $cmd = Get-Command signtool -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw 'signtool not found (install Windows SDK)'
}

function Get-OrCreate-Cert {
    $cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue |
        Where-Object { $_.Subject -match 'Lunhui Dukou' } | Select-Object -First 1
    if ($cert) { return $cert }
    return New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject 'CN=Lunhui Dukou, O=Lunhui Dukou Dev' `
        -KeyUsage DigitalSignature `
        -KeyExportPolicy Exportable `
        -CertStoreLocation Cert:\CurrentUser\My `
        -NotAfter (Get-Date).AddYears(3)
}

if (-not (Test-Path $Exe)) {
    throw "exe not found: $Exe (run godot --export-release first)"
}

$sig = Get-SignTool
$cert = Get-OrCreate-Cert
Write-Host "cert thumbprint: $($cert.Thumbprint)"

& $sig sign /fd SHA256 /sha1 $cert.Thumbprint /v $Exe
if ($LASTEXITCODE -ne 0) { throw 'sign failed' }

& $sig verify /pa $Exe
Write-Host "signed: $Exe"