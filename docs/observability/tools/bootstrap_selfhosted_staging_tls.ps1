#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Bootstrap a host-local internal CA and staging server certificate for
    GymCRM self-hosted staging TLS.

.DESCRIPTION
    Generates an internal CA and a server certificate (with DDNS + loopback
    SANs) using only built-in Windows PKI cmdlets. No external tools
    (mkcert, OpenSSL) are required.

    Requires PowerShell 7 or later (for RSA private-key PEM export via
    ExportPkcs8PrivateKey). Must be run as Administrator.

    Outputs to C:\ProgramData\gymcrm-staging-tls\:
        ca.crt     - CA certificate in DER format
                     (import to Windows/macOS trust store; Docker volume mount)
        server.crt - Server certificate in PEM format
        server.key - Server private key in PEM format (PKCS#8)

.PARAMETER Hostname
    The staging DDNS hostname (e.g. ajw0831.iptime.org).
    Falls back to $env:STAGING_HOSTNAME if not provided.

.PARAMETER Force
    Overwrite existing certificate files and regenerate the CA + server cert.
    WARNING: rotation requires re-importing the CA on every connected client.

.EXAMPLE
    .\bootstrap_selfhosted_staging_tls.ps1 -Hostname ajw0831.iptime.org

.EXAMPLE
    $env:STAGING_HOSTNAME = "ajw0831.iptime.org"
    .\bootstrap_selfhosted_staging_tls.ps1

.EXAMPLE
    # Force regeneration (all clients must re-import CA afterwards)
    .\bootstrap_selfhosted_staging_tls.ps1 -Hostname ajw0831.iptime.org -Force
#>

[CmdletBinding()]
param(
    [string]$Hostname,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# PowerShell version check (ExportPkcs8PrivateKey requires PS7 / .NET 5+)
# ---------------------------------------------------------------------------
if ($PSVersionTable.PSVersion.Major -lt 7) {
    Write-Error (
        "This script requires PowerShell 7 or later. " +
        "Current version: $($PSVersionTable.PSVersion). " +
        "Install from https://aka.ms/powershell"
    )
    exit 1
}

# ---------------------------------------------------------------------------
# Resolve hostname
# ---------------------------------------------------------------------------
if (-not $Hostname) { $Hostname = $env:STAGING_HOSTNAME }
if (-not $Hostname) {
    Write-Error (
        "Hostname is required. " +
        "Provide -Hostname <ddns-hostname> or set `$env:STAGING_HOSTNAME."
    )
    exit 1
}

# ---------------------------------------------------------------------------
# Paths and constants
# ---------------------------------------------------------------------------
$OutDir        = 'C:\ProgramData\gymcrm-staging-tls'
$CaCrtPath     = Join-Path $OutDir 'ca.crt'
$ServerCrtPath = Join-Path $OutDir 'server.crt'
$ServerKeyPath = Join-Path $OutDir 'server.key'
$TempPfxPath   = Join-Path $OutDir '_staging_server_tmp.pfx'

$CaSubject  = 'CN=GymCRM Staging CA,O=GymCRM,C=KR'
$CaFriendly = 'GymCRM Staging Internal CA'
$SrvFriendly = 'GymCRM Staging Server'

# ---------------------------------------------------------------------------
# Idempotency guard
# ---------------------------------------------------------------------------
if ((Test-Path $ServerCrtPath) -and -not $Force) {
    Write-Warning "server.crt already exists at '$ServerCrtPath'."
    Write-Warning "Pass -Force to regenerate. NOTE: -Force rotation requires re-importing the CA on all clients."
    exit 0
}

# ---------------------------------------------------------------------------
# Ensure output directory exists
# ---------------------------------------------------------------------------
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
    Write-Host "[+] Created output directory: $OutDir"
}

# ---------------------------------------------------------------------------
# Helper: encode bytes as PEM base64 body (64-char wrapped lines, LF endings)
# ---------------------------------------------------------------------------
function ConvertTo-PemBody {
    param([byte[]]$Bytes)
    $b64   = [Convert]::ToBase64String($Bytes)
    $lines = for ($i = 0; $i -lt $b64.Length; $i += 64) {
        $b64.Substring($i, [Math]::Min(64, $b64.Length - $i))
    }
    return ($lines -join "`n")
}

# ---------------------------------------------------------------------------
# Clean up any previous GymCRM Staging certs from the certificate store
# ---------------------------------------------------------------------------
Write-Host "[*] Cleaning up previous GymCRM Staging certs from certificate stores..."
foreach ($storeName in @('My', 'Root')) {
    $storePath = "Cert:\LocalMachine\$storeName"
    Get-ChildItem $storePath -ErrorAction SilentlyContinue |
        Where-Object { $_.Subject -match 'GymCRM Staging' -or $_.FriendlyName -match 'GymCRM Staging' } |
        ForEach-Object {
            Remove-Item $_.PSPath -Force
            Write-Host "    Removed from LocalMachine\$storeName : $($_.Subject)"
        }
}

# ---------------------------------------------------------------------------
# Create CA certificate in LocalMachine\My
# ---------------------------------------------------------------------------
Write-Host "[*] Creating CA certificate..."
$caCert = New-SelfSignedCertificate `
    -Subject           $CaSubject `
    -CertStoreLocation 'Cert:\LocalMachine\My' `
    -KeyUsage          CertSign, CRLSign, DigitalSignature `
    -KeyExportPolicy   Exportable `
    -NotAfter          (Get-Date).AddYears(10) `
    -FriendlyName      $CaFriendly
Write-Host "    Thumbprint : $($caCert.Thumbprint)"

# ---------------------------------------------------------------------------
# Create server certificate signed by the CA
# SANs: DDNS hostname + localhost (DNS) + 127.0.0.1 (IP)
# ---------------------------------------------------------------------------
Write-Host "[*] Creating server certificate (SANs: $Hostname, localhost, 127.0.0.1)..."
$serverCert = New-SelfSignedCertificate `
    -Subject           "CN=$Hostname" `
    -DnsName           $Hostname, 'localhost' `
    -IPAddress         '127.0.0.1' `
    -CertStoreLocation 'Cert:\LocalMachine\My' `
    -Signer            $caCert `
    -KeyUsage          DigitalSignature, KeyEncipherment `
    -KeyExportPolicy   Exportable `
    -NotAfter          (Get-Date).AddYears(2) `
    -FriendlyName      $SrvFriendly `
    -TextExtension     @('2.5.29.37={text}1.3.6.1.5.5.7.3.1')
Write-Host "    Thumbprint : $($serverCert.Thumbprint)"

# ---------------------------------------------------------------------------
# Export CA cert as DER (binary) → ca.crt
# ---------------------------------------------------------------------------
Write-Host "[*] Exporting CA cert (DER) → $CaCrtPath"
Export-Certificate -Cert $caCert -FilePath $CaCrtPath -Type CERT | Out-Null

# ---------------------------------------------------------------------------
# Install CA cert into LocalMachine\Root (system-wide trust)
# ---------------------------------------------------------------------------
Write-Host "[*] Installing CA into LocalMachine\Root (system trust store)..."
Import-Certificate -FilePath $CaCrtPath -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null

# ---------------------------------------------------------------------------
# Export server cert + private key via PFX, then convert both to PEM files
# ---------------------------------------------------------------------------
$pfxPassPlain  = [System.Guid]::NewGuid().ToString('N')
$pfxPassSecure = ConvertTo-SecureString -String $pfxPassPlain -AsPlainText -Force

Write-Host "[*] Exporting server cert + key via temporary PFX..."
Export-PfxCertificate -Cert $serverCert -FilePath $TempPfxPath -Password $pfxPassSecure | Out-Null

try {
    $storageFlags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
    $pfxCert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new(
        $TempPfxPath, $pfxPassPlain, $storageFlags
    )

    try {
        # --- server.crt (PEM) ---
        $certPemBody  = ConvertTo-PemBody -Bytes $pfxCert.RawData
        $serverCrtPem = "-----BEGIN CERTIFICATE-----`n$certPemBody`n-----END CERTIFICATE-----`n"
        [System.IO.File]::WriteAllText($ServerCrtPath, $serverCrtPem)
        Write-Host "[+] Written: $ServerCrtPath"

        # --- server.key (PKCS#8 PEM) — requires .NET 5+ / PowerShell 7+ ---
        $rsaKey = $pfxCert.GetRSAPrivateKey()
        if (-not $rsaKey) {
            throw "RSA private key not found in PFX. Verify -KeyExportPolicy Exportable was used."
        }

        $keyBytes = $null
        try {
            $keyBytes     = $rsaKey.ExportPkcs8PrivateKey()
            $keyPemBody   = ConvertTo-PemBody -Bytes $keyBytes
            $serverKeyPem = "-----BEGIN PRIVATE KEY-----`n$keyPemBody`n-----END PRIVATE KEY-----`n"
            [System.IO.File]::WriteAllText($ServerKeyPath, $serverKeyPem)
            Write-Host "[+] Written: $ServerKeyPath"
        } finally {
            # Zero-out the key material from memory
            if ($null -ne $keyBytes) {
                [System.Array]::Clear($keyBytes, 0, $keyBytes.Length)
            }
            $rsaKey.Dispose()
        }
    } finally {
        $pfxCert.Dispose()
    }
} finally {
    if (Test-Path $TempPfxPath) {
        Remove-Item $TempPfxPath -Force
    }
}

# ---------------------------------------------------------------------------
# Compute CA SHA-256 fingerprint for client-side verification
# ---------------------------------------------------------------------------
$sha256    = [System.Security.Cryptography.SHA256]::Create()
$hashBytes = $sha256.ComputeHash($caCert.RawData)
$caFp      = ($hashBytes | ForEach-Object { $_.ToString('X2') }) -join ':'
$sha256.Dispose()

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '============================================================'
Write-Host ' GymCRM Staging TLS Bootstrap — Complete'
Write-Host '============================================================'
Write-Host ''
Write-Host "  Output directory : $OutDir"
Write-Host "  ca.crt  (DER)    : $CaCrtPath"
Write-Host "  server.crt (PEM) : $ServerCrtPath"
Write-Host "  server.key (PEM) : $ServerKeyPath"
Write-Host ''
Write-Host '  CA SHA-256 Fingerprint:'
Write-Host "    $caFp"
Write-Host '  (Verify this fingerprint after copying ca.crt to your MacBook.)'
Write-Host ''
Write-Host '  MacBook trust import — run in Terminal on your Mac:'
Write-Host "    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt"
Write-Host "    (Copy $CaCrtPath from the Windows host to your MacBook first.)"
Write-Host ''
Write-Host '  DNS check — run from inside the WireGuard VPN:'
Write-Host "    Resolve-DnsName $Hostname"
Write-Host '    -- Must return the Windows host IP, not your Mac or WAN address.'
Write-Host '============================================================'
