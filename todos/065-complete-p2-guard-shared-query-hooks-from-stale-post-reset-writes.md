---
status: complete
priority: p2
issue_id: "065"
tags: [code-review, frontend, react, auth, query-lifecycle]
dependencies: []
---

# Problem Statement

새로 추출한 shared query hook(`members`, `products`)은 reset helper는 있지만 최신 요청/commit guard가 없어, logout 또는 protected UI reset 직후 늦게 도착한 응답이 비워진 state를 다시 채울 수 있다. 이번 리팩터링의 핵심 목적이 auth reset과 query ownership을 분리하면서도 stale UI를 남기지 않는 것이므로, 이 경계는 구현으로 보강해야 한다.

# Findings

- `frontend/src/features/members/useMembersQuery.ts`는 `loadMembers()`에서 응답이 오면 항상 `setMembers()`/`setMembersLoading(false)`를 수행한다.
- `frontend/src/features/products/useProductsQuery.ts`도 동일하게 late response를 무조건 반영한다.
- `frontend/src/App.tsx`는 인증 직후 preload와 logout/reset 흐름을 소유하지만, `loadMembers()`/`loadProducts()`에는 `shouldCommit` 또는 request-id 보호를 넘기지 않는다.
- 그래서 초기 preload, 수동 reload, 또는 logout 직전 in-flight request가 reset 이후 state를 다시 채울 수 있다.

# Proposed Solutions

## Option 1: Request ID / shouldCommit guard 추가
Pros:
- 현재 workspace loader 패턴과 가장 일관적이다.
- reset 시점 이후 stale write를 직접 차단할 수 있다.
Cons:
- hook 시그니처가 조금 복잡해진다.
Effort: Small
Risk: Low

## Option 2: AbortController 기반 취소 추가
Pros:
- 네트워크 자체를 취소할 수 있다.
Cons:
- 현재 `apiGet` 계층까지 signal 지원을 내려야 해서 범위가 커진다.
Effort: Medium
Risk: Medium

# Recommended Action

# Technical Details

Affected files:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useMembersQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductsQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

# Acceptance Criteria

- [x] `members/products` query hook이 reset 이후 late response를 무시한다.
- [x] logout/protected reset 후 stale list가 다시 나타나지 않는다.
- [x] `npm test`와 `npm run build`가 통과한다.

# Work Log

- 2026-03-09: follow-up review에서 shared query hook stale-write risk 발견.
- 2026-03-09: `members/products` shared query hook에 request-version guard를 추가하고 reset 이후 late response 무시 테스트를 통과시킴.

# Resources

- PR review on branch `codex/refactor-bundle-query-auth-lifecycle`
