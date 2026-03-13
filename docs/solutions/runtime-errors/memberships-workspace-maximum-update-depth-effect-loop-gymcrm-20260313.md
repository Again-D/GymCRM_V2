---
module: Gym CRM Admin Portal Frontend
date: 2026-03-13
problem_type: runtime_error
component: frontend
symptoms:
  - "`회원권 업무` 화면 진입 직후 브라우저 콘솔에 `Maximum update depth exceeded` 오류가 반복적으로 누적되었다"
  - "회원 선택 상태가 있는 상태에서 memberships workspace가 무한 렌더 루프에 빠지는 것처럼 보였다"
  - "동일 패턴이 상품 query 쪽 effect 의존성에도 재발할 여지가 있었다"
root_cause: async_timing
resolution_type: code_fix
severity: high
tags: [frontend, react, memberships, effect-loop, callback-stability, workspace]
---

# Troubleshooting: Memberships Workspace `Maximum update depth exceeded` Effect Loop

## Problem

`회원권 업무` 워크스페이스로 진입하면 React가 `Maximum update depth exceeded`를 반복 출력하며 화면이 사실상 무한 업데이트 상태에 빠졌다. 증상은 memberships 화면에서만 먼저 드러났지만, 원인은 page-level `useEffect`가 매 렌더 바뀌는 hook action을 의존하고 있던 구조 자체에 있었다.

## Environment

- Module: Gym CRM Admin Portal Frontend
- Affected Component:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/memberships/MembershipsPage.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/modules/useProductsQuery.ts`
- Date: 2026-03-13

## Symptoms

- memberships workspace 진입 시 콘솔에 `Maximum update depth exceeded`가 연속으로 출력됨
- `selectedMemberId`가 있는 상태에서 memberships page effect가 계속 다시 실행됨
- effect가 `setState`를 유발하는 query loader/reset 함수를 다시 호출해 렌더가 안정화되지 않음
- 제품 query 훅도 동일하게 새 함수 참조를 외부에 노출하고 있어 같은 종류의 회귀 가능성이 존재함

## What Didn't Work

**Attempted Solution 1:** memberships page 자체의 dependency array를 축소하는 방향으로만 의심
- **Why it failed:** page 코드를 보기만 해서는 문제의 본질이 드러나지 않았다. 실제 원인은 page가 아니라 hook이 매 렌더 새 함수를 만들어 effect 의존성을 계속 바꾸고 있었다.

**Attempted Solution 2:** 직전 프론트 안정화 수정이 memberships loop까지 함께 해결됐을 것이라고 가정
- **Why it failed:** 날짜 처리와 mock boundary 정리는 별도 문제였고, memberships query/public action 참조 안정성은 건드리지 않았다.

## Solution

핵심은 memberships/query 훅이 외부에 노출하는 action 함수들의 참조를 안정화하는 것이었다.

### 1) memberships query action을 `useCallback`으로 고정

`MembershipsPage`는 아래 effect에서 query actions를 dependency로 사용하고 있었다.

```tsx
useEffect(() => {
  if (selectedMemberId == null) {
    resetSelectedMemberMembershipsQuery();
    return;
  }
  void loadSelectedMemberMemberships(selectedMemberId);
}, [selectedMemberId, loadSelectedMemberMemberships, resetSelectedMemberMembershipsQuery]);
```

문제는 `useSelectedMemberMembershipsQuery()`가 `loadSelectedMemberMemberships`, `resetSelectedMemberMembershipsQuery`, mutation actions를 매 렌더 새 함수로 만들고 있었다는 점이다. 그래서 effect dependency가 매번 바뀌고, effect가 다시 돌며 state update를 유발했다.

해결 후에는 memberships query actions를 `useCallback`으로 감쌌다.

```tsx
const loadSelectedMemberMemberships = useCallback(async (memberId: number) => {
  // ...
}, [selectedMemberMembershipsVersion]);

const resetSelectedMemberMembershipsQuery = useCallback(() => {
  // ...
}, []);
```

### 2) products query도 같은 패턴으로 정리

`useProductsQuery()` 역시 `loadProducts`가 `getDefaultFilters`의 새 함수 참조를 그대로 dependency로 물고 있어, page에서 inline callback을 넘기면 쉽게 불안정해질 수 있었다.

`useMembersQuery()` 패턴과 맞추기 위해 최신 기본 필터 함수를 ref에 저장하고, loader callback은 version 값에만 반응하게 바꿨다.

```tsx
function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

const getDefaultFiltersRef = useLatestRef(getDefaultFilters);

const loadProducts = useCallback(async (filters?: ProductFilters) => {
  const effectiveFilters = filters ?? getDefaultFiltersRef.current();
  // ...
}, [productsVersion]);
```

### 3) 회귀 방지 테스트 추가

무한 루프는 브라우저 진입 시에야 드러나는 문제가 많아서, hook action 참조가 rerender 간 안정적인지 직접 테스트로 고정했다.

추가한 테스트:

- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.test.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/modules/useProductsQuery.test.tsx`

검증 포인트:

- 동일 hook를 `rerender()` 했을 때 공개 action 함수의 참조가 유지되는지
- 전체 frontend test suite가 계속 통과하는지

## Why This Works

1. **React effect는 함수 identity 변화에도 반응한다**
   - dependency array에 있는 값이 primitive가 아니더라도, 함수 참조가 바뀌면 effect는 다시 실행된다.

2. **memberships page는 “문제의 장소”였고, “문제의 원인”은 hook action 불안정성이었다**
   - page effect 자체는 합리적이었다. 하지만 hook이 매 렌더 새 action을 리턴하니, effect가 사실상 “매 렌더 실행” 상태가 되었다.

3. **state update를 수행하는 effect가 매 렌더 재실행되면 곧바로 update depth 오류로 이어진다**
   - `loadSelectedMemberMemberships()`와 `resetSelectedMemberMembershipsQuery()` 모두 내부에서 state를 바꾸기 때문에, 참조 불안정성은 곧 무한 루프 리스크가 된다.

4. **최신 값은 ref로, 공개 action은 stable callback으로 분리해야 한다**
   - `getDefaultFilters`처럼 외부에서 자주 새로 만들어지는 입력은 ref로 읽고, 외부에 노출되는 action은 `useCallback`으로 고정하는 방식이 effect-safe하다.

## Prevention

- page-level `useEffect`가 hook action을 dependency로 사용할 때는, 그 action이 stable reference인지 먼저 확인한다.
- inline callback props를 받는 query hook은 `useMembersQuery()`처럼 latest-ref 패턴을 우선 고려한다.
- “화면 진입 시만 실행되어야 하는 effect”가 있다면, hook public API가 rerender 간 동일 참조를 유지하는 테스트를 추가한다.
- React console의 `Maximum update depth exceeded`는 page 코드만 보지 말고, dependency에 들어간 custom hook action identity까지 추적한다.
- query/mutation hook를 만들 때는 “외부에 노출되는 함수는 stable, 내부 최신 입력은 ref”를 기본 규칙으로 삼는다.

## Commands run

```bash
cd /Users/abc/projects/GymCRM_V2/frontend
npm test -- useSelectedMemberMembershipsQuery useProductsQuery
npm test
```

## Validation Evidence

- Commit: `55aa6b9` (`fix(frontend): stop memberships page effect loop`)
- Test result: `28 passed, 73 passed`

## Related Issues

- See also: `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
- See also: `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
