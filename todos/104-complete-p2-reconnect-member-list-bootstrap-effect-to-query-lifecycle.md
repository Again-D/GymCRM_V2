---
status: complete
priority: p2
issue_id: "104"
tags: [code-review, frontend, quality, members, query-lifecycle]
dependencies: []
---

# Problem Statement

`MemberListSection`의 초기 member load effect가 빈 의존성 배열에 묶여 있어서, `loadMembers`의 내부 계약이 바뀌어도 다시 실행되지 않습니다. 현재 `loadMembers`는 `authUser`와 query invalidation version에 의존하므로, 이 effect는 members query lifecycle과 분리된 상태입니다.

# Findings

- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx` 는 다음 effect를 사용합니다:
  - `useEffect(() => { void loadMembers(); }, []);`
- 같은 화면의 `loadMembers`는 `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts` 에서 `authUser`, `membersVersion`, `getDefaultFiltersRef`에 의존하는 `useCallback` 입니다.
- 따라서 현재 구현은:
  - auth role/context가 바뀌어도 mount 후 자동 refetch가 연결되지 않고
  - members invalidation version이 바뀌어도 목록이 다시 로드되지 않으며
  - effect dependency 규칙을 의도적으로 우회한 상태가 됩니다.
- 이 패턴은 과거 workspace effect-loop/unstable hook 문제에서 이미 리스크 패턴으로 다뤄진 바 있습니다.

# Proposed Solutions

## Option 1: effect 의존성을 `loadMembers` 로 맞추고 쿼리 훅의 함수 안정성을 그대로 활용

### Pros
- 현재 설계와 가장 잘 맞습니다.
- auth/query invalidation 변화와 초기 load가 같은 계약으로 묶입니다.

### Cons
- mount-only semantics를 바꾸는 영향은 확인해야 합니다.

### Effort
Small

### Risk
Low

## Option 2: 초기 load를 전용 hook로 분리하고 화면에서는 명시적으로 bootstrap semantics를 표현

### Pros
- 의도가 더 분명해집니다.

### Cons
- 지금 문제에 비해 구조 변경이 큽니다.

### Effort
Medium

### Risk
Low

# Recommended Action

`MemberListSection` 의 bootstrap effect가 `loadMembers` reference를 의존성으로 따라가도록 바꿔서, auth/query invalidation lifecycle과 같은 계약을 따르게 한다. 컴포넌트 테스트로 rerender 시 새 `loadMembers`가 다시 호출되는지 확인한다.

# Technical Details

- Affected files:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts`

# Acceptance Criteria

- [x] member list의 초기 load effect가 query lifecycle과 같은 의존성 계약을 따른다.
- [x] auth/context/query invalidation 변화 시 필요한 refetch가 연결된다.
- [x] 관련 테스트가 현재 동작을 보존하거나 기대 동작을 명시한다.

# Work Log

### 2026-03-19 - Review Finding Created

**By:** Codex

**Actions:**
- `MemberListSection`의 초기 load effect와 `useMembersQuery`의 `loadMembers` 의존성을 대조했습니다.
- effect가 빈 dependency 배열로 고정돼 있어 query lifecycle과 분리된 점을 확인했습니다.

**Learnings:**
- 이 파일의 우선순위 높은 리팩터링 포인트는 코드 스타일보다 effect/query 계약 복원입니다.

### 2026-03-19 - Bootstrap Effect Reconnected

**By:** Codex

**Actions:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx` 의 초기 load effect 의존성을 `[]` 에서 `[loadMembers]` 로 변경했습니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.test.tsx` 에서 rerender 시 새로운 `loadMembers` reference가 다시 호출되는지 검증했습니다.

**Learnings:**
- 이 화면은 mount-only effect보다 query hook reference contract를 따르는 쪽이 더 안전합니다.

# Resources

- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts`
