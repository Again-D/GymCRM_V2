---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, backend, architecture, database, flyway]
dependencies: []
---

# Add JDBC starter so datasource and Flyway actually initialize

## Problem Statement

백엔드가 PostgreSQL/Flyway 기반으로 설계되어 있지만, 현재 빌드 의존성에 JDBC starter가 없어 `DataSource` 자동 구성과 Flyway 실행이 실제로 비활성화될 가능성이 높다. 이 상태에서는 앱이 정상 기동해도 DB 연결/마이그레이션 검증이 통과한 것처럼 보이는 false positive가 발생한다.

## Findings

- `backend/build.gradle`에 `spring-boot-starter-web`, `validation`, `actuator`, `flyway-core`, `postgresql`만 있고 `spring-boot-starter-jdbc` 또는 `spring-boot-starter-data-jpa`가 없다.
- `backend/src/main/resources/application.yml`에는 `spring.datasource.*`, `spring.flyway.enabled=true`가 설정되어 있어 DB/Flyway를 사용할 의도가 분명하다.
- 실제 `bootRun` 검증 시 로컬 PostgreSQL 없이도 앱이 기동되었는데, 이는 현재 구성에서 DB/Flyway 경로가 실제로 활성화되지 않았을 가능성을 강하게 시사한다.
- 영향: Phase 1 체크리스트의 “DB 연결/마이그레이션 기반 준비”와 Phase 2 착수 조건 검증 신뢰도가 떨어진다.

## Proposed Solutions

### Option 1: `spring-boot-starter-jdbc` 추가 (권장)

**Approach:** `backend/build.gradle`에 JDBC starter를 추가하고, `bootRun` 시 DB 미기동 환경에서 실패하는지/DB 기동 시 Flyway가 실행되는지 재검증한다.

**Pros:**
- 가장 단순하고 설계 의도와 일치
- Flyway + DataSource 경로를 즉시 활성화 가능
- Phase 2(도메인 CRUD) 준비에 적합

**Cons:**
- 로컬 DB 준비가 안 된 환경에서는 앱 기동 실패가 발생할 수 있음
- 체크리스트/실행 가이드에 DB 준비 전제 명시 필요

**Effort:** 30-60분

**Risk:** Low

---

### Option 2: Flyway를 임시 비활성화하고 DB 의존성은 Phase 2에서 추가

**Approach:** Phase 1에서는 DB/Flyway를 문서상 준비만 하고 실제 실행 검증은 보류한다.

**Pros:**
- 당장 로컬 환경 의존성 문제를 줄임
- 프로토타입 화면/기초 작업에 집중 가능

**Cons:**
- 현재 체크리스트/문서와 불일치
- Phase 2 시작 시점에 다시 리스크가 터짐

**Effort:** 15-30분

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/build.gradle:21`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/application.yml:6`

**Related components:**
- Flyway migration bootstrap
- Phase 1 / Phase 2 checklist validation

**Database changes (if any):**
- Migration needed? No
- Schema change? No

## Resources

- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase15-gradle-standardization-log.md`

## Acceptance Criteria

- [x] `backend/build.gradle`에 JDBC 기반 starter 추가
- [x] DB 미기동 상태에서 `./gradlew bootRun` 실패 원인이 datasource/Flyway로 명확히 나타남 (의도 확인)
- [x] DB 기동 상태에서 Flyway 마이그레이션이 실제 실행됨
- [x] Phase 1 체크리스트의 DB 마이그레이션 검증 항목 업데이트

## Work Log

### 2026-02-23 - Code Review Finding Created

**By:** Codex

**Actions:**
- `backend/build.gradle` 의존성 검토
- `application.yml`의 datasource/flyway 설정 검토
- `bootRun` 성공 로그와 DB 비의존 기동 정황을 비교
- 리스크를 Phase 1/2 체크리스트 관점에서 정리

**Learnings:**
- 현재 기동 성공만으로는 DB/Flyway 경로가 검증되지 않는다.
- Phase 2 착수 전 가장 먼저 정리해야 할 기반 이슈다.

### 2026-02-23 - Resolved During Phase 1/DB Standardization

**By:** Codex

**Actions:**
- `spring-boot-starter-jdbc` 추가로 DataSource 경로 활성화
- Docker PostgreSQL 기반 검증 경로 구성(`compose.yaml`)
- `flyway-database-postgresql` 모듈 추가(Flyway + PostgreSQL 16 호환)
- DB 미기동 실패 / DB 기동 성공(Flyway 적용) / 재실행 no-op까지 확인
- Phase 1 체크리스트(`P1-2`) 완료 항목 업데이트

**Learnings:**
- Flyway 최신 코어만으로는 DB 버전 지원 모듈이 추가로 필요할 수 있다.

## Notes

- 이 이슈는 실제 기능 구현 전 해결하는 편이 이후 디버깅 비용을 크게 줄인다.
