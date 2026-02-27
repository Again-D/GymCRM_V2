---
status: complete
priority: p2
issue_id: "033"
tags: [code-review, security, observability, backend]
dependencies: []
---

# Protect Prometheus Actuator Endpoint in JWT Mode

`/actuator/prometheus` is exposed while JWT mode is active, but security rules currently allow any non-`/api/v1/**` route by default. This can leak internal telemetry to unauthenticated callers unless an external network boundary is guaranteed.

## Problem Statement

The observability rollout added Prometheus endpoint exposure in application config, but application-level authorization does not explicitly protect that endpoint in JWT mode.

This creates a security/operational risk:
- Internal route/cardinality and error-rate information can be scraped publicly if ingress/network policy is misconfigured or relaxed.
- The system relies on external perimeter controls without an in-app fail-safe.

## Findings

- `management.endpoints.web.exposure.include` includes `prometheus`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/application.yml:21`
- In JWT mode, only listed endpoints are permitted and `/api/v1/**` requires auth, but `anyRequest().permitAll()` keeps other routes open:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/SecurityConfig.java:51`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/SecurityConfig.java:61`
- Therefore `/actuator/prometheus` is reachable without JWT in app-level policy.

## Proposed Solutions

### Option 1: Explicitly require auth for `/actuator/prometheus`

**Approach:** Add explicit matcher for `/actuator/prometheus` requiring authenticated role (`CENTER_ADMIN` or dedicated ops role).

**Pros:**
- Strong in-app safety regardless of edge policy drift.
- Clear and testable security intent.

**Cons:**
- Scraper credentials/config needed.
- Slightly more setup in staging/prod.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Keep unauthenticated but enforce network allowlist (document + verify)

**Approach:** Keep app rule as-is, but enforce private-only route at ingress/load balancer/security group and add CI/ops validation checks.

**Pros:**
- No app auth changes for scraper.
- Simple runtime behavior.

**Cons:**
- Security depends entirely on infra discipline.
- Misconfiguration can expose metrics immediately.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 3: Disable Prometheus endpoint by default in prod profile

**Approach:** Expose `prometheus` only when explicit profile flag is enabled.

**Pros:**
- Safe default posture.
- Limits accidental exposure in new environments.

**Cons:**
- Extra environment toggles required.
- Potential observability downtime if misconfigured.

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

Option 1 적용:
- JWT 모드에서 `/actuator/prometheus`를 앱 레벨 권한 검사 대상으로 추가
- `/actuator/health`는 공개 유지
- 통합 테스트로 무인증 차단/health 공개를 고정
- observability 문서에 최종 접근 모델(인증 필요) 반영

## Technical Details

**Affected files (candidate):**
- `backend/src/main/java/com/gymcrm/common/config/SecurityConfig.java`
- `backend/src/main/resources/application.yml`
- `backend/src/test/...` security integration tests for actuator access

## Resources

- Merged PR: https://github.com/Again-D/GymCRM_V2/pull/15
- Related docs:
  - `docs/observability/core-api-slo-contract.md`
  - `docs/observability/staging-go-no-go-checklist.md`

## Acceptance Criteria

- [x] JWT mode에서 `/actuator/prometheus` 접근 정책이 의도대로 강제된다.
- [x] 무인증 요청에 대한 기대 동작(차단 또는 허용)이 테스트로 고정된다.
- [x] 운영 문서에 최종 접근 모델(앱/네트워크 책임 경계)이 명시된다.
- [ ] staging에서 scraper 동선 검증이 완료된다. (후속 운영 검증)

## Work Log

### 2026-02-27 - Post-merge Review Finding

**By:** Codex

**Actions:**
- Reviewed merged observability baseline changes (PR #15).
- Verified actuator exposure and security matcher interaction.
- Identified unauthenticated prometheus exposure path under JWT mode.
- Created follow-up todo for triage.

**Learnings:**
- Observability feature parity was implemented well, but endpoint access control needs explicit hardening to avoid perimeter-only dependency.

### 2026-02-27 - Implementation Complete

**By:** Codex

**Actions:**
- Added `/actuator/prometheus` authorization rule in JWT mode.
- Extended JWT filter scope so Bearer token auth applies to `/actuator/prometheus`.
- Added integration test `ActuatorSecurityIntegrationTest`:
  - unauthenticated `/actuator/prometheus` -> `401`
  - `/actuator/health` remains public -> `200`
- Updated observability docs to state authenticated prometheus access model.
- Ran targeted test:
  - `./gradlew test --no-daemon --tests 'com.gymcrm.auth.ActuatorSecurityIntegrationTest'` ✅

**Learnings:**
- Actuator route hardening requires both authorization matcher and authentication filter-path parity.
