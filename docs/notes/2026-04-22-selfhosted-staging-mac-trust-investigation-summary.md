---
title: Self-hosted staging Mac trust investigation summary
status: completed
date: 2026-04-22
origin:
  - docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
  - docs/ops/selfhosted-staging-runbook.md
  - docs/observability/staging-go-no-go-checklist.md
  - docs/notes/2026-04-22-mac-browser-trust-validation-semantics-research.md
---

# Self-hosted Staging Mac Trust Investigation Summary

## Summary

We verified that the staging server certificate and the downloaded CA are aligned.
The remaining failure is not a confirmed server-side TLS bundle problem. It is a local macOS trust-evaluation problem on one Mac.

## Verified Evidence

- `curl --resolve ... -vk` reached `https://ajw0831.iptime.org/api/v1/health` and returned HTTP 200.
- The server leaf certificate presented for staging had:
  - subject `CN=ajw0831.iptime.org`
  - issuer `CN=GymCRM Staging CA`
  - SHA-256 fingerprint `D3:C8:24:1C:E1:ED:72:50:23:1A:EE:32:91:69:22:B6:C5:82:6F:58:83:0B:E7:63:5F:A9:17:BD:FC:4D:9F:D2`
- `/Users/abc/Downloads/ca.crt` exists and is DER, not PEM.
  - `openssl x509 -inform DER ...` succeeded
  - `openssl x509 -inform PEM ...` failed
- The downloaded CA had SHA-256 fingerprint `3B:4C:A5:CF:74:76:E4:B3:35:67:BC:EF:86:D9:72:6C:7E:BA:04:55:B4:BD:5E:DB:15:6F:52:17:B2:1B:AE:71` and subject/issuer `CN=GymCRM Staging CA`.
- Converting the CA from DER to PEM and using `curl --cacert <pem>` succeeded.
- `security find-certificate -a -Z -c "GymCRM Staging CA" "/Library/Keychains/System.keychain"` later showed the same CA fingerprint in `System.keychain`.
- `bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh` still failed Check 2 with:
  - `curl: (60) SSL certificate problem: unable to get local issuer certificate`
  - while Check 1 passed because the certificate was present in `System.keychain`

## What We Learned

### 1. DER vs PEM explained the earlier `curl: (77)` error

The distributed `ca.crt` is a DER certificate intended for client import.
That file is correct for the repo's documented keychain-import flow, but it is not the right direct input for `curl --cacert`.

For `curl --cacert`, the CA had to be converted to PEM first.

### 2. Server-side TLS alignment was confirmed

Because `curl --cacert <converted-pem>` succeeded, we confirmed that:

- the downloaded CA matches the staging issuer
- the server is presenting the expected hostname certificate
- the remaining problem is not explained by a mismatched server leaf / CA pair

### 3. The unresolved issue is the plain macOS trust path

The helper script intentionally separates two checks:

- **Check 1**: certificate exists in `/Library/Keychains/System.keychain`
- **Check 2**: `curl --resolve ...` actually succeeds using the system trust path

That distinction mattered here. Presence in the System keychain was not enough to make Check 2 pass.

## Repo-Level Interpretation

This investigation did not reveal a repo-side TLS contract mismatch.

The repo still consistently expects this flow:

1. export `ca.crt` as DER
2. import that CA into the macOS System keychain
3. use the canonical hostname `https://ajw0831.iptime.org/`
4. use hosts override for final Mac browser trust validation

What remained unresolved was narrower: whether this specific Mac had fully applied the CA as an SSL trust root in the way `curl`/`SecureTransport` expected.

## Why We Stopped

By the end of the investigation, the important repository questions were answered:

- PR #150 changes were already merged
- runbook/checklist/helper semantics were aligned
- server certificate / CA compatibility was verified

The only remaining issue was local operator-machine trust debugging, so no additional repo change was justified at that point.

## If This Needs To Be Resumed Later

Use the repo flow first:

```bash
security find-certificate -a -Z -c "GymCRM Staging CA" "/Library/Keychains/System.keychain"
bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
```

If Check 1 passes but Check 2 still fails, treat it as a local macOS trust-settings investigation and inspect:

```bash
security dump-trust-settings -d
curl -V
```

Also confirm in Keychain Access that `GymCRM Staging CA` is trusted for SSL, and keep these usage rules in mind:

- use the DER `ca.crt` for System keychain import
- use a PEM-converted copy only when explicitly testing with `curl --cacert`

## Related Files

- `docs/observability/tools/validate_mac_trust_selfhosted_staging.sh`
- `docs/ops/selfhosted-staging-runbook.md`
- `docs/observability/staging-go-no-go-checklist.md`
- `docs/notes/2026-04-22-mac-browser-trust-validation-semantics-research.md`
