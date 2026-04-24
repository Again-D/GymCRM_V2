<#
.SYNOPSIS
    Preflight validation for the self-hosted staging Certbot deployment flow.

.DESCRIPTION
    Validates the canonical hostname, Certbot contact email, and Compose rendering
    before the deploy workflow starts the staging stack. This replaces the old
    host-local TLS bundle gate used by the internal-CA model.

.PARAMETER Hostname
    Canonical staging hostname. Falls back to $env:STAGING_HOSTNAME.

.PARAMETER CertbotEmail
    Email address passed to Certbot. Falls back to $env:STAGING_CERTBOT_EMAIL.
#>

[CmdletBinding()]
param(
    [string]$Hostname,
    [string]$CertbotEmail
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $Hostname) { $Hostname = $env:STAGING_HOSTNAME }
if (-not $CertbotEmail) { $CertbotEmail = $env:STAGING_CERTBOT_EMAIL }

if (-not $Hostname) {
    Write-Error "Hostname is required. Pass -Hostname <ddns-hostname> or set `$env:STAGING_HOSTNAME."
    exit 1
}

if (-not $CertbotEmail) {
    Write-Error "CertbotEmail is required. Pass -CertbotEmail <email> or set `$env:STAGING_CERTBOT_EMAIL."
    exit 1
}

if ([System.Uri]::CheckHostName($Hostname) -ne [System.UriHostNameType]::Dns) {
    Write-Error "Hostname must be a DNS hostname. Received: $Hostname"
    exit 1
}

if ($CertbotEmail -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    Write-Error "CertbotEmail must look like a valid email address. Received: $CertbotEmail"
    exit 1
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$composeFile = Join-Path $repoRoot 'compose.selfhosted-staging.yaml'

if (-not (Test-Path $composeFile)) {
    Write-Error "Compose file not found: $composeFile"
    exit 1
}

$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCommand) {
    Write-Error 'docker command not found in PATH. Install Docker Desktop / Docker CLI first.'
    exit 1
}

$dnsCommand = Get-Command Resolve-DnsName -ErrorAction SilentlyContinue
if (-not $dnsCommand) {
    Write-Error 'Resolve-DnsName command is not available. Run this preflight on the Windows self-hosted runner.'
    exit 1
}

Write-Host '==================================================='
Write-Host ' GymCRM staging Certbot preflight'
Write-Host "  Hostname      : $Hostname"
Write-Host "  Certbot email : $CertbotEmail"
Write-Host "  Compose file  : $composeFile"
Write-Host '==================================================='
Write-Host ''

$env:STAGING_HOSTNAME = $Hostname
$env:STAGING_CERTBOT_EMAIL = $CertbotEmail
if (-not $env:STAGING_POSTGRES_PASSWORD) {
    $env:STAGING_POSTGRES_PASSWORD = 'preflight-placeholder'
}

Write-Host '[*] Checking docker compose availability...'
& docker 'compose' 'version' | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose version failed (exit code $LASTEXITCODE)."
    exit 1
}

Write-Host "[*] Resolving hostname via local DNS: $Hostname"
try {
    Resolve-DnsName -Name $Hostname -ErrorAction Stop | Out-Null
}
catch {
    Write-Error "Local DNS resolution failed for '$Hostname'. Confirm the hostname resolves before running the deploy workflow. $($_.Exception.Message)"
    exit 1
}

$dockerComposeArgs = @(
    'compose',
    '-p', 'gymcrm-staging',
    '-f', $composeFile,
    'config'
)

Write-Host '[*] Rendering docker compose configuration...'
& docker @dockerComposeArgs | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose config failed (exit code $LASTEXITCODE)."
    exit 1
}

Write-Host '[PASS] Docker, local DNS, hostname/email inputs, and docker compose rendering all succeeded.'
exit 0
