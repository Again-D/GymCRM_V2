---
title: plan: Roll back period/scope settlements to monthly model
type: plan
status: completed
date: 2026-04-10
origin: /Users/abc/projects/GymCRM/docs/03_데이터베이스_설계서.md
---

# plan: Roll back period/scope settlements to monthly model

## Overview

현재 `settlements`는 `period_start`, `period_end`, `scope_type`, `scope_trainer_user_id`를 가진 기간/범위 기반 canonical settlement 모델로 확장되어 있다. 그러나 원본 데이터베이스 설계서의 `settlements`는 `center_id + settlement_year + settlement_month` 기준의 월 정산 헤더이고, 트레이너/PT/GX 분리는 `settlement_details`의 1:N 상세 행이 담당한다. 이번 계획은 현재 구현을 원본 월 단위 모델로 롤백해 도메인 복잡도를 줄이고, 프론트/API에서 필요했던 기간 표현은 파생 응답으로만 유지하는 방향을 정리한다.

## Problem Frame

현재 period/scope 모델은 다음 문제를 만든다.

- DB identity가 월 단위가 아니라 기간+범위로 바뀌면서 원본 설계서와 달라졌다.
- `ALL` / `TRAINER` 범위 잠금과 overlap validation이 서비스/저장소 복잡도를 키웠다.
- 프론트와 API가 `periodStart` / `periodEnd`를 중심으로 굳어지면서, 원래의 월 정산 도메인보다 더 큰 모델이 persistence까지 스며들었다.
- `trainer_settlements` 월별 bridge와 `settlements` canonical 모델이 이중 구조가 되어, 실제 운영 언어와 저장 모델이 어긋난다.

원본 문서 기준으로 보면 `settlements`는 월 단위 정산 헤더이며, 유니크 키도 `uk_settlements_center_period(center_id, settlement_year, settlement_month)` 하나면 충분했다. 따라서 이번 롤백은 “응답 shape 때문에 생긴 기간/범위 모델”을 persistence에서 제거하고, 월 단위 모델을 다시 canonical source-of-truth로 복구하는 것이 목적이다.

## Requirements Trace

- R1. `settlements`의 canonical identity는 다시 `center_id + settlement_year + settlement_month`가 된다.
- R2. `period_start`, `period_end`, `scope_type`, `scope_trainer_user_id`는 persistence 핵심 식별자에서 제거된다.
- R3. `settlement_details`의 `settlement_id -> settlements` 1:N 관계를 중심 모델로 복구한다.
- R4. API/프론트에서 필요한 기간 표현은 월 기준 파생값으로 계산한다.
- R5. 기존 월별 문서 출력, 조회, 확정 흐름은 유지하거나 단순화되어야 한다.
- R6. 원본 설계서와 현재 DB/API 문서를 같은 delivery unit에서 다시 정렬한다.

## Scope Boundaries

- 이번 계획은 정산 정책 계산식 자체를 바꾸지 않는다.
- 트레이너별 저장 단가(`users.pt_session_unit_price`, `users.gx_session_unit_price`)는 유지한다.
- 매출 분석 탭의 KPI/환불/추이 기능은 다루지 않는다.
- `settlement_details`의 트레이너/PT/GX 상세 구조는 유지한다.
- period/scope 모델 제거와 무관한 PDF 레이아웃 개선은 범위에 포함하지 않는다.

## Context & Research

### Original Source of Truth

- 원본 설계서 `/Users/abc/projects/GymCRM/docs/03_데이터베이스_설계서.md`
  - `settlements`는 `settlement_year`, `settlement_month` 중심 월 정산 헤더다.
  - UK는 `uk_settlements_center_period(center_id, settlement_year, settlement_month)`다.
  - `settlement_details`는 `settlement_id`를 FK로 가지는 1:N 상세 테이블이다.

### Current Diverged Implementation

- `backend/src/main/resources/db/migration/V34__add_trainer_settlement_rates_and_canonical_settlements.sql`
  - 최초 구현은 원본 설계에 가깝게 월 단위 settlement header를 만들었다.
- `backend/src/main/resources/db/migration/V36__convert_settlements_to_period_scope.sql`
  - 이후 period/scope 확장을 도입했다.
- `backend/src/main/java/com/gymcrm/settlement/entity/SettlementEntity.java`
  - 현재 entity는 `periodStart`, `periodEnd`, `scopeType`, `scopeTrainerUserId`를 필수 필드로 가진다.
- `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementPreviewService.java`
- `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementCreationService.java`
  - 현재 preview/create 흐름은 period-based validation과 scope-based conflict detection을 전제로 한다.
- `frontend/src/pages/settlements/SettlementsPage.tsx`
- `frontend/src/pages/settlements/modules/useTrainerSettlementWorkspaceState.ts`
- `frontend/src/pages/settlements/modules/useTrainerSettlementPreviewQuery.ts`
  - 프론트도 `periodStart`/`periodEnd` 기반 조회 UX로 전환되어 있다.

## Key Technical Decisions

- `settlements`의 canonical key는 다시 월 단위로 고정한다.
  - `center_id + settlement_year + settlement_month`를 unique identity로 복원한다.
- period 표현은 DB 원본값이 아니라 파생값으로 취급한다.
  - 필요하면 API 응답에서 `settlementYear`, `settlementMonth`로부터 `periodStart=월초`, `periodEnd=월말`을 계산해 내려준다.
- `scope_type` / `scope_trainer_user_id`는 정산 헤더에서 제거한다.
  - 트레이너 단위 분리는 `settlement_details`와 월별 조회 필터에서 해결한다.
- overlap locking은 제거하고, 같은 월 중복 생성 방지만 남긴다.
  - 원본 설계 요구는 기간 overlap conflict가 아니라 “센터별 월 정산 1건”이었다.
- 트레이너 self-view도 월 단위로 정렬한다.
  - 트레이너 조회는 본인 상세 행 필터로 해결하고, persistence 모델에 별도 scope 축을 만들지 않는다.
- legacy bridge가 아니라 monthly model 자체를 canonical model로 재승격한다.
  - `trainer_settlements`와 `settlements`의 역할 분리가 불필요하게 이중화되어 있으면 함께 정리한다.
- 이번 롤백은 단계적으로 수행한다.
  - 1차는 contract/UX를 month-based로 복구하고, 2차에서 period/scope persistence 제거와 bridge 정리를 마무리한다.

## Compatibility Strategy

- 백엔드 API는 한 릴리즈 동안 month-based contract를 canonical로 두되, 필요한 경우 기존 `periodStart` / `periodEnd` 입력은 deprecated compatibility layer로만 받는다.
- compatibility layer를 둘 경우 서버는 아래 규칙만 허용한다.
  - `periodStart`는 해당 월 1일이어야 한다.
  - `periodEnd`는 해당 월 말일이어야 한다.
  - 두 값이 같은 달이 아니면 validation error를 반환한다.
- 프론트 기본 contract는 즉시 `settlementMonth`로 되돌린다.
- 호환 레이어가 유지되는 동안에도 persistence와 domain rule은 month-based만 사용한다.

## Data Normalization Rules

- 롤백 대상 `settlements` row는 월 전체 기간 row만 자동 정규화 대상으로 인정한다.
- 월 전체 기간의 기준은 다음과 같다.
  - `period_start = settlement_year/settlement_month의 1일`
  - `period_end = 해당 월의 말일`
- 아래 조건 중 하나라도 만족하면 자동 롤백 대상에서 제외하고 migration을 중단한다.
  - `period_start`와 `settlement_year` / `settlement_month`가 같은 달 1일이 아님
  - `period_end`가 해당 월 말일이 아님
  - `scope_type != 'ALL'`
  - 같은 `center_id + settlement_year + settlement_month`에 복수 row가 존재함
- 중단된 데이터는 one-off 수동 정리 대상으로 분리하고, 자동 축약 규칙으로 억지 변환하지 않는다.

## Lifecycle Policy

- month-based canonical settlement의 identity는 `center_id + settlement_year + settlement_month`다.
- 같은 월에 existing `DRAFT`가 있으면 새 row를 만들지 않고 기존 `DRAFT`를 재사용한다.
- 같은 월에 existing `CONFIRMED`가 있으면 create/confirm 모두 차단한다.
- soft-deleted settlement는 unique 판단과 재사용 판단에서 제외한다.

## Bridge Policy

- `settlements`를 다시 canonical source-of-truth로 승격한다.
- `trainer_settlements`는 즉시 canonical로 취급하지 않는다.
- 1차 롤백 릴리즈에서는 월별 문서 출력/기존 조회 호환을 위해 `trainer_settlements`를 read-only bridge로만 유지한다.
- 2차 정리 릴리즈에서 아래 둘 중 하나를 확정한다.
  - bridge 제거
  - 문서 출력 전용 projection으로 역할 축소

## Rollout Phases

| Phase | Goal | Notes |
|---|---|---|
| Phase A | API contract와 프론트 UX를 month-based로 복구 | period input은 deprecated compatibility로만 허용 가능 |
| Phase B | DB canonical schema를 month-based identity로 복구 | 데이터 검증 통과 시에만 period/scope persistence 제거 |
| Phase C | `trainer_settlements` bridge 축소/제거 | 별도 후속 릴리즈로 분리 가능 |

## Decision Matrix

| Concern | Keep current period/scope model | Roll back to monthly model | Decision |
|---|---|---|---|
| Canonical identity | 기간+범위 exact-match | 센터+연월 | Monthly |
| Conflict rule | overlapping period/scope 차단 | 같은 월 중복 생성만 차단 | Monthly |
| DB columns | `period_start`, `period_end`, `scope_type`, `scope_trainer_user_id` 유지 | 제거 또는 파생 전환 | Remove from canonical schema |
| API response period | persisted values | derived values from `settlementYear`/`settlementMonth` | Derived |
| Trainer-specific separation | scope column | detail row / query filter | Detail/query |

## Open Questions

### To Resolve During Implementation

- `period_start` / `period_end` 컬럼을 Phase B에서 즉시 drop할지, 한 릴리즈 동안 deprecated read-only 컬럼으로 남길지?
- `trainer_settlements` bridge를 Phase C에서 제거할지 projection으로 축소할지?
- 프론트 `/settlements`에서 월 선택 결과 옆에 파생 기간(helper text)을 계속 보여줄지?

## Implementation Units

- [x] **Unit 1: Canonical settlement schema를 월 단위 identity로 롤백**

**Goal:** `settlements`를 다시 원본 설계서의 월 정산 헤더로 복구한다.

**Requirements:** R1-R3

**Dependencies:** 없음

**Files:**
- Add: `backend/src/main/resources/db/migration/V37__rollback_settlements_to_monthly_model.sql`
- Modify: `backend/src/main/java/com/gymcrm/settlement/entity/SettlementEntity.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/entity/Settlement.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/repository/SettlementJpaRepository.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/repository/SettlementRepository.java`
- Test: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java`

**Approach:**
- `uk_settlements_center_period`를 복원한다.
- `period_start`, `period_end`, `scope_type`, `scope_trainer_user_id` 의존 쿼리와 entity mapping을 제거한다.
- 기존 period/scope 데이터는 문서의 `Data Normalization Rules`를 만족하는 row만 자동 정규화한다.
- 비정규 row가 발견되면 migration을 실패시키고 수동 정리 대상으로 넘긴다.
- `settlement_details` FK 구조는 유지해 월 헤더 아래 상세 1:N 모델을 명확히 한다.

**Verification:**
- DB에서 같은 `center_id + year + month`의 중복 settlement 생성이 차단된다.
- non-month-full row 또는 trainer scope row가 존재하면 migration이 중단된다.

- [x] **Unit 2: Preview/create/confirm API를 month-based contract로 재정의**

**Goal:** period-based settlement API를 월 단위 contract로 단순화한다.

**Requirements:** R1, R4-R5

**Dependencies:** Unit 1

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/settlement/controller/SettlementController.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/controller/TrainerPayrollSettlementController.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/dto/request/CreateTrainerSettlementRequest.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/dto/request/PreviewTrainerSettlementRequest.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/dto/response/CreateTrainerSettlementResponse.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/dto/response/PreviewTrainerSettlementResponse.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementPreviewService.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementCreationService.java`

**Approach:**
- 요청 contract를 `settlementMonth (YYYY-MM)` 중심으로 되돌린다.
- 응답에 기간 표시가 필요하면 서버가 `periodStart`, `periodEnd`를 파생 계산해 포함한다.
- compatibility layer가 필요하면 month-full period만 허용하는 deprecated parser로 제한한다.
- overlap conflict rule 대신 `Lifecycle Policy`의 월 중복 생성/확정 rule만 유지한다.
- 트레이너 본인 조회도 월 기준으로 다시 정렬한다.

**Verification:**
- preview/create/confirm API가 모두 `settlementMonth` 기준으로 동작하고, 응답 period는 파생값으로만 노출된다.
- compatibility layer가 존재할 경우 월 전체 기간 외 입력은 validation error를 반환한다.

- [x] **Unit 3: Frontend settlements 화면을 월 기준 UX로 복구**

**Goal:** 프론트 정산 화면에서 period-based UX를 제거하고 월 기준 흐름으로 복구한다.

**Requirements:** R4-R5

**Dependencies:** Unit 2

**Files:**
- Modify: `frontend/src/pages/settlements/SettlementsPage.tsx`
- Modify: `frontend/src/pages/settlements/modules/types.ts`
- Modify: `frontend/src/pages/settlements/modules/useTrainerSettlementWorkspaceState.ts`
- Modify: `frontend/src/pages/settlements/modules/useTrainerSettlementPreviewQuery.ts`
- Modify: `frontend/src/api/mockData.ts`
- Test: `frontend/src/pages/settlements/SettlementsPage.test.tsx`
- Test: `frontend/src/pages/settlements/modules/useTrainerSettlementPreviewQuery.test.tsx`

**Approach:**
- 입력 필터를 `settlementMonth` 중심으로 되돌린다.
- 필요 시 화면에는 월 전체 기간을 helper text로만 보여준다.
- `ALL/TRAINER` scope 선택 UI는 제거하고, 트레이너 self-view는 본인 월 preview로 단순화한다.
- mockData와 테스트 계약도 month-based payload로 되돌린다.

**Verification:**
- 운영자와 트레이너 모두 월 단위 정산 흐름을 사용하고, period 입력 필드는 사라진다.
- 파생 기간이 남아 있더라도 read-only helper text일 뿐 입력 source-of-truth는 `settlementMonth`다.

- [x] **Unit 4: 문서와 운영 규칙을 원본 monthly model 기준으로 재정렬**

**Goal:** DB/API 문서와 구현을 다시 같은 모델로 맞춘다.

**Requirements:** R6

**Dependencies:** Unit 1-3

**Files:**
- Modify: `docs/03_데이터베이스_설계서.md`
- Modify: `docs/04_API_설계서.md`
- Modify: `docs/plans/2026-04-10-001-feat-period-based-trainer-settlement-workflow-plan.md`

**Approach:**
- `settlements`를 월 단위 canonical model로 다시 기술한다.
- V36 기반 period/scope 설명은 deprecated 또는 rollback note로 정리한다.
- API 설계서의 period-based settlement preview/create 계약을 monthly contract로 수정한다.

**Verification:**
- DB/API 문서가 현재 구현과 같은 monthly model을 설명한다.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| 기존 period/scope 데이터가 이미 운영 데이터로 존재할 수 있음 | 롤백 migration 전에 데이터 스냅샷과 축약 규칙을 정의한다 |
| 프론트와 백엔드가 동시에 바뀌어 계약 mismatch가 날 수 있음 | API contract 변경과 프론트 전환을 같은 delivery unit에서 처리한다 |
| 문서 출력/조회 bridge가 끊길 수 있음 | monthly PDF/document flow 테스트를 먼저 고정하고 진행한다 |
| 문서가 다시 구현보다 뒤처질 수 있음 | DB/API 문서를 같은 PR에서 갱신한다 |
| deprecated compatibility가 길게 남아 다시 모델을 흐릴 수 있음 | compatibility layer 제거 시점을 후속 Phase C 또는 즉시 제거 정책으로 명시한다 |

## Validation Plan

- 백엔드
  - 월 기준 settlement create/confirm integration test
  - 같은 월 중복 생성 conflict test
  - trainer self-view month preview test
  - 비월말/비월초 period row 존재 시 rollback migration failure test
  - deprecated compatibility 입력이 월 전체 기간만 허용하는지 검증
- 프론트
  - settlements page month filter regression test
  - preview query contract test
  - mock mode month-based create/preview test
  - helper text period가 남더라도 month input이 source-of-truth인지 검증
- 문서
  - DB 설계서 `settlements`, `settlement_details` 섹션
  - API 설계서 settlement endpoints 섹션 동기화

## Sources & References

- Original DB design: `/Users/abc/projects/GymCRM/docs/03_데이터베이스_설계서.md`
- Current DB migration baseline: `backend/src/main/resources/db/migration/V34__add_trainer_settlement_rates_and_canonical_settlements.sql`
- Period/scope expansion to roll back: `backend/src/main/resources/db/migration/V36__convert_settlements_to_period_scope.sql`
- Current period workflow plan to supersede: `docs/plans/2026-04-10-001-feat-period-based-trainer-settlement-workflow-plan.md`
