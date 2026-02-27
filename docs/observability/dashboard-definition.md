# Core API SLO Dashboard Definition (dev/staging)

Date: 2026-02-27
Status: active

## 1) Purpose

핵심 업무 API의 SLI/SLO 상태를 `dev`, `staging`에서 동일 구조로 조회하기 위한 대시보드 기준 정의.

- `dev`: 회귀/진단용
- `staging`: 공식 Go/No-Go 판정용

## 2) Global Filters

- Environment: `dev` | `staging`
- Time range presets: `1h`, `24h`, `7d`
- Route scope: `/api/v1/**` (except health/sample)

## 3) Panel Layout

### Row A: Overall Health

1. Core API p95 latency (single stat + trend)
2. Core API 5xx rate (single stat + trend)
3. Core API availability (single stat + trend)
4. Request volume (req/s)

### Row B: Domain Group Latency

1. `member_domain` p95
2. `product_domain` p95
3. `membership_domain` p95
4. `reservation_domain` p95
5. `access_domain` p95

### Row C: Domain Group Error/Availability

1. group 5xx rate table
2. group availability table
3. top 5 failing routes (5xx count)

### Row D: Operational Guard

1. telemetry ingestion health
2. scrape freshness panel
3. recent alert events

## 4) Query Baseline (PromQL)

```promql
# Core API p95 (5m)
histogram_quantile(
  0.95,
  sum(rate(http_server_requests_seconds_bucket{uri=~"/api/v1/.*",uri!~"/api/v1/health|/api/v1/samples.*"}[5m])) by (le)
)
```

```promql
# Core API 5xx rate (5m)
sum(rate(http_server_requests_seconds_count{uri=~"/api/v1/.*",status=~"5..",uri!~"/api/v1/health|/api/v1/samples.*"}[5m]))
/
sum(rate(http_server_requests_seconds_count{uri=~"/api/v1/.*",uri!~"/api/v1/health|/api/v1/samples.*"}[5m]))
```

```promql
# Core API availability (5m)
1 - (
  sum(rate(http_server_requests_seconds_count{uri=~"/api/v1/.*",status=~"5..",uri!~"/api/v1/health|/api/v1/samples.*"}[5m]))
  /
  sum(rate(http_server_requests_seconds_count{uri=~"/api/v1/.*",uri!~"/api/v1/health|/api/v1/samples.*"}[5m]))
)
```

## 5) Threshold Lines

- p95 target line: `250ms`
- 5xx rate target line: `0.5%`
- availability target line: `99.7%`

## 6) SLO Review View (staging, 7d)

Required cards:
- 7-day p95 summary
- 7-day 5xx rate summary
- 7-day availability summary
- group-wise pass/fail table
- low-traffic warning-only groups (`total_count < 200`)

## 7) Ownership

- Dashboard owner: Backend/Platform
- On-call reviewer for Go/No-Go: release owner
