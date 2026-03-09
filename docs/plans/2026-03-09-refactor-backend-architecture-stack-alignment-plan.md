---
title: refactor: Align Backend Implementation With Architecture Stack Detail
type: refactor
status: active
date: 2026-03-09
---

# refactor: Align Backend Implementation With Architecture Stack Detail

## Overview

`docs/02_시스템_아키텍처_설계서.md`의 Backend 기술스택 상세는 Java 21 + Spring Boot + Spring Security + Flyway + Gradle이라는 큰 방향은 현재 프로젝트와 맞지만, 핵심 구현 항목 일부는 아직 코드베이스에 반영되지 않았다.

현재 백엔드는 `JdbcClient` 기반 저장소, PostgreSQL 기반 refresh token 저장, 미도입 상태의 SpringDoc/OpenAPI, Redis 미도입 상태를 가지고 있다. 반면 아키텍처 문서는 `Spring Data JPA + QueryDSL`, Redis 기반 세션/락/토큰 처리, OpenAPI 자동 문서화를 전제로 서술한다.

이 계획의 목적은 아키텍처 문서의 Backend 항목을 기준으로 현재 프로젝트를 맞추기 위한 점진적 전환 로드맵을 정의하는 것이다. 단, 이미 더 최신인 항목(예: Spring Boot 3.4.2)은 하향 조정하지 않고, 문서 버전 표기는 "최소 기준"으로 해석한다.

## Problem Statement / Motivation

현재 상태를 그대로 두면 다음 문제가 계속된다.

- 아키텍처 문서가 실제 구현보다 앞서 있어 신규 개발자가 잘못된 전제를 갖게 된다.
- 저장소/인증/캐시/문서화 패턴이 문서와 달라 리뷰 기준이 흔들린다.
- Redis, QueryDSL, OpenAPI를 전제로 한 후속 설계가 실제 코드에서는 바로 이어지지 않는다.
- 추후 외부연동, 예약 동시성, 실게이트 토큰 소비, API 운영 문서화 단계에서 한 번 더 구조 전환 비용이 발생한다.

반대로 이 전환은 단순 의존성 추가가 아니라 저장소 계층, 인증 상태 저장소, 운영 인프라, 테스트 전략까지 건드리는 대형 리팩터링이다. 따라서 "한 번에 전면 교체"가 아니라 기능별로 경계를 자르며 진행해야 한다.

## Research Summary

### Local repo findings

- 빌드 기준은 Gradle이며 Java 21 / Spring Boot 3.4.2를 사용 중이다.
  - `backend/build.gradle`
- 백엔드 저장소는 전반적으로 `JdbcClient` 기반 수동 SQL 구현이다.
  - 예: `backend/src/main/java/com/gymcrm/member/MemberRepository.java`
  - 예: `backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java`
- Flyway 마이그레이션은 이미 운영 기준으로 자리 잡았다.
  - `backend/src/main/resources/db/migration/V1__*.sql` ~ `V19__*.sql`
- Redis/Lettuce/Redisson/Spring Data JPA/QueryDSL/SpringDoc 의존성은 현재 없다.
- `backend/pom.xml`도 남아 있어 빌드 표준이 완전히 정리되지는 않았다.

### Institutional learnings

- 문서-코드 드리프트는 바로잡지 않으면 후속 `plan/review/work` 흐름 전체의 신뢰도가 흔들린다.
  - `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`
- 배포/마이그레이션 리스크는 기능 구현과 별개로 사전 체크리스트를 고정해야 한다.
  - `docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md`
- 현재 저장소 계층은 도메인 로직과 SQL이 촘촘히 묶여 있어, 저장소 기술 전환 시 회귀 테스트와 경계 정의가 먼저 필요하다.

### External research decision

이번 계획은 기존 문서와 저장소 구조를 정렬하는 내부 리팩터링 계획이므로 외부 리서치는 생략한다.

## Scope Boundary

이 계획은 "문서 기준으로 코드를 맞추는 작업"만 다룬다.

포함 범위:

- Spring Data JPA 도입 및 저장소 계층 점진 전환
- QueryDSL 기반 동적 조회 계층 도입
- Redis 기반 토큰/락/1회성 소비 저장소 도입
- SpringDoc OpenAPI 도입
- Gradle 단일 빌드 표준 정리
- 운영/테스트/마이그레이션 계획 수립

제외 범위:

- 비즈니스 요구사항 자체 추가
- 프론트엔드 기능 변경
- 외부 벤더 연동 프로토콜 변경
- 이미 최신인 프레임워크를 문서의 구버전으로 다운그레이드하는 작업

## SpecFlow Analysis

### Primary transition flows

1. 개발자가 기존 `JdbcClient` 저장소를 JPA 저장소로 옮겨도 API 동작과 DB 결과가 유지되어야 한다.
2. 인증/QR/예약 흐름이 Redis 도입 이후에도 기존 정책과 동일하게 동작해야 한다.
3. 운영자가 Swagger/OpenAPI로 현재 REST 계약을 확인할 수 있어야 한다.
4. 배포 시 Flyway, DB 스키마, Redis 인프라, 애플리케이션 설정이 순서대로 안전하게 전환되어야 한다.

### Edge cases

- JPA 매핑이 기존 SQL과 다른 NULL/enum/시간대 해석을 만들 수 있다.
- QueryDSL 전환 시 기존 집계/검색 조건이 미묘하게 달라질 수 있다.
- Redis 장애 시 로그인/QR/예약 락이 기존보다 더 취약해질 수 있다.
- PostgreSQL canonical 상태와 Redis 캐시/토큰 상태가 불일치할 수 있다.
- OpenAPI 공개 범위가 인증/운영 정책과 충돌할 수 있다.

### SpecFlow decisions

- 전환은 "의존성 추가 -> 추상화 추가 -> 일부 모듈 전환 -> 운영 검증 -> 다음 모듈 전환" 순서로 진행한다.
- `JdbcClient`를 한 번에 제거하지 않는다.
- 정산/리포트처럼 SQL이 더 명확한 영역은 JPA 강제 전환 대상에서 제외 가능 항목으로 별도 판단한다.
- Redis는 한 번에 모든 용도에 투입하지 않고 `QR token -> reservation lock -> auth denylist/refresh store` 순으로 단계 도입한다.

## Proposed Solution

문서 기준 정렬은 다음 5개 트랙으로 나눠 진행한다.

1. **Build/Dependency 정렬 트랙**
- Gradle 단일화
- JPA/QueryDSL/SpringDoc/Redis 의존성 도입
- 프로파일별 설정/로컬 인프라 정리

2. **Persistence 전환 트랙**
- `JdbcClient` 저장소를 JPA Repository + Query Repository 구조로 점진 전환
- 도메인 엔티티/매핑/트랜잭션 기준 정립

3. **Redis 런타임 도입 트랙**
- QR one-time token 저장소
- 예약 분산 락
- 인증 denylist/refresh token 저장 전략 정렬

4. **API 문서화/운영 가시성 트랙**
- SpringDoc OpenAPI 도입
- 인증/권한/에러 응답 문서화
- 운영용 Swagger exposure 정책 정리

5. **Cutover/문서 정렬 트랙**
- 아키텍처 문서와 실제 구현 상태 동기화
- POM 제거 여부 확정
- 전환 runbook과 회귀 테스트 기준 문서화

## Technical Approach

### Architecture Principles

- 현재 `JdbcClient` 구현을 즉시 제거하지 않고, 전환 기간에는 `JDBC + JPA` 혼합 상태를 허용한다.
- 쓰기 모델부터 무조건 JPA로 바꾸지 않는다. 위험이 낮은 조회/단건 도메인부터 전환한다.
- 집계/리포트 SQL은 QueryDSL 또는 네이티브 쿼리로 유지 가능하다. "모든 SQL 제거"는 목표가 아니다.
- Redis는 canonical source가 아니라 보조 저장소부터 시작한다. 특히 인증 상태는 dual-write 또는 단계 cutover 없이 바로 전면 이전하지 않는다.
- Spring Boot는 현재 3.4.2를 유지한다. 문서의 3.2.x는 downgrade target이 아니라 baseline family로 해석한다.

### Implementation Phases

#### Phase 1: Foundation and Dependency Alignment

- Deliverables:
  - `spring-boot-starter-data-jpa`, QueryDSL, SpringDoc, Redis 의존성 추가
  - `application.yml` 프로파일별 Redis/OpenAPI 설정 추가
  - `backend/pom.xml`의 역할 정리 또는 제거 계획 확정
  - 로컬 `compose.yaml` 또는 dev infra에 Redis 추가
- Success criteria:
  - 앱이 기존 기능 회귀 없이 JPA/Redis/SpringDoc 의존성을 로드한다.
  - `/swagger-ui` 또는 `/v3/api-docs`가 개발환경에서 접근 가능하다.
- Quality gates:
  - 전체 백엔드 테스트 통과
  - Flyway startup 회귀 없음
  - Actuator/OpenAPI 보안 노출 정책 검증

Phase 1 checklist:
- [ ] Gradle을 canonical build로 확정하고 `pom.xml` 유지/제거 전략을 문서화한다.
- [ ] JPA/QueryDSL/SpringDoc/Redis 관련 의존성을 `backend/build.gradle`에 추가한다.
- [ ] 개발/스테이징/운영 프로파일별 Redis 연결 및 OpenAPI exposure 정책을 추가한다.
- [ ] 로컬 실행 기준 문서(`README.md`, `docs/notes/local-run-phase1.md` 등)를 새 의존성 기준으로 갱신한다.

#### Phase 2: Persistence Model Introduction

- Deliverables:
  - 핵심 도메인 엔티티 매핑 기준 수립 (`member`, `product`, `membership`, `user`)
  - JPA Repository 인터페이스와 Query Repository 분리 패턴 도입
  - 기존 `JdbcClient` repository와 결과 parity 테스트 추가
- Success criteria:
  - 최소 1개 저위험 도메인에서 JPA 저장/조회가 기존 SQL 결과와 일치한다.
- Quality gates:
  - CRUD parity integration test
  - enum/시간대/soft-delete 정책 회귀 0건

Phase 2 checklist:
- [ ] JPA 엔티티 공통 규칙(`@Table`, soft delete, timestamp, audit field) 초안을 확정한다.
- [ ] `member` 또는 `product`처럼 상대적으로 단순한 도메인을 첫 전환 대상으로 선정한다.
- [ ] 기존 repository 결과와 JPA repository 결과를 비교하는 integration test를 추가한다.
- [ ] 서비스 계층이 저장소 구현 세부사항보다 도메인 인터페이스에 의존하도록 경계를 정리한다.

#### Phase 3: QueryDSL and Dynamic Query Migration

- Deliverables:
  - 검색/필터링이 많은 도메인에 QueryDSL query repository 추가
  - 기존 문자열 결합 SQL 제거 또는 최소화
  - 동적 검색, 페이징, 정렬 패턴 표준화
- Success criteria:
  - 회원 검색/상품 검색/예약 조회 등 동적 조회가 QueryDSL 기준으로 동작한다.
- Quality gates:
  - 기존 검색 결과 parity
  - 성능 회귀 없음 (`EXPLAIN`, p95 비교)

Phase 3 checklist:
- [ ] `MemberRepository.findAll*` 계열을 QueryDSL 대상 1순위로 평가한다.
- [ ] 조건 조합이 많은 목록/검색 API를 QueryDSL query repository로 옮긴다.
- [ ] 정산/리포트성 복잡 집계는 QueryDSL 전환 대상과 네이티브 SQL 유지 대상을 구분한다.
- [ ] 인덱스/실행계획 기준 성능 검증 로그를 남긴다.

#### Phase 4: Redis Runtime Adoption

- Deliverables:
  - Redis 연결 설정 및 장애 fallback 정책
  - `QrTokenStore` Redis 구현체 추가
  - 예약 분산 락 서비스 도입
  - 인증 denylist/refresh token 저장 전략 결정
- Success criteria:
  - 1회성 QR 소비와 예약 동시성 제어가 Redis 기반으로 동작한다.
  - Redis 장애 시 fallback 또는 degrade 정책이 정의되어 있다.
- Quality gates:
  - 중복 QR 소비 방지 검증
  - 예약 동시성 race test 통과
  - Redis 장애 주입 테스트 통과

Phase 4 checklist:
- [ ] 현재 `InMemoryQrTokenStore`를 Redis 구현체로 대체할 인터페이스 계약을 고정한다.
- [ ] 예약 락 대상 API/서비스와 락 범위(center/member/schedule)를 명확히 정의한다.
- [ ] 인증은 `denylist only`, `refresh token dual-write`, `refresh token full cutover` 중 하나를 결정한다.
- [ ] Redis 장애 시 로그인/QR/예약 흐름별 fallback 정책과 운영 알림 기준을 문서화한다.

#### Phase 5: Security and API Documentation Alignment

- Deliverables:
  - SpringDoc OpenAPI 적용
  - 주요 컨트롤러에 태그/요약/보안 스키마 반영
  - JWT 인증, role matrix, 에러 응답 문서화
  - Swagger 접근 통제 정책 적용
- Success criteria:
  - 운영/개발자가 현재 REST 계약을 OpenAPI에서 확인 가능하다.
- Quality gates:
  - 인증 필요 API가 보안 스키마와 일치
  - internal/admin only endpoint 비노출 검증

Phase 5 checklist:
- [ ] OpenAPI 문서 범위에서 actuator/internal endpoint를 제외한다.
- [ ] 인증이 필요한 주요 API에 bearer auth 스키마를 연결한다.
- [ ] 공통 에러 응답 포맷과 검증 오류 응답을 문서화한다.
- [ ] Swagger UI 노출 환경(dev/staging only 등)을 정책으로 고정한다.

#### Phase 6: Module-by-Module Cutover and Document Closure

- Deliverables:
  - 모듈별 저장소 전환 완료 표
  - 남겨둘 JDBC/Native SQL 예외 목록
  - 아키텍처 문서와 실제 구현 동기화
  - 운영 runbook, rollback plan, 검증 로그
- Success criteria:
  - Backend 기술스택 문서와 실제 코드베이스가 더 이상 모순되지 않는다.
- Quality gates:
  - 전환 완료 모듈에 대해 테스트/문서/운영 검증이 함께 완료
  - 남겨진 예외는 의도적으로 기록됨

Phase 6 checklist:
- [ ] 각 모듈을 `JPA 전환 완료 / JDBC 유지 / Redis 도입 완료 / 추후 전환` 상태로 분류한다.
- [ ] `docs/02_시스템_아키텍처_설계서.md`와 실제 구현 차이를 잔여 예외 포함 형태로 닫는다.
- [ ] 단계별 rollback 조건과 재전환 절차를 문서화한다.
- [ ] 관련 todo와 검증 로그를 같은 PR 또는 같은 마일스톤 단위로 정리한다.

## Alternative Approaches Considered

### Option A: 문서를 현재 코드에 맞게 수정하고 코드 전환은 하지 않는다

장점:
- 가장 빠르다.
- 런타임 리스크가 없다.

단점:
- 아키텍처 문서가 의도한 장기 기술 방향을 포기하게 된다.
- QueryDSL/Redis/OpenAPI 기반 후속 확장 여지가 약해진다.

판단:
- 이번 요청은 "문서 기준으로 코드를 맞출 때의 계획"이므로 제외한다.

### Option B: 한 번에 전면 JPA/Redis/OpenAPI 전환

장점:
- 문서와 구현을 가장 빨리 맞출 수 있다.

단점:
- 저장소/인증/운영 인프라가 동시에 변해 회귀 위험이 높다.
- 실패 시 원인 분리가 어렵다.

판단:
- 현재 프로젝트 규모와 이미 누적된 기능 폭을 감안하면 비현실적이다.

### Option C: 단계별 전환 + 예외 명시

장점:
- 실제 운영 가능한 경로다.
- 모듈별로 rollback이 가능하다.
- JPA/QueryDSL/Redis/OpenAPI 도입을 분리 검증할 수 있다.

단점:
- 일정이 길어진다.
- 전환 기간 중 혼합 아키텍처를 관리해야 한다.

판단:
- 권장안.

## System-Wide Impact

### Interaction Graph

- Repository layer 전환은 `Controller -> Service -> Repository -> DB` 전 경로를 건드린다.
- Redis 도입은 `AuthService`, `QrCodeService`, 예약 서비스, 보안 필터 체인까지 영향을 준다.
- OpenAPI 도입은 컨트롤러 전반과 보안 설정, 운영 노출 정책에 영향을 준다.

### Error & Failure Propagation

- JPA 전환 후 SQL 예외는 `DataAccessException` 계열에서 JPA/Hibernate 예외로 일부 바뀔 수 있다.
- Redis 장애는 인증 재발급, QR 검증, 예약 생성에서 서로 다른 실패 전략을 요구한다.
- OpenAPI는 기능 실패를 만들지는 않지만 보안 노출 실패를 만들 수 있다.

### State Lifecycle Risks

- PostgreSQL canonical auth state와 Redis auth state를 동시에 쓰면 dual-write drift가 생길 수 있다.
- QR one-time token이 DB/메모리/Redis 사이에서 이중 관리되면 재사용 방지 규칙이 깨질 수 있다.
- JPA 전환 시 flush timing 차이로 기존 수동 SQL과 다른 commit ordering이 생길 수 있다.

### API Surface Parity

- 같은 도메인을 사용하는 REST API가 여러 개면 동일 저장소 전환 원칙을 공유해야 한다.
- Swagger/OpenAPI에 노출된 계약과 실제 응답 DTO가 일치해야 한다.
- 보안 role matrix와 OpenAPI security annotation이 동일해야 한다.

### Integration Test Scenarios

- 기존 `JdbcClient` 저장소와 JPA 저장소가 동일 결과를 반환하는지 비교
- Redis 기반 QR 1회성 소비가 중복 요청/만료/장애 상황에서 동일 정책을 지키는지 검증
- 예약 동시 요청에서 락 없이 실패하던 race를 Redis 락이 막는지 검증
- JWT refresh/logout/denylist가 PostgreSQL/Redis 전략 변경 후에도 동일 사용자 경험을 유지하는지 검증
- Swagger/OpenAPI 노출 범위가 dev/staging/prod profile별 정책과 일치하는지 검증

## Acceptance Criteria

### Functional Requirements

- [ ] Gradle이 백엔드의 단일 canonical build 경로로 정리된다.
- [ ] 최소 1개 핵심 도메인이 JPA Repository + Query Repository 패턴으로 전환된다.
- [ ] QueryDSL이 동적 검색/조회에 실제 사용된다.
- [ ] Redis가 최소 1개 런타임 책임(QR token, reservation lock, auth denylist 중 하나)에 실제 사용된다.
- [ ] SpringDoc OpenAPI가 주요 REST API를 문서화한다.

### Non-Functional Requirements

- [ ] 기존 API 계약/응답/권한 정책 회귀가 없다.
- [ ] Redis 장애 시 fallback 또는 명시적 failure mode가 정의된다.
- [ ] JPA/QueryDSL 전환 후 핵심 목록 조회 성능이 기존 대비 허용 가능한 수준을 유지한다.

### Quality Gates

- [ ] 모듈별 전환마다 integration test가 추가된다.
- [ ] 설정/인프라/운영 노출 정책이 문서화된다.
- [ ] 아키텍처 문서와 실제 구현 상태가 단계 종료 시 동기화된다.

## Success Metrics

- Backend 기술스택 문서와 실제 구현 간 주요 불일치 항목 0건
- `JdbcClient` 직접 사용 저장소 수 단계별 감소
- Redis 도입 기능에서 장애 drill/운영 기준 확보
- Swagger/OpenAPI 문서로 주요 API 계약 확인 가능

## Dependencies & Prerequisites

- Redis 로컬/스테이징 인프라 준비
- JPA/QueryDSL codegen 및 빌드 파이프라인 정비
- DB naming/enum/soft-delete 규칙 명문화
- 운영팀과 Swagger/OpenAPI 노출 정책 합의
- 인증 저장소를 PostgreSQL에서 Redis로 확장할지 여부에 대한 명시적 결정

## Risk Analysis & Mitigation

- **Risk:** JPA 전환으로 기존 SQL semantics 변경
  - Mitigation: parity integration tests, 저위험 도메인부터 전환
- **Risk:** Redis 장애가 로그인/QR/예약 실패로 전파
  - Mitigation: 용도별 fallback, timeout, alert threshold 문서화
- **Risk:** QueryDSL 도입 후 복잡 집계 성능 저하
  - Mitigation: 집계성 조회는 native SQL 유지 허용
- **Risk:** 문서 기준을 맞추려다 불필요한 downgrade/over-engineering 발생
  - Mitigation: 최신 호환 버전 유지, exact version downgrade 금지 원칙

## Documentation Plan

- `docs/02_시스템_아키텍처_설계서.md`
- `README.md`
- `docs/notes/local-run-phase1.md`
- Redis/OpenAPI/JPA cutover 검증 로그 문서
- 모듈별 전환 완료 체크리스트 문서

## Sources & References

### Internal References

- `docs/02_시스템_아키텍처_설계서.md`
- `backend/build.gradle`
- `backend/pom.xml`
- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/gymcrm/member/MemberRepository.java`
- `backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java`
- `backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java`
- `docs/notes/phase15-gradle-standardization-log.md`
- `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`
- `docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md`
- `todos/070-pending-p2-backend-architecture-doc-overstates-jpa-querydsl-stack.md`
- `todos/071-pending-p2-backend-architecture-doc-overstates-redis-runtime-usage.md`
- `todos/072-pending-p3-backend-architecture-doc-version-and-tooling-drift.md`

### Related Work

- `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
