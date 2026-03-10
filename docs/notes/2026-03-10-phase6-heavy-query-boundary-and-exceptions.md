# Phase 6 Heavy Query Boundary and Intentional Native SQL Exceptions

Date: 2026-03-10
Plan: `docs/plans/2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md`

## Purpose

Phase 6의 목적은 heavy query/reporting 영역을 무리하게 전부 QueryDSL로 옮기는 것이 아니라, 현재 코드 기준으로 다음 두 가지를 고정하는 것이다.

- QueryDSL/JPA로 옮겨도 의미 보존이 가능한 조회 경계
- 당장은 native SQL을 의도적으로 유지해야 하는 예외 경계

이 문서는 `settlement`, CRM history/search 도메인에 대해 그 구분과 이유를 기록한다.

## Classification Summary

### Settlement

| Repository | Current shape | Recommended boundary | Reason |
|---|---|---|---|
| `SalesDashboardRepository` | 단일 aggregate row, `SUM(CASE ...)`, 날짜별 조건 집계, 서브쿼리 2개, `AT TIME ZONE 'Asia/Seoul'` date cast | Native SQL exception | 서울 로컬 날짜 경계와 conditional aggregate를 한 SQL에서 보장하는 현재 형태가 더 명확하다. QueryDSL로 옮겨도 표현은 가능하지만 가독성/검증 비용이 증가한다. |
| `SalesSettlementReportRepository` | 상품명/결제수단 기준 그룹 집계, `SUM(CASE ...)`, `ILIKE`, derived alias 정렬 | Native SQL exception | 리포트 성격이 강하고 aggregate alias 중심 정렬까지 포함한다. QueryDSL로 바꾸면 표현식이 길어지고 SQL 의도를 숨길 가능성이 크다. |
| `TrainerPayrollSettlementRepository` | 예약/스케줄 join 후 `COUNT(*)` group by trainer | QueryDSL candidate | 조인, 필터, group by가 단순하고 현재 비즈니스 의미도 명확하다. QueryDSL aggregate query로 옮겨도 읽기/검증 비용이 감당 가능하다. |

### CRM

| Repository | Current shape | Recommended boundary | Reason |
|---|---|---|---|
| `CrmTargetRepository.findExpiringMembershipTargets` | 만료일 기준 대상 조회 | QueryDSL candidate | 단순 join + equality filter라 QueryDSL 전환 난도가 낮다. |
| `CrmTargetRepository.findBirthdayTargets` | 생일 월/일 추출, consent/member_status 필터 | Mixed candidate | QueryDSL function template로 옮길 수는 있지만 `EXTRACT(MONTH/DAY ...)` 의존이 남는다. QueryDSL 전환 시에도 DB 함수 사용을 허용하는 조건부 전환이 맞다. |
| `CrmTargetRepository.findEventCampaignTargets` | `SELECT DISTINCT`, 활성 membership/category 필터 | QueryDSL candidate | distinct + join 수준이라 QueryDSL에서 충분히 표현 가능하다. |
| `CrmMessageEventRepository` | dedupe insert, dispatch queue, retry/dead 전이, attempt count 증가, `ON CONFLICT ... DO NOTHING` | Native SQL exception | 메시지 큐 성격의 상태 저장소다. `ON CONFLICT`, 상태 전이, retry scheduling을 QueryDSL/JPA로 억지 전환하면 의미 보존과 동시성 검증 비용이 커진다. |
| `CrmMessageTemplateRepository` | template CRUD + list filter | QueryDSL/JPA candidate | 전형적인 CRUD/filter 저장소다. soft delete/filter 규칙만 맞추면 전환에 무리가 없다. |

## Boundary Rules

### Keep native SQL when

- `SUM(CASE ...)` 같은 conditional aggregate가 리포트 핵심 의미를 직접 드러낼 때
- timezone cast, derived aggregate ordering, report-only SQL shape가 QueryDSL보다 더 명확할 때
- `ON CONFLICT`, retry queue, attempt count update처럼 DB 단 상태 전이 semantics가 핵심일 때
- 단일 SQL statement의 원자성이 기능 계약 일부일 때

### Prefer QueryDSL/JPA when

- CRUD + filter + paging + simple join 정도로 의미를 충분히 보존할 수 있을 때
- distinct/search/filter 조합이지만 DB vendor-specific SQL에 강하게 묶이지 않을 때
- 서비스 코드가 이미 JPA entity lifecycle을 활용하고 있고 write/read 분리를 통해 경계를 더 선명하게 만들 수 있을 때

## Intentional Native SQL Exceptions

현재 단계에서 의도적으로 native SQL 예외로 유지하는 항목은 다음과 같다.

- `member` summary query (`CTE + DISTINCT ON`)
- `AccessEligibilityService` eligibility query
- `SalesDashboardRepository`
- `SalesSettlementReportRepository`
- `CrmMessageEventRepository`
- `settlement` 계열의 향후 aggregate/report SQL 중 실행계획과 집계식 가독성이 QueryDSL보다 우세한 항목

이 목록은 "문서 미달"이 아니라 현재 아키텍처에서 허용하는 예외 목록이다.

## Validation Baseline

`psql`이 현재 작업 환경에 없어 직접 `EXPLAIN` CLI 검증은 수행하지 못했다. 대신 Phase 6에서는 기존 service integration suite를 behavioral/performance probe 기준으로 재실행했다.

Executed on 2026-03-10 KST:

- `./gradlew test --tests com.gymcrm.settlement.SalesDashboardServiceIntegrationTest`
- `./gradlew test --tests com.gymcrm.settlement.SalesSettlementReportServiceIntegrationTest`
- `./gradlew test --tests com.gymcrm.settlement.TrainerPayrollSettlementServiceIntegrationTest`
- `./gradlew test --tests com.gymcrm.crm.CrmMessageServiceIntegrationTest`
- `./gradlew test --tests com.gymcrm.crm.CrmMessageTemplateServiceIntegrationTest`

Result:

- All passed on `2026-03-10 16:52:08 KST` execution window.
- 현재 단계의 검증 의미는 “저장소 전환/예외 분류 후에도 기존 집계/CRM 시나리오가 깨지지 않았다”는 behavioral baseline 고정이다.

## Next Phase Guidance

Phase 6 이후 실제 전환 우선순위는 다음이 적절하다.

1. `TrainerPayrollSettlementRepository`
2. `CrmTargetRepository`
3. `CrmMessageTemplateRepository`
4. native SQL 예외 항목은 QueryDSL 전환보다 실행계획/인덱스/운영 검증 기준 문서화를 우선

## Notes for Architecture Sync

Phase 7에서 `docs/02_시스템_아키텍처_설계서.md`를 동기화할 때는 Backend 항목에 다음 문장을 포함하는 것이 맞다.

- 기본 저장소 패턴은 `JPA + QueryDSL`이다.
- 단, reporting/queue/concurrency semantics가 강한 일부 조회/상태 전이 쿼리는 의도적으로 native SQL을 유지한다.
