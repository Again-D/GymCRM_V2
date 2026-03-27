---
status: complete
priority: p3
issue_id: "122"
tags: [code-review, frontend, reservation, diagnostics, ux]
dependencies: []
---

# Reservation Create Errors Hide Business Rule Detail

## Problem Statement

예약 생성이 실패하면 서버는 구체적인 사유를 `error.detail`에 담아주지만, 프런트는 상위 `message`만 `Error.message`로 사용합니다. 그 결과 예약 화면에서는 `비즈니스 규칙 위반입니다.` 같은 공통 문구만 보이고, 운영자는 왜 422가 났는지 알 수 없습니다.

실제 원인 분석과 현장 대응이 어려워져 같은 오류를 반복하게 만듭니다.

## Findings

- API 클라이언트는 실패 응답에서 `payload.message`를 예외 메시지로 사용하고 `payload.error.detail`은 보조 필드로만 저장합니다.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/api/client.ts:153`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/api/client.ts:158`
- 예약 생성 화면은 `error.message`만 패널 에러로 표시합니다.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx:198`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx:199`
- 백엔드는 예약 생성 실패에서 구체 사유를 예외 메시지에 담아 내려주며, 과거 슬롯 같은 경우도 세부 문구가 존재합니다.
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/error/GlobalExceptionHandler.java:23`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java:351`

## Proposed Solutions

### Option 1: Prefer Error Detail in UI (Recommended)

**Approach:** 예약 화면에서 `ApiClientError.detail`이 있으면 이를 우선 표시하고, 없을 때만 `message`를 fallback으로 사용합니다.

**Pros:**
- 운영자가 바로 실패 원인을 볼 수 있습니다.
- 예약 외 다른 화면에도 같은 패턴으로 확장하기 쉽습니다.

**Cons:**
- 에러 타입 분기 처리가 조금 늘어납니다.

**Effort:** Small

**Risk:** Low

---

### Option 2: Promote Detail to ApiClientError Message

**Approach:** API 클라이언트에서 실패 시 `payload.error.detail ?? payload.message`를 예외 메시지로 설정합니다.

**Pros:**
- 각 화면 수정 없이 전체 API 에러 UX를 개선할 수 있습니다.

**Cons:**
- 기존에 공통 메시지를 기대하던 화면의 문구가 바뀔 수 있습니다.

**Effort:** Small-Medium

**Risk:** Medium

## Recommended Action

예약 화면에서 `ApiClientError.detail`이 존재하면 이를 패널 에러로 우선 노출하고, detail이 없을 때만 기존 `message` 또는 fallback 문구를 사용한다. 공통 API 클라이언트 계약은 유지해 다른 화면 문구 변화는 피하고, 예약 생성 패널과 관련 테스트만 국소적으로 보강한다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/api/client.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx`

## Resources

- **Related todo:** `/Users/abc/projects/GymCRM_V2/todos/121-complete-p2-reservation-create-modal-allows-past-schedules.md`

## Acceptance Criteria

- [x] 예약 생성 422 발생 시 사용자가 구체 사유를 볼 수 있다.
- [x] `BUSINESS_RULE`과 `VALIDATION_ERROR` 모두 상세 문구가 보존된다.
- [x] 예약 화면 또는 공통 API 클라이언트에 이에 대한 테스트가 추가된다.

## Work Log

### 2026-03-27 - Initial Discovery

**By:** Codex

**Actions:**
- 예약 생성 실패 처리 경로를 API 클라이언트와 예약 화면까지 추적했다.
- 실패 응답의 `detail`이 존재해도 실제 UI는 `message`만 노출하는 점을 확인했다.
- 422 원인 파악을 어렵게 만드는 진단성 결함으로 분류했다.

**Learnings:**
- 현재 화면은 422를 막는 것뿐 아니라, 발생했을 때도 운영자가 즉시 수정 행동을 취할 수 있도록 상세 원인 노출이 필요하다.

### 2026-03-27 - Fix Implemented

**By:** Codex

**Actions:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx` 에 예약 패널용 에러 메시지 해석 함수를 추가해 `ApiClientError.detail`을 우선 노출하도록 변경했다.
- 동일 패널을 사용하는 예약 생성/상태 변경 catch 경로를 같은 해석 함수로 통일했다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.test.tsx` 에 detail 우선 노출과 fallback 동작 테스트를 추가했다.
- `npm test -- --run src/pages/reservations/ReservationsPage.test.tsx`

**Learnings:**
- 공통 API 클라이언트를 바꾸지 않고도 화면 단에서 detail 우선 정책을 적용하면 회귀 범위를 작게 유지할 수 있다.
- 예약 업무처럼 운영자 진단성이 중요한 화면은 공통 메시지보다 서버의 세부 사유를 직접 보여 주는 편이 실효성이 높다.
