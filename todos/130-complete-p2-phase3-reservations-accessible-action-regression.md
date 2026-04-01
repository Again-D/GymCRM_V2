---
status: complete
priority: p2
issue_id: "130"
tags: [code-review, frontend, accessibility, reservations, phase3]
dependencies: []
---

# Restore reservations workbench action contract

## Problem Statement

예약 디렉터리에서 워크벤치로 진입하는 핵심 CTA의 접근 가능한 이름과 문구 계약이 phase3에서 바뀌었다. 기존 자동화와 보조기기 탐색이 깨진다.

## Findings

- [`/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx:509`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx#L509)~[`:521`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx#L521)에서 버튼이 `SolutionOutlined` 아이콘과 함께 렌더링되며 accessible name이 `solution조회 및 고정`으로 계산된다.
- focused test `npx vitest run src/pages/reservations/ReservationsPage.test.tsx`가 기존 계약 버튼을 찾지 못해 실패한다.
- selected-member handoff UX는 유지되어야 하는 workdoc gate와 충돌한다.

## Proposed Solutions

### Option 1: Preserve previous CTA label and hide icon from name

**Approach:** 버튼 문구를 기존 계약으로 복원하고 아이콘이 accessible name에 섞이지 않도록 처리한다.

**Pros:**
- 기존 UX 계약과 테스트를 함께 복원한다.
- 수정 범위가 작다.

**Cons:**
- 디자인 변경 의도가 있었다면 일부 후퇴다.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Update contract intentionally and revise all dependent tests/docs

**Approach:** 새 문구를 유지하되 테스트, 접근성 기준, workdoc parity 판단을 모두 함께 갱신한다.

**Pros:**
- 새 UX 방향을 유지할 수 있다.

**Cons:**
- 실제 parity 유지 요청과 충돌할 가능성이 높다.
- 변경 범위가 커진다.

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

## Technical Details

**Affected files:**
- `frontend/src/pages/reservations/ReservationsPage.tsx`
- `frontend/src/pages/reservations/ReservationsPage.test.tsx`

## Resources

- `cd frontend && npx vitest run src/pages/reservations/ReservationsPage.test.tsx`
- Workdoc phase3 gate: selected member handoff UX 유지

## Acceptance Criteria

- [x] 예약 디렉터리 CTA가 기존 selected-member handoff 계약과 일치한다.
- [x] 버튼 accessible name이 아이콘 이름에 오염되지 않는다.
- [x] `ReservationsPage.test.tsx`의 phase3 시나리오가 다시 통과한다.

## Work Log

### 2026-03-30 - Initial Discovery

**By:** Codex

**Actions:**
- focused vitest로 Reservations phase3 시나리오 실행
- CTA accessible name과 문구 변경 지점 확인

**Learnings:**
- 이번 회귀는 단순 테스트 문자열 변경이 아니라 접근성/자동화 계약 변경이다.

### 2026-03-30 - Implemented

**By:** Codex

**Actions:**
- `ReservationsPage.tsx`에서 예약 디렉터리 CTA를 `선택 후 조회`로 복원하고 관련 아이콘을 제거
- 신규 예약 모달/버튼 카피를 기존 계약에 맞게 되돌리고 PT 안내 문구를 복원
- `ReservationsPage.test.tsx`를 AntD modal/select timing에 맞게 조정하고 focused vitest 재통과 확인

**Learnings:**
- AntD modal leave animation은 role-based disappearance assertion을 불안정하게 만들 수 있어서, 이 경로는 사용자 결과 메시지 기준으로 검증하는 편이 더 견고하다.
