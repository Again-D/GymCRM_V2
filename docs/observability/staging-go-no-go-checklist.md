# Staging Go/No-Go Checklist (Core API SLO)

Date: 2026-02-27
Status: active
Owner: Platform/Backend (temporary: Center Admin engineering owner)

## 0) Scope / HTTPS 전제

- Canonical staging URL: `https://ajw0831.iptime.org/` (공개 HTTPS ingress)
- Health endpoint: `https://ajw0831.iptime.org/api/v1/health`
- TLS는 Nginx에서 종료된다. 공개 인증서는 Compose 내부의 Certbot HTTP-01 webroot 플로우로 발급/갱신된다.
- **Trusted Access Model:**
  - **Windows Runner Smoke [AUTOMATED / WORKFLOW GATE]:** GitHub Actions Runner가 공개 인증서 기반 canonical-host HTTPS(`/`, `/api/v1/health`, TLS SAN)를 검증한다.
  - **Mac Browser Trust [MANUAL / QA PRE-CHECK]:** Mac은 공개 DNS + 공개 인증서 경로 그대로 접속해야 한다. 예전 VPN/hosts override(`10.170.47.3`, `127.0.0.1`)가 남아 있으면 NO-GO다.
- Pre-check 이전에 공개 DNS와 `80/tcp`, `443/tcp` ingress가 정상인지 확인한다.

## 1) Pre-check & Access Gate (Telemetry health)

- [ ] [MANUAL / QA PRE-CHECK] Public DNS resolves `ajw0831.iptime.org` without stale hosts override (`127.0.0.1`, `10.170.47.3`)
- [ ] [MANUAL / QA PRE-CHECK] Final Mac trust gate passes: `bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh --final-go`
- [ ] [AUTOMATED / WORKFLOW GATE] Staging app up (`https://ajw0831.iptime.org/api/v1/health` 200, HTTPS, TLS 신뢰 확인 via Windows runner smoke)
- [ ] [ROLLOUT ACCEPTANCE] First cutover is not stuck in HTTP bootstrap mode (`http://...` only). If Certbot issuance fails or HTTPS is unavailable, mark `HOLD` and fix DNS/80 ingress before QA.
- [ ] Actuator metrics endpoint reachable (`/actuator/prometheus`, authenticated)
- [ ] Metrics ingestion pipeline healthy (no scrape gap alert)
- [ ] Dashboard query returns recent data (< 5m latency)

If any pre-check or access gate fails: `HOLD` (No-Go by default)

## 2) SLO Gate Window

- Environment: `staging`
- Window: rolling 7 days
- Scope: core API groups (`member`, `product`, `membership`, `reservation`, `access`)

## 3) Gate Criteria

All core groups must satisfy:
- [ ] p95 latency < 250ms
- [ ] 5xx rate < 0.5%
- [ ] availability >= 99.7%

Low-traffic handling:
- [ ] If group total_count < 200, mark as `warning-only` and require owner sign-off note.

## 4) Validation Queries (example PromQL)

Adjust labels to your dashboard conventions.

Raw-vs-dashboard sample validation helper:
- `/Users/abc/projects/GymCRM_V2/docs/observability/dashboard-sample-validation-procedure.md`
- `/Users/abc/projects/GymCRM_V2/docs/observability/tools/validate_sli_sample.sh`

```promql
# p95 latency (5m)
histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{uri!~"/actuator.*"}[5m])) by (le, uri, method, status))
```

```promql
# 5xx rate (5m)
sum(rate(http_server_requests_seconds_count{status=~"5..",uri!~"/actuator.*"}[5m]))
/
sum(rate(http_server_requests_seconds_count{uri!~"/actuator.*"}[5m]))
```

```promql
# availability proxy (5m)
1 - (
  sum(rate(http_server_requests_seconds_count{status=~"5..",uri!~"/actuator.*"}[5m]))
  /
  sum(rate(http_server_requests_seconds_count{uri!~"/actuator.*"}[5m]))
)
```

## 5) Traceability Spot Check

- [ ] 실패 응답 3건에서 `X-Trace-Id`와 body `traceId`가 존재
- [ ] 같은 `traceId`로 서버 로그 상관 추적 가능

## 6) Decision Record

- Release candidate:
- Review time (KST):
- Reviewer:
- Decision: `GO` / `NO-GO` / `HOLD`
- Evidence links (dashboard, logs, note doc):
- If No-Go or Hold: immediate mitigation/rollback plan:

## 7) Failure Signals & Immediate Action

Failure signals:
- 6시간 연속 p95 breach
- 6시간 연속 5xx breach
- availability < 99.7% with adequate sample
- telemetry ingestion outage

Immediate action:
- [ ] 신규 배포 중단
- [ ] 마지막 안정 릴리즈로 롤백 또는 feature toggle 비활성
- [ ] incident note 생성 (`docs/notes/`)
- [ ] 원인 분석 owner 지정 + ETA 공유

## 8) Post-review artifact sync

- [ ] 관련 계획서 체크박스 반영
- [ ] 필요 시 계획 `status` 업데이트
- [ ] 검증 로그 문서 링크 추가
