---
title: refactor: Backend JPA QueryDSL OpenAPI Alignment
type: refactor
status: active
date: 2026-03-09
origin: docs/brainstorms/2026-03-09-backend-architecture-stack-alignment-brainstorm.md
---

# refactor: Backend JPA QueryDSL OpenAPI Alignment

## Enhancement Summary

**Deepened on:** 2026-03-09
**Sections enhanced:** 5
**Research sources used:** Spring Boot 3.4.1 docs, Springdoc OpenAPI docs, Querydsl docs, project learnings

### Key Improvements
1. JPA 도입 시 `Flyway canonical + Hibernate validate/none` 원칙을 추가했다.
2. QueryDSL code generation과 `JPAQueryFactory` 기반 query repository 패턴을 plan에 구체화했다.
3. Swagger `dev only` 노출 정책을 Spring profile / property 기준으로 더 명확히 적었다.
4. soft delete, center scope, 성능 회귀 검증을 phase별 quality gate로 보강했다.
5. 인증 저장소 전환 시 PostgreSQL canonical 정책을 유지하는 guardrail을 더 분명히 했다.

## Overview

Found brainstorm from 2026-03-09: `backend-architecture-stack-alignment`. Using as foundation for planning.

이번 계획은 `docs/02_시스템_아키텍처_설계서.md`의 Backend 항목과 현재 구현 간 드리프트를 줄이기 위해, 백엔드를 `JdbcClient` 중심 구조에서 `JPA + QueryDSL + SpringDoc OpenAPI` 중심 구조로 단계적으로 옮기는 실행 계획이다.

브레인스토밍에서 이번 1차 범위는 `JPA/QueryDSL + OpenAPI`로 제한하고, Redis는 제외하기로 결정했다. 또한 인증 영역도 전환 범위에 포함하고, Swagger UI는 `dev` 환경에서만 노출하기로 확정했다 (see brainstorm: `docs/brainstorms/2026-03-09-backend-architecture-stack-alignment-brainstorm.md`).

## Problem Statement / Motivation

현재 백엔드는 Java 21 / Spring Boot / Spring Security / Flyway / Gradle이라는 큰 축은 문서와 일치하지만, 실제 저장소 계층과 운영 문서화는 문서 기준과 다르다.

- 저장소 계층은 대부분 `JdbcClient` + 수동 SQL이다.
- QueryDSL과 Spring Data JPA는 아직 도입되지 않았다.
- SpringDoc/OpenAPI도 실제로 노출되지 않는다.
- 인증 저장소(`auth_refresh_tokens`)도 JDBC 저장소 구현이다.

이 상태를 유지하면 다음 비용이 계속 누적된다.

- 신규 작업자가 아키텍처 문서를 읽고 잘못된 전제를 가진다.
- 저장소 패턴이 도메인마다 달라 장기 유지보수성이 떨어진다.
- OpenAPI 기반 계약 검증/운영 가시성이 부족하다.
- 이후 Redis 도입이나 런타임 구조 개편 전에 선행되어야 할 저장소 표준화가 계속 밀린다.

## Proposed Solution

권장안은 “점진적 JPA/QueryDSL 전환 + OpenAPI 도입”이다.

핵심 원칙:

- `JdbcClient`를 한 번에 제거하지 않는다.
- 일반 CRUD/조회 도메인뿐 아니라 인증 영역도 전환 범위에 포함한다.
- 정산/리포트 같은 복잡 집계도 최대한 전환 대상으로 보되, 실제 구현에서는 native SQL 예외를 허용한다.
- OpenAPI는 개발 생산성 도구로 먼저 도입하고 `dev`에서만 노출한다.
- Redis는 이번 단계에서 도입하지 않는다 (see brainstorm: `docs/brainstorms/2026-03-09-backend-architecture-stack-alignment-brainstorm.md`).

## Research Summary

### Local repo findings

- 현재 빌드 기준:
  - `backend/build.gradle`은 Java 21, Spring Boot 3.4.2, Spring Security, Flyway, JDBC starter 기준이다.
  - `backend/pom.xml`도 남아 있어 빌드 표준이 완전히 단일화되지는 않았다.
- 현재 저장소 패턴:
  - `backend/src/main/java/com/gymcrm/member/MemberRepository.java`
  - `backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java`
  - 다수 저장소가 `JdbcClient` 기반 직접 SQL 구현이다.
- 현재 보안 경로:
  - `backend/src/main/java/com/gymcrm/common/config/SecurityConfig.java`
  - JWT 기반 stateless 체인은 이미 존재하므로, OpenAPI 보안 스키마와 연계할 수 있다.
- 현재 QR 토큰 저장은 Redis가 아니라 메모리 구현이다:
  - `backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java`
- 이전 의사결정:
  - Phase 5 JWT 계획은 refresh token canonical을 PostgreSQL로 두고 Redis denylist는 후속 단계로 미뤘다.
  - `docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md`

### Institutional learnings

- 문서-코드 드리프트는 즉시 동기화하지 않으면 후속 `plan/review/work` 품질이 같이 떨어진다.
  - `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`
- DB/쿼리/배포 리스크는 기능 작업과 함께 체크리스트로 묶어야 한다.
  - `docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md`

### External research decision

강한 로컬 맥락이 있어 일반 웹 검색은 생략했지만, Spring Boot 3.4.1 / Springdoc / Querydsl 공식 문서를 기준으로 다음 구현 원칙을 추가 반영한다.

- Spring Boot + Flyway 조합에서는 Hibernate schema generation을 운영에서 `update/create`로 두지 않고 `validate` 또는 `none` 기준으로 고정하는 편이 안전하다.
- Spring Boot는 multi-document YAML과 `spring.config.activate.on-profile`로 profile별 OpenAPI 노출을 분리할 수 있다.
- Springdoc은 `paths-to-match`, `paths-to-exclude`, bearer security scheme, `api-docs/swagger-ui enabled` 설정을 프로파일별로 제어할 수 있다.
- Querydsl은 JPA entity 기준 Q-class 생성과 `JPAQueryFactory` 기반 query composition을 전제로 설계하는 것이 자연스럽다.

## Technical Approach

### Architecture

- 저장소 계층을 `Command/Crud Repository`와 `Query Repository`로 분리한다.
- 단건 저장/수정/삭제와 단순 조회는 JPA 중심으로 옮긴다.
- 복합 필터/검색/목록은 QueryDSL 중심으로 옮긴다.
- 매우 무거운 리포트/정산 SQL은 native SQL 유지 예외를 허용하되, 예외 목록을 명시적으로 관리한다.
- 인증 도메인(`AuthUser`, `auth_refresh_tokens`)도 같은 저장소 표준으로 정렬한다.
- OpenAPI는 `dev`에서만 Swagger UI를 열고, staging/prod에서는 비노출한다 (see brainstorm: `docs/brainstorms/2026-03-09-backend-architecture-stack-alignment-brainstorm.md`).

### Research Insights

**Best practices:**
- Flyway가 canonical schema manager이면 `spring.jpa.hibernate.ddl-auto`는 `validate` 또는 `none`으로 두고, 스키마 변경은 전부 migration으로 흘려보내는 것이 안전하다.
- Query repository는 서비스가 아니라 repository layer 바로 아래에 두고, 동적 조회만 소유하게 해야 JDBC/JPA 혼합 기간에도 경계가 선명하다.
- OpenAPI는 `dev` 전용 `@Profile` 또는 profile-specific properties로 차단하는 편이 보안 설정과 운영 노출 정책을 단순하게 유지한다.

**Implementation details:**
- JPA repository 테스트는 `@DataJpaTest`로 빠르게 검증하되, 기존 API parity는 실제 PostgreSQL integration test로 다시 확인해야 한다.
- Querydsl generated source는 IDE/CI 모두 같은 출력 경로를 보도록 고정해야 한다. 이 부분이 흔들리면 로컬은 되는데 CI가 깨지는 전형적인 문제가 생긴다.

**Edge cases:**
- soft delete가 붙은 테이블은 `findById` 같은 단순 메서드에서도 누락 없이 필터링되어야 한다.
- `center_id` scope를 SQL에서 명시하던 코드가 JPA 전환 후 엔티티 연관관계에 묻히며 빠질 수 있다. 서비스/리포지토리 테스트로 강제해야 한다.

### Target module grouping

1. Low-risk CRUD domains
- `member`
- `product`
- `locker`

2. Stateful business domains
- `membership`
- `reservation`
- `access`

3. Security and operational domains
- `auth`
- `audit`
- `integration` activation policy

4. Heavy query / reporting domains
- `settlement`
- CRM event/history search

### Implementation Phases

#### Phase 1: Build and Runtime Foundation

- Deliverables:
  - `spring-boot-starter-data-jpa`, QueryDSL, SpringDoc/OpenAPI 의존성 추가
  - QueryDSL codegen/build path 확정
  - `dev` 전용 Swagger UI 노출 정책 추가
  - Gradle canonical build 기준 재확인, `pom.xml` 유지/제거 정책 고정
- Success criteria:
  - 앱이 새 의존성과 함께 기동한다.
  - `/swagger-ui` 및 `/v3/api-docs`가 `dev`에서만 동작한다.
- Quality gates:
  - 전체 백엔드 테스트 통과
  - `prototype` / `jwt` 모드 모두 startup 회귀 없음
  - Swagger가 `staging/prod`에서 비활성화됨

Phase 1 checklist:
- [ ] `backend/build.gradle`에 JPA/QueryDSL/SpringDoc 의존성을 추가한다.
- [ ] QueryDSL generated source 경로와 CI/로컬 빌드 절차를 고정한다.
- [ ] `SecurityConfig`와 OpenAPI 설정을 맞춰 Swagger `dev only` 노출 정책을 적용한다.
- [ ] `backend/pom.xml`의 역할을 `deprecated`로 명시하거나 제거 시점을 확정한다.
- [ ] 실행 문서(`README.md`, `docs/notes/local-run-phase1.md`)를 새 빌드 기준에 맞춘다.

Phase 1 research insights:
- `application.yml`의 multi-document profile block으로 `springdoc.api-docs.enabled` / `springdoc.swagger-ui.enabled`를 `dev=true`, `staging/prod=false`로 분리하는 것이 가장 단순하다.
- `springdoc.paths-to-match=/api/**`, `paths-to-exclude=/actuator/**,/api/internal/**` 같은 정책을 초기에 잡아두면 문서 범위가 흔들리지 않는다.
- build 도입 직후에는 Q-class 생성만 검증하고, 대규모 저장소 전환은 다음 phase로 미루는 것이 안정적이다.

#### Phase 2: Persistence Baseline and Mapping Rules

- Deliverables:
  - 공통 엔티티 매핑 규칙
  - soft delete / timestamp / audit field 처리 기준
  - JPA repository naming / package 구조 표준
- Success criteria:
  - 전환 대상 모듈이 같은 엔티티/리포지토리 규칙을 공유한다.
- Quality gates:
  - enum / nullability / timezone / optimistic locking 기준 문서화

Phase 2 checklist:
- [ ] 엔티티 공통 규칙(`@Entity`, `@Table`, PK, soft delete, timestamp`)을 문서화한다.
- [ ] `JdbcClient Repository -> JPA Repository + Query Repository` 패턴 예시를 1개 만든다.
- [ ] 트랜잭션 경계가 서비스 계층에 남도록 규칙을 고정한다.
- [ ] 기존 DTO/서비스가 엔티티에 과하게 결합되지 않도록 anti-corruption 원칙을 정한다.

Phase 2 research insights:
- soft delete가 이미 설계 규칙으로 존재하므로, JPA 전환 시 `@SQLDelete`/`@Where` 같은 ORM 기능을 쓸지 아니면 repository explicit predicate를 유지할지 먼저 결정해야 한다.
- audit/timestamp 필드는 엔티티 라이프사이클 훅에 과도하게 숨기기보다 현재 명시적 서비스 업데이트 패턴과 충돌하지 않는 쪽을 선택해야 한다.
- optimistic locking이 필요한 도메인은 초기에 `@Version` 적용 후보를 분류하되, 모든 엔티티에 일괄 적용하지 않는다.

#### Phase 3: Low-Risk Domain Migration

- Deliverables:
  - `member`, `product`, `locker` 도메인의 JPA/QueryDSL 전환
  - 기존 검색/목록 API parity 검증
- Success criteria:
  - 사용자 영향이 큰 기본 CRUD 도메인이 새 패턴으로 안정 전환된다.
- Quality gates:
  - API 응답 회귀 없음
  - 생성/수정/삭제/검색 integration test 통과

Phase 3 checklist:
- [ ] `member` 도메인을 첫 전환 대상으로 사용해 조회/저장/검색을 분리 전환한다.
- [ ] `product`, `locker` 도메인에 같은 패턴을 반복 적용한다.
- [ ] 기존 `JdbcClient` 결과와 새 저장소 결과를 비교하는 parity 테스트를 추가한다.
- [ ] 각 도메인 전환 후 남은 JDBC 코드와 제거 가능한 코드를 표시한다.

Phase 3 research insights:
- `member`는 이미 검색/요약/만료임박 같은 조건 조합이 많아 Querydsl 효과를 검증하기 좋은 첫 대상이다.
- 단, 회원 요약 조회는 과거 인덱스/배포 리스크가 있었으므로 query rewrite만 보고 넘어가지 말고 실행계획과 인덱스 사용 여부까지 같이 봐야 한다.
- low-risk라 해도 `member_code`, soft delete, consent, encrypted field fallback 같은 기존 semantics는 parity 테스트에 포함해야 한다.

#### Phase 4: Stateful Domain Migration

- Deliverables:
  - `membership`, `reservation`, `access` 도메인의 JPA/QueryDSL 전환
  - 상태 전이와 동시성 관련 회귀 테스트 강화
- Success criteria:
  - 상태성 도메인이 저장소 기술 전환 후에도 정책 회귀 없이 동작한다.
- Quality gates:
  - 회원권 상태 전이 회귀 없음
  - 예약/출입 시나리오 integration test 통과

Phase 4 checklist:
- [ ] `membership` 상태 전이와 usage event 기록 흐름을 먼저 보호 테스트로 고정한다.
- [ ] `reservation` 저장소 전환 시 capacity/current_count semantics를 유지한다.
- [ ] `access` 저장소 전환 시 QR/입장 이벤트 정책이 유지되는지 검증한다.
- [ ] 이 단계에서는 Redis를 넣지 않고 현재 메모리/PostgreSQL 경계를 유지한다.

#### Phase 5: Auth and Operational Domain Migration

- Deliverables:
  - `AuthUser`, `auth_refresh_tokens`, `audit`, `integration activation policy` 저장소 전환
  - OpenAPI 보안 스키마와 JWT 정책 문서화
- Success criteria:
  - 인증/감사/운영 도메인이 저장소 패턴 기준으로 정렬된다.
- Quality gates:
  - 로그인/refresh/logout/RBAC 회귀 없음
  - `auth_refresh_tokens` 저장 정책이 기존 PostgreSQL canonical과 동일 동작

Phase 5 checklist:
- [ ] `AuthUser`와 `auth_refresh_tokens`를 JPA 전환 대상으로 포함한다 (see brainstorm: `docs/brainstorms/2026-03-09-backend-architecture-stack-alignment-brainstorm.md`).
- [ ] Phase 5 JWT 계획의 PostgreSQL canonical 결정을 유지하면서 저장소 기술만 바꾼다.
- [ ] `audit`/`integration` 계열도 운영 조회 중심 저장소 패턴으로 정리한다.
- [ ] OpenAPI에 bearer auth, role matrix, 공통 에러 응답을 반영한다.

Phase 5 research insights:
- 인증 저장소는 기술만 JPA로 바꾸고 데이터 계약(`auth_refresh_tokens`)은 유지해야 한다. schema 의미까지 바꾸면 이번 계획 범위를 넘는다.
- bearer auth scheme는 OpenAPI 전역 security requirement로 두되, login/refresh/health처럼 공개 endpoint는 명시적으로 override하는 것이 문서 가독성이 좋다.
- RBAC 문서화는 controller annotation만 믿지 말고 실제 `SecurityConfig` permit list와 함께 검증해야 한다.

#### Phase 6: Heavy Query and Reporting Alignment

- Deliverables:
  - `settlement`와 CRM 검색/이력 도메인 전환 또는 예외 등록
  - QueryDSL / native SQL 사용 경계 문서화
- Success criteria:
  - 복잡 집계 영역도 “왜 JPA/QueryDSL인지, 왜 native SQL 예외인지”가 분명해진다.
- Quality gates:
  - 성능 회귀 없음
  - 예외 목록이 문서화됨

Phase 6 checklist:
- [ ] `settlement` 조회를 QueryDSL로 옮길 수 있는 부분과 native SQL 유지 부분을 구분한다.
- [ ] CRM history/search 도메인도 같은 기준으로 정리한다.
- [ ] `EXPLAIN` 또는 기존 성능 프로브 기준으로 회귀 여부를 검증한다.
- [ ] “문서 기준 미달”이 아니라 “의도적 예외” 목록을 남긴다.

Phase 6 research insights:
- Querydsl은 동적 필터 조합에 강하지만, 대규모 집계/윈도우 함수/DB별 최적화가 섞이면 native SQL이 더 명확할 수 있다.
- 따라서 heavy query domain의 성공 기준은 “전부 Querydsl로 이동”이 아니라 “왜 남겼는지가 설명 가능한 상태”여야 한다.
- 성능 검증은 기능 테스트보다 먼저 `EXPLAIN`, row estimate, index usage를 확인하는 편이 비용이 낮다.

#### Phase 7: Closure and Documentation Sync

- Deliverables:
  - 아키텍처 문서 동기화
  - 남은 JDBC 예외 목록
  - 전환 검증 로그와 rollback 기준
- Success criteria:
  - Backend 항목이 실제 코드와 모순되지 않는다.
- Quality gates:
  - 문서/체크리스트/검증 로그 동기화

Phase 7 checklist:
- [ ] `docs/02_시스템_아키텍처_설계서.md`의 Backend/레이어/보안/OpenAPI 항목을 실제 상태로 동기화한다.
- [ ] 남은 JDBC/native SQL 예외 목록을 문서에 남긴다.
- [ ] 관련 todo와 검증 문서를 같은 마일스톤에서 정리한다.
- [ ] plan 상태와 acceptance criteria를 실제 구현 상태에 맞춰 즉시 갱신한다.

## System-Wide Impact

### Interaction graph

- `Controller -> Service -> Repository -> DB` 전 경로가 저장소 기술 전환 영향을 받는다.
- 인증 도메인은 `SecurityConfig -> JwtAuthenticationFilter -> AuthService -> Auth repository` 체인이 함께 바뀐다.
- OpenAPI 도입은 컨트롤러 전반, 보안 노출 정책, DTO/에러 응답 설명까지 영향을 준다.

### Error propagation

- JDBC 기반 `DataAccessException` 처리와 JPA/Hibernate 예외 계층이 달라질 수 있다.
- flush timing 차이로 기존 수동 SQL과 예외 시점이 달라질 수 있다.
- Swagger는 런타임 비즈니스 오류는 만들지 않지만, 잘못된 exposure 정책은 운영 노출 사고를 만든다.

### State lifecycle risks

- 상태성 도메인(`membership`, `reservation`, `access`, `auth`)은 전환 중 flush/transaction ordering 차이로 드리프트가 생길 수 있다.
- 인증 저장소는 canonical DB 정책은 유지하되 저장소 기술만 바꾸므로, DB 스키마/정책 자체는 변경하지 않는다.

### API surface parity

- 기존 REST 계약은 유지되어야 한다.
- OpenAPI 스펙과 실제 DTO/보안 정책이 어긋나지 않아야 한다.
- `prototype` / `jwt` 모드 모두에서 동일한 endpoint contract가 유지되어야 한다.

### Integration test scenarios

- 기존 `JdbcClient` 저장소와 새 JPA 저장소가 동일 결과를 반환하는지 비교
- `member` 검색/목록/수정 API가 QueryDSL 전환 후 동일 필터 semantics를 유지하는지 검증
- 로그인/refresh/logout/RBAC가 인증 저장소 전환 후 회귀 없는지 검증
- 예약/출입/회원권 상태 전이가 flush timing 변화에도 동일하게 유지되는지 검증
- Swagger UI / OpenAPI가 `dev`에서만 열리고 다른 프로파일에서 비노출인지 검증

## Acceptance Criteria

### Functional Requirements

- [ ] `JPA + QueryDSL + SpringDoc OpenAPI` 의존성이 백엔드에 도입된다.
- [ ] `member`, `product`, `locker`, `membership`, `reservation`, `access`, `auth`, `audit`, `integration` 도메인 중 예외를 제외한 저장소가 새 패턴으로 전환된다.
- [ ] 인증 영역(`AuthUser`, `auth_refresh_tokens`)도 전환 범위에 포함된다.
- [ ] OpenAPI 문서가 `dev` 환경에서만 제공된다.
- [ ] 정산/리포트 도메인의 QueryDSL 전환 또는 native SQL 예외 정책이 명시된다.

### Non-Functional Requirements

- [ ] 기존 API 계약과 RBAC 정책에 회귀가 없다.
- [ ] 전환 후 핵심 조회 성능이 허용 범위 내로 유지된다.
- [ ] `prototype` / `jwt` 실행 모드 모두 startup 및 핵심 테스트가 유지된다.

### Quality Gates

- [ ] 각 단계마다 integration test 또는 parity test가 추가된다.
- [ ] 문서-코드 드리프트를 같은 마일스톤에서 같이 닫는다.
- [ ] 남겨진 JDBC/native SQL은 의도적 예외로 문서화된다.

## Success Metrics

- 문서상 Backend 기술스택과 실제 구현 간 핵심 불일치 항목 0건
- 직접 `JdbcClient` 사용하는 저장소 수의 단계적 감소
- Swagger/OpenAPI로 주요 API 계약을 `dev`에서 확인 가능
- 저장소 전환 후 핵심 API 회귀 0건

## Dependencies & Risks

Dependencies:

- QueryDSL code generation build path 정리
- SpringDoc exposure 정책 확정
- JPA 매핑 규칙과 soft delete 처리 방식 합의
- parity integration test 작성 시간 확보

Risks:

- 상태성 도메인에서 flush/transaction semantics 차이로 회귀 발생
- 복잡 집계를 QueryDSL로 무리하게 옮기다 성능 저하 발생
- 인증 저장소 전환 중 보안/권한 회귀 발생
- 문서 기준을 맞추려다 실제로는 native SQL이 더 적합한 영역을 과도하게 일반화할 위험

Mitigation:

- 저위험 도메인부터 전환 후 상태성 도메인으로 확장
- 복잡 집계는 QueryDSL 우선 검토 후 native SQL 예외 허용
- 인증 저장은 PostgreSQL canonical 정책 유지
- 각 단계에 parity/integration test를 고정

## Sources & References

### Origin

- **Brainstorm document:** [2026-03-09-backend-architecture-stack-alignment-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-09-backend-architecture-stack-alignment-brainstorm.md)
  - Key decisions carried forward:
  - 1차 범위는 `JPA/QueryDSL + OpenAPI`
  - Redis는 제외
  - 인증 포함
  - Swagger UI는 `dev only`

### Internal References

- [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_시스템_아키텍처_설계서.md)
- [build.gradle](/Users/abc/projects/GymCRM_V2/backend/build.gradle)
- [pom.xml](/Users/abc/projects/GymCRM_V2/backend/pom.xml)
- [application.yml](/Users/abc/projects/GymCRM_V2/backend/src/main/resources/application.yml)
- [MemberRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java)
- [AuthRefreshTokenRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java)
- [InMemoryQrTokenStore.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java)
- [SecurityConfig.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/SecurityConfig.java)
- [2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md)
- [prototype-plan-checklist-status-drift-gymcrm-20260227.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md)
- [member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md)

### External References

- Spring Boot 3.4.1 reference: profile-specific config and JPA/Hibernate properties
- Springdoc OpenAPI docs: API docs path, Swagger UI enable/disable, bearer auth configuration
- Querydsl docs: JPA Q-class generation and `JPAQueryFactory` query composition

### Related Work

- [2026-03-09-refactor-backend-architecture-stack-alignment-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-backend-architecture-stack-alignment-plan.md)
