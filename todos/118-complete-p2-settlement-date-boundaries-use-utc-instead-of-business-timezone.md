---
status: complete
priority: p2
issue_id: "118"
tags: [code-review, backend, settlement, timezone, reporting]
dependencies: []
---

# Align Settlement Date Boundaries With Business Timezone

`settlement` 모듈의 정산 리포트와 트레이너 급여 집계는 사용자 입력 `LocalDate`/`YearMonth`를 그대로 `UTC` 시작/종료 시각으로 변환해서 조회합니다. 하지만 같은 모듈의 대시보드 집계는 `Asia/Seoul` 기준으로 `paid_at` 날짜를 계산하고 있어, 월말/일자 경계 거래가 화면마다 서로 다른 날에 잡힐 수 있습니다.

## Problem Statement

사용자가 `2026-03-01` 같은 로컬 날짜를 전달하면, 일반적으로 기대하는 의미는 한국 영업일 기준 `2026-03-01 00:00`부터 `2026-03-01 23:59:59`까지입니다. 그런데 현재 정산 리포트와 급여 집계는 이를 `UTC` 경계로 잘라 조회합니다.

이 결과:
- KST 자정 직후 결제/수업 완료가 전날 UTC로 저장된 경우, 사용자가 본 날짜와 실제 집계 날짜가 어긋날 수 있습니다.
- 같은 settlement 모듈 안에서도 대시보드는 KST 기준, 리포트/급여는 UTC 기준이어서 운영자가 화면별 숫자를 대조할 때 충돌할 수 있습니다.
- 현재 테스트도 `ZoneOffset.UTC`를 직접 사용해 이 가정을 고정하고 있어, 실제 영업일 기준 회귀를 잡지 못합니다.

## Findings

- 대시보드 쿼리는 명시적으로 `Asia/Seoul` 날짜 변환을 사용합니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/SalesDashboardRepository.java:22`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/SalesDashboardRepository.java:31`
- 반면 정산 리포트 서비스는 입력 날짜를 UTC 경계로 바꿉니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/SalesSettlementReportService.java:57`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/SalesSettlementReportService.java:58`
- 트레이너 급여 집계도 월 경계를 UTC로 계산합니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/TrainerPayrollSettlementService.java:40`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/TrainerPayrollSettlementService.java:41`
- integration test도 UTC 가정을 그대로 사용합니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceIntegrationTest.java:52`
  - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/settlement/TrainerPayrollSettlementServiceIntegrationTest.java:52`

## Proposed Solutions

### Option 1: Settlement 전체를 `Asia/Seoul` business timezone 기준으로 통일

**Approach:** `SalesSettlementReportService`와 `TrainerPayrollSettlementService`에서 `LocalDate`/`YearMonth`를 `ZoneId.of("Asia/Seoul")` 기준 `OffsetDateTime`으로 바꿔 조회하고, 경계 회귀 테스트를 추가합니다.

**Pros:**
- 대시보드와 리포트/급여 화면이 같은 영업일 기준을 공유합니다.
- 운영자가 보는 날짜 의미와 집계 결과가 일치합니다.

**Cons:**
- 기존 UTC 가정을 따르던 테스트와 fixture를 갱신해야 합니다.
- 배포 후 날짜 경계 수치가 일부 달라질 수 있습니다.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: 전 모듈을 UTC 기준으로 명시하고 대시보드도 같은 기준으로 변경

**Approach:** 대시보드 쿼리의 `Asia/Seoul` 변환을 제거하고, 사용자-facing 문서/화면도 UTC 기준임을 명시합니다.

**Pros:**
- 구현 기준이 단일해집니다.
- DB 시각과 직접 대응되어 내부 일관성은 높아집니다.

**Cons:**
- 한국 운영 화면에서 날짜 의미가 직관적이지 않습니다.
- 이미 대시보드와 사용자 기대가 로컬 영업일 기준에 가까워 보여 변경 비용이 큽니다.

**Effort:** 3-5 hours

**Risk:** High

## Recommended Action

`settlement` 모듈은 이미 대시보드에서 `Asia/Seoul` 기준을 사용하고 있으므로, 정산 리포트와 급여 집계도 같은 business timezone으로 맞추는 편이 더 안전합니다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/SalesSettlementReportService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/TrainerPayrollSettlementService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/SalesDashboardRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceIntegrationTest.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/settlement/TrainerPayrollSettlementServiceIntegrationTest.java`

## Resources

- Review scope: `develop` branch `settlement` module review
- Validation command:
  - `cd backend && ./gradlew test --tests com.gymcrm.settlement.SalesDashboardServiceTest --tests com.gymcrm.settlement.SalesSettlementReportServiceTest --tests com.gymcrm.settlement.SalesDashboardServiceIntegrationTest --tests com.gymcrm.settlement.SalesSettlementReportServiceIntegrationTest --tests com.gymcrm.settlement.TrainerPayrollSettlementServiceIntegrationTest --stacktrace`

## Acceptance Criteria

- [x] `SalesSettlementReportService` 날짜 경계가 business timezone 기준으로 계산된다.
- [x] `TrainerPayrollSettlementService` 월 경계가 business timezone 기준으로 계산된다.
- [x] 대시보드/리포트/급여 화면이 같은 날짜 기준을 공유한다.
- [x] 자정 직후/월말 경계 fixture를 포함한 회귀 테스트가 추가된다.

## Work Log

### 2026-03-25 - Review Finding

**By:** Codex

**Actions:**
- `develop` 브랜치의 settlement 서비스, 저장소, 캐시, 테스트를 검토했다.
- settlement 대표 테스트를 실행해 현재 회귀 상태를 확인했다.
- 대시보드와 리포트/급여 집계의 날짜 경계 계산 방식을 비교했다.

**Learnings:**
- 같은 settlement 모듈 안에서도 대시보드는 KST 날짜 기준, 리포트/급여는 UTC 경계 기준이라 운영 수치가 화면별로 어긋날 여지가 있다.
- 현재 테스트는 UTC 가정을 고정하고 있어 business timezone 회귀를 방지하지 못한다.

### 2026-03-25 - Implementation

**By:** Codex

**Actions:**
- `SalesSettlementReportService`, `TrainerPayrollSettlementService`가 `Asia/Seoul` 기준 시작/종료 경계를 사용하도록 수정했다.
- settlement 하위 `config/controller/repository/service` package 선언을 실제 경로 기준으로 정렬하고 참조 import를 갱신했다.
- 자정 직후/월 경계 UTC 시각이 KST 기준으로 올바르게 포함·제외되는 integration test와 서비스 boundary unit test를 추가했다.
- `cd backend && ./gradlew compileJava compileTestJava --stacktrace`를 실행했다.
- `cd backend && ./gradlew test --tests com.gymcrm.settlement.SalesDashboardServiceTest --tests com.gymcrm.settlement.SalesSettlementReportServiceTest --tests com.gymcrm.settlement.SalesDashboardCacheConfigTest --tests com.gymcrm.settlement.SalesSettlementReportCacheConfigTest --tests com.gymcrm.settlement.RedisSalesDashboardCacheServiceIntegrationTest --tests com.gymcrm.settlement.RedisSalesSettlementReportCacheServiceIntegrationTest --tests com.gymcrm.settlement.SalesDashboardServiceIntegrationTest --tests com.gymcrm.settlement.SalesSettlementReportServiceIntegrationTest --tests com.gymcrm.settlement.TrainerPayrollSettlementServiceIntegrationTest --stacktrace`를 실행했다.

**Learnings:**
- KST 자정 경계는 UTC 기준으로 전날 15:00에 해당하므로, `OffsetDateTime` 경계를 business timezone에서 직접 계산해야 대시보드와 리포트/급여가 일치한다.
- 개발 DB integration test는 기존 데이터 영향을 받을 수 있어, 경계 회귀는 고유 키워드/트레이너 이름 기준으로 검증하는 편이 안정적이다.
