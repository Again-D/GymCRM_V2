#!/usr/bin/env bash
# =============================================================================
# Script  : validate_mac_trust_selfhosted_staging.sh
# Purpose : Verify that this Mac can reach the GymCRM self-hosted staging
#           environment over HTTPS using the canonical hostname.
#           Checks public DNS resolution, rejects stale localhost/VPN hosts
#           overrides, validates HTTPS reachability, and confirms the live
#           certificate SAN contains the canonical hostname.
# Usage   : bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
#             -> preflight mode (DNS + TLS + stale-hosts safety checks)
#           bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh --final-go
#             -> final Mac browser trust gate (adds browser-path root URL check)
# =============================================================================

set -euo pipefail

MODE="preflight"
ENFORCE_BROWSER_GO=0

usage() {
  cat <<'EOF'
Usage:
  bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
    - Preflight mode. Validates public DNS resolution, plain canonical-host
      HTTPS reachability, and rejects stale localhost / legacy VPN host overrides.

  bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh --final-go
    - Final Mac browser trust gate. Adds a browser-facing root URL check on top
      of the preflight requirements.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --final-go)
      MODE="final-go"
      ENFORCE_BROWSER_GO=1
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

HOSTNAME="${STAGING_HOSTNAME:-ajw0831.iptime.org}"
HEALTH_PATH="/api/v1/health"
LEGACY_IPS=("127.0.0.1" "10.170.47.3")

HARD_FAIL=0

pass()    { echo "  [PASS] $*"; }
fail()    { echo "  [FAIL] $*"; HARD_FAIL=1; }
section() { echo ""; echo "--- $* ---"; }

echo "==================================================="
echo " GymCRM staging Mac trust validation"
echo "  Mode     : ${MODE}"
echo "  Hostname : ${HOSTNAME}"
echo "==================================================="

section "Check 1: Canonical hostname DNS resolution"
DNS_OUTPUT=$(dscacheutil -q host -a name "${HOSTNAME}" 2>/dev/null || true)
DNS_IPS=$(printf '%s\n' "${DNS_OUTPUT}" | awk '/ip_address:/ { print $2 }')

if [ -n "${DNS_IPS}" ]; then
  pass "${HOSTNAME} resolves to: $(printf '%s ' ${DNS_IPS})"
else
  fail "${HOSTNAME} did not resolve to any IP address via dscacheutil"
fi

for legacy_ip in "${LEGACY_IPS[@]}"; do
  if printf '%s\n' "${DNS_IPS}" | grep -Fxq "${legacy_ip}"; then
    fail "${HOSTNAME} resolves to legacy/stale IP ${legacy_ip}. Remove old /etc/hosts overrides before public HTTPS QA."
  fi
done

section "Check 2: Canonical-host HTTPS reachability"
CURL_BODY=""
CURL_BODY=$(curl --fail --silent --show-error "https://${HOSTNAME}${HEALTH_PATH}" 2>&1) || true

if echo "${CURL_BODY}" | grep -q '"status"'; then
  pass "Response from https://${HOSTNAME}${HEALTH_PATH} contains '\"status\"'"
else
  fail "Could not reach https://${HOSTNAME}${HEALTH_PATH} over the public HTTPS path"
  echo "         Response/error: ${CURL_BODY}"
fi

section "Check 3: TLS certificate SAN"
CERT_DETAILS=$(openssl s_client -connect "${HOSTNAME}:443" -servername "${HOSTNAME}" </dev/null 2>/dev/null \
  | openssl x509 -noout -issuer -subject -ext subjectAltName 2>&1) || true

if echo "${CERT_DETAILS}" | grep -q "DNS:${HOSTNAME}"; then
  pass "Live certificate SAN contains ${HOSTNAME}"
else
  fail "Could not confirm that the live certificate SAN contains ${HOSTNAME}"
  echo "         openssl output: ${CERT_DETAILS}"
fi

if [ "${ENFORCE_BROWSER_GO}" -eq 1 ]; then
  section "Check 4: Final GO browser-path root URL"
  if curl --fail --silent --show-error "https://${HOSTNAME}/" > /dev/null 2>&1; then
    pass "Browser-facing root URL responds successfully: https://${HOSTNAME}/"
  else
    fail "Final GO requires the browser-facing root URL to succeed: https://${HOSTNAME}/"
  fi
fi

echo ""
echo "==================================================="
if [ "${HARD_FAIL}" -eq 0 ]; then
  if [ "${ENFORCE_BROWSER_GO}" -eq 1 ]; then
    echo " Final Mac browser trust gate PASSED"
  else
    echo " Preflight checks PASSED"
    echo " Use --final-go to validate the browser-facing root URL as the final GO gate."
  fi
  echo " Canonical staging URL: https://${HOSTNAME}/"
  echo "==================================================="
  exit 0
else
  if [ "${ENFORCE_BROWSER_GO}" -eq 1 ]; then
    echo " FINAL GO FAILED — one or more required checks did not pass"
  else
    echo " PREFLIGHT FAILED — one or more checks did not pass"
  fi
  echo "==================================================="
  exit 1
fi
