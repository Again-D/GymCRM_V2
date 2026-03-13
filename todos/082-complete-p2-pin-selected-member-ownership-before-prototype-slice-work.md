---
status: pending
priority: p2
issue_id: 082
tags: [code-review, architecture, frontend, state, routing]
dependencies: []
---

# Problem Statement

플랜이 `members` prototype slice와 `memberships/reservations` prototype slice를 core vertical slices로 잡았지만, rebuilt app에서 `selectedMember` 컨텍스트의 canonical owner를 아직 고정하지 않았다. 이 앱에서 가장 복잡한 흐름이 member-context handoff인데, prototype 단계에서부터 source of truth가 모호하면 page-first 구조에서도 다시 coordinator drift가 생길 수 있다.

## Findings

- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md:145`는 selected member workflows를 parity rule로 언급하지만, rebuilt app의 canonical owner는 정하지 않는다.
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md:184`는 `selected member loading contract 정의`라고 적지만, 그 contract의 주체가 app shell인지 members page인지 page support module인지가 없다.
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md:200`의 memberships/reservations prototype는 member-context handoff에 의존하므로, owner를 미리 못 박지 않으면 prototype마다 다른 방식이 섞일 수 있다.

## Proposed Solutions

### Option 1: App-shell selected member ownership 유지
rebuilt app에서도 top-level shell이 `selectedMemberId/selectedMember`를 canonical source로 유지하고, pages는 읽기/변경 인터페이스만 사용한다.

**Pros**
- 현재 앱과 개념적 연속성이 있다.
- memberships/reservations handoff가 단순하다.

**Cons**
- rebuild의 핵심 목표인 coordinator 축소 효과가 약해질 수 있다.

**Effort**: Small  
**Risk**: Medium

### Option 2: Members domain store/page-support module ownership
`members` domain module이 selected member canonical source를 갖고, app shell은 route + providers만 담당한다. memberships/reservations는 그 module을 통해 읽는다.

**Pros**
- coordinator 축소 방향과 더 잘 맞는다.
- member-context ownership이 도메인 중심으로 정리된다.

**Cons**
- 초기 prototype 설계가 더 필요하다.
- reset contract를 다시 정의해야 한다.

**Effort**: Medium  
**Risk**: Medium

### Option 3: Route query param source of truth
prototype부터 `memberId`를 route query로 canonical source로 삼는다.

**Pros**
- deep link 복원성이 좋다.
- URL과 상태가 맞는다.

**Cons**
- 현재 rebuild plan scope를 넓힌다.
- prototype-first 단계에선 과하다.

**Effort**: Medium-Large  
**Risk**: High

## Recommended Action


## Technical Details

- Affected file: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
- Risk area: state ownership, reset behavior, memberships/reservations member-context handoff

## Acceptance Criteria

- [ ] rebuilt prototype에서 `selectedMember`의 canonical owner가 문서로 고정된다.
- [ ] members -> memberships/reservations handoff contract가 owner 기준으로 설명된다.
- [ ] full reload, section navigation, invalid member-context reset behavior가 owner 모델과 함께 정리된다.

## Work Log

- 2026-03-12: prototype-first rebuild plan review 중 selected member ownership ambiguity를 finding으로 기록.

## Resources

- Plan: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
