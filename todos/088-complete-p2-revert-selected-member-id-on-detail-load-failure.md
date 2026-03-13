---
status: complete
priority: p2
issue_id: "088"
tags: [code-review, frontend, state-ownership, selected-member]
dependencies: []
---

# Problem Statement

`selectedMember` canonical ownership을 `members` 도메인으로 옮겼지만, 상세 조회 실패 시 `selectedMemberId`가 먼저 바뀐 상태로 남습니다. 이 상태는 owner가 downstream consumer를 잘못 깨우는 문제를 만들 수 있습니다.

# Findings

- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useSelectedMemberOwner.ts`
  - `selectMember()`가 API 성공 전에 `selectedMemberId`를 먼저 설정합니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
  - `selectedMemberId` 변경만으로 `loadMemberMemberships(selectedMemberId)`가 실행됩니다.
- 결과적으로 member detail fetch가 실패해도 memberships read는 이미 시작될 수 있고, stale/unauthorized downstream state를 만들 수 있습니다.

# Proposed Solutions

## Option 1
성공 응답 이후에만 `selectedMemberId`와 `selectedMember`를 함께 commit한다.

Pros:
- owner contract가 가장 명확해진다
- 실패 시 downstream read가 아예 시작되지 않는다

Cons:
- 로딩 중에 "pending selected id"가 필요한 UX가 있다면 별도 상태가 필요하다

Effort: Small
Risk: Low

## Option 2
`selectedMemberId`는 먼저 설정하되, 실패 시 이전 값 또는 `null`로 rollback한다.

Pros:
- 현재 로딩 흐름을 덜 흔든다

Cons:
- rollback 분기가 늘고 상태 전이가 더 복잡하다

Effort: Small
Risk: Medium

# Recommended Action

Commit `selectedMemberId` only after member detail load succeeds, and keep the existing stale-response guard in place.

# Technical Details

- Affected files:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useSelectedMemberOwner.ts`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

# Acceptance Criteria

- member detail fetch 실패 시 `selectedMemberId`가 잘못된 새 값으로 남지 않는다
- memberships/reservations downstream reads가 실패한 member selection 때문에 시작되지 않는다
- late response / auth-driven clear 테스트와 충돌하지 않는다

# Work Log

- 2026-03-13: 코드 리뷰 중 selected-member owner가 detail load 실패 전에 `selectedMemberId`를 commit하는 문제 발견
- 2026-03-13: `selectMember()`가 성공 응답 뒤에만 `selectedMemberId`를 publish하도록 수정하고, 실패 회귀 테스트 추가

# Resources

- PR: [#74](https://github.com/Again-D/GymCRM_V2/pull/74)
- Plan: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-main-selected-member-ownership-harvest-plan.md`
