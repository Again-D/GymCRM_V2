---
status: complete
priority: p2
issue_id: "121"
tags: [code-review, frontend, backend, reservation, ux]
dependencies: []
---

# Reservation Create Modal Allows Past Schedules

## Problem Statement

예약 관리 화면의 예약 등록 모달이 센터의 전체 스케줄을 그대로 노출하고 있어, 이미 시작했거나 종료된 과거 슬롯도 선택 가능합니다. 하지만 서버는 예약 생성 시 과거 슬롯을 `BUSINESS_RULE`로 거절하므로, 운영자는 화면에서 정상 선택했다고 생각한 뒤 422 에러를 맞게 됩니다.

이 문제는 예약 생성 실패를 화면이 직접 유도하는 형태라서, 예약 등록 플로우의 신뢰도를 떨어뜨립니다.

## Findings

- 프런트는 `/api/v1/reservations/schedules` 응답을 후처리 없이 그대로 저장합니다.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/useReservationSchedulesQuery.ts:17`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/useReservationSchedulesQuery.ts:30`
- 예약 등록 모달은 저장된 스케줄 전체를 그대로 선택지로 렌더링합니다.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx:555`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx:567`
- 백엔드는 예약 생성 시 `schedule.startAt <= now` 인 경우 `과거 슬롯은 예약할 수 없습니다.`로 422를 반환합니다.
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java:349`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java:351`
- 스케줄 목록 API도 미래 슬롯으로 제한하지 않고 센터 전체 스케줄을 반환합니다.
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java:157`

## Proposed Solutions

### Option 1: Future-Only Schedule Contract (Recommended)

**Approach:** `/api/v1/reservations/schedules` 자체를 예약 가능한 미래 슬롯만 반환하도록 제한하고, 프런트는 그 계약을 그대로 사용합니다.

**Pros:**
- 서버/클라이언트 계약이 일치합니다.
- 다른 클라이언트에서도 같은 오류 경로를 제거합니다.
- 예약 가능 슬롯 정의가 한곳에 모입니다.

**Cons:**
- 기존에 전체 스케줄을 기대하는 다른 화면이 있으면 영향 분석이 필요합니다.

**Effort:** Small-Medium

**Risk:** Low

---

### Option 2: Frontend Guard Only

**Approach:** 프런트에서 `startAt > now` 인 슬롯만 드롭다운에 노출하거나, 과거 슬롯을 비활성화합니다.

**Pros:**
- 변경 범위가 작습니다.
- 현재 보고된 화면 버그는 즉시 완화됩니다.

**Cons:**
- API 계약은 여전히 느슨합니다.
- 다른 클라이언트나 우회 경로는 계속 422를 맞습니다.

**Effort:** Small

**Risk:** Low-Medium

## Recommended Action

예약 생성 경로에서 미래 슬롯만 예약 가능하다는 계약을 서버와 프론트에 함께 고정한다. 서버의 `/api/v1/reservations/schedules` 응답을 미래 시작 슬롯으로 제한하고, 프론트 query에서도 같은 조건으로 한 번 더 필터링해 과거 슬롯이 드롭다운에 섞이지 않도록 한다. 관련 API/프론트 테스트를 추가해 회귀를 막는다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/useReservationSchedulesQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java`

## Resources

- **Related plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-feat-phase7-reservation-and-usage-deduction-foundation-plan.md`
- **Related completed todo:** `/Users/abc/projects/GymCRM_V2/todos/022-complete-p3-reservation-form-state-persists-when-switching-member.md`

## Acceptance Criteria

- [x] 예약 등록 모달에서 과거 슬롯을 선택할 수 없다.
- [x] 과거 슬롯 때문에 예약 생성이 422로 실패하는 경로가 재현되지 않는다.
- [x] 관련 테스트가 미래 슬롯만 노출하거나 과거 슬롯을 차단하는 계약을 검증한다.

## Work Log

### 2026-03-27 - Initial Discovery

**By:** Codex

**Actions:**
- 예약 생성 422 제보 기준으로 예약 화면과 생성 API를 대조 검토했다.
- 스케줄 목록이 전체 센터 스케줄을 그대로 내려오고, 프런트가 이를 그대로 선택지로 쓰는 것을 확인했다.
- 서버가 과거 슬롯을 `BUSINESS_RULE` 422로 차단하는 검증과 직접 연결되는 실패 경로를 확인했다.

**Learnings:**
- 현재 버그는 필수값 누락보다 `예약 불가 슬롯을 선택 가능하게 만든 UI 계약 불일치`에 가깝다.
- 서버 가드는 올바르지만, 현재 UX는 그 가드를 자주 밟게 만드는 상태다.

### 2026-03-27 - Fix Implemented

**By:** Codex

**Actions:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java` 에서 예약 스케줄 목록을 미래 시작 슬롯만 반환하도록 제한했다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/useReservationSchedulesQuery.ts` 에서도 과거 슬롯을 제거하는 방어 필터를 추가했다.
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/reservation/ReservationApiIntegrationTest.java` 와 `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/useReservationSchedulesQuery.test.tsx` 에 회귀 테스트를 추가했다.
- `npm test -- --run src/pages/reservations/modules/useReservationSchedulesQuery.test.tsx`
- `./gradlew test --tests 'com.gymcrm.reservation.ReservationApiIntegrationTest.reservationSchedulesOnlyIncludeFutureSlots'`

**Learnings:**
- 예약 생성 화면의 안전성은 생성 API 검증만으로 충분하지 않고, 목록 API 계약도 예약 가능 슬롯 정의와 맞아야 한다.
- 프론트의 보조 필터는 API 계약이 확장되더라도 현재 화면에서 과거 슬롯 회귀를 막는 안전장치로 유효하다.
