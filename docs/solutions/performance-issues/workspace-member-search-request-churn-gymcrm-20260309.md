---
module: Gym CRM Admin Portal Frontend
date: 2026-03-09
problem_type: performance_issue
component: frontend
symptoms:
  - "워크스페이스 회원 검색 입력 중 매 키입력마다 직접 진입 picker가 `/api/v1/members`를 다시 호출했다"
  - "같은 검색어로 다시 진입하거나 같은 검색어 요청이 겹쳐도 동일 응답을 반복해서 다시 가져왔다"
  - "부모 렌더에 따라 picker effect가 다시 돌 수 있어 요청 churn 위험이 있었다"
root_cause: async_timing
resolution_type: code_fix
severity: medium
tags: [frontend, react, performance, debounce, cache, dedupe, member-search, workspace-picker]
---

# Troubleshooting: Workspace Member Search Request Churn in Direct-Entry Picker

## Problem

`회원권 업무`와 `예약 관리`의 직접 진입 picker는 기능적으로는 맞게 동작했지만, 검색 입력 중 요청 수를 제어하지 않아 네트워크 churn이 발생할 수 있었다. 특히 동일 검색어 재사용과 빠른 타이핑 시 불필요한 재호출이 반복되어, 운영 규모가 커질수록 체감 성능이 나빠질 위험이 있었다.

## Environment

- Module: Gym CRM Admin Portal Frontend
- Affected Component: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`, `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx`
- Date: 2026-03-09

## Symptoms

- picker 검색 입력 중 query가 바뀔 때마다 곧바로 fetch가 다시 실행됨
- 같은 keyword로 다시 검색하거나 같은 요청이 겹쳐도 응답을 재사용하지 못함
- 부모 컴포넌트가 리렌더되면 `loadMembers` 함수 참조 변경 때문에 effect가 다시 평가될 수 있음
- 직접 진입 UX 자체는 개선됐지만, 데이터 패칭 비용이 여전히 입력 빈도에 과도하게 비례함

## What Didn't Work

**Attempted Solution 1:** 서버 검색 API만 추가하고 프론트 fetch 타이밍은 그대로 유지
- **Why it failed:** 전체 목록 fetch 문제는 해결됐지만, query 변경마다 즉시 네트워크 요청이 발생하는 구조는 그대로 남았다.

**Attempted Solution 2:** `useDeferredValue`만 사용해 검색 입력을 완화
- **Why it failed:** `useDeferredValue`는 렌더 우선순위를 조정할 뿐, 네트워크 debounce나 동일 query dedupe를 보장하지 않는다.

## Solution

직접 진입 picker의 검색을 `debounce + cache + in-flight dedupe` 구조로 바꿨다.

### 1) Debounce로 입력 중 과호출 완화

`WorkspaceMemberPicker`에서 즉시 fetch하지 않고, `250ms` debounce된 query를 기준으로만 검색을 실행한다.

```tsx
const SEARCH_DEBOUNCE_MS = 250;
const deferredQuery = useDeferredValue(query.trim().toLowerCase());
const [debouncedQuery, setDebouncedQuery] = useState("");

useEffect(() => {
  if (!deferredQuery) {
    setDebouncedQuery("");
    return;
  }

  const timer = window.setTimeout(() => {
    setDebouncedQuery(deferredQuery);
  }, SEARCH_DEBOUNCE_MS);

  return () => window.clearTimeout(timer);
}, [deferredQuery]);
```

### 2) 최신 `loadMembers` 참조만 유지

부모 리렌더로 함수 참조가 바뀌더라도 불필요한 재호출이 생기지 않게 `ref`에 최신 로더를 유지했다.

```tsx
const loadMembersRef = useRef(loadMembers);

useEffect(() => {
  loadMembersRef.current = loadMembers;
}, [loadMembers]);

useEffect(() => {
  void loadMembersRef.current(debouncedQuery || undefined);
}, [debouncedQuery]);
```

### 3) 동일 keyword 캐시 + 동시 요청 dedupe

`App.tsx`에 keyword별 결과 캐시와 in-flight promise 맵을 두고, 동일 검색어 요청은 재사용하도록 만들었다.

```tsx
const workspaceMemberSearchCacheRef = useRef(new Map<string, MemberSummary[]>());
const workspaceMemberSearchInFlightRef = useRef(new Map<string, Promise<MemberSummary[]>>());

async function loadWorkspaceMembers(keyword?: string) {
  const normalizedKeyword = keyword?.trim().toLowerCase() ?? "";
  const cachedRows = workspaceMemberSearchCacheRef.current.get(normalizedKeyword);
  if (cachedRows) {
    return cachedRows;
  }

  const inFlight = workspaceMemberSearchInFlightRef.current.get(normalizedKeyword);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const params = new URLSearchParams();
    if (normalizedKeyword) {
      params.set("keyword", normalizedKeyword);
    }
    const query = params.toString();
    const response = await apiGet<MemberSummary[]>(`/api/v1/members${query ? `?${query}` : ""}`);
    workspaceMemberSearchCacheRef.current.set(normalizedKeyword, response.data);
    return response.data;
  })();

  workspaceMemberSearchInFlightRef.current.set(normalizedKeyword, request);

  try {
    return await request;
  } finally {
    workspaceMemberSearchInFlightRef.current.delete(normalizedKeyword);
  }
}
```

## Why This Works

1. **문제의 핵심은 데이터량이 아니라 요청 타이밍이었다**
   - 전체 목록 fetch는 이미 이전 수정에서 서버 keyword 검색으로 옮겨졌지만, 입력 이벤트마다 바로 fetch하면 여전히 요청 수가 과도해질 수 있다.

2. **debounce는 네트워크 경계를 줄인다**
   - 빠른 타이핑 동안 중간 query를 모두 요청하지 않고, 사용자가 잠깐 멈춘 뒤의 검색어만 서버로 보낸다.

3. **cache/dedupe는 동일 작업의 반복을 없앤다**
   - 같은 keyword를 다시 검색하거나 같은 query 요청이 겹쳐도 이미 진행 중인 promise나 저장된 결과를 재사용하므로, 네트워크와 렌더 비용이 줄어든다.

4. **함수 참조 안정화로 effect 재실행 범위를 줄인다**
   - 부모 리렌더 때문에 `loadMembers` 함수 identity가 바뀌더라도, 실제 fetch는 query 변화에만 반응하도록 좁혀졌다.

## Prevention

- 검색 입력은 `useDeferredValue`만으로 끝내지 말고, 실제 네트워크 호출에는 `debounce`를 별도로 둔다.
- 같은 query를 반복해서 조회하는 picker/search UI에는 최소한 `Map` 기반 cache 또는 in-flight dedupe를 둔다.
- effect dependency에 함수가 직접 걸려 있을 때는, 그 함수가 부모 리렌더마다 새로 만들어지는지 확인한다.
- 직접 진입용 lightweight picker는 “정확성”뿐 아니라 “request churn”까지 함께 점검한다.
- React 성능 후속 점검 시에는 `Vercel React Best Practices`의 `client-side data fetching`, `rerender-*` 규칙을 같이 본다.

## Commands run

```bash
cd /Users/abc/projects/GymCRM_V2/frontend
npm run build
```

## Validation Evidence

- Commit: `da2aec5` (`perf(frontend): debounce workspace member search`)
- PR #58: [perf(frontend): debounce workspace member search](https://github.com/Again-D/GymCRM_V2/pull/58)
- Merged commit: `217551a`

## Related Issues

- See also: `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
- Related precursor: PR #57 added the direct-entry workspace picker flow before this request-churn optimization
