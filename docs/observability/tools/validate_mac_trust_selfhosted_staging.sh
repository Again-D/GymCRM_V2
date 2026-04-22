#!/usr/bin/env bash
# =============================================================================
# Script  : validate_mac_trust_selfhosted_staging.sh
# Purpose : Verify that this Mac can reach the GymCRM self-hosted staging
#           environment over HTTPS using the canonical hostname.
#           Checks CA trust, canonical-host curl reachability, hosts-override
#           resolution, and a misconfiguration guard (127.0.0.1 must fail).
# Usage   : bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
#             -> preflight mode (CA + TLS + safety checks; hosts override warns)
#           bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh --final-go
#             -> final Mac browser trust gate (hosts override + plain canonical curl required)
# =============================================================================

set -euo pipefail

MODE="preflight"
ENFORCE_HOSTS=0

usage() {
  cat <<'EOF'
Usage:
  bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
    - Preflight mode. Validates CA trust, canonical-host TLS via --resolve,
      and the 127.0.0.1 misconfiguration guard. Missing hosts override is a warning.

  bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh --final-go
    - Final Mac browser trust gate. Hosts override must be active and plain
      canonical-host HTTPS must succeed without --resolve.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --final-go)
      MODE="final-go"
      ENFORCE_HOSTS=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

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
echo "  Mode     : ${MODE}"
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
  if [ "${ENFORCE_HOSTS}" -eq 1 ]; then
    fail "${HOSTNAME} does not currently resolve to ${WG_IP} via hosts override"
    echo "         → Final GO requires canonical hostname resolution to the WireGuard IP."
    echo "           Enable hosts override first:"
    echo "           sudo sh -c 'grep -qF \"${HOSTNAME}\" /etc/hosts || echo \"${WG_IP} ${HOSTNAME}\" >> /etc/hosts'"
  else
    warn "${HOSTNAME} does not currently resolve to ${WG_IP} via hosts override"
    echo "         → Preflight mode allows this so you can validate TLS before editing /etc/hosts."
    echo "           To enable hosts override, run:"
    echo "           sudo sh -c 'grep -qF \"${HOSTNAME}\" /etc/hosts || echo \"${WG_IP} ${HOSTNAME}\" >> /etc/hosts'"
    echo "         (Use --final-go after hosts override is active.)"
  fi
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
# Check 5 — Final GO: plain canonical-host HTTPS must work without --resolve
# ---------------------------------------------------------------------------
if [ "${ENFORCE_HOSTS}" -eq 1 ]; then
  section "Check 5: Final GO plain canonical-host HTTPS"
  FINAL_BODY=""
  FINAL_BODY=$(curl --fail --silent --show-error \
    "https://${HOSTNAME}${HEALTH_PATH}" 2>&1) || true

  if echo "${FINAL_BODY}" | grep -q '"status"'; then
    pass "Plain canonical-host access to https://${HOSTNAME}${HEALTH_PATH} contains '\"status\"'"
  else
    fail "Final GO requires plain canonical-host access without --resolve"
    echo "         Response/error: ${FINAL_BODY}"
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "==================================================="
if [ "${HARD_FAIL}" -eq 0 ]; then
  if [ "${ENFORCE_HOSTS}" -eq 1 ]; then
    echo " Final Mac browser trust gate PASSED"
  else
    echo " Preflight checks PASSED"
    echo " Use --final-go after hosts override is active to validate final browser GO."
  fi
  echo " Canonical staging URL: https://${HOSTNAME}/"
  echo "==================================================="
  exit 0
else
  if [ "${ENFORCE_HOSTS}" -eq 1 ]; then
    echo " FINAL GO FAILED — one or more required checks did not pass"
  else
    echo " PREFLIGHT FAILED — one or more checks did not pass"
  fi
  echo "==================================================="
  exit 1
fi
