---
title: "refactor: frontend bundle boundaries, query ownership, and auth lifecycle"
type: refactor
status: active
date: 2026-03-09
---

# refactor: frontend bundle boundaries, query ownership, and auth lifecycle

## Enhancement Summary

**Deepened on:** 2026-03-09  
**Sections enhanced:** Overview, Local Research Summary, Proposed Solution, Technical Approach, Acceptance Criteria, Sources & References

### Key Improvements
1. `React.lazy`/`Suspense` 경계의 실제 적용 단위를 shell vs panel 수준으로 더 명확히 좁혔다.
2. query ownership 추출에서 `hook이 소유할 것`과 `계속 app-shared로 남길 것`의 경계를 더 구체화했다.
3. auth lifecycle 분리 시 bootstrap/refresh/logout/reset 계약과 검증 포인트를 더 선명하게 정리했다.

### New Considerations Discovered
- React 공식 문서 기준으로 `lazy`는 첫 렌더 시점에만 로드되므로, 기존 탭 전환 UX를 깨지 않으려면 section shell은 정적으로 유지하고 heavy panel만 split 하는 쪽이 안전하다.
- custom hook 추출은 단순 파일 분리가 아니라 “reactive trigger”와 “side-effect ownership”을 이동하는 작업이므로, auth/query hook은 반환 API를 작게 유지하고 수명주기를 내부에 캡슐화해야 한다.
- render-time derived state 원칙을 따르면 query/auth refactor에서도 파생된 booleans나 labels를 effect로 재생성하지 않도록 기준을 유지해야 한다.

## Overview

최근 PR #59, PR #60까지의 리팩터링으로 workspace-local state, workspace loader lifecycle, theme lifecycle은 한 단계 정리됐다. 다음 병목은 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에 남아 있는 큰 번들 경계, read query ownership 분산, auth bootstrap orchestration이다.

이번 단계의 목적은 기능 추가가 아니라 다음 세 가지를 구조적으로 정리하는 것이다.

1. 초기 진입 번들에서 비활성 workspace 코드를 늦게 로드하도록 분리
2. read query를 화면 렌더/이벤트 코드에서 분리해 fetch lifecycle ownership을 명확히 함
3. auth bootstrap/refresh/logout orchestration을 전용 hook으로 이동해 `App.tsx` 책임을 더 줄임

## Problem Statement / Motivation

현재 프론트는 상태 분리 리팩터링 이후에도 다음 문제가 남아 있다.

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`는 여전히 `2220`줄이며 거의 모든 workspace UI를 정적 import한다.
- `apiGet/apiPost/apiPatch` 기반 read query가 여러 workspace 로더와 `App.tsx`에 분산돼 있어 dedupe/invalidation/ownership 규칙이 화면마다 흩어져 있다.
- auth bootstrap, refresh wiring, logout reset은 여전히 `App.tsx`가 직접 소유한다.
- 일부 긴 리스트는 `content-visibility`가 적용됐지만, 예약/정산처럼 후보 surface가 더 남아 있다.

Vercel React best practices 기준으로 보면 다음 규칙이 다음 단계 핵심이다.

- `bundle-dynamic-imports`
- `bundle-conditional`
- `client-swr-dedup`
- `rerender-dependencies`
- `advanced-init-once`
- `rendering-content-visibility`

## Local Research Summary

### Repo Findings

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`는 `SidebarNav`, `DashboardSection`, `MembershipsSection`, `ReservationsSection`, `AccessManagementPanels`, `LockerManagementPanels`, `CrmMessagePanels`, `SettlementReportPanels`, `ProductManagementPanels`까지 모두 직접 import한다.
- `/Users/abc/projects/GymCRM_V2/frontend/package.json`은 현재 React 18.3 + Vite 구조이며, code splitting이나 SWR/TanStack Query 같은 query 라이브러리는 아직 도입되지 않았다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에는 여전히 다수의 `apiGet` 기반 read query가 남아 있다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceMemberSearchLoader.ts`와 `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceMemberPickerQuery.ts`는 이미 narrow query hook 경계의 선행 패턴을 제공한다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useThemePreference.ts`와 `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceLoaders.ts`는 최근 hook 추출 방식의 기준선 역할을 한다.

### Institutional Learnings

- `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
  - query lifecycle은 UI와 분리하고 debounce/cache/dedupe를 좁은 경계에서 소유하는 것이 맞다.
- `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
  - workspace IA를 정리한 후에는 entry surface 간 동작 계약을 흔들지 않는 것이 중요하다.
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-react-workspace-lifecycle-validation.md`
  - workspace loader/theme 추출 이후 `App.tsx`는 orchestration이 줄었지만 여전히 cross-workspace auth/query/route composition을 크게 소유한다.
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`
  - 현재 단계에서는 SWR 전면 도입보다 local hook 단위의 query ownership 정리가 우선이라는 기준이 이미 정리되어 있다.

### External Research Decision

이 범위는 React/Vite 기반 기존 코드베이스의 내부 구조 정리이며, 최근 로컬 문서와 코드 패턴이 충분하다. 보안/결제/외부 API 확장 같은 고위험 새 주제도 아니므로 외부 조사는 생략한다.

### Research Insights

**React 공식 문서 기준**
- `React.lazy`는 처음 렌더될 때 컴포넌트 코드를 불러오므로, route shell 전체를 한 번에 split 하기보다 heavy management panel만 늦게 로드하는 경계가 더 안정적이다.
- `Suspense`는 boundary를 작게 쪼갤수록 fallback을 국소화할 수 있다. 현재 앱에서는 `SidebarNav`, `TopBar`, section wrapper는 유지하고 panel 본문만 fallback으로 감싸는 구성이 적절하다.
- custom hook은 기존 컴포넌트의 effect를 그대로 복사하는 것이 아니라, “어떤 값이 trigger인지”와 “누가 side effect를 소유하는지”를 같이 이동해야 한다.
- derived state는 render에서 계산하고 effect는 실제 외부 시스템 동기화에만 써야 한다. 이번 query/auth refactor에서도 loading label, active booleans, mode badge 같은 값은 effect 대상이 아니다.

**Institutional pattern alignment**
- `workspace member search` 최적화 문서에서 이미 정리된 `cache + in-flight dedupe + 최신 요청만 반영` 패턴은, 이번 query hook 추출에서도 “필요한 쿼리에만 좁게 적용”하는 게 맞다.
- sidebar workspace 재구성 문서에서 확인된 것처럼, entry surface 계약은 유지해야 하므로 lazy split이 direct-entry 흐름이나 dashboard quick action의 체감 동작을 바꾸면 안 된다.

## Proposed Solution

이번 리팩터링은 네 개의 작업 묶음으로 나눈다.

1. `React.lazy` + `Suspense` 기반으로 비핵심 workspace UI를 탭 진입 시점에 로드
2. 반복되는 read query를 workspace-specific query hook으로 이동
3. auth bootstrap/refresh/logout을 `useAuthSession` 계열 hook으로 이동
4. 남은 long-list surface에 `content-visibility` 적용 여부를 profiler/smoke로 판단

핵심 원칙은 다음과 같다.

- `App.tsx`는 cross-workspace routing/composition만 남기고, feature 코드와 fetch orchestration을 더 내려보낸다.
- read query는 "누가 로드하고 누가 invalidate하는가"를 hook 단위로 명확히 한다.
- auth lifecycle은 browser/session side effect와 UI composition을 분리한다.
- 성능 최적화는 무조건적인 전면 도입보다, 현재 구조와 맞는 좁은 경계부터 적용한다.

## Technical Approach

### Phase 1: Bundle Boundary Split

#### Scope

다음 UI surface를 정적 import에서 lazy import 후보로 전환한다.

- `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipOperationsPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/AccessManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/LockerManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/CrmMessagePanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/settlements/SettlementReportPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductManagementPanels.tsx`

#### Plan

- `React.lazy(() => import(...))`로 panel 단위를 늦게 로드한다.
- 초기 가시성이 높은 shell/section 컴포넌트는 정적 유지하고, 실제 heavy management panel만 lazy split 대상으로 둔다.
- `Suspense` fallback은 기존 panel skeleton/placeholder 톤과 맞춘 lightweight fallback으로 유지한다.
- 탭 hover/preload는 이번 단계의 필수 범위가 아니며, first pass는 conditional load만 적용한다.

#### Rationale

- `bundle-dynamic-imports`, `bundle-conditional` 규칙에 직접 대응한다.
- 현재 앱은 관리자용 단일 shell이라 route-level splitting보다 workspace panel-level splitting이 더 자연스럽다.

#### Research Insights

**Implementation details**
- `SidebarNav`, `ContentHeader`, 각 `*Section` wrapper는 정적으로 유지하고, 실제 폼/테이블이 큰 `*ManagementPanels`만 lazy split 하는 편이 fallback 범위를 가장 작게 유지한다.
- `Suspense` boundary는 탭별 렌더 분기 내부에 두고, boundary 바깥에서 `selectedMember`, `authUser`, `activeNavSection` 같은 app-shared context를 계속 계산한다.
- fallback UI는 전역 스피너보다 panel 내부 placeholder가 낫다. 현재 `PlaceholderCard`, skeleton 톤, muted copy를 재사용하는 쪽이 기존 UI와 맞는다.

**Edge cases**
- direct-entry picker로 회원을 고른 직후 lazy panel이 처음 로드되는 경우, picker에서 panel로 넘어가는 전환이 두 단계로 느껴질 수 있다. fallback copy는 “불러오는 중” 정도로 짧게 유지한다.
- jwt bootstrap 중 lazy import까지 겹치면 사용자 입장에서 blank state로 보일 수 있으므로, auth gate가 닫히기 전에는 workspace panel split이 개입하지 않게 순서를 유지해야 한다.

**Validation guidance**
- `npm run build` 후 생성된 split chunk 이름/개수를 기록한다.
- `agent-browser`로 dashboard → memberships/reservations/access 직접 진입 시 fallback이 깜빡이거나 layout jump를 만들지 않는지 확인한다.

### Phase 2: Query Ownership Extraction

#### Scope

우선순위가 높은 read query를 개별 hook으로 옮긴다.

우선 후보:
- `members` list query
- `products` list query
- `reservation schedules`
- `settlement report`
- `crm history`

#### Plan

- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/` 또는 feature-local hooks에 query hooks 추가
- 각 hook은 최소한 아래를 소유한다.
  - `rows/data`
  - `loading`
  - `error`
  - `reload`
  - 필요한 경우 `invalidate`
- workspace member search에서 이미 검증된 `cache + in-flight dedupe + latest ref` 패턴을 재사용 가능한 곳에만 좁게 적용한다.
- 전면 SWR 도입은 보류한다. 현재 범위는 ownership 정리가 목적이다.

#### Boundary Rules

- `selectedMember`, auth session, nav section 같은 app-shared context는 여전히 `App.tsx` 또는 dedicated top-level hook에 남긴다.
- `members`와 `products`는 1차 추출에서도 **app-shared canonical query**로 유지한다. 즉 feature-local query로 분산 소유하지 않고, top-level에서 `useMembersQuery()` / `useProductsQuery()` 같은 shared query hook 결과를 받아 현재 cross-workspace 소비자에게 계속 내려준다.
- `access`, `lockers`, dashboard counts, direct-entry flows, member/product management screens는 위 canonical shared query를 소비하는 쪽으로 맞춘다. feature-local hook은 이 shared query를 대체하지 않고, 필요 시 파생 데이터나 workspace-local 보조 read만 소유한다.
- query hook은 server read lifecycle을 소유하지만, create/update/delete mutation 결과의 cross-workspace reset 정책은 당장 전부 흡수하지 않는다.
- mutation 후 어떤 query를 reload/invalidate하는지는 hook contract에 명시한다.
- `members/products` mutation 후 invalidation은 app-shared canonical query에서 수행한다. 즉 어떤 workspace에서 변경이 발생해도 shared list consumer들이 같은 reload/invalidate 결과를 보도록 유지한다.

#### Research Insights

**Ownership rules**
- query hook은 `data/loading/error/reload/invalidate`를 소유하되, submit form state나 mutation draft state는 기존 workspace-local state hook에 남기는 편이 경계가 명확하다.
- `members` list와 `workspace member search`는 모두 member domain이지만 invalidation 요구가 다르므로 바로 하나의 global query store로 합치지 않는다.
- `reservation schedules`처럼 read가 reservations workspace와 강하게 결합된 데이터는 feature-local hook이 더 자연스럽고, `members/products`처럼 cross-workspace로 재사용될 여지가 있는 데이터는 shared hook 후보가 된다.
- `members/products`는 이번 단계에서 “feature-local 후보”가 아니라 “shared query hook으로 바뀌는 top-level data source”로 취급한다. 이 점을 구현 시작 전에 고정해 duplicate store를 막는다.

**Implementation details**
- 현재 `useWorkspaceMemberSearchLoader` 패턴을 일반화하더라도, 모든 query에 cache를 무조건 넣지 않는다. 재방문 빈도와 invalidation 비용이 낮은 쿼리에만 적용한다.
- mutation 이후 `await reload()`를 호출할지, `invalidate()`만 호출할지는 각 query의 사용자 체감 요구에 맞춰 분리한다. 예를 들어 settlement report처럼 명시 조회형 화면은 invalidate보다 explicit reload가 더 예측 가능하다.

**Edge cases**
- query hook 추출 후 `selectedMember` 변경, logout, 탭 전환 시 어떤 query가 즉시 비워져야 하고 어떤 query는 캐시를 유지해도 되는지 계약이 필요하다.
- query hook이 늘어날수록 panel 로딩 상태가 분산되므로, section/header 단에서 보여주는 요약 message가 잘못된 hook을 구독하지 않도록 주의해야 한다.

### Phase 3: Auth Lifecycle Extraction

#### Scope

현재 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에 남아 있는 auth 관련 책임을 분리한다.

포함 범위:
- health 기반 security mode bootstrap
- refresh session 복구
- `configureApiAuth` wiring
- login/logout action
- unauthorized reset behavior

#### Plan

- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useAuthSession.ts` 추가
- 반환 예시:
  - `securityMode`
  - `prototypeNoAuth`
  - `authUser`
  - `authAccessToken`
  - `isAuthenticated`
  - `authBootstrapping`
  - `authError`
  - `authStatusMessage`
  - `login()`
  - `logout()`
- `App.tsx`는 auth hook 결과를 조합해 화면 분기만 담당한다.
- 다만 **protected UI reset ownership은 계속 `App.tsx` 또는 별도 top-level reset coordinator에 남긴다.** `useAuthSession`이 workspace-local reset 로직을 직접 소유하지는 않는다.
- 1차 구현에서는 `useAuthSession`이 `onUnauthorized` / `onLogoutComplete` 같은 callback boundary를 통해 auth state clear 시점을 알리고, 실제 `clearProtectedUiState()` 호출은 top-level composition layer가 담당하는 방식을 기본안으로 둔다.

#### Rationale

- `advanced-init-once`, `rerender-dependencies` 관점에서 auth bootstrap은 별도 수명주기로 보는 편이 맞다.
- 현재 `App.tsx`에서 가장 큰 남은 orchestration 묶음이 auth다.

#### Research Insights

**Implementation details**
- `useAuthSession`은 반환 surface를 작게 유지하고, 내부에서 health bootstrap, refresh 시도, unauthorized cleanup, `configureApiAuth` wiring을 묶는다.
- `login()`과 `logout()`은 UI 이벤트 진입점으로 남기고, auth hook은 성공/실패 후 상태 반영만 책임진다.
- `isAuthenticated`, `isJwtMode`, `isPrototypeMode` 같은 파생 boolean은 hook 또는 render에서 derive하고, effect로 따로 저장하지 않는다.
- workspace-local reset helper들은 auth hook 안으로 들어가지 않는다. auth hook은 “세션이 비워졌다”는 사실만 알리고, protected UI reset은 app composition layer가 일괄 수행한다.

**Failure handling**
- refresh 실패가 `401`인 경우와 네트워크/기타 오류인 경우를 계속 구분해야 한다. 이 차이가 초기 auth screen UX를 바꾸기 때문이다.
- logout은 현재처럼 best-effort 요청 뒤 로컬 세션 제거를 보장해야 하고, protected UI reset contract가 약해지지 않도록 hook 밖 reset path와 연결 기준을 명시해야 한다.
- unauthorized 경로와 explicit logout 경로 모두 동일한 protected reset contract를 타야 한다. 둘 중 하나만 reset되고 다른 하나가 빠지는 구현은 허용하지 않는다.

**Validation guidance**
- prototype/no-auth와 jwt 모드를 둘 다 확인해야 한다.
- health → refresh → authenticated flow와 health → refresh 401 → login screen flow 둘 다 smoke에 포함한다.

### Phase 4: Rendering Guard Follow-up

#### Scope

이미 `deferred-list-surface`가 적용된 surface 외에 아래 후보를 점검한다.

- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/settlements/SettlementReportPanels.tsx`

#### Plan

- profiler 또는 브라우저 스모크로 실제 긴 리스트/테이블 조건을 확인
- `content-visibility` 적용 시 스크롤 점프/포커스 문제 없을 때만 opt-in
- 체감 이득이 없거나 레이아웃이 불안하면 적용하지 않는다

#### Research Insights

**Implementation details**
- 이미 적용된 `deferred-list-surface` 유틸을 재사용하되, reservations/settlements처럼 fold 아래에 길게 누적되는 영역에만 제한적으로 붙인다.
- `contain-intrinsic-size`는 현재 값에서 시작하되, 예약/정산 패널의 실제 평균 높이가 다르면 별도 유틸 분리를 고려한다.

**Rollback criteria**
- 모바일에서 첫 스크롤 시 레이아웃이 눈에 띄게 점프함
- 키보드 포커스 이동이 어색해짐
- 데이터 길이가 짧은 상태에서도 오히려 시각적 지연이 느껴짐

## Alternative Approaches Considered

### 1. SWR 또는 TanStack Query 전면 도입

장점:
- dedupe/cache/revalidation을 표준화하기 쉽다.

단점:
- 현재 workspace reset/mutation coupling이 강해 바로 도입하면 수명 정책이 더 복잡해진다.
- 최근 정리한 hook 경계를 다시 크게 흔들 수 있다.

결론:
- 보류. 우선 query ownership과 invalidation 경계부터 정리한다.

### 2. Route-level major split 없이 현 상태 유지

장점:
- 작업량이 적다.

단점:
- 초기 번들에 비활성 workspace 코드가 계속 포함된다.
- `App.tsx` 유지보수 비용이 다시 커진다.

결론:
- 채택하지 않음.

## System-Wide Impact

### Interaction Graph

- 앱 부트스트랩
  - app mount → auth hook bootstrap → health 확인 → security mode 결정 → refresh 복구 시도 → UI gate 결정
- 탭 진입
  - sidebar/dashboard action → `activeNavSection` 변경 → lazy panel import + relevant query hook/loader 실행
- mutation 후 화면 갱신
  - 구매/예약/상품 수정 등 → 기존 mutation handler → query hook reload/invalidate → panel UI 재반영

### Error Propagation

- auth bootstrap 실패는 auth hook 내부 상태로 귀속되고 `App.tsx`는 화면 분기만 수행한다.
- query hook 실패는 workspace panel error surface로만 노출하고 전역 fatal state로 승격하지 않는다.
- lazy import 실패는 fallback/error boundary 전략이 필요하며, 최소한 개발 중 콘솔/에러 표시 기준을 정해야 한다.

### State Lifecycle Risks

- bundle split 후 fallback과 기존 selectedMember/workspace reset 타이밍이 어긋날 수 있다.
- query ownership 추출 시 reload/invalidation이 누락되면 mutation 후 stale data가 남을 수 있다.
- auth hook 분리 시 logout 후 protected reset 계약이 약해지면 stale UI가 남을 수 있다.
- `members/products`를 canonical shared query로 고정하지 않으면 workspace별 duplicate list state가 생겨 서로 다른 시점의 데이터를 보여줄 수 있다.

### API Surface Parity

- 백엔드 API 계약 변경은 없다.
- 대시보드 quick action, sidebar, direct-entry picker 등 기존 진입 surface는 모두 같은 결과를 유지해야 한다.
- prototype / jwt mode 둘 다 auth hook 결과가 동일한 UI contract를 제공해야 한다.

### Integration Test Scenarios

- jwt / prototype 모드 각각에서 초기 부트스트랩 화면이 정상 분기
- memberships/reservations direct-entry 진입 시 lazy panel 로드 후 기존 member-context 흐름 유지
- mutation 후 관련 query reload/invalidation이 정상 반영
- logout 직후 stale workspace data가 다시 그려지지 않음
- 긴 리스트 surface에 rendering guard를 적용해도 모바일/데스크톱에서 스크롤과 포커스가 깨지지 않음

## SpecFlow Review

이 리팩터링은 신규 기능이 아니라 내부 구조 변경이지만, 실제 사용자 체감 흐름으로 보면 아래 edge case를 반드시 방지해야 한다.

- 탭 전환 직후 lazy load fallback이 기존 panel state를 깨뜨리지 않는다.
- auth bootstrap 중 dashboard/sidebar가 잘못된 권한 상태로 먼저 그려지지 않는다.
- query hook 분리 후 member/product/reservation/settlement/CRM 화면에서 기존 새로고침/조회 버튼 계약이 유지된다.
- prototype 모드와 jwt 모드에서 초기 진입 메시지와 권한 surface가 동일한 의미를 유지한다.

## Acceptance Criteria

### Functional Requirements

- [ ] 비핵심 workspace management panel이 lazy import 경계로 분리된다.
- [ ] `App.tsx`에서 반복되는 read query가 workspace-specific 또는 shared query hook으로 이전된다.
- [ ] auth bootstrap/refresh/logout lifecycle이 dedicated auth hook으로 이동한다.
- [ ] long-list 후보 surface(예약/정산)에 대해 적용 여부가 검증되고 결과가 코드 또는 문서로 남는다.
- [ ] `members/products` query가 app-shared canonical source로 유지된다는 ownership 규칙이 구현에 반영된다.
- [ ] auth state clear 이후 protected UI reset을 누가 호출하는지 경계가 구현에 반영된다.

### Non-Functional Requirements

- [ ] 초기 메인 번들에 비활성 workspace 코드가 줄어든다.
- [ ] query ownership이 명확해져 `App.tsx`의 fetch orchestration 코드가 감소한다.
- [ ] prototype/jwt 모드에서 auth bootstrapping 회귀가 없다.
- [ ] lazy load fallback과 rendering guard 적용 후 UX 점프/깜빡임이 눈에 띄지 않는다.
- [ ] `members/products`를 소비하는 cross-workspace surface가 하나의 shared query 결과만 본다.
- [ ] logout과 unauthorized 두 경로 모두 동일한 protected reset 계약을 유지한다.

### Quality Gates

- [ ] `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` 통과
- [ ] `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` 통과
- [ ] `agent-browser` 또는 동등 수동 검증으로 dashboard, memberships, reservations, auth gate 확인
- [ ] 최소 1개 이상의 auth hook 테스트 추가
- [ ] 최소 1개 이상의 query ownership/invalidation 테스트 추가
- [ ] lazy split 후 화면 진입 smoke 증빙 추가
- [ ] build 결과에서 split chunk 생성 여부와 main chunk 변화가 기록된다.
- [ ] prototype / jwt 두 모드의 auth bootstrap smoke 결과가 분리 기록된다.
- [ ] `members/products` shared query를 소비하는 대표 surface(access/lockers/dashboard 또는 members/products management) 중 최소 1개 이상에서 same-source 계약이 검증된다.
- [ ] logout / unauthorized 각각에서 protected UI reset이 동일하게 실행되는 검증이 추가된다.

## Success Metrics

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx` line count와 직접 import 수가 유의미하게 감소한다.
- Vite build 결과에서 메인 entry chunk가 줄고, workspace split chunk가 생긴다.
- query hook 추출 후 중복된 loading/error/reload 패턴이 감소한다.
- auth/session 변경 시 `App.tsx` 수정 범위가 줄어든다.

## Dependencies & Risks

### Dependencies

- 기존 workspace lifecycle refactor 결과 유지
- 현재 `useWorkspaceMemberSearchLoader`, `useWorkspaceMemberPickerQuery`, `useThemePreference`, `useWorkspaceLoaders` 패턴 재사용
- `agent-browser` 기반 smoke 검증 가능 환경

### Risks

1. lazy split 후 fallback/selection state 타이밍 꼬임
2. query ownership 분리 중 mutation 후 reload 누락
3. auth hook 분리 중 logout/reset contract 회귀
4. 너무 많은 query hook 분리로 오히려 구조가 흩어질 위험

### Mitigations

- panel-level split만 먼저 적용하고 route shell은 유지
- query hook 범위를 high-churn read path부터 제한적으로 시작
- auth hook 분리 후 prototype/jwt smoke를 둘 다 돌린다
- 각 phase마다 build/test/smoke를 잘라서 검증한다

## Implementation Phases

### Phase 1: Bundle Split Foundation

- lazy split 대상 panel 결정
- `Suspense` fallback 설계
- dashboard/sidebar/tabs direct-entry smoke

### Phase 2: Query Hook Extraction

- members/products/reservation schedules/settlement/crm 우선순위 확정
- query hook API 정의
- mutation 이후 reload/invalidate 계약 정리

### Phase 3: Auth Hook Extraction

- `useAuthSession` 설계
- bootstrap/refresh/logout/unauthorized reset 이동
- prototype/jwt smoke 검증

### Phase 4: Rendering Guard Follow-up

- reservations/settlements surface profiler or smoke
- 필요 시 `deferred-list-surface` 확대
- validation note 정리

## Sources & References

### Internal References

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceMemberSearchLoader.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceMemberPickerQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useThemePreference.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceLoaders.ts`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-react-workspace-lifecycle-validation.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`
- `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
- `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`

### Best-Practice References

- Vercel React Best Practices
  - `bundle-dynamic-imports`
  - `bundle-conditional`
  - `client-swr-dedup`
  - `rerender-dependencies`
  - `advanced-init-once`
  - `rendering-content-visibility`

### Official References

- React docs: `lazy` / `Suspense` / custom hooks / derived state guidance
