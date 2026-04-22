#!/usr/bin/env bash
# =============================================================================
# Script  : validate_mac_trust_selfhosted_staging.sh
# Purpose : Verify that this Mac can reach the GymCRM self-hosted staging
#           environment over HTTPS using the canonical hostname.
#           Checks CA trust, canonical-host curl reachability, hosts-override
#           resolution, and a misconfiguration guard (127.0.0.1 must fail).
# Usage   : bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
#           (no arguments required; edit variables below if defaults differ)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
HOSTNAME="ajw0831.iptime.org"
WG_IP="10.170.47.3"
CA_NAME="GymCRM Staging CA"
HEALTH_PATH="/api/v1/health"

# ---------------------------------------------------------------------------
# State tracking
# ---------------------------------------------------------------------------
HARD_FAIL=0

pass()    { echo "  [PASS] $*"; }
fail()    { echo "  [FAIL] $*"; HARD_FAIL=1; }
warn()    { echo "  [WARN] $*"; }
section() { echo ""; echo "--- $* ---"; }

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
echo "==================================================="
echo " GymCRM staging Mac trust validation"
echo "  Hostname : ${HOSTNAME}"
echo "  WG IP    : ${WG_IP}"
echo "  CA Name  : ${CA_NAME}"
echo "==================================================="

# ---------------------------------------------------------------------------
# Check 1 — CA trust (macOS System keychain)
# ---------------------------------------------------------------------------
section "Check 1: CA certificate in System keychain"
if security find-certificate -a -c "${CA_NAME}" /Library/Keychains/System.keychain \
     > /dev/null 2>&1; then
  pass "\"${CA_NAME}\" found in /Library/Keychains/System.keychain"
else
  fail "\"${CA_NAME}\" NOT found in System keychain"
  echo "         → Import the CA first (see runbook section 2.4):"
  echo "           sudo security add-trusted-cert -d -r trustRoot \\"
  echo "             -k /Library/Keychains/System.keychain ca.crt"
fi

# ---------------------------------------------------------------------------
# Check 2 — Pre-hosts-override canonical-host trust (curl --resolve)
# ---------------------------------------------------------------------------
section "Check 2: Canonical-host HTTPS reachability (curl --resolve)"
CURL_BODY=""
CURL_BODY=$(curl --resolve "${HOSTNAME}:443:${WG_IP}" --fail --silent --show-error \
  "https://${HOSTNAME}${HEALTH_PATH}" 2>&1) || true

if echo "${CURL_BODY}" | grep -q '"status"'; then
  pass "Response from https://${HOSTNAME}${HEALTH_PATH} contains '\"status\"'"
else
  fail "Could not reach https://${HOSTNAME}${HEALTH_PATH} via ${WG_IP}"
  echo "         Response/error: ${CURL_BODY}"
fi

# ---------------------------------------------------------------------------
# Check 3 — Hosts override resolution check
# ---------------------------------------------------------------------------
section "Check 3: /etc/hosts override resolution"
DNS_OUTPUT=$(dscacheutil -q host -a name "${HOSTNAME}" 2>/dev/null || true)
if echo "${DNS_OUTPUT}" | grep -q "ip_address: ${WG_IP}"; then
  pass "dscacheutil resolves ${HOSTNAME} → ${WG_IP} (hosts override active)"
else
  warn "${HOSTNAME} does not currently resolve to ${WG_IP} via hosts override"
  echo "         → To enable hosts override, run:"
  echo "           sudo sh -c 'echo \"${WG_IP} ${HOSTNAME}\" >> /etc/hosts'"
  echo "         (Check 2 already confirmed TLS trust works; this is informational)"
fi

# ---------------------------------------------------------------------------
# Check 4 — Misconfiguration guard: 127.0.0.1 MUST fail
# (set -e intentionally bypassed here — we expect curl to exit non-zero)
# ---------------------------------------------------------------------------
section "Check 4: Misconfiguration guard (127.0.0.1 must be refused)"
BAD_EXIT=0
curl --resolve "${HOSTNAME}:443:127.0.0.1" --connect-timeout 5 \
  "https://${HOSTNAME}${HEALTH_PATH}" > /dev/null 2>&1 || BAD_EXIT=$?

if [ "${BAD_EXIT}" -ne 0 ]; then
  pass "curl to 127.0.0.1 exited non-zero (exit ${BAD_EXIT}) — correct, 127.0.0.1 is not the server"
else
  fail "curl to 127.0.0.1 returned success (unexpected — 127.0.0.1 should not host the server)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "==================================================="
if [ "${HARD_FAIL}" -eq 0 ]; then
  echo " All checks PASSED"
  echo " Canonical staging URL: https://${HOSTNAME}/"
  echo "==================================================="
  exit 0
else
  echo " VALIDATION FAILED — one or more checks did not pass"
  echo "==================================================="
  exit 1
fi
