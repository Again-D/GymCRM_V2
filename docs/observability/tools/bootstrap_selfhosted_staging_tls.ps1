#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Bootstrap a host-local internal CA and staging server certificate for
    GymCRM self-hosted staging TLS.

.DESCRIPTION
    Generates an internal CA and a server certificate (with DDNS hostname and
    localhost DNS SANs) using only built-in Windows PKI cmdlets. No external
    tools (mkcert, OpenSSL) are required.

    Requires Windows PowerShell 5.1 or PowerShell 7+. Must be run as
    Administrator.

    Outputs to C:\ProgramData\gymcrm-staging-tls\:
        ca.crt     - CA certificate in DER format
                     (import to Windows/macOS trust store; Docker volume mount)
        server.crt - Server certificate in PEM format
        server.key - Server private key in PEM format (PKCS#1 RSA)

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
function Get-ExistingBundleStatus {
    param([string]$ExpectedHostname)

    if (-not (Test-Path $CaCrtPath) -or -not (Test-Path $ServerCrtPath) -or -not (Test-Path $ServerKeyPath)) {
        return [pscustomobject]@{ Status = 'Incomplete' }
    }

    try {
        $existingCertBytes = Get-PemCertificateBytes -Path $ServerCrtPath
        $existingCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 -ArgumentList (, $existingCertBytes)
        $sanExt = $existingCert.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' }
        if (-not $sanExt) {
            return [pscustomobject]@{ Status = 'Invalid' }
        }

        $sanText = $sanExt.Format($false)
        if (
            ($existingCert.Subject -match [regex]::Escape("CN=$ExpectedHostname")) -and
            ($sanText -match [regex]::Escape($ExpectedHostname))
        ) {
            return [pscustomobject]@{ Status = 'Match' }
        }

        return [pscustomobject]@{ Status = 'Mismatch' }
    } catch {
        return [pscustomobject]@{ Status = 'Invalid' }
    }
}

if (-not $Force) {
    $bundleStatus = Get-ExistingBundleStatus -ExpectedHostname $Hostname
    switch ($bundleStatus.Status) {
        'Match' {
            Write-Warning "TLS bundle already exists at '$OutDir' and matches hostname '$Hostname'."
            Write-Warning "Pass -Force to rotate the CA/cert bundle. NOTE: -Force rotation requires re-importing the CA on all clients."
            exit 0
        }
        'Mismatch' {
            Write-Warning "Existing TLS bundle at '$OutDir' does not match hostname '$Hostname'."
            Write-Warning "Pass -Force to rotate the CA/cert bundle for the new hostname."
            exit 1
        }
        default {
            Write-Warning "Existing TLS bundle at '$OutDir' is incomplete or unreadable. Regenerating a fresh bundle."
        }
    }
}

# ---------------------------------------------------------------------------
# Ensure output directory exists
# ---------------------------------------------------------------------------
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
    Write-Host "[+] Created output directory: $OutDir"
}

Remove-Item $CaCrtPath, $ServerCrtPath, $ServerKeyPath, $TempPfxPath -Force -ErrorAction SilentlyContinue

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

function ConvertTo-DerLengthBytes {
    param([int]$Length)

    if ($Length -lt 0x80) {
        return [byte[]]@([byte]$Length)
    }

    $value = $Length
    $lengthBytes = New-Object System.Collections.Generic.List[byte]
    while ($value -gt 0) {
        $lengthBytes.Insert(0, [byte]($value -band 0xFF))
        $value = $value -shr 8
    }

    $prefix = [byte](0x80 -bor $lengthBytes.Count)
    $result = New-Object System.Collections.Generic.List[byte]
    $result.Add($prefix)
    $result.AddRange([byte[]]$lengthBytes.ToArray())
    return $result.ToArray()
}

function ConvertTo-DerIntegerBytes {
    param([byte[]]$Bytes)

    if ($null -eq $Bytes -or $Bytes.Length -eq 0) {
        $Bytes = [byte[]]@(0)
    } else {
        $Bytes = [byte[]]$Bytes

        $startIndex = 0
        while ($startIndex -lt ($Bytes.Length - 1) -and $Bytes[$startIndex] -eq 0) {
            $startIndex++
        }

        if ($startIndex -gt 0) {
            $Bytes = $Bytes[$startIndex..($Bytes.Length - 1)]
        }

        if (($Bytes[0] -band 0x80) -ne 0) {
            $Bytes = [byte[]]@(0) + $Bytes
        }
    }

    $lengthBytes = ConvertTo-DerLengthBytes -Length $Bytes.Length
    $result = New-Object System.Collections.Generic.List[byte]
    $result.Add(0x02)
    $result.AddRange([byte[]]$lengthBytes)
    $result.AddRange([byte[]]$Bytes)
    return $result.ToArray()
}

function ConvertTo-RsaPrivateKeyDer {
    param([System.Security.Cryptography.RSAParameters]$Parameters)

    $parts = New-Object System.Collections.Generic.List[byte]
    foreach ($segment in @(
        (ConvertTo-DerIntegerBytes -Bytes ([byte[]]@(0))),
        (ConvertTo-DerIntegerBytes -Bytes $Parameters.Modulus),
        (ConvertTo-DerIntegerBytes -Bytes $Parameters.Exponent),
        (ConvertTo-DerIntegerBytes -Bytes $Parameters.D),
        (ConvertTo-DerIntegerBytes -Bytes $Parameters.P),
        (ConvertTo-DerIntegerBytes -Bytes $Parameters.Q),
        (ConvertTo-DerIntegerBytes -Bytes $Parameters.DP),
        (ConvertTo-DerIntegerBytes -Bytes $Parameters.DQ),
        (ConvertTo-DerIntegerBytes -Bytes $Parameters.InverseQ)
    )) {
        $parts.AddRange([byte[]]$segment)
    }

    $sequenceLength = ConvertTo-DerLengthBytes -Length $parts.Count
    $der = New-Object System.Collections.Generic.List[byte]
    $der.Add(0x30)
    $der.AddRange([byte[]]$sequenceLength)
    $der.AddRange($parts)
    return $der.ToArray()
}

function Get-PemCertificateBytes {
    param([string]$Path)

    $pem = Get-Content -Raw -Path $Path
    $match = [regex]::Match(
        $pem,
        '-----BEGIN CERTIFICATE-----\s*(?<body>.*?)\s*-----END CERTIFICATE-----',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    if (-not $match.Success) {
        throw "File is not a PEM certificate: $Path"
    }

    $body = ($match.Groups['body'].Value -replace '\s', '')
    return [Convert]::FromBase64String($body)
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
# SANs: DDNS hostname + localhost (DNS)
# ---------------------------------------------------------------------------
Write-Host "[*] Creating server certificate (SANs: $Hostname, localhost)..."
$serverCert = New-SelfSignedCertificate `
    -Subject           "CN=$Hostname" `
    -DnsName           $Hostname, 'localhost' `
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

        # --- server.key (PKCS#1 PEM) — compatible with Windows PowerShell 5.1+ ---
        $rsaKey = $pfxCert.PrivateKey
        if (-not $rsaKey) {
            throw "RSA private key not found in PFX. Verify -KeyExportPolicy Exportable was used."
        }

        $keyBytes = $null
        try {
            $keyBytes     = ConvertTo-RsaPrivateKeyDer -Parameters $rsaKey.ExportParameters($true)
            $keyPemBody   = ConvertTo-PemBody -Bytes $keyBytes
            $serverKeyPem = "-----BEGIN RSA PRIVATE KEY-----`n$keyPemBody`n-----END RSA PRIVATE KEY-----`n"
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
