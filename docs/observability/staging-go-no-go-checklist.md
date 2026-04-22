# Staging Go/No-Go Checklist (Core API SLO)

Date: 2026-02-27
Status: active
Owner: Platform/Backend (temporary: Center Admin engineering owner)

## 0) Scope / HTTPS 전제

- Canonical staging URL: `https://ajw0831.iptime.org/` (WireGuard VPN 내부에서만 접근 가능)
- Canonical staging IP: `10.170.47.3` (Windows host WireGuard IP)
- Health endpoint: `https://ajw0831.iptime.org/api/v1/health`
- TLS는 Nginx에서 종료된다. 내부 CA(`GymCRM Staging CA`) 신뢰 설정이 없으면 브라우저 경고가 발생한다.
- **Trusted Access Model:**
  - **Windows Runner Smoke:** GitHub Actions Runner가 서버 측 HTTPS(TLS SAN 포함)를 검증한다. 이는 Mac 브라우저 신뢰를 보장하지 않는다.
  - **Mac Browser Trust:** Mac에서 브라우저 경고 없이 접근하려면 (1) CA를 시스템 키체인에 등록하고, (2) 호스트 파일에서 `ajw0831.iptime.org`를 `10.170.47.3`으로 강제 매핑해야 한다.
- Pre-check 이전에 WireGuard VPN 연결 및 Mac 신뢰 설정 완료 여부를 확인한다.

## 1) Pre-check (Telemetry health)

- [ ] Mac CA trust verified: `security find-certificate -a -c "GymCRM Staging CA" /Library/Keychains/System.keychain`
- [ ] Mac hosts override active: `dscacheutil -q host -a name ajw0831.iptime.org` returns `ip_address: 10.170.47.3`
- [ ] Staging app up (`https://ajw0831.iptime.org/api/v1/health` 200, HTTPS, TLS 신뢰 확인)
- [ ] Actuator metrics endpoint reachable (`/actuator/prometheus`, authenticated)
- [ ] Metrics ingestion pipeline healthy (no scrape gap alert)
- [ ] Dashboard query returns recent data (< 5m latency)

If any pre-check fails: `HOLD` (No-Go by default)

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
