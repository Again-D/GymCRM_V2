# Mac Browser Trust Validation Semantics — Research Summary

**Date**: 2026-04-22  
**Scope**: Read-only context for planning minimal changes to Mac browser trust validation  
**Goal**: Support concise implementation plan without redesigning certificates, SANs, or CORS

---

## 1. ESTABLISHED TRUST MODEL

### 1.1 Final Accepted State (Canonical)

The repo has **already implemented** the complete VPN-only HTTPS staging lane with a clear trust model:

```
┌─────────────────────────────────────────────────────────────┐
│ Mac Browser Trust (Final Accepted State)                    │
├─────────────────────────────────────────────────────────────┤
│ 1. CA Import                                                │
│    └─ GymCRM Staging CA → macOS System keychain             │
│       Command: security add-trusted-cert -d -r trustRoot    │
│                  -k /Library/Keychains/System.keychain      │
│                  ca.crt                                     │
│                                                             │
│ 2. Hosts Override (DNS Mapping)                             │
│    └─ ajw0831.iptime.org → 10.170.47.3 (WireGuard IP)      │
│       Command: echo "10.170.47.3 ajw0831.iptime.org"        │
│                  >> /etc/hosts                              │
│       Verification: dscacheutil -q host -a name             │
│                     ajw0831.iptime.org                      │
│                                                             │
│ 3. Canonical Hostname Access                                │
│    └─ https://ajw0831.iptime.org/ (ONLY accepted URL)      │
│       Health check: curl https://ajw0831.iptime.org/        │
│                     api/v1/health                           │
│                                                             │
│ 4. Guardrails (MUST NOT)                                    │
│    ✗ No 127.0.0.1 mapping (localhost)                       │
│    ✗ No raw WireGuard IP browsing (https://10.170.47.3)    │
│    ✗ No public HTTPS exposure                               │
│    ✗ No split-DNS redesign                                  │
│    ✗ No WG-IP SAN support as productized model              │
└─────────────────────────────────────────────────────────────┘
```

**Source**: `.sisyphus/plans/selfhosted-staging-cert-trust.md` (Definition of Done, lines 47–62)

---

## 2. GATE SEMANTICS CURRENTLY EXPRESSED

### 2.1 Verification Commands (Exact, Agent-Executable)

The repo defines **four concrete verification gates** in the plan:

| Gate | Command | Expected Output | Purpose |
|------|---------|-----------------|---------|
| **CA Trust** | `security find-certificate -a -c "GymCRM Staging CA" /Library/Keychains/System.keychain` | CA exists in System keychain | Proves CA import completed |
| **Pre-hosts Canonical** | `curl --fail --silent --show-error --resolve ajw0831.iptime.org:443:10.170.47.3 https://ajw0831.iptime.org/api/v1/health` | Contains `"status"` | Proves TLS trust works before hosts override |
| **Hosts Resolution** | `dscacheutil -q host -a name ajw0831.iptime.org` | `ip_address: 10.170.47.3` | Proves DNS mapping is active |
| **Canonical-host HTTPS** | `curl --fail --silent https://ajw0831.iptime.org/api/v1/health` | Contains `"status"` | Proves end-to-end access after hosts override |
| **Misconfiguration Guard** | `curl --connect-timeout 5 --resolve ajw0831.iptime.org:443:127.0.0.1 https://ajw0831.iptime.org/api/v1/health` | Non-zero exit (failure) | Proves 127.0.0.1 is NOT the server |

**Source**: `.sisyphus/plans/selfhosted-staging-cert-trust.md` (lines 47–62)

### 2.2 Operational Checklists

Two documents currently express gate semantics:

#### A. **Staging Go/No-Go Checklist** (`docs/observability/staging-go-no-go-checklist.md`)

```markdown
## Pre-check (Telemetry health)
- [ ] Mac CA trust verified: security find-certificate -a -c "GymCRM Staging CA" ...
- [ ] Mac hosts override active: dscacheutil -q host -a name ajw0831.iptime.org
- [ ] Staging app up (https://ajw0831.iptime.org/api/v1/health 200, HTTPS, TLS trust)
```

**Key distinction** (lines 13–15):
- **Windows Runner Smoke**: GitHub Actions validates server-side HTTPS (TLS SAN). Does NOT guarantee Mac browser trust.
- **Mac Browser Trust**: Requires (1) CA in System keychain + (2) hosts override.

#### B. **Self-hosted Staging Runbook** (`docs/ops/selfhosted-staging-runbook.md`)

Sections 2.3–2.4 define:
- CA import command (CLI + UI options)
- Hosts override procedure
- Verification commands
- Guardrails against `127.0.0.1` and raw WG-IP browsing

**Source**: Lines 87–112 of runbook

---

## 3. HELPER SCRIPTS & VALIDATION ARTIFACTS

### 3.1 Mac Trust Validation Script

**File**: `docs/observability/tools/validate_mac_trust_selfhosted_staging.sh`

**Purpose**: Reproducible, agent-executable validation of all four gates.

**Structure**:
```bash
#!/usr/bin/env bash
# Configuration (editable defaults)
HOSTNAME="ajw0831.iptime.org"
WG_IP="10.170.47.3"
CA_NAME="GymCRM Staging CA"
HEALTH_PATH="/api/v1/health"

# Four checks:
# Check 1: CA trust (security find-certificate)
# Check 2: Pre-hosts canonical-host (curl --resolve)
# Check 3: Hosts override resolution (dscacheutil)
# Check 4: Misconfiguration guard (127.0.0.1 must fail)

# Summary: exit 0 if all pass, exit 1 if any fail
```

**Key design**:
- No mutation (read-only validation)
- Exact command strings match plan definition
- Failure modes documented inline
- Exit code signals overall pass/fail

**Source**: `docs/observability/tools/validate_mac_trust_selfhosted_staging.sh` (lines 1–114)

### 3.2 TLS Bootstrap Script (Windows)

**File**: `docs/observability/tools/bootstrap_selfhosted_staging_tls.ps1`

**Purpose**: Generate CA + server cert on Windows host (one-time setup).

**Key outputs**:
- `C:\ProgramData\gymcrm-staging-tls\ca.crt` (DER format, for client import)
- `C:\ProgramData\gymcrm-staging-tls\server.crt` (PEM, for Nginx)
- `C:\ProgramData\gymcrm-staging-tls\server.key` (PEM, for Nginx)

**Idempotency**: Checks if cert already exists and matches hostname; skips regeneration unless `-Force`.

**Source**: `docs/observability/tools/bootstrap_selfhosted_staging_tls.ps1` (lines 1–382)

---

## 4. CONFIGURATION & DEPLOYMENT INTEGRATION

### 4.1 Compose File (`compose.selfhosted-staging.yaml`)

**CORS Origin Configuration** (line 51):
```yaml
APP_PROTOTYPE_ALLOWED_ORIGINS: ${APP_PROTOTYPE_ALLOWED_ORIGINS:-https://localhost,https://127.0.0.1}
```

**Current default**: `https://localhost,https://127.0.0.1` (dev/test only)

**Conditional expansion** (per plan U4):
- If canonical-host CORS failure is reproduced, add `https://ajw0831.iptime.org`
- **Status**: No failure reproduced yet; U4 is conditional/no-op

### 4.2 Backend CORS Config (`PrototypeCorsConfig.java`)

```java
@Configuration
@Profile({"dev", "staging"})
public class PrototypeCorsConfig implements WebMvcConfigurer {
    private final List<String> allowedOrigins;
    
    public PrototypeCorsConfig(
        @Value("${app.prototype.allowed-origins:...}") List<String> allowedOrigins
    ) { ... }
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/v1/**")
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
                .allowCredentials(true);
    }
}
```

**Design**: Environment-driven, no hardcoding. Same-origin (canonical hostname) should work without CORS changes.

**Source**: `backend/src/main/java/com/gymcrm/common/config/PrototypeCorsConfig.java`

---

## 5. BEST PRACTICES FOR EXPRESSING GATE SEMANTICS

### 5.1 Command-Based Verification (Preferred)

**Pattern**: Exact, copy-paste-ready commands in docs + scripts.

**Advantages**:
- ✅ Agent-executable (no human interpretation)
- ✅ Reproducible across environments
- ✅ Testable in CI/CD (Bash, PowerShell)
- ✅ Failure modes clear (exit codes, output patterns)

**Examples from repo**:
```bash
# CA trust
security find-certificate -a -c "GymCRM Staging CA" /Library/Keychains/System.keychain

# Hosts resolution
dscacheutil -q host -a name ajw0831.iptime.org

# Canonical-host health
curl --fail --silent https://ajw0831.iptime.org/api/v1/health
```

### 5.2 Guardrails (Explicit Negations)

**Pattern**: Document what MUST NOT happen, not just what should.

**Examples from repo**:
- ✗ "Do not map `ajw0831.iptime.org` to `127.0.0.1`"
- ✗ "Do not use raw WG-IP browsing as final success criterion"
- ✗ "Do not introduce split-DNS/router redesign"

**Benefit**: Prevents scope creep and operator error.

**Source**: `.sisyphus/plans/selfhosted-staging-cert-trust.md` (lines 64–76, "Must NOT Have")

### 5.3 Checklist Distinction (Runner vs. Browser)

**Pattern**: Separate verification gates for different actors.

**Example from repo**:
```markdown
## Trusted Access Model
- **Windows Runner Smoke**: GitHub Actions validates server-side HTTPS.
  → Does NOT guarantee Mac browser trust.
- **Mac Browser Trust**: Requires CA import + hosts override.
  → Separate verification gate.
```

**Benefit**: Prevents false positives (runner success ≠ browser success).

**Source**: `docs/observability/staging-go-no-go-checklist.md` (lines 13–15)

### 5.4 Conditional Config (Evidence-Driven)

**Pattern**: Only change config if failure is reproduced.

**Example from repo**:
```markdown
## U4: Conditionally update canonical-origin config
- Verify whether any backend/workflow env change is needed.
- Only if CORS failure is reproduced for https://ajw0831.iptime.org
  should this unit modify compose/CORS config.
- If no failure: close as no-op with documented rationale.
```

**Benefit**: Avoids speculative changes; keeps diffs minimal.

**Source**: `.sisyphus/plans/selfhosted-staging-cert-trust.md` (lines 231–269)

---

## 6. CURRENT IMPLEMENTATION STATUS

### 6.1 Completed (Merged)

| Artifact | Status | Evidence |
|----------|--------|----------|
| VPN-only HTTPS staging lane | ✅ Deployed | `feature/staging-vpn-https` PR merged |
| TLS bootstrap script (Windows) | ✅ Implemented | `bootstrap_selfhosted_staging_tls.ps1` |
| Runbook (CA import + hosts override) | ✅ Documented | `docs/ops/selfhosted-staging-runbook.md` |
| Go/No-Go checklist (trust gates) | ✅ Documented | `docs/observability/staging-go-no-go-checklist.md` |
| Mac validation script | ✅ Implemented | `validate_mac_trust_selfhosted_staging.sh` |

### 6.2 Conditional (No-Op if No Failure)

| Artifact | Status | Condition |
|----------|--------|-----------|
| CORS origin config update | ⏳ Pending | Only if canonical-host CORS failure reproduced |
| Backend config change | ⏳ Pending | Only if same-origin fails |

**Source**: `.sisyphus/plans/selfhosted-staging-cert-trust.md` (U4, lines 231–269)

---

## 7. MINIMAL CHANGE OPPORTUNITIES

### 7.1 Documentation Alignment

**Current gaps** (if any):
- Runbook section 2.4 (Mac CA import) is clear but could cross-reference the validation script
- Go/No-Go checklist distinguishes runner vs. browser but could link to validation script

**Minimal fix**:
```markdown
## 2.4 MacBook에 CA 인증서 가져오기

[existing CLI/UI instructions]

**Verification**: After import, run the validation script:
  bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
```

### 7.2 Script Discoverability

**Current state**: Validation script exists but may not be discoverable from runbook.

**Minimal fix**: Add one-line reference in runbook section 3 (Smoke check):
```markdown
## 3) 수동 구동

[existing instructions]

Smoke check:
- https://<STAGING_HOSTNAME>/
- https://<STAGING_HOSTNAME>/api/v1/health
- **Mac validation**: bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
```

### 7.3 Conditional Config Closure

**Current state**: U4 (CORS config) is marked as conditional/no-op.

**Minimal fix**: Document the decision:
```markdown
## U4 Status: No-Op (No Failure Reproduced)

As of [date], canonical-host HTTPS access works without CORS changes.
Same-origin requests from https://ajw0831.iptime.org/ are accepted.
No config change required.

If future CORS failure occurs, update:
- compose.selfhosted-staging.yaml: APP_PROTOTYPE_ALLOWED_ORIGINS
- backend/src/main/java/com/gymcrm/common/config/PrototypeCorsConfig.java
```

---

## 8. SCRIPT/DOC PATTERNS FOR GATE SEMANTICS

### 8.1 Bash Validation Pattern

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration (editable)
HOSTNAME="ajw0831.iptime.org"
WG_IP="10.170.47.3"

# State tracking
HARD_FAIL=0
pass()    { echo "  [PASS] $*"; }
fail()    { echo "  [FAIL] $*"; HARD_FAIL=1; }
section() { echo ""; echo "--- $* ---"; }

# Check 1: CA trust
section "Check 1: CA certificate"
if security find-certificate -a -c "GymCRM Staging CA" /Library/Keychains/System.keychain > /dev/null 2>&1; then
  pass "CA found"
else
  fail "CA not found"
fi

# Check 2: Canonical-host reachability
section "Check 2: Canonical-host HTTPS"
if curl --resolve "${HOSTNAME}:443:${WG_IP}" --fail --silent https://${HOSTNAME}/api/v1/health | grep -q '"status"'; then
  pass "Health check passed"
else
  fail "Health check failed"
fi

# Summary
if [ "${HARD_FAIL}" -eq 0 ]; then
  echo "All checks PASSED"
  exit 0
else
  echo "VALIDATION FAILED"
  exit 1
fi
```

**Key elements**:
- Editable configuration at top
- Named functions for output consistency
- Sections for readability
- Exit code signals overall result
- Inline failure guidance

### 8.2 Markdown Checklist Pattern

```markdown
## Pre-check (Telemetry health)

- [ ] Mac CA trust verified
  Command: `security find-certificate -a -c "GymCRM Staging CA" /Library/Keychains/System.keychain`
  Expected: CA exists in System keychain

- [ ] Mac hosts override active
  Command: `dscacheutil -q host -a name ajw0831.iptime.org`
  Expected: `ip_address: 10.170.47.3`

- [ ] Canonical-host HTTPS reachable
  Command: `curl --fail --silent https://ajw0831.iptime.org/api/v1/health`
  Expected: Contains `"status"`

If any check fails: HOLD (No-Go by default)
```

**Key elements**:
- Checkbox for tracking
- Exact command (copy-paste ready)
- Expected output (clear pass/fail)
- Failure action (what to do next)

### 8.3 Plan/Runbook Pattern

```markdown
## Definition of Done (verifiable conditions with commands)

- [ ] Acceptance criterion 1
  Verification: `exact command`
  Expected: `exact output pattern`
  Evidence: `.sisyphus/evidence/task-N-slug.txt`

- [ ] Acceptance criterion 2
  Verification: `exact command`
  Expected: `exact output pattern`
  Evidence: `.sisyphus/evidence/task-N-slug.txt`

## Must NOT Have (guardrails)

- No public internet exposure
- No WG-IP SAN support as productized model
- No split-DNS redesign
```

**Key elements**:
- Acceptance criteria tied to commands
- Evidence artifact path
- Explicit guardrails (negations)
- No ambiguous language

---

## 9. SUMMARY: MINIMAL CHANGE PLAN TEMPLATE

For any future Mac trust validation work, follow this pattern:

### Phase 1: Runbook Alignment
- [ ] Update `docs/ops/selfhosted-staging-runbook.md` with exact verification commands
- [ ] Add guardrails (what NOT to do)
- [ ] Cross-reference validation script

### Phase 2: Helper/Script Hardening
- [ ] Ensure validation script covers all four gates (CA, pre-hosts, hosts, canonical-host)
- [ ] Include misconfiguration guard (127.0.0.1 must fail)
- [ ] Document failure modes inline

### Phase 3: Checklist Alignment
- [ ] Update `docs/observability/staging-go-no-go-checklist.md` to distinguish runner vs. browser trust
- [ ] Link to validation script
- [ ] Clarify that runner smoke ≠ Mac browser proof

### Phase 4: Conditional Config (Only if Failure Reproduced)
- [ ] Verify same-origin CORS works
- [ ] Document decision (no-op or change)
- [ ] If change needed, update compose + backend config

---

## 10. REFERENCES

| Document | Purpose | Key Sections |
|----------|---------|--------------|
| `.sisyphus/plans/selfhosted-staging-cert-trust.md` | Master plan | Definition of Done (lines 47–62), Must NOT Have (lines 64–76), U1–U4 tasks |
| `docs/ops/selfhosted-staging-runbook.md` | Operator guide | Section 2.3–2.4 (CA import, hosts override, verification) |
| `docs/observability/staging-go-no-go-checklist.md` | Release gate | Section 0 (trust model), Pre-check (lines 18–26) |
| `docs/observability/tools/validate_mac_trust_selfhosted_staging.sh` | Validation script | All checks (lines 43–98) |
| `docs/observability/tools/bootstrap_selfhosted_staging_tls.ps1` | TLS setup | CA + server cert generation |
| `compose.selfhosted-staging.yaml` | Deployment config | Line 51 (CORS origins) |
| `backend/src/main/java/com/gymcrm/common/config/PrototypeCorsConfig.java` | CORS enforcement | Environment-driven origin list |

---

## 11. CONCLUSION

The repo has **already established a complete, well-documented trust model** for Mac browser access to self-hosted staging:

1. **Gate semantics are expressed as exact, agent-executable commands** (not prose).
2. **Guardrails are explicit** (what NOT to do).
3. **Verification is reproducible** (validation script + checklist).
4. **Config changes are conditional** (only if failure reproduced).
5. **Documentation is aligned** (runbook, checklist, scripts all reference same model).

**For minimal changes**, focus on:
- Cross-referencing the validation script from the runbook
- Documenting the U4 decision (no-op or change)
- Ensuring new work follows the same command-based, evidence-driven pattern

No redesign of certificates, SANs, or CORS is needed. The model is sound and reproducible.

For the follow-up investigation that verified DER vs PEM behavior, confirmed server certificate / CA alignment, and narrowed the remaining failure to local macOS trust evaluation on one machine, see [2026-04-22-selfhosted-staging-mac-trust-investigation-summary.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-04-22-selfhosted-staging-mac-trust-investigation-summary.md).
