<#
.SYNOPSIS
    HTTPS smoke validation for the self-hosted staging environment.

.DESCRIPTION
    Validates that the GymCRM self-hosted staging HTTPS endpoints are reachable,
    the TLS certificate is trusted natively, and the certificate's Subject
    Alternative Names include the canonical staging hostname.

    Targets the canonical staging hostname over HTTPS. The certificate issued
    by the bootstrap script includes the DDNS hostname as a SAN, so TLS
    validation succeeds against the same URL that users and the deploy workflow
    consume. The CA is installed in LocalMachine\Root by the bootstrap script,
    so no -SkipCertificateCheck is needed.

    Requires PowerShell 7 or later (pwsh). Compatible with a Windows GitHub
    Actions self-hosted runner.

.PARAMETER Hostname
    Canonical staging hostname (e.g. ajw0831.iptime.org).
    Falls back to $env:STAGING_HOSTNAME if not provided.

.EXAMPLE
    .\validate_selfhosted_staging_https.ps1 -Hostname ajw0831.iptime.org

.EXAMPLE
    $env:STAGING_HOSTNAME = "ajw0831.iptime.org"
    .\validate_selfhosted_staging_https.ps1
#>

[CmdletBinding()]
param(
    [string]$Hostname
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Resolve hostname
# ---------------------------------------------------------------------------
if (-not $Hostname) { $Hostname = $env:STAGING_HOSTNAME }
if (-not $Hostname) {
    Write-Host "[ERROR] Hostname not set." -ForegroundColor Red
    Write-Host "        Pass -Hostname <ddns-hostname> or set `$env:STAGING_HOSTNAME."
    exit 1
}

$BaseUrl    = "https://$Hostname"
$MaxRetries = 30
$SleepSecs  = 2
$AllPassed  = $true

Write-Host '==================================================='
Write-Host ' GymCRM staging HTTPS smoke validation'
Write-Host "  Hostname : $Hostname"
Write-Host "  Target   : $BaseUrl  (canonical hostname)"
Write-Host '==================================================='
Write-Host ''

# ---------------------------------------------------------------------------
# Helper: wait for a URL to return HTTP 200 (with optional body assertion)
# Retries up to $MaxRetries times with $SleepSecs between attempts.
# Returns $true on success, $false if all retries are exhausted.
# ---------------------------------------------------------------------------
function Wait-UrlOk {
    param(
        [string]$Url,
        [string]$BodyMustContain = '',
        [int]   $MaxRetries,
        [int]   $SleepSecs
    )

    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        try {
            # No -SkipCertificateCheck — TLS trust is validated natively via
            # the CA installed in LocalMachine\Root by the bootstrap script.
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10

            if ($resp.StatusCode -ne 200) {
                throw "Unexpected HTTP $($resp.StatusCode)"
            }

            if ($BodyMustContain -and ($resp.Content -notmatch [regex]::Escape($BodyMustContain))) {
                throw "Response body is missing expected string: $BodyMustContain"
            }

            Write-Host "  [PASS] $Url  (attempt $attempt, HTTP $($resp.StatusCode))"
            return $true

        } catch {
            $msg = $_.Exception.Message
            if ($attempt -lt $MaxRetries) {
                Write-Host "  [WAIT $attempt/$MaxRetries] $Url — $msg"
                Start-Sleep -Seconds $SleepSecs
            } else {
                Write-Host "  [FAIL] $Url — $msg (exhausted $MaxRetries attempts)" -ForegroundColor Red
                return $false
            }
        }
    }
    return $false
}

# ---------------------------------------------------------------------------
# Check 1: GET / returns HTTP 200 over TLS
# ---------------------------------------------------------------------------
Write-Host "--- Check 1: GET $BaseUrl/ (TLS + HTTP 200) ---"
if (-not (Wait-UrlOk -Url "$BaseUrl/" -MaxRetries $MaxRetries -SleepSecs $SleepSecs)) {
    $AllPassed = $false
}

# ---------------------------------------------------------------------------
# Check 2: GET /api/v1/health returns HTTP 200 with "status" in body
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host "--- Check 2: GET $BaseUrl/api/v1/health (HTTP 200 + body contains `"status`") ---"
if (-not (Wait-UrlOk -Url "$BaseUrl/api/v1/health" `
                     -BodyMustContain '"status"' `
                     -MaxRetries $MaxRetries `
                     -SleepSecs  $SleepSecs)) {
    $AllPassed = $false
}

# ---------------------------------------------------------------------------
# Check 3: TLS cert SAN includes the canonical hostname
# Connects via SSL to the canonical hostname to capture the server certificate,
# then inspects the SAN extension. Trust check bypass (return $true in
# callback) is intentional here because the purpose of this step is cert
# inspection only — TLS trust was already exercised by Invoke-WebRequest in
# checks 1 and 2 above.
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host "--- Check 3: TLS cert SAN includes '$Hostname' ---"
try {
    $certCapture = @{ X509 = $null }

    $captureCallback = [System.Net.Security.RemoteCertificateValidationCallback]{
        param($sender, $rawCert, $chain, $policyErrors)
        if ($rawCert) {
            # X509Certificate2(X509Certificate) constructor available in .NET 5+
            $certCapture.X509 = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($rawCert)
        }
        return $true   # Accept solely for cert capture; trust verified above
    }

    $tcpClient = [System.Net.Sockets.TcpClient]::new($Hostname, 443)
    $sslStream  = $null
    try {
        $sslStream = [System.Net.Security.SslStream]::new(
            $tcpClient.GetStream(), $false, $captureCallback
        )
        # Authenticate to the canonical hostname so SNI and hostname matching
        # are exercised on the same URL used by the smoke checks.
        $sslStream.AuthenticateAsClient($Hostname)
    } finally {
        if ($null -ne $sslStream) { $sslStream.Dispose() }
        $tcpClient.Dispose()
    }

    $x509 = $certCapture.X509
    if (-not $x509) {
        throw 'Could not capture the server certificate from the TLS handshake.'
    }

    Write-Host "  Subject  : $($x509.Subject)"
    Write-Host "  Issuer   : $($x509.Issuer)"
    Write-Host "  Expires  : $($x509.NotAfter.ToString('yyyy-MM-dd HH:mm:ss'))"

    # OID 2.5.29.17 = Subject Alternative Name
    $sanExt = $x509.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' }
    if (-not $sanExt) {
        throw 'Certificate has no Subject Alternative Name (SAN) extension.'
    }

    $sanText = $sanExt.Format($false)
    Write-Host "  SANs     : $sanText"

    if ($sanText -match [regex]::Escape($Hostname)) {
        Write-Host "  [PASS] Cert SAN contains '$Hostname'"
    } else {
        Write-Host "  [FAIL] Cert SAN does not contain '$Hostname'" -ForegroundColor Red
        $AllPassed = $false
    }

} catch {
    Write-Host "  [FAIL] Cert SAN check: $($_.Exception.Message)" -ForegroundColor Red
    $AllPassed = $false
}

# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '==================================================='
if (-not $AllPassed) {
    Write-Host ' SMOKE FAILED — one or more checks did not pass' -ForegroundColor Red
    Write-Host '==================================================='
    exit 1
}

Write-Host ' All smoke checks PASSED'
Write-Host " Canonical staging URL: https://$Hostname/"
Write-Host '==================================================='
exit 0
