---
module: Gym CRM Members Query Contract
date: 2026-03-20
problem_type: integration_issue
component: development_workflow
symptoms:
  - "`MemberListSection`에 `회원상태` 필터가 보이지만 `활성` 또는 `비활성`을 선택해도 회원 목록 결과가 바뀌지 않았다"
  - "같은 화면에서 `초기화`를 눌러도 새로 추가된 `memberStatus` 값은 다른 필터와 함께 리셋되지 않았다"
  - "mock mode와 live mode 모두에서 `memberStatus`가 실제 query contract에 연결되지 않아 필터가 dead control처럼 동작했다"
root_cause: scope_issue
resolution_type: code_fix
severity: medium
tags: [members, filters, query-contract, frontend, backend, mock-parity, reset-state]
---

# Troubleshooting: Member Status Filter Visible in UI but Not Affecting Results

## Problem

회원관리 화면의 [`MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) 에 `회원상태` 필터를 추가했지만, 실제 회원 목록 조회에는 반영되지 않았다. 화면에서는 새 필터가 존재했지만, query 타입, request serialization, mock filtering, backend endpoint, reset 흐름까지 이어지는 계약이 비어 있었다.

## Environment

- Module: Gym CRM Members Query Contract
- Affected Component:
  - [/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
  - [/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts)
  - [/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.ts](/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.ts)
  - [/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java)
  - [/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java)
- Date: 2026-03-20

## Symptoms

- `회원상태` select를 `활성` 또는 `비활성`으로 바꿔도 목록 결과가 그대로 유지됨
- `초기화` 버튼이 다른 필터는 비우지만 새 `memberStatus`는 명시적으로 reset payload에 포함하지 않음
- prototype mock mode에서도 `/api/v1/members?memberStatus=...`가 동작하지 않아 로컬 검증에서 같은 문제가 재현됨
- backend `GET /api/v1/members`가 `memberStatus` request param을 받지 않아 live mode 역시 필터를 적용할 수 없음

## What Didn't Work

**Attempted Solution 1:** UI에 `memberStatus` local state와 select만 추가
- **Why it failed:** 목록 조회는 [`useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts) 의 typed filter contract와 request serialization을 통해 움직이기 때문에, UI state만 추가해서는 아무 효과가 없다.

**Attempted Solution 2:** members 화면만 보면 문제일 것이라고 가정
- **Why it failed:** 실제 문제는 `MemberListSection` 하나가 아니라 shared `MemberQueryFilters`, mock filtering, backend list endpoint, repository predicate까지 이어지는 다층 계약 누락이었다.

**Attempted Solution 3:** members 쪽만 고치면 끝날 것이라고 가정
- **Why it failed:** `MemberQueryFilters`가 확장되면 [`AccessPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx), [`LockersPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx), [`MemberContextFallback.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/MemberContextFallback.tsx) 같은 다른 consumers도 기본값을 함께 맞춰야 frontend build가 다시 green이 된다.

## Solution

해결은 `memberStatus`를 **UI state에서 backend query predicate까지 end-to-end로 운반**하는 것이었다.

### 1) Frontend query contract 확장

[`MemberQueryFilters`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts) 에 `memberStatus`를 추가하고, [`MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) 에서 기본 필터, pagination reset dependencies, reset payload를 모두 갱신했다.

```ts
type MemberQueryFilters = {
  name: string;
  phone: string;
  memberStatus: string;
  membershipOperationalStatus: string;
  dateFrom: string;
  dateTo: string;
};
```

```ts
getDefaultFilters: () => ({
  name,
  phone,
  memberStatus,
  membershipOperationalStatus,
  dateFrom: dateFilter.dateFrom,
  dateTo: dateFilter.dateTo
})
```

### 2) Query serialization과 mock parity 추가

[`useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts) 에서 `memberStatus`를 query string에 포함시키고, [`mockData.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.ts) 의 `/api/v1/members` mock filtering도 같은 필드를 기준으로 동작하게 맞췄다.

```ts
const memberStatus = filters?.memberStatus ?? defaults.memberStatus;
if (memberStatus.trim()) params.set("memberStatus", memberStatus.trim());
```

### 3) Live endpoint와 repository predicate 연결

backend는 [`MemberController.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java) 에 optional `memberStatus` request param을 추가하고, [`MemberService.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java) 에서 값을 normalize/validate한 뒤 [`MemberRepository.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java), [`MemberQueryRepository.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java) 로 전달했다.

최종 query는 `member_status`에 `equalsIgnoreCase` predicate를 붙여 `ACTIVE`와 `INACTIVE`를 직접 필터링한다.

```java
@RequestParam(required = false) String memberStatus
```

```java
equalsIgnoreCase(memberEntity.memberStatus, memberStatus)
```

### 4) Auxiliary consumers와 테스트 갱신

공유 타입이 바뀌었기 때문에 [`AccessPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx), [`LockersPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx), [`MemberContextFallback.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/MemberContextFallback.tsx) 도 `memberStatus: ""` 기본값을 추가했다.

회귀 방지는 다음에 추가했다.

- [/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.test.tsx)
- [/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.test.tsx)
- [/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.test.ts](/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.test.ts)
- [/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java)

## Why This Works

문제의 본질은 “필터 UI가 없다”가 아니라 “필터 contract가 중간에서 끊겼다”였다.

1. 회원 목록은 local state가 아니라 typed filter object와 request serialization을 통해 조회된다.
2. prototype mode는 제품 일부가 아니라 동일한 operator flow의 일부이므로, mock filtering도 live semantics와 맞아야 한다.
3. backend controller, service, repository 중 어느 한 계층이라도 `memberStatus`를 모르면 UI에서 새 필터를 추가해도 결과 집합은 바뀌지 않는다.
4. reset 흐름과 auxiliary consumers까지 함께 갱신해야, 새 shared filter field가 build/runtime 수준에서 완전한 계약이 된다.

즉, 이 수정은 단순 화면 수정이 아니라 `memberStatus`라는 새 필드를 members query pipeline 전체에 등록한 작업이다.

## Prevention

- 새 목록 필터를 추가할 때는 UI 변경이 아니라 **contract change**로 취급한다.
- members 영역에서는 최소한 다음 홉이 모두 채워졌는지 확인한다:
  - page local state
  - `MemberQueryFilters`
  - `getDefaultFilters()`
  - `useMembersQuery` serialization
  - `mockData.ts`
  - backend controller param
  - service/repository signature
  - reset payload
  - pagination `resetDeps`
- shared filter type를 확장하면 다른 consumers가 모두 explicit empty default를 갖는지 compile sweep를 바로 돌린다.
- reset 버튼은 local state 초기화와 `load*` explicit reset payload를 같은 handler에서 처리한다.
- prototype mode와 live mode 모두에서 동일 query shape에 대한 회귀 테스트를 남긴다.

## Commands Run

```bash
cd /Users/abc/projects/GymCRM_V2/frontend
npx vitest run src/pages/members/modules/useMembersQuery.test.tsx src/pages/members/components/MemberListSection.test.tsx src/api/mockData.test.ts
npm run build

cd /Users/abc/projects/GymCRM_V2/backend
./gradlew test --tests com.gymcrm.member.MemberSummaryApiIntegrationTest
```

## Validation Evidence

- Todo: [/Users/abc/projects/GymCRM_V2/todos/107-complete-p2-wire-member-status-filter-through-members-query-contract.md](/Users/abc/projects/GymCRM_V2/todos/107-complete-p2-wire-member-status-filter-through-members-query-contract.md)
- Frontend targeted tests: `3/3` files, `15/15` tests passed
- Frontend build: success
- Backend integration test: `BUILD SUCCESSFUL`

## Related Issues

- See also: [/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md](/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md)
- See also: [/Users/abc/projects/GymCRM_V2/docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md](/Users/abc/projects/GymCRM_V2/docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md)
- Background context: [/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-20-feat-members-crud-modal-management-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-20-feat-members-crud-modal-management-plan.md)
