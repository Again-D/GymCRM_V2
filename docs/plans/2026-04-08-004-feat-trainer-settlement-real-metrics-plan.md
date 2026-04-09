---
title: feat: Add real trainer settlement metrics
type: feat
status: completed
date: 2026-04-08
---

# feat: Add real trainer settlement metrics

## Overview

현재 생성형 정산 응답은 `completed PT`만 실제 집계하고, `cancelledSessions`, `noShowSessions`, `gxSessions`, `gxRatePerSession`, `gxAmount`, `bonus`, `deduction`는 `0` 또는 `null` placeholder다. 이 계획은 정산 source repository와 계산 규칙을 확장해, 원본 4.10 계약에 더 가까운 실집계 응답을 만드는 구현 방향을 정리한다.

## Problem Frame

새 생성형 정산 API는 canonical persistence는 갖췄지만, 정산 수치 자체는 아직 PT 완료 횟수 중심의 1차 버전이다. 그래서 응답 schema는 풍부해 보이지만 실제 데이터는 비어 있고, 이후 문서 출력이나 운영 검증에서 “왜 숫자가 0인가”라는 혼란이 생길 수 있다.

문제를 풀려면 단순히 필드에 숫자를 채우는 수준이 아니라, 어떤 이벤트를 어떤 기간 기준으로 어떤 trainer에게 귀속할지 정산 정책을 먼저 명확히 해야 한다. 특히 cancellation/no-show는 reservation lifecycle semantics를 따라야 하고, bonus/deduction은 아직 데이터 source가 없으므로 정책적 보수성이 필요하다.

## Requirements Trace

- R1. `cancelledSessions`, `noShowSessions`, `gxSessions`는 실제 reservation/schedule data를 기반으로 집계되어야 한다.
- R2. `gxRatePerSession`와 `gxAmount`는 trainer의 GX 단가와 실제 GX 집계를 연결해 계산되어야 한다.
- R3. bonus/deduction은 데이터 source가 없는 경우 명시적으로 정책을 정하고, 추후 확장 가능한 구조로 저장/응답되어야 한다.
- R4. 전체 trainer batch(`trainerId=ALL`)와 단일 trainer 생성 모두 같은 집계 규칙을 공유해야 한다.
- R5. API 문서, 테스트, 향후 PDF 출력에서 사용할 수 있도록 calculation semantics가 명확해야 한다.

## Scope Boundaries

- bonus/deduction의 운영 UI나 수동 입력 워크플로우는 이번 계획 범위에 포함하지 않는다.
- 지급 완료(`PAID`)나 회계 시스템 연동은 다루지 않는다.
- reservation lifecycle 자체를 다시 설계하지 않는다. 기존 상태 전이 semantics를 정산 source로 재사용한다.

## Context & Research

### Relevant Code and Patterns

- `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementCreationService.java`
  응답 필드는 이미 준비돼 있고, 현재 PT completed 기준으로만 값을 채운다.
- `backend/src/main/java/com/gymcrm/settlement/repository/TrainerSettlementSourceRepository.java`
  현재 `findCompletedPtSources(...)` 하나만 있어 source aggregation 확장의 1차 후보 지점이다.
- `backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java`
  `CANCELLED`, `COMPLETED`, `NO_SHOW` 전이 시점과 timestamp semantics를 정의한다.
- `backend/src/main/java/com/gymcrm/reservation/repository/ReservationRepository.java`
  `cancelled_at`, `completed_at`, `no_show_at` 컬럼을 상태 전이와 함께 유지한다.
- `backend/src/main/java/com/gymcrm/reservation/gx/service/GxScheduleService.java`
  GX는 `trainer_schedules.schedule_type = 'GX'`와 예외/대체 trainer 흐름이 존재해 trainer 귀속 규칙에 영향이 있다.
- `backend/src/main/java/com/gymcrm/common/auth/entity/AuthUserEntity.java`
  `pt_session_unit_price`, `gx_session_unit_price`가 trainer rate source다.

### Institutional Learnings

- `docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`
  no-show와 completed는 서로 대체 불가능한 lifecycle 상태이며, timestamp/transition semantics를 source-of-truth로 삼아야 한다.
- `docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
  reservation 상태는 운영 정책과 강하게 연결되므로 집계도 동일한 lifecycle 의미를 따라야 drift가 생기지 않는다.
- `docs/solutions/database-issues/pt-availability-based-reservation-integrity-gymcrm-20260327.md`
  PT와 GX는 schedule 생성 방식이 다르지만 결국 concrete `trainer_schedules + reservations`에 귀결된다는 점이 집계 공통화의 근거다.

### External References

- 없음. 현재 repo 내부 lifecycle 규칙이 source-of-truth다.

## Key Technical Decisions

- PT/GX/취소/노쇼는 각각 별도 집계 count로 source repository에서 계산하되, 기간 판단은 해당 상태의 event timestamp(`completed_at`, `cancelled_at`, `no_show_at`)를 따른다.
  상태 전이 시점 기준이 정산 의미와 가장 잘 맞는다.
- trainer 귀속은 항상 `trainer_schedules.trainer_user_id`를 따른다.
  reservation 단독 row보다 concrete schedule row가 운영상 담당 트레이너의 canonical source다.
- `TrainerSettlementSourceRepository`는 “completed PT 단일 query”에서 “trainer별 settlement metrics aggregate”를 반환하는 구조로 확장한다.
  service가 raw reservation semantics를 다시 조합하지 않도록 repository에서 집계 책임을 갖게 한다.
- bonus/deduction은 1차에서 자동 집계 source가 없으므로 기본값 0을 유지하되, canonical `settlement_details`에는 field를 계속 저장하고 service/repository 구조를 이후 수동 입력 확장에 맞게 열어둔다.
  억지로 가짜 source를 만들지 않는다.

## Open Questions

### Resolved During Planning

- Q. cancelled/no-show는 어떤 날짜 기준으로 월 집계할까?
  A. 각 상태의 전이 timestamp(`cancelled_at`, `no_show_at`) 기준으로 집계한다.
- Q. GX 집계는 별도 테이블이 필요한가?
  A. 아니다. 기존 `trainer_schedules.schedule_type = 'GX'`와 reservation 상태 컬럼만으로 1차 집계가 가능하다.
- Q. bonus/deduction도 이번에 실집계해야 하나?
  A. 아니오. source가 없으므로 0 유지가 더 정직하다. 대신 이후 수동 입력/정책 확장을 위한 field 보존과 문서 명시가 필요하다.

### Deferred to Implementation

- Q. GX amount는 `completed GX`만 반영할지, 참석/확정 정책을 별도로 둘지?
  A. 구현 시 existing business expectation을 확인해 finalize하되, 기본값은 completed-only가 가장 일관적이다.
- Q. cancellation/no-show를 amount calculation에 직접 반영할지, summary only로 둘지?
  A. 1차 구현은 summary count로만 노출하고 amount는 PT/GX completed 기준 유지하는 것이 안전하다. 구현 시 문서와 응답 예시를 함께 맞춘다.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

| Metric | Source rows | Period field | Trainer attribution | Affects amount |
|---|---|---|---|---|
| `completedSessions` / `ptSessions` | PT reservations with `reservation_status = COMPLETED` | `completed_at` | `trainer_schedules.trainer_user_id` | Yes |
| `gxSessions` | GX reservations with `reservation_status = COMPLETED` | `completed_at` | `trainer_schedules.trainer_user_id` | Yes |
| `cancelledSessions` | reservations with `reservation_status = CANCELLED` | `cancelled_at` | `trainer_schedules.trainer_user_id` | No |
| `noShowSessions` | reservations with `reservation_status = NO_SHOW` | `no_show_at` | `trainer_schedules.trainer_user_id` | No |
| `bonus` / `deduction` | manual or future policy source | N/A | canonical detail row | Not in 1차 자동집계 |

## Implementation Units

- [x] **Unit 1: Define settlement metric policy and API semantics**

**Goal:** placeholder 필드들의 의미와 집계 규칙을 문서/서비스 경계에서 확정한다.

**Requirements:** R1, R2, R3, R5

**Dependencies:** 없음

**Files:**
- Modify: `docs/04_API_설계서.md`
- Modify: `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementCreationService.java`
- Test: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java`

**Approach:**
- 각 count와 amount가 어떤 lifecycle event를 기준으로 계산되는지 문서와 코드 주석/DTO mapping에 명확히 남긴다.
- `bonus/deduction`는 “source 없음 -> 0 유지”를 명시적 정책으로 기록한다.

**Patterns to follow:**
- `backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java`
- `docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`

**Test scenarios:**
- Happy path: 생성 응답이 completed/cancelled/no-show/gx count semantics를 문서와 동일하게 노출한다.
- Error path: source timestamp가 없는 상태는 해당 metric에 잘못 집계되지 않는다.
- Unchanged invariant: bonus/deduction이 source 부재 시 0/null 정책을 유지한다.

**Verification:**
- 문서와 테스트에서 각 metric 의미가 모호하지 않게 표현된다.

- [x] **Unit 2: Expand source repository to aggregate real trainer metrics**

**Goal:** trainer별 completed PT 외에 GX/cancelled/no-show metrics와 GX rate source를 함께 읽는 repository 경로를 만든다.

**Requirements:** R1, R2, R4

**Dependencies:** Unit 1

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/settlement/repository/TrainerSettlementSourceRepository.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementCreationService.java`
- Test: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java`

**Approach:**
- 기존 `findCompletedPtSources(...)`를 대체하거나 보완해, trainer별 aggregate row가 `ptCompleted`, `gxCompleted`, `cancelled`, `noShow`, `ptRate`, `gxRate`를 반환하도록 만든다.
- query는 `reservations + trainer_schedules + users` 조합을 유지하고, 상태별 timestamp 조건을 분리해서 중복 집계를 피한다.
- `ALL`과 단일 trainer 모두 같은 aggregate row 타입을 재사용한다.

**Execution note:** Start with a failing integration test that proves non-PT metrics are no longer always zero.

**Patterns to follow:**
- `backend/src/main/java/com/gymcrm/settlement/repository/TrainerSettlementSourceRepository.java`
- `backend/src/main/java/com/gymcrm/settlement/repository/TrainerPayrollSettlementRepository.java`

**Test scenarios:**
- Happy path: completed PT와 completed GX가 같은 trainer에 각각 올바르게 집계된다.
- Edge case: trainer별로 PT rate만 있고 GX rate가 없을 때 GX amount 계산 정책이 명확히 적용된다.
- Edge case: `trainerId=ALL` 요청 시 여러 trainer aggregate가 stable ordering으로 반환된다.
- Error path: 단가가 필요한 lesson type에 rate가 없으면 business rule 오류가 발생한다.
- Integration: reservation 상태 전이를 실제로 발생시킨 뒤 aggregate query가 completed/cancelled/no-show를 구분해 읽는다.

**Verification:**
- source repository가 단일 aggregate row에서 필요한 metrics와 rates를 모두 반환한다.

- [x] **Unit 3: Update canonical detail creation and response mapping**

**Goal:** canonical `settlement_details` 생성과 API 응답이 실집계 metrics를 반영하도록 바꾼다.

**Requirements:** R1, R2, R3, R4

**Dependencies:** Unit 2

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementCreationService.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/dto/response/CreateTrainerSettlementResponse.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/repository/SettlementDetailRepository.java`
- Test: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java`

**Approach:**
- PT amount와 GX amount를 분리 계산하고 total/net amount에 반영한다.
- canonical detail row는 1차에서는 lesson type별 row(PT/GX) 전략 또는 single trainer aggregate row 전략 중 현재 schema에 더 맞는 방향으로 정한다.
- `cancelled/noShow`는 summary-only metric으로 response에 반영하되, amount에는 직접 넣지 않는다.
- `bonus/deduction`는 canonical detail schema field를 유지하면서 기본값 0을 명시적으로 넣는다.

**Patterns to follow:**
- `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementCreationService.java`
- `backend/src/main/java/com/gymcrm/settlement/repository/SettlementDetailRepository.java`

**Test scenarios:**
- Happy path: 단일 trainer 생성 응답에 `gxSessions`, `gxRatePerSession`, `gxAmount`가 실제 값으로 채워진다.
- Happy path: `cancelledSessions`와 `noShowSessions`가 실제 reservation lifecycle 결과를 반영한다.
- Edge case: GX가 없는 trainer는 GX metrics가 0으로 남는다.
- Edge case: PT/GX 혼합 trainer의 totalAmount는 `ptAmount + gxAmount + bonus - deduction`과 일치한다.
- Integration: confirm 전 canonical detail과 생성 응답의 값이 일치한다.

**Verification:**
- 생성 응답의 placeholder 값들이 실제 source data로 대체되고, 계산식이 테스트로 고정된다.

- [x] **Unit 4: Align downstream consumers and document the remaining manual fields**

**Goal:** confirm/document/downstream consumer가 새 metrics 의미를 받아들이도록 정렬하고, 남은 manual fields를 명확히 남긴다.

**Requirements:** R3, R5

**Dependencies:** Unit 3

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementLifecycleService.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/controller/TrainerPayrollSettlementController.java`
- Modify: `docs/04_API_설계서.md`
- Test: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java`

**Approach:**
- confirm 시 legacy `trainer_settlements` bridge 저장이 여전히 PT-centric라면, 어떤 metric만 bridge되고 어떤 metric은 canonical-only인지 명확히 정한다.
- 이후 문서 출력 plan과 충돌하지 않도록 canonical fields를 downstream service가 읽을 수 있는 방향으로 정리한다.
- `bonus/deduction`가 아직 manual placeholder라는 점을 API 설계서 구현 메모에 명확히 남긴다.

**Patterns to follow:**
- `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementLifecycleService.java`
- `docs/04_API_설계서.md`

**Test scenarios:**
- Integration: 생성 -> 확정 흐름 후에도 calculated totals가 손실 없이 유지된다.
- Unchanged invariant: 기존 trainer-payroll 월간 운영 집계는 현재 호환 범위 내에서 계속 동작한다.
- Documentation: API 설계서 구현 보강 메모가 실제 구현 상태와 일치한다.

**Verification:**
- canonical metrics와 downstream confirm/document 흐름의 의미가 충돌하지 않고 문서에 남는다.

## System-Wide Impact

- **Interaction graph:** reservation lifecycle(`cancel`, `complete`, `no-show`)가 settlement source repository의 직접 입력이 된다.
- **Error propagation:** rate 누락, aggregate query mismatch, lesson type 해석 오류는 생성 API에서 business rule 또는 validation 오류로 surface되어야 한다.
- **State lifecycle risks:** 같은 reservation을 여러 metric에 중복 집계하면 정산 숫자가 부풀 수 있다. 상태별 timestamp와 mutually-exclusive status 조건이 중요하다.
- **API surface parity:** 생성 응답, confirm flow, 이후 문서 출력이 같은 metric semantics를 공유해야 한다.
- **Integration coverage:** reservation 상태 전이를 실제로 만든 뒤 settlement 생성 응답을 검증하는 통합 테스트가 필요하다.
- **Unchanged invariants:** reservation lifecycle 자체의 규칙과 count membership usage deduction semantics는 바꾸지 않는다.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 상태별 timestamp 기준이 잘못되면 월 경계 집계가 어긋남 | 각 metric의 기간 기준을 문서화하고 월 경계 integration test 추가 |
| GX 예외/대체 trainer 처리에서 귀속이 흔들릴 수 있음 | trainer attribution source를 `trainer_schedules.trainer_user_id`로 고정 |
| bonus/deduction source가 없는데 억지 집계를 추가할 위험 | 1차에서는 0 유지 정책을 명시하고 future extension point만 남김 |

## Documentation / Operational Notes

- `docs/04_API_설계서.md` 4.10 구현 메모에서 placeholder 설명을 실제 구현 상태로 갱신한다.
- 후속 문서 출력 plan에서 canonical trainer document에 어떤 fields를 노출할지 이 metric semantics를 재사용한다.

## Sources & References

- API reference: `docs/04_API_설계서.md`
- Related code: `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementCreationService.java`
- Related code: `backend/src/main/java/com/gymcrm/settlement/repository/TrainerSettlementSourceRepository.java`
- Related code: `backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java`
- Related code: `backend/src/main/java/com/gymcrm/reservation/repository/ReservationRepository.java`
- Related code: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java`
- Institutional learning: `docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`
- Institutional learning: `docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
