<#
.SYNOPSIS
    Preflight validation for the self-hosted staging TLS bundle.

.DESCRIPTION
    Checks that the Windows host TLS bundle exists and that an nginx container
    can load the server certificate and private key before the deploy workflow
    starts the full compose stack.

    This step is intentionally lightweight: it does not trust or inspect the
    certificate chain in depth. It exists to catch the exact class of failure
    where nginx cannot load /etc/nginx/certs/server.crt or server.key.

.PARAMETER Hostname
    Canonical staging hostname, used only for the temporary nginx config.
.EXAMPLE
    .\validate_selfhosted_staging_tls_bundle.ps1 -Hostname ajw0831.iptime.org
#>

[CmdletBinding()]
param(
    [string]$Hostname
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $Hostname) { $Hostname = $env:STAGING_HOSTNAME }
if (-not $Hostname) {
    Write-Error "Hostname is required. Pass -Hostname <ddns-hostname> or set `$env:STAGING_HOSTNAME."
    exit 1
}

$BundleDir = 'C:\ProgramData\gymcrm-staging-tls'
$RequiredFiles = @('ca.crt', 'server.crt', 'server.key')

Write-Host '==================================================='
Write-Host ' GymCRM staging TLS bundle preflight'
Write-Host "  Hostname : $Hostname"
Write-Host "  Bundle   : $BundleDir"
Write-Host '==================================================='
Write-Host ''

foreach ($fileName in $RequiredFiles) {
    $path = Join-Path $BundleDir $fileName
    if (-not (Test-Path $path)) {
        Write-Error "Missing TLS file: $path. Run docs/observability/tools/bootstrap_selfhosted_staging_tls.ps1 on the Windows host first."
        exit 1
    }

    $item = Get-Item $path
    if ($item.Length -le 0) {
        Write-Error "TLS file is empty: $path"
        exit 1
    }
}

$tempRoot = Join-Path $PSScriptRoot '_tmp'
if (-not (Test-Path $tempRoot)) {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
}

$tempDir = Join-Path $tempRoot ("gymcrm-staging-nginx-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$tempConfigPath = Join-Path $tempDir 'nginx.conf'
$config = @"
events {}
http {
  server {
    listen 443 ssl;
    server_name $Hostname;
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
  }
}
"@
[System.IO.File]::WriteAllText($tempConfigPath, $config)

try {
    $mountBundle = "${BundleDir}:/etc/nginx/certs:ro"
    $mountConfig = "${tempConfigPath}:/etc/nginx/nginx.conf:ro"
    $args = @(
        'run', '--rm',
        '-v', $mountBundle,
        '-v', $mountConfig,
        'nginx:1.27-alpine',
        'nginx', '-t', '-c', '/etc/nginx/nginx.conf'
    )

    Write-Host '[*] Asking nginx to load the bundle...'
    & docker @args
    if ($LASTEXITCODE -ne 0) {
        throw "nginx could not load the TLS bundle (exit code $LASTEXITCODE)."
    }

    Write-Host '[PASS] TLS bundle is present and nginx can load server.crt/server.key.'
}
finally {
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

exit 0
