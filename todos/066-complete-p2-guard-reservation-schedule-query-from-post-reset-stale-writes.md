---
status: complete
priority: p2
issue_id: "066"
tags: [code-review, frontend, react, reservations, query-lifecycle]
dependencies: []
---

# Problem Statement

`reservation schedules` query는 별도 hook으로 추출됐지만, 초기 preload 경로에서 `shouldCommit` 없이 호출되고 reset/invalidate용 request guard도 없다. 그래서 auth reset이나 logout 직전에 시작된 `/reservations/schedules` 응답이 늦게 도착하면 비워진 예약 워크스페이스를 다시 채울 수 있다.

# Findings

- `frontend/src/features/reservations/useReservationSchedulesQuery.ts`는 `loadReservationSchedules()`가 응답 도착 시 항상 state를 반영한다.
- `frontend/src/App.tsx`는 인증 후 preload에서 `void loadReservationSchedules()`를 직접 호출한다.
- `clearProtectedUiState()`는 `resetReservationSchedulesQuery()`를 호출하지만, in-flight request를 무효화하지 않는다.

# Proposed Solutions

## Option 1: members/products와 같은 request-version guard 추가
Pros:
- 현재 패턴과 일관적이다.
- reset 후 stale write를 직접 차단한다.
Cons:
- hook 내부 로직이 조금 늘어난다.
Effort: Small
Risk: Low

## Option 2: preload 호출에도 explicit `shouldCommit` 계약 부여
Pros:
- existing workspace loader guard 패턴을 활용할 수 있다.
Cons:
- preload 경로와 reset coordinator 사이의 연결이 더 복잡해진다.
Effort: Small
Risk: Medium

# Recommended Action

# Technical Details

Affected files:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/useReservationSchedulesQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

# Acceptance Criteria

- [x] reset/logout 이후 late reservation schedule response가 state를 다시 채우지 않는다.
- [x] 예약 direct-entry / workspace 진입은 기존처럼 동작한다.
- [x] `npm test`와 `npm run build`가 통과한다.

# Work Log

- 2026-03-09: PR 61 재리뷰에서 reservation schedule preload stale-write risk 발견.
- 2026-03-09: reservation schedule query에 request-version guard와 reset 이후 late response 무시 테스트를 추가함.

# Resources

- PR #61 review
