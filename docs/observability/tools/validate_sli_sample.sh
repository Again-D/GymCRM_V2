#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <prometheus_url> [uri_regex]"
  echo "Example: $0 http://localhost:8087/actuator/prometheus '^/api/v1/(members|auth/login)$'"
  exit 1
fi

PROM_URL="$1"
URI_REGEX="${2:-^/api/v1/}"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

curl -fsS "$PROM_URL" > "$TMP_FILE"

read -r TOTAL_COUNT ERROR_5XX RATE_5XX AVAILABILITY <<EOF_METRIC
$(awk -v re="$URI_REGEX" '
  /^http_server_requests_seconds_count\{/ {
    line=$0
    split(line, pair, "} ")
    labels=pair[1]
    value=pair[2] + 0

    uri=""; status=""
    if (match(labels, /uri="[^"]+"/)) {
      uri = substr(labels, RSTART+5, RLENGTH-6)
    }
    if (match(labels, /status="[^"]+"/)) {
      status = substr(labels, RSTART+8, RLENGTH-9)
    }

    if (uri ~ re && uri !~ /^\/actuator/ && uri !~ /^\/api\/v1\/samples/ && uri != "/api/v1/health") {
      total += value
      if (status ~ /^5/) err += value
    }
  }
  END {
    if (total == 0) {
      printf "0 0 0 1\n"
    } else {
      rate = err / total
      avail = 1 - rate
      printf "%.0f %.0f %.6f %.6f\n", total, err, rate, avail
    }
  }
' "$TMP_FILE")
EOF_METRIC

BUCKETS_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE" "$BUCKETS_FILE"' EXIT

awk -v re="$URI_REGEX" '
  /^http_server_requests_seconds_bucket\{/ {
    line=$0
    split(line, pair, "} ")
    labels=pair[1]
    value=pair[2] + 0

    uri=""; le=""
    if (match(labels, /uri="[^"]+"/)) {
      uri = substr(labels, RSTART+5, RLENGTH-6)
    }
    if (match(labels, /le="[^"]+"/)) {
      le = substr(labels, RSTART+4, RLENGTH-5)
    }

    if (uri ~ re && uri !~ /^\/actuator/ && uri !~ /^\/api\/v1\/samples/ && uri != "/api/v1/health") {
      if (le == "+Inf") {
        inf += value
      } else {
        buckets[le] += value
      }
    }
  }
  END {
    for (k in buckets) printf "%s %f\n", k, buckets[k]
    printf "+Inf %f\n", inf
  }
' "$TMP_FILE" > "$BUCKETS_FILE"

TOTAL_INF=$(awk '$1=="+Inf" {print $2+0}' "$BUCKETS_FILE")

if awk -v t="$TOTAL_INF" 'BEGIN { exit !(t > 0) }'; then
  TARGET=$(awk -v t="$TOTAL_INF" 'BEGIN { print t * 0.95 }')
  P95_LE=$(awk '$1 != "+Inf" {print $1, $2}' "$BUCKETS_FILE" \
    | sort -n -k1,1 \
    | awk -v target="$TARGET" '
        {
          le = $1 + 0
          val = $2 + 0
          if (val >= target) {
            print le
            found=1
            exit
          }
        }
        END {
          if (!found) print "+Inf"
        }
      ')
else
  P95_LE="N/A"
fi

echo "SLI sample validation"
echo "- source: $PROM_URL"
echo "- uri regex: $URI_REGEX"
echo "- total requests: $TOTAL_COUNT"
echo "- 5xx requests: $ERROR_5XX"
printf -- "- 5xx rate: %.4f%%\n" "$(awk -v x="$RATE_5XX" 'BEGIN { print x * 100 }')"
printf -- "- availability: %.4f%%\n" "$(awk -v x="$AVAILABILITY" 'BEGIN { print x * 100 }')"
echo "- estimated p95 upper bound (seconds): $P95_LE"

if awk -v x="$RATE_5XX" 'BEGIN { exit !(x < 0.005) }'; then
  echo "- gate check (5xx<0.5%): PASS"
else
  echo "- gate check (5xx<0.5%): FAIL"
fi

if awk -v x="$AVAILABILITY" 'BEGIN { exit !(x >= 0.997) }'; then
  echo "- gate check (availability>=99.7%): PASS"
else
  echo "- gate check (availability>=99.7%): FAIL"
fi

if [ "$P95_LE" = "N/A" ]; then
  echo "- gate check (p95<250ms): N/A (insufficient data)"
elif awk -v x="$P95_LE" 'BEGIN { exit !(x < 0.25) }'; then
  echo "- gate check (p95<250ms): PASS"
else
  echo "- gate check (p95<250ms): FAIL"
fi
