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

## Follow-ups

- Staging dashboard wiring and alert rules
- 7-day rolling rehearsal execution
