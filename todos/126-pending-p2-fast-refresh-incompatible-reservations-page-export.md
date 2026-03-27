---
status: completed
priority: p2
issue_id: "126"
tags: [code-review, frontend, react, vite, hmr, quality]
dependencies: []
---

# Fix ReservationsPage Fast Refresh export incompatibility

## Problem Statement

프론트 개발 서버에서 `Could not Fast Refresh ("getReservationPanelErrorMessage" export is incompatible)` 경고가 발생한다. 이 문제는 HMR이 해당 모듈을 안전하게 교체하지 못하게 만들어 예약 페이지 수정 시 전체 리로드나 state 손실을 유발할 수 있다.

## Findings

- [ReservationsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx#L35) 가 React component 모듈인데 `getReservationPanelErrorMessage` helper를 named export로 함께 내보내고 있다.
- [ReservationsPage.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.test.tsx#L8) 는 그 helper를 직접 import해서 테스트하고 있다.
- Vite React Fast Refresh는 component module의 export shape가 component-compatible 하다는 가정에 기대는데, 테스트용 helper export가 함께 있으면 `export is incompatible` 경고가 발생할 수 있다.
- 현재 오류 메시지에 표시된 export 이름이 `getReservationPanelErrorMessage`와 정확히 일치해 원인이 명확하다.

## Proposed Solutions

### Option 1: Helper를 별도 유틸 모듈로 분리

**Approach:** `getReservationPanelErrorMessage`를 `frontend/src/pages/reservations/modules/` 아래 별도 파일로 이동하고, 페이지와 테스트가 그 파일을 import하게 한다.

**Pros:**
- Fast Refresh 규칙과 가장 잘 맞는다
- 테스트 대상이 명확해진다
- 페이지 모듈 책임이 단순해진다

**Cons:**
- import 경로가 한 군데 더 생긴다

**Effort:** 15-30분

**Risk:** Low

---

### Option 2: Helper export를 제거하고 페이지 내부로 인라인

**Approach:** helper를 `ReservationsPage.tsx` 내부 private function으로 유지하고, 테스트는 UI 행위 기준으로만 검증한다.

**Pros:**
- export incompatibility를 바로 제거한다
- 페이지 공개 API가 줄어든다

**Cons:**
- 단위 테스트가 간접적이 된다
- 에러 메시지 매핑 로직만 분리해서 검증하기 어려워진다

**Effort:** 15-30분

**Risk:** Low

## Recommended Action

helper를 별도 util 모듈로 분리해 `ReservationsPage.tsx`가 component export만 가지도록 정리한다.

## Technical Details

**Affected files:**
- [ReservationsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx)
- [ReservationsPage.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.test.tsx)

**Related components:**
- Vite React Fast Refresh
- Reservation modal error handling

**Database changes (if any):**
- No

## Resources

- **Error:** `Could not Fast Refresh ("getReservationPanelErrorMessage" export is incompatible)`
- **Related files:** [ReservationsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx), [ReservationsPage.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.test.tsx)

## Acceptance Criteria

- [x] `ReservationsPage.tsx` no longer exports non-component helper symbols that trigger Fast Refresh incompatibility
- [x] Reservation error message behavior remains covered by tests
- [x] Frontend dev server no longer logs the incompatible export warning for `ReservationsPage`

### 2026-03-27 - Resolution

**By:** Codex

**Actions:**
- Moved `getReservationPanelErrorMessage` into a dedicated reservations module utility.
- Updated `ReservationsPage.tsx` to import the helper instead of exporting it.
- Updated the page test to import the helper from the new utility module.

**Outcome:**
- Closed as implemented.

## Work Log

### 2026-03-27 - Initial Discovery

**By:** Codex

**Actions:**
- Traced the Fast Refresh warning string to the `ReservationsPage` module exports.
- Confirmed that a named helper export is shared between the page file and its test.
- Verified that the warning export name matches the current helper symbol exactly.

**Learnings:**
- This is a module-shape issue, not a reservation business logic issue.
- The smallest safe fix is to move the helper out of the page component module.

## Notes

- This does not block production behavior, but it degrades frontend development workflow and should be cleaned up soon.
