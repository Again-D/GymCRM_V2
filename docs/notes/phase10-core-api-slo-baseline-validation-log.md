# Phase 10 Core API SLO Baseline Validation Log

Date: 2026-02-27
Scope: SLO contract baseline + actuator metric surface verification

## Changes in Scope

- Added Prometheus registry dependency
- Added actuator exposure and `http.server.requests` histogram/SLO bucket settings
- Added observability docs:
  - `/Users/abc/projects/GymCRM_V2/docs/observability/core-api-slo-contract.md`
  - `/Users/abc/projects/GymCRM_V2/docs/observability/staging-go-no-go-checklist.md`

## Runtime Validation

### Command

```bash
cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/feat-core-api-observability-slo-guardrails/backend
./gradlew test --no-daemon --tests 'com.gymcrm.common.api.ApiResponseTest'
```

### Result

- Status: PASS
- Notes:
  - `BUILD SUCCESSFUL`
  - Targeted test `com.gymcrm.common.api.ApiResponseTest` passed
  - No compile/runtime regression from observability config changes
  - Existing deprecation warnings (`@MockBean`, `@SpyBean`) observed, unrelated to this change

### Dev Rehearsal (actuator/prometheus)

Command:

```bash
cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/feat-core-api-observability-slo-guardrails/backend
PORT=8086 SPRING_PROFILES_ACTIVE=dev APP_SECURITY_MODE=jwt \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev DB_USERNAME=gymcrm DB_PASSWORD=gymcrm \
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew bootRun --no-daemon
```

Validation calls:

```bash
curl -s -D - http://localhost:8086/actuator/prometheus
curl -s http://localhost:8086/actuator/prometheus | rg "http_server_requests_seconds_(bucket|count|sum)"
```

Result:
- Status: PASS
- Notes:
  - `/actuator/prometheus` returned `HTTP 200`
  - `application`, `environment=dev` metric tags observed
  - `http_server_requests_seconds_*` metrics observed
  - app startup log confirmed `Exposing 4 endpoints beneath base path '/actuator'`

### Staging Rehearsal (core API + metrics)

Command:

```bash
cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/feat-core-api-observability-slo-guardrails/backend
PORT=8087 SPRING_PROFILES_ACTIVE=staging APP_SECURITY_MODE=jwt \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev DB_USERNAME=gymcrm DB_PASSWORD=gymcrm \
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew bootRun --no-daemon
```

Validation calls:

```bash
curl -s http://localhost:8087/api/v1/health
curl -s -X POST http://localhost:8087/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"loginId":"center-admin","password":"dev-admin-1234!"}'
curl -s http://localhost:8087/api/v1/members -H "Authorization: Bearer <accessToken>"
curl -s http://localhost:8087/actuator/prometheus
```

Result:
- Status: PASS
- Notes:
  - `health=200`, `members=200`, `prometheus=200`
  - `environment=staging` tag observed in Prometheus output
  - core API URI metrics observed:
    - `/api/v1/auth/login`
    - `/api/v1/members`
  - `http_server_requests_seconds_bucket/count/sum` surface confirmed for SLI formulas
  - Startup log confirmed actuator endpoint exposure in `staging` profile

### Gate status snapshot

- `dev`, `staging` both expose 동일 metric surface: confirmed
- p95/5xx/availability 계산에 필요한 raw metrics 존재: confirmed
- 대시보드 수치 대조(quality gate)와 7-day staging gate 리허설: pending

### Raw SLI sample script validation

Script:

```bash
./docs/observability/tools/validate_sli_sample.sh \
  http://localhost:8087/actuator/prometheus \
  '^/api/v1/(members|auth/login)$'
```

Observed output summary:
- total requests: `6`
- 5xx rate: `0.0000%` (PASS)
- availability: `100.0000%` (PASS)
- estimated p95 upper bound: `0.268435s`
- p95 gate (`<250ms`) sample result: FAIL

Interpretation:
- 스크립트가 SLI 계산과 게이트 판정 로직을 정상 수행함을 확인
- 현재 샘플 트래픽이 매우 작아 p95 판정 민감도가 높으므로, 공식 판정은 7일 rolling + dashboard 대조 이후 확정 필요

## Follow-ups

- Staging dashboard wiring and alert rules
- 7-day rolling rehearsal execution
