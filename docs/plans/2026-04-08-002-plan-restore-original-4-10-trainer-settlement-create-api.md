---
title: "plan: 원본 4.10 트레이너 정산 생성 API 복원 최소안"
type: plan
status: completed
date: 2026-04-08
origin: docs/04_API_설계서.md
---

# plan: 원본 4.10 트레이너 정산 생성 API 복원 최소안

## Overview

현재 정산 모듈은 `GET /api/v1/settlements/trainer-payroll` 조회, `POST /trainer-payroll/confirm` 확정, `GET /trainer-payroll/document` 문서 출력 중심으로 동작한다. 반면 원본 API 설계서의 `4.10 트레이너 정산 생성 API`는 `POST /api/v1/settlements`를 통해 지정 기간 정산을 생성하고, 응답에서 `settlementId`, `trainer`, `period`, `summary`, `calculation`, `status=DRAFT`, `createdAt`를 반환하는 생성형 워크플로우를 전제한다.

이번 계획의 목표는 현재 월간 집계/확정 기능을 깨지 않으면서도, 원본 `4.10`의 생성형 계약을 최소한의 추가 설계로 복원하는 것이다. 이번 조정에서는 `docs/03_데이터베이스_설계서.md`의 정산 마스터/상세 모델과 `uk_settlements_center_period(center_id, settlement_year, settlement_month)` 제약을 그대로 존중한다. 핵심 원칙은 “정산 생성/확정 단위는 center-month batch, 트레이너별 생성은 해당 배치의 detail 추가, 트레이너별 전달은 개별 문서 출력”이며, `/api/v1/settlements/{settlementId}/confirm`를 canonical 상태 전이 endpoint로 삼는다.

## Problem Frame

지금 구현은 운영상 유용하지만, 원본 `4.10`이 기대한 도메인 개념과는 다르다.

- 현재는 “월별 미리보기 집계 -> 확정 스냅샷 저장” 모델이다.
- 원본 `4.10`은 “정산 생성 -> DRAFT 보관 -> CONFIRMED -> PAID” 모델이다.
- 현재 `trainer_settlements` 테이블은 `CONFIRMED` 상태 스냅샷만 저장하도록 설계되어 있고, 기간 범위도 사실상 `settlementMonth` 단일 월 기준이다.
- 반면 DB 설계서는 이미 `settlements`(정산 마스터)와 `settlement_details`(트레이너별 상세) 구조를 정의하고 있으며, `uk_settlements_center_period(center_id, settlement_year, settlement_month)` 제약은 “센터-월 배치 1건” 모델과 자연스럽게 맞는다.
- 현재 응답에는 `summary.totalSessions`, `cancelledSessions`, `noShowSessions`, `gxSessions`, `bonus`, `deduction` 같은 `4.10` 필드가 없다.

따라서 `POST /api/v1/settlements`만 단순 추가하면 끝나지 않는다. 최소한 “DRAFT 정산 리소스”를 저장할 수 있는 persistence와 `4.10` 응답 전용 조립 계층이 필요하며, 그 persistence는 새 임시 테이블보다 DB 설계서의 `settlements` + `settlement_details`를 우선 기준으로 삼는 편이 이후 문서/구현 정합성에 유리하다. 대신 중복 규칙은 “같은 배치 안에 같은 트레이너 detail을 다시 만들 수 없음”으로 해석해야 한다.

## Current vs Target

| 항목 | 현재 구현 | 원본 4.10 목표 | 최소 복원 방향 |
|------|-----------|----------------|----------------|
| 진입점 | `GET /trainer-payroll`, `POST /trainer-payroll/confirm` | `POST /api/v1/settlements` | 생성 API를 additive 로 복원 |
| 기간 모델 | `settlementMonth` | `periodStart`, `periodEnd` | 1차는 “단일 월 범위만 허용”으로 축소 |
| 상태 모델 | 사실상 `CONFIRMED`만 저장 | `DRAFT -> CONFIRMED -> PAID` | 1차부터 `DRAFT -> CONFIRMED -> PAID` 전이 모델을 반영 |
| 저장 구조 | 트레이너별 확정 row snapshot (`trainer_settlements`) | 생성된 정산 리소스 | `settlements` + `settlement_details`를 사용하고 center-month batch 아래 trainer detail을 저장 |
| 응답 구조 | 월별 aggregate result | settlement resource | 단일 트레이너 생성은 batch 재사용 + detail 추가, `trainerId=ALL`은 batch 일괄 detail 생성 |
| 트레이너 권한 | `/settlements` 미니뷰에서 본인 PT 완료 수업 수만 조회 | 명시 없음 | 현행 trainer mini-view 유지, 생성 API는 운영 권한 전용 |
| 문서/PDF | `CONFIRMED` 월 기준 PDF | 생성 리소스와 연결 가능해야 함 | 1차는 기존 PDF 흐름 유지, 2차에 settlementId 연결 |

## Scope Boundaries

- 이번 계획은 “원본 4.10을 바로 완전 재구현”하지 않는다.
- 트레이너 mini-view, 매출 XLSX export, PDF 문서 출력의 최근 정책 변경은 되돌리지 않는다.
- `PAID` 처리 UI, 지급 승인 프로세스, 회계 연동은 이번 최소안에 포함하지 않는다. 다만 상태 값 자체는 1차 모델에 포함한다.
- 현재 `trainer_settlements` 확정 스냅샷 구조를 이번 계획에서 즉시 제거하지 않는다.
- `trainerId` 단일 생성과 `trainerId=ALL` 일괄 생성은 모두 이번 계획 범위에 포함한다.
- 트레이너별 개별 전달이 가능하도록 문서 출력 단위는 trainer detail 기준으로 분리한다.

## Key Decisions

- `POST /api/v1/settlements`는 새 정산 리소스를 만드는 additive endpoint로 복원한다.
  - 기존 `/trainer-payroll` 조회/확정 흐름은 당장 제거하지 않는다.
- 1차 구현은 “월 단위 기간만 허용”한다.
  - `periodStart`는 해당 월 1일, `periodEnd`는 해당 월 말일인 경우만 허용해 현재 월간 집계 로직을 최대 재사용한다.
- `DRAFT` 저장은 실제 persistence를 둔다.
  - 메모리성 preview 응답으로는 `4.10 생성 API`를 복원했다고 보기 어렵고, `settlements` + `settlement_details`를 기반으로 둔다.
- 상태 복원은 `DRAFT`, `CONFIRMED`, `PAID`를 모두 모델에 포함한다.
- center-month 헤더는 센터/월당 1건만 생성한다.
- 동일 배치 안에서는 같은 트레이너 detail을 중복 생성할 수 없다.
  - `trainerId=ALL` 호출도 내부적으로는 “없는 trainer detail만 일괄 생성” 또는 “이미 존재하면 충돌” 중 하나의 명시적 규칙을 둔다.
- 수업 집계는 `COMPLETED` 상태 예약만 대상으로 한다.
- 단가(`Rate`)는 요청 body가 아니라 트레이너 정보에 미리 설정된 값을 사용한다.
- 기존 확정 row 스냅샷(`trainer_settlements`)은 당장 폐기하지 않는다.
  - 안전하게 가려면 canonical batch/detail 리소스를 도입하고, 기존 월간 확정 흐름 및 PDF 출력과 잠시 병행하는 쪽이 낫다.
- 생성 API는 `trainerId` 단일 값과 `ALL`을 모두 지원한다.
- canonical 확정 endpoint는 `/api/v1/settlements/{settlementId}/confirm`로 둔다.
  - 기존 `/trainer-payroll/confirm`는 호환용 bridge로만 유지한다.
- 문서 출력은 center-month batch를 기준으로 하되, 전달 단위는 trainer별 개별 문서로 지원한다.

## Recommended Minimal Architecture

### 1. 생성형 정산 헤더/상세를 DB 설계서 기준으로 도입하고 center-month batch를 canonical로 둔다

DB 설계서의 `settlements`와 `settlement_details`를 실제 migration/엔티티/리포지토리로 구현한다.

`settlements`에는 최소 아래 필드를 둔다.
- `settlement_id`
- `center_id`
- `settlement_year`
- `settlement_month`
- `total_lesson_count`
- `total_amount`
- `status` (`DRAFT`, `CONFIRMED`, `PAID`)
- `settlement_date`
- `confirmed_by`, `confirmed_at`
- audit / soft delete 컬럼

`settlement_details`에는 최소 아래 필드를 둔다.
- `settlement_detail_id`
- `settlement_id`
- `user_id`
- `lesson_type`
- `lesson_count`
- `unit_price`
- `amount`
- `bonus_amount`
- `deduction_amount`
- `net_amount`
- `memo`
- audit 컬럼

추가 정렬:
- `uk_settlements_center_period`는 유지한다.
- 중복 금지는 헤더가 아니라 `settlement_details`에서 같은 배치 안의 같은 트레이너를 다시 만들 수 없도록 설계한다.
- 필요하면 `settlement_details`에 `(settlement_id, user_id, lesson_type)` 또는 trainer 기준 unique 해석을 더 명확히 문서화한다.

이유:
- 현재 `trainer_settlements`는 확정 row 스냅샷 용도라 `4.10`의 생성 리소스 역할을 바로 맡기기엔 제약이 크다.
- DB 설계서는 이미 정산 마스터/상세 구조와 상태 제약을 정의하고 있으므로, 새 임시 배치 테이블보다 해당 구조를 우선 구현하는 편이 문서 정합성과 이후 확장성에 유리하다.

### 2. 상세 집계는 기존 월간 계산 서비스를 재사용하되 비즈니스 규칙 필터를 명시한다

`TrainerPayrollSettlementService`를 기반으로 월간 PT 완료 수업 수와 급여 계산을 가져오고, 이를 `settlement_details` row 및 `4.10` 응답으로 조립한다.

- `completedSessions` = 현재 `completedClassCount`
- `ptSessions` = 현재 `completedClassCount`
- `ptAmount` = 현재 `payrollAmount`
- `ptRatePerSession` = 트레이너 정보에 사전 설정된 `Rate`
- `gxSessions`, `gxAmount`, `bonus`, `deduction` = 1차 구현에서는 `0` 또는 `null`
- `totalSessions`, `cancelledSessions`, `noShowSessions`는 예약 집계 확장이 필요하므로 별도 Query 추가 여부를 1차 결정 포인트로 둔다

필수 규칙:
- 수업 횟수는 `COMPLETED` 예약만 집계한다.
- `CANCELLED`, `NO_SHOW`는 제외한다.
- 단가는 요청값이 아니라 trainer profile/source-of-truth 에서 읽는다.

권장 최소안:
- 1차 구현에서도 `summary` 필드는 내려주되, 현재 데이터 소스로 안정적으로 계산 가능한 값만 채운다.
- 원본 예시와 차이가 생기는 필드는 문서에서 “Phase 1은 PT 기준 우선 복원”이라고 명시한다.
- `settlements.total_lesson_count`, `settlements.total_amount`는 생성 시점에 `settlement_details` 합계로 채워 center-month batch 단위 요약과 상세가 일관되도록 한다.

### 3. 확정 API는 `/api/v1/settlements/{settlementId}/confirm`를 canonical로 연결한다

현재 `POST /trainer-payroll/confirm`는 “월 전체 확정”에 가깝다. 이번 조정에서는 `/api/v1/settlements/{settlementId}/confirm`를 canonical endpoint로 추가하고, 기존 `/trainer-payroll/confirm`는 필요 시 그 endpoint를 감싸는 호환 bridge로만 둔다.

이 방향이 더 명확하다. 그래야 `4.10`에서 만든 리소스가 이후 상태 전이를 가질 수 있다.

추가 정렬:
- `settlements.status`는 canonical state로 사용하고, 기존 `trainer_settlements`는 확정 시점 스냅샷/문서 출력 호환 용도로 유지한다.
- `CONFIRMED` 이후에는 수정 불가 규칙을 lifecycle service에서 강제한다.
- 후속 단계에서 `trainer_settlements`를 `settlement_details` 기반 문서 출력으로 완전히 대체할 수 있도록 mapping 경계를 분리한다.

## Proposed Delivery

### Unit 1. DB 설계서 기준 정산 마스터/상세 골격 추가

**Goal:** `POST /api/v1/settlements`를 받을 수 있는 최소 저장 구조와 상태 모델을 DB 설계서의 `settlements` + `settlement_details` 기준으로 만들고, center-month batch + trainer detail 구조를 고정한다.

**Files:**
- Add: `backend/src/main/resources/db/migration/Vxx__create_settlements_and_settlement_details.sql`
- Add: `backend/src/main/java/com/gymcrm/settlement/entity/Settlement*.java`
- Add: `backend/src/main/java/com/gymcrm/settlement/repository/Settlement*.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/enums/...` 또는 상태 상수 위치

**Notes:**
- `status`는 `DRAFT`, `CONFIRMED`, `PAID`를 포함한다.
- `uk_settlements_center_period`는 유지한다.
- detail 중복 금지는 같은 `settlement_id` 아래 동일 트레이너가 다시 생성되지 않도록 처리한다.
- `trainer_settlements`는 그대로 두고, 새 canonical table과의 브리지 전략을 후속 유닛에서 정한다.
- 최소 테스트 시나리오:
  - 같은 센터/월 헤더는 1건만 생성
  - 같은 배치에서 동일 트레이너 재생성 시 충돌
  - 같은 배치에 서로 다른 트레이너 detail 추가 가능
  - `PAID` 상태 컬럼 저장/조회 가능

### Unit 2. `POST /api/v1/settlements` 생성 API 복원

**Goal:** 원본 `4.10` request/response shape를 최대한 따르되, `trainerId` 단건 생성은 기존 center-month batch를 생성 또는 재사용하고, `trainerId=ALL`은 해당 배치에 모든 트레이너 detail을 일괄 생성하는 endpoint를 추가한다.

**Files:**
- Add: `backend/src/main/java/com/gymcrm/settlement/controller/SettlementController.java` 또는 기존 settlement controller 확장
- Add: `backend/src/main/java/com/gymcrm/settlement/dto/request/CreateTrainerSettlementRequest.java`
- Add: `backend/src/main/java/com/gymcrm/settlement/dto/response/CreateTrainerSettlementResponse.java`
- Add: `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementCreationService.java`
- Modify: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java` 또는 전용 integration test 추가

**Approach:**
- `periodStart`, `periodEnd`가 같은 달 범위인지 검증한다.
- `trainerId`는 단일 trainer ID 또는 `ALL`을 허용한다.
- 기존 월간 payroll 집계를 재사용하되, `COMPLETED` 예약만 반영하도록 집계 조건을 명시한다.
- 단가(`Rate`)는 trainer profile/source-of-truth 에서 읽어 온다.
- 생성 시 center-month `DRAFT` 헤더를 찾거나 만들고, 요청 대상 trainer detail을 추가한다.
- 단건 생성은 같은 배치의 특정 trainer detail 생성 결과를 응답한다.
- `trainerId=ALL`은 같은 배치에 아직 없는 trainer detail을 일괄 생성하는 흐름으로 정의한다.
- 이미 존재하는 trainer detail 재생성은 명시적으로 차단한다. 기본 정책은 `409 Conflict`가 가장 자연스럽다.
- 최소 테스트 시나리오:
  - 단일 trainer 생성 시 헤더 신규 생성 또는 기존 헤더 재사용
  - `trainerId=ALL` 일괄 생성 성공
  - rate 미설정 trainer 처리
  - 잘못된 기간 범위 validation
  - 같은 배치 내 동일 trainer detail 중복 생성 충돌

### Unit 3. 생성형 리소스와 기존 확정 흐름 연결

**Goal:** 생성된 `DRAFT`가 canonical confirm endpoint를 통해 기존 확정 row snapshot 흐름과 이어지도록 만든다.

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/settlement/service/TrainerSettlementLifecycleService.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/repository/TrainerSettlementRepository.java`
- Add/Modify: confirm endpoint/controller
- Modify: PDF document download path if settlementId linkage is needed

**Approach:**
- `/api/v1/settlements/{settlementId}/confirm`를 canonical endpoint로 추가한다.
- 확정 시 `settlements.status`를 `CONFIRMED`로 바꾸고, 동시에 기존 `trainer_settlements` row snapshot 저장 로직을 재사용해 문서/PDF 호환을 유지한다.
- `CONFIRMED` 이후 수정 불가 규칙을 명시적으로 강제한다.
- 문서 출력은 `settlementId` 아래 trainer별 개별 문서 전달이 가능하도록 설계한다.
- 최소 테스트 시나리오:
  - `DRAFT -> CONFIRMED` 전이 성공
  - 이미 `CONFIRMED`인 정산 재확정 차단
  - `CONFIRMED` 이후 detail 추가/수정 요청 차단
  - 존재하지 않는 `settlementId` 처리

### Unit 4. 문서/테스트 동기화

**Goal:** `4.10` 복원 범위를 문서와 테스트에 정확히 반영한다.

**Files:**
- Modify: `docs/04_API_설계서.md`
- Modify: `docs/01_요구사항_분석서.md` if needed
- Modify: `docs/brainstorms/2026-04-03-settlements-analytics-and-trainer-payroll-requirements.md`
- Add/Modify: backend integration tests, repository tests

**Approach:**
- Appendix C에 `POST /api/v1/settlements` 복원 이력을 추가한다.
- `docs/03_데이터베이스_설계서.md`의 `settlements` / `settlement_details` 구조를 이번 구현 기준 canonical schema로 참조하도록 plan/API 문서를 정렬한다.
- “Phase 1은 center-month batch 생성/재사용 + trainer detail 추가 복원”이라는 제한을 문서에 분명히 남긴다.
- `docs/04_API_설계서.md`의 원본 `4.10 트레이너 정산 생성 API` 본문은 최대한 유지한다.
- API 설계서에는 `/api/v1/settlements/{settlementId}/confirm`를 canonical confirm API로 추가한다.
- API 설계서에는 `trainerId=ALL` 처리에 대한 보강 설명을 추가한다.
- API 설계서 본문에는 `settlementId`가 `settlements.settlement_id`에 대응하고, 각 trainer 결과가 `settlement_details`에 대응한다는 연결 설명을 추가한다.
- trainer별 개별 전달이 필요한 운영을 위해 document API는 `settlementId + trainerId` 기준 출력이 가능해야 한다는 점을 문서화한다.
- 기존 `GET /api/v1/settlements/trainer-payroll`, `POST /trainer-payroll/confirm`, `GET /trainer-payroll/document`는 운영용 월간 조회/확정/문서 흐름으로 남기고, 새 `POST /api/v1/settlements`는 생성형 정산 리소스 API라는 점을 구분해 병행 설명한다.

**Technical design:** *(directional guidance, not implementation specification)*

| API 설계서 항목 | 이전 해석 | 조정 후 문서화 방향 |
|---|---|---|
| Request body | `trainerId`, `periodStart`, `periodEnd` | `trainerId`, `periodStart`, `periodEnd` |
| Resource identity | 트레이너별 settlement처럼 보이는 외부 계약 | 내부 persistence는 center-month settlement batch, trainer 결과는 detail |
| Trainer payload | 단일 `trainer` 객체 | 원문 유지, 단 `ALL` 처리 방식은 보강 설명 추가 |
| Summary | 트레이너 1명 기준 요약 | 원문 유지, 단 `ALL` 처리 시 응답 해석은 보강 설명 추가 |
| Calculation | 트레이너 1명 기준 계산 | 원문 유지, 단 `ALL` 처리 시 응답 해석은 보강 설명 추가 |
| Persistence mapping | 미정 또는 batch 신설 가정 | `settlements` + `settlement_details` 그대로 활용 |

## API Shape Recommendation

1차 복원에서는 `docs/04_API_설계서.md`의 원본 `4.10` request/response를 기본 계약으로 유지한다. 다만 구현자가 헷갈릴 수 있는 부분만 보강 설명으로 덧붙인다. 핵심은 외부 API 예시는 trainer 중심으로 보이더라도, 내부 persistence identity는 center-month batch라는 점이다.

```json
{
  "trainerId": "41",
  "periodStart": "2026-04-01",
  "periodEnd": "2026-04-30"
}
```

```json
{
  "success": true,
  "data": {
    "settlementId": 7001,
    "trainer": {
      "trainerId": 41,
      "trainerName": "정트레이너"
    },
    "period": {
      "start": "2026-04-01",
      "end": "2026-04-30"
    },
    "summary": {
      "totalSessions": 12,
      "completedSessions": 12,
      "cancelledSessions": 0,
      "noShowSessions": 0,
      "ptSessions": 12,
      "gxSessions": 0
    },
    "calculation": {
      "totalAmount": 600000,
      "bonus": 0,
      "deduction": 0,
      "netAmount": 600000
    },
    "status": "DRAFT",
    "createdAt": "2026-04-08T14:00:00+09:00"
  },
  "message": "정산이 성공적으로 생성되었습니다.",
  "timestamp": "2026-04-08T14:00:00+09:00"
}
```

보강 설명으로 추가할 내용은 아래 4가지면 충분하다.

1. `trainerId=ALL`은 “해당 센터/월 batch 아래 모든 트레이너 detail을 일괄 생성”한다는 의미다.
2. `settlementId`는 내부적으로 center-month batch identity를 가리키며, 원문 예시의 trainer 중심 식별자는 외부 표현으로 해석한다.
3. `ALL` 호출 시 이미 일부 trainer detail이 존재하는 경우의 처리 정책을 명시한다.
4. 생성된 정산의 확정은 `/api/v1/settlements/{settlementId}/confirm`로 수행하고, trainer별 문서 전달은 `settlementId + trainerId` 기준으로 이어진다.

### 1차 계약 정리 메모

- `trainerId`는 단일 ID 또는 `ALL`을 지원한다.
- 단건 생성 응답은 원문 `trainer` 단일 객체를 유지한다.
- `trainerId=ALL` 응답 shape는 새 계약으로 단정하지 않고, 설명 보강 및 구현 정렬 항목으로 처리한다.
- `settlementId`는 문자열 코드보다 DB PK 또는 별도 public code 중 하나로 일관되게 정해야 하며, 1차에서는 DB PK를 그대로 써도 무방하다.
- `/api/v1/settlements/{settlementId}/confirm`를 canonical state transition API로 둔다.
- document 출력은 `settlementId + trainerId` 조합으로 개별 전달이 가능해야 한다.

## Documentation Alignment Checklist

- `docs/04_API_설계서.md`에 `POST /api/v1/settlements`를 원문 4.10 기준으로 유지하되 `ALL` 해석을 보강한다.
- 원문 4.10의 request/response 예시는 유지한다.
- `trainerId=ALL` 처리 방식과 재시도/중복 처리 규칙을 설명 문장으로 보강한다.
- `/api/v1/settlements/{settlementId}/confirm`를 canonical confirm API로 문서화한다.
- `docs/03_데이터베이스_설계서.md`의 `settlements`, `settlement_details`를 persistence 근거로 참조하고, `uk_settlements_center_period`가 center-month batch identity라는 점을 명시한다.
- `GET /api/v1/settlements/trainer-payroll` 계열 운영 API와 `POST /api/v1/settlements` 생성형 API의 역할 차이를 문서상 분리해 설명한다.
- Appendix C에는 “4.10 생성 API 설명 보강 및 confirm 연결 추가”라고 기록한다.

## Risks

- 현재 `trainer_settlements`가 `CONFIRMED` 전용 제약을 가진 상태라, 무리하게 재사용하면 migration 리스크가 커진다.
- `trainerId=ALL` 처리 방식이 문서상 모호한 상태로 남으면 구현 해석이 갈릴 수 있다.
- detail 중복 금지 규칙을 `settlement_details` 레벨에서 어떻게 고정할지 명확히 하지 않으면 단건 생성/ALL 생성/재시도 흐름에서 구현 차이가 생길 수 있다.
- `summary.totalSessions`, `cancelledSessions`, `noShowSessions`, `gxSessions`를 실제로 맞추려면 reservation/source query 확장이 필요할 수 있다.
- `PAID` 상태를 모델에 포함하더라도 실제 지급 완료 처리 UI/회계 반영은 별도 유닛으로 분리해야 한다.

## Recommendation

가장 안전한 최소 구현 순서는 아래와 같다.

1. DB 설계서 기준 `settlements` + `settlement_details`를 실제 canonical persistence로 먼저 도입한다.
2. `uk_settlements_center_period`를 유지한 채 center-month batch identity를 구현에 고정한다.
3. detail 중복 금지와 `trainerId=ALL` 재시도 정책을 `settlement_details` 기준으로 명확히 정한다.
4. `POST /api/v1/settlements`를 원문 4.10 계약 기준으로 복원하고, `trainerId=ALL` 처리 해석을 구현과 문서에서 함께 정렬한다.
5. `/api/v1/settlements/{settlementId}/confirm`를 canonical confirm endpoint로 추가하고, 기존 `/trainer-payroll/confirm`는 bridge로만 유지한다.
6. trainer별 개별 전달이 필요하므로 document 출력은 `settlementId + trainerId` 기준 확장 여부를 구현 단계에서 구체화한다.
7. `PAID` UI는 다음 단계로 분리한다.

이렇게 가면 현재 동작 중인 정산 화면과 문서/PDF 흐름을 흔들지 않으면서도, 원본 `4.10` 계약과 이번에 확정한 운영 해석을 함께 복원할 수 있다. 핵심은 `settlements`는 batch, `settlement_details`는 trainer 결과, document 전달은 trainer별이라는 세 층을 명확히 나누는 것이다.
