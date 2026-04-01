---
title: "refactor: Frontend Ant Design and Zustand foundation migration"
type: refactor
status: active
date: 2026-03-27
origin: docs/brainstorms/2026-03-27-frontend-ant-design-zustand-brainstorm.md
---

# refactor: Frontend Ant Design and Zustand foundation migration

## Enhancement Summary

**Deepened on:** 2026-03-27
**Sections enhanced:** 9
**Research agents used:** `architecture-strategist`, `frontend-design`, `kieran-typescript-reviewer`, `performance-oracle`, `security-sentinel`, targeted institutional-learning review

### Key Improvements
1. provider/bootstrap 계약, theme 단일 진실원, shared feedback adapter 규칙을 plan-level contract로 고정했다.
2. Zustand와 TanStack Query의 ownership 경계, typed query key/error 정책, selected member reset semantics를 구체화했다.
3. phase별 exit gate, 성능 기준선, 보안 음성 테스트, shell IA 회귀 방지 규칙을 추가해 구현 순서와 검증 기준을 더 엄격하게 만들었다.

### New Considerations Discovered
- Ant Design 도입은 단순한 시각 전환이 아니라 `data-theme`와 `ConfigProvider` 사이의 theme source-of-truth 정리가 선행돼야 한다.
- shell/layout 교체와 query standardization을 동시에 진행하면 root-cause 분석이 어려워지므로 phase gate를 분리해야 한다.
- auth/session 전환 시 selected member, privileged cache, route visibility의 정리 순서가 보안과 UX 모두에 직접 영향을 준다.

## Overview

현재 프론트엔드는 React + TypeScript + React Router 기반으로 페이지 구조와 인증/테마/선택 회원 컨텍스트가 어느 정도 정리되어 있지만, UI 계층은 CSS Modules와 커스텀 컴포넌트 중심으로 남아 있다. 아키텍처 문서의 목표 스택인 `Ant Design 5.x + Zustand + TanStack Query 5.x`와 실제 구현이 어긋나 있으므로, 이번 작업은 그 불일치를 해소하고 이후 화면 개발의 기준선을 재정의하는 프론트엔드 전환 계획이다.

이 계획은 브레인스토밍에서 합의한 방향을 그대로 계승한다. Ant Design은 부분 도입이 아니라 전면 도입으로 간다. 전환 순서는 `셸 우선 재구축 후 내부 페이지 교체`다. 공통 UI도 가능한 한 Ant Design 컴포넌트로 대체한다. 상태는 `Zustand = 앱/UI 상태`, `TanStack Query = 서버 상태`로 역할을 분리한다. 시각 방향은 Ant Design 기본 구조를 유지하되 GymCRM 톤을 반영한 브랜드 토큰 커스터마이징으로 정리한다. (see brainstorm: `docs/brainstorms/2026-03-27-frontend-ant-design-zustand-brainstorm.md`)

## Problem Statement

현재 코드베이스는 다음 문제를 동시에 안고 있다.

- [`frontend/package.json`](../../../frontend/package.json) 에는 `antd`, `zustand`, `@tanstack/react-query`가 아직 없다.
- [`frontend/src/index.css`](../../../frontend/src/index.css) 는 디자인 토큰, 버튼, 패널, 폼 입력, 레이아웃 유틸리티까지 광범위하게 책임지고 있다.
- [`frontend/src/components/layout/DashboardLayout.tsx`](../../../frontend/src/components/layout/DashboardLayout.tsx), [`frontend/src/components/layout/HeaderLayout.tsx`](../../../frontend/src/components/layout/HeaderLayout.tsx), [`frontend/src/shared/ui/Modal.tsx`](../../../frontend/src/shared/ui/Modal.tsx) 등 주요 공통 surface가 모두 bespoke UI다.
- [`frontend/src/app/auth.tsx`](../../../frontend/src/app/auth.tsx), [`frontend/src/app/theme.tsx`](../../../frontend/src/app/theme.tsx), [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](../../../frontend/src/pages/members/modules/SelectedMemberContext.tsx) 는 React context + local state로 유지되고 있어, 앞으로 상태 surface가 늘어날수록 ownership이 분산될 가능성이 있다.
- 기존 계획과 해결 문서들이 이미 보여주듯, 이 저장소는 프론트엔드 재구축 과정에서 shell IA, query lifecycle, effect dependency, 테마 lifecycle 문제를 여러 번 겪었다. 이번 전환은 단순 라이브러리 치환이 아니라 그 교훈을 보존하는 방향이어야 한다.

## Proposed Solution

브레인스토밍에서 확정한 `접근 B`를 구현 계획으로 구체화한다. 핵심은 “페이지 하나를 예쁘게 Ant Design으로 바꾼다”가 아니라, 먼저 foundation layer를 새 기준으로 고정하고 그 위에 각 페이지를 순차 마이그레이션하는 것이다.

기준 원칙:

- Ant Design 5.x를 프론트 표준 UI 계층으로 통일한다.
- Zustand는 앱 상태와 UI 상태에만 사용한다.
- TanStack Query 5.x는 서버 데이터 조회/캐싱/무효화의 단일 기준으로 사용한다.
- 기존 custom UI primitive는 남기지 않고 Ant Design 대응 surface로 치환한다.
- CSS 오버라이드는 최소화하고, Ant Design token + component token 중심으로 브랜드를 반영한다.
- 로그인 우선 진입, 사이드바 shell, role 기반 route visibility, selected member handoff 같은 기존 운영 UX 계약은 유지한다.

명시적 비목표:

- API contract, backend behavior, routing model, page-level information architecture 자체를 바꾸지 않는다.
- UI 라이브러리 교체를 핑계로 기능 재설계나 도메인 규칙 재정의를 섞지 않는다.
- 서버 상태를 Zustand로 끌어오지 않는다.

## Research Summary

### Origin Brainstorm

- 기준 문서: [docs/brainstorms/2026-03-27-frontend-ant-design-zustand-brainstorm.md](../brainstorms/2026-03-27-frontend-ant-design-zustand-brainstorm.md)
- carry-forward decisions:
  - Ant Design 5.x 전면 도입
  - 셸 우선 재구축 후 페이지 순차 교체
  - 공통 UI도 Ant Design으로 교체
  - Zustand는 앱/UI 상태 전용, 서버 상태는 TanStack Query 유지
  - 브랜드 토큰 기반 커스터마이징
  - CSS 오버라이드 최소화

### Repo Research

- 현재 앱 진입점은 [`frontend/src/main.tsx`](../../../frontend/src/main.tsx) 에서 `AuthStateProvider -> ThemeProvider -> BrowserRouter -> App` 구조를 사용한다. 이 구조는 향후 `QueryClientProvider`, `ConfigProvider`, `App`(antd) 계층으로 재정렬할 자연스러운 위치를 제공한다.
- shell route, role gating, dashboard/sidebar surface는 [`frontend/src/App.tsx`](../../../frontend/src/App.tsx) 와 [`frontend/src/app/routes.ts`](../../../frontend/src/app/routes.ts) 에 정리돼 있다. 라우팅 구조 자체를 바꾸기보다 shell view layer를 교체하는 쪽이 안전하다.
- 인증 상태는 [`frontend/src/app/auth.tsx`](../../../frontend/src/app/auth.tsx), 테마 상태는 [`frontend/src/app/theme.tsx`](../../../frontend/src/app/theme.tsx), 선택 회원 공유 상태는 [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](../../../frontend/src/pages/members/modules/SelectedMemberContext.tsx) 가 담당한다. 이 세 영역은 Zustand 전환의 1차 후보이며, 서버 fetch가 섞여 있는 선택 회원 컨텍스트는 TanStack Query와의 경계 재정리가 필요하다.
- API 클라이언트는 [`frontend/src/api/client.ts`](../../../frontend/src/api/client.ts) 에서 인증 토큰, refresh dedupe, 공통 envelope 처리 책임을 이미 갖고 있다. TanStack Query 도입은 transport 교체가 아니라 호출 orchestration과 cache lifecycle 표준화로 봐야 한다.
- 대표 UI shell은 [`frontend/src/components/layout/DashboardLayout.tsx`](../../../frontend/src/components/layout/DashboardLayout.tsx), [`frontend/src/components/layout/HeaderLayout.tsx`](../../../frontend/src/components/layout/HeaderLayout.tsx), [`frontend/src/pages/Dashboard.tsx`](../../../frontend/src/pages/Dashboard.tsx), [`frontend/src/shared/ui/Modal.tsx`](../../../frontend/src/shared/ui/Modal.tsx), [`frontend/src/shared/ui/EmptyState.tsx`](../../../frontend/src/shared/ui/EmptyState.tsx), [`frontend/src/shared/ui/SkeletonLoader.tsx`](../../../frontend/src/shared/ui/SkeletonLoader.tsx) 에 흩어져 있다. foundation phase에서 우선 교체할 surface가 명확하다.

### Institutional Learnings

- sidebar/login-first 운영 구조는 유지해야 한다.
  - [`docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`](../solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)
- query/cache lifecycle는 표면적인 fetch 통합보다 ownership과 invalidation 경계가 먼저다.
  - [`docs/plans/2026-03-09-refactor-frontend-state-ownership-and-query-lifecycle-plan.md`](./2026-03-09-refactor-frontend-state-ownership-and-query-lifecycle-plan.md)
- React effect 의존성과 hook action identity 안정성은 반드시 지켜야 한다.
  - [`docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md`](../solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md)
- 검색/picker 류 화면은 debounce와 dedupe를 query layer 설계에 포함해야 한다.
  - [`docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`](../solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md)
- `docs/solutions/patterns/critical-patterns.md` 는 현재 저장소에 없었다. 즉, 이번 계획은 분산된 해결 문서와 기존 플랜에서 직접 가이드를 가져와야 한다.

### External Research Decision

외부 리서치를 수행했다. 이유는 이번 작업이 단순한 로컬 스타일 정리가 아니라, 실제 저장소에 아직 없는 `Ant Design`, `Zustand`, `TanStack Query`를 기준 기술로 채택하는 계획이기 때문이다. 로컬 문서는 전환 배경과 기존 회귀 패턴에는 강하지만, 새 라이브러리의 현재 권장 provider, theming, store, invalidation 패턴을 대신해주지는 못한다.

### Official References

- Ant Design 5.26.2 공식 문서
  - `ConfigProvider` 의 `theme.token`, `algorithm`, `components`, `cssVar`, `hashed` 설정으로 전역 토큰을 구성할 수 있다.
  - 다크/컴팩트 알고리즘은 `theme.darkAlgorithm`, `theme.compactAlgorithm` 조합으로 제공된다.
  - static `message/notification/Modal.confirm`는 `ConfigProvider` context를 그대로 상속하지 않으므로 `App.useApp()` 또는 hook 기반 API를 사용해야 한다.
  - CSS variable mode(`cssVar`)와 `hashed: false` 조합은 단일 antd 버전 앱에서 스타일 크기와 토큰 전환 비용을 줄이는 후보가 된다.
  - Source: Ant Design 5.26.2 docs via Context7
- Zustand v5.0.12 공식 문서
  - `create<State>()(...)` 기반 타입 안전 store 구성이 가능하다.
  - 앱 상태가 커질 경우 slices pattern으로 분리하는 것이 권장된다.
  - selector 기반 소비로 불필요한 re-render를 줄일 수 있다.
  - 필요한 경우 `useShallow` 또는 `createWithEqualityFn` 기반으로 selector rerender를 제어할 수 있다.
  - Source: Zustand v5.0.12 docs via Context7
- TanStack Query v5.90.3 공식 문서
  - `QueryClientProvider`를 앱 최상단에 배치하고 `useQuery`, `useMutation`, `invalidateQueries`로 서버 상태를 통합 관리한다.
  - 기본 `QueryClient` 옵션에서 `staleTime`, `gcTime`, `networkMode` 같은 global policy를 정의할 수 있다.
  - v5에서는 `keepPreviousData` 대신 `placeholderData`/`keepPreviousData` helper를 사용해야 한다.
  - Source: TanStack Query v5.90.3 docs via Context7

## SpecFlow Analysis

### User Flow Overview

1. 앱 부트스트랩
   - 브라우저 진입
   - 테마 초기화
   - auth bootstrap
   - router 진입
   - shell 또는 login 화면 노출

2. 로그인/세션 흐름
   - mock/live 모드 구분
   - 로그인 성공
   - shell 진입
   - 로그아웃 또는 런타임 세션 전환

3. shell 탐색 흐름
   - role에 맞는 sidebar 메뉴 노출
   - dashboard 또는 각 page로 이동
   - 현재 선택 회원 컨텍스트가 필요한 페이지에서 유지/리셋

4. 공통 UI 흐름
   - loading
   - empty
   - modal confirm
   - form submit
   - error feedback
   - toast/message

5. 서버 데이터 흐름
   - list/detail 조회
   - mutation 성공
   - query invalidation
   - refetch
   - stale UI 제거

### Flow Permutations Matrix

| Flow | 사용자 상태 | 컨텍스트 | 핵심 리스크 |
| --- | --- | --- | --- |
| 로그인 | prototype / jwt / anon | first load / refresh | ConfigProvider, theme, auth bootstrap 순서 꼬임 |
| shell 진입 | admin / trainer / desk | desktop / tablet | role 기반 메뉴와 layout 토큰 drift |
| selected member | member 미선택 / 선택 / 권한 제한 | page 이동 / auth 변경 | Zustand 전환 중 reset 규칙 누락 |
| query fetch | 성공 / error / 401 refresh | initial / background refetch | TanStack Query와 기존 auth retry 경계 충돌 |
| modal action | open / submit / cancel / failure | light / dark | antd App context 미적용으로 modal/message 스타일 불일치 |

### Missing Elements & Gaps

- **Error Handling**: TanStack Query 도입 후 `ApiClientError`를 어떤 공통 error surface로 노출할지 기준이 아직 없다.
- **State Ownership**: `selectedMember`를 Zustand로 올릴 때 query 결과와 transient UI state를 어디까지 store에 둘지 경계가 필요하다.
- **Theming**: 기존 `data-theme` 기반 구현과 Ant Design token/algorithm을 어떻게 연결할지 구체 계약이 필요하다.
- **Accessibility**: 기존 custom modal이 가진 focus/ESC/scroll lock 계약을 Ant Design `Modal`과 `Drawer` 사용 규칙으로 문서화해야 한다.
- **Migration Safety**: page별 점진 이행 중 custom CSS와 antd style이 섞이는 기간의 허용 범위를 정해야 한다.

### Critical Questions Resolved By Default

- 서버 상태까지 Zustand로 통합할지
  - 아니오. TanStack Query 유지.
- Ant Design을 신규 화면만에 한정할지
  - 아니오. 기존 화면 포함 전면 도입.
- 브랜드 표현을 기본 테마로 대체할지
  - 아니오. Ant Design token 기반 커스터마이징을 적용.
- custom shared UI를 남길지
  - 아니오. 가능하면 Ant Design 대응 surface로 대체.

## Technical Approach

### Architecture

새 foundation의 최상단 구조는 아래 기준으로 정렬한다.

1. `main.tsx`
   - `QueryClientProvider`
   - Zustand-backed auth/theme/session bootstrap
   - `ConfigProvider`
   - antd `App`
   - `BrowserRouter`

2. App shell
   - route gating은 유지
   - shell layout/view는 antd `Layout`, `Menu`, `Breadcrumb`, `Grid`, `Typography`, `Space` 중심으로 교체

3. Shared state
   - auth session, theme preference, selected member, global UI feedback는 Zustand
   - list/detail/mutation lifecycle은 TanStack Query

4. Shared UI surface
   - `Modal`, `Drawer`, `Table`, `Form`, `Input`, `Select`, `DatePicker`, `Tabs`, `Card`, `Tag`, `Alert`, `Result`, `Empty`, `Skeleton`, `Spin`, `Notification`, `Message`

5. Styling
   - global CSS는 reset, app-level primitives, 최소 layout guard만 유지
   - 브랜드 표현은 `ConfigProvider.theme.token` 및 component token에 집중
   - page-scoped CSS Modules는 antd layout 보조와 domain-specific layout에 한정

### Provider Contract

- top-level render order는 `theme bootstrap -> auth/store hydration -> QueryClientProvider -> ConfigProvider -> antd App -> BrowserRouter` 로 고정한다.
- `QueryClient`, Ant Design `theme` object, shell `menu items`, 공통 `table columns`, selected-member selectors는 render path에서 매번 새로 만들지 않는다.
- antd `message`, `notification`, `Modal.confirm`는 feature code에서 직접 static 호출하지 않는다. 반드시 `App.useApp()` 기반 중앙 adapter를 거친다.
- 기존 `data-theme`는 migration 동안 bridge attribute로 유지하되, 값은 Zustand-backed theme state에서만 파생한다. 최종적으로 theme source of truth는 단일 경로만 남긴다.
- access token은 memory-only로 유지한다. raw token, backend error payload, trace id를 Zustand, localStorage, query cache에 저장하지 않는다.

### Ownership Matrix

| Concern | Owner | Out of Scope |
| --- | --- | --- |
| auth/session metadata | Zustand auth slice | raw access token persistence, query cache 저장 |
| theme preference/resolved theme | Zustand theme slice + DOM bridge | page-local style state |
| selected member id / UI selection status | Zustand selected-member slice | member detail canonical cache |
| member detail, lists, mutations | TanStack Query feature hooks | Zustand 중복 캐시 |
| query defaults / invalidation helpers | shared query layer | feature-specific mutation semantics |
| query keys | feature query key factory module | raw string keys, ad hoc array literals |
| global feedback UI | antd App adapter | feature별 static message 직접 호출 |
| shell layout and nav | shell layer | feature domain query logic |

명시 규칙:

- query state를 Zustand에 넣지 않는다.
- UI transient state를 TanStack Query에 넣지 않는다.
- selected member store는 `selectedMemberId`와 selection UI 상태를 보유하되, canonical member detail은 query key 기반으로 읽는다.

### UI Contract

- `Button`, `Form`, `Table`, `Modal`, `Drawer`, `Empty`, `Skeleton`, `Result`, `Alert`, `Message`, `Notification`을 shared surface 표준으로 사용한다.
- loading/empty/error/retry 상태는 페이지마다 새 패턴을 만들지 않고, 공통 surface contract를 따른다.
- form validation은 `local validation -> submit -> server validation mapping` 흐름을 표준으로 둔다.
- modal/drawer surface는 focus trap, ESC close, scroll lock, labelled dialog, close 후 focus 복귀를 만족해야 한다.
- migration 중에는 기존 custom shared UI를 thin compatibility wrapper로 유지하고, parity 검증 후 제거한다.

### Implementation Phases

#### Phase 0: Foundation Audit and Contract Freeze

- 현재 `Dashboard`, `Members`, `Memberships`, `Reservations` 흐름의 React Profiler baseline, interaction latency, JS/CSS asset baseline을 기록
- 현재 frontend dependency, entrypoint, providers, shared UI, page ownership을 inventory로 고정
- Ant Design/Zustand/TanStack Query 도입 범위와 replacement target을 checklist로 정리
- 기존 `data-theme`, auth bootstrap, selected member reset 규칙을 migration contract로 명문화
- shell IA, login-first behavior, sidebar workspace ownership, narrow-width stability를 frozen contract에 포함
- brand token inventory 작성
  - color
  - semantic status
  - radius
  - spacing
  - typography
  - elevation
  - focus ring
  - motion
- API/UX 계약이 문서와 불일치하는 부분을 목록화

baseline budget 초안:
- initial JS 증가 허용치: baseline 대비 `+20%` 이내
- initial CSS 증가 허용치: baseline 대비 `+15%` 이내
- auth/theme/member 전환 시 shell-wide commit count: baseline 대비 `+10%` 이내
- focus/route transition 기반 불필요 refetch: baseline 대비 증가 금지
- representative query-heavy flow(`Members`, `Memberships`, `Reservations`)의 interaction latency: baseline 대비 악화 금지

Success criteria:
- foundation 대상 파일 목록과 migration ownership이 합의된다.
- “남길 것 / 바꿀 것 / 나중에 바꿀 것”이 구분된다.
- baseline performance budget과 visual/token inventory가 문서화된다.

#### Phase 1: Dependency and Provider Layer

- `frontend/package.json`에 `antd`, `zustand`, `@tanstack/react-query` 추가
- `main.tsx`에 `QueryClientProvider`, `ConfigProvider`, antd `App` 계층 배치
- QueryClient 기본 정책 정의
  - 예: reasonable `staleTime`, `gcTime`, retry, auth-sensitive defaults
- antd theme token 초안 정의
  - light/dark 브랜드 토큰
  - typography, radius, spacing, surface tone
- token mapping table 정의
  - `token`
  - `algorithm`
  - `components`
  - `cssVar`
  - `hashed`
- 기존 theme bootstrap을 antd algorithm과 연결하는 thin adapter 작성
- antd `reset.css`는 entry에서 한 번만 import하고, second reset은 추가하지 않음
- icon은 named import만 허용하고, heavy page/modal content는 lazy boundary 후보로 표시
- refresh 실패 시 access token memory clear -> session expired event -> redirect 순서를 고정
- provider 재배치가 unauthenticated login-first behavior를 바꾸지 않도록 보장

Success criteria:
- 앱이 Ant Design theme context와 QueryClient context 아래에서 정상 부팅한다.
- light/dark 전환과 first paint 계약이 유지된다.
- shell 바깥 feedback context 누락 없이 `App.useApp()` adapter가 동작한다.

#### Phase 2A: Zustand App State Baseline

- auth state를 Zustand slice로 이전
- theme preference/resolved theme를 Zustand slice로 이전
- slice pattern 적용 여부 판단
  - auth
  - theme
  - ui-feedback
- `Readonly` state, typed actions, `satisfies` 기반 initial slice를 표준으로 고정
- `any`, 무분별한 `Partial`, untyped payload를 금지
- selector 기반 소비와 필요 시 `useShallow`로 broad rerender를 줄인다
- 기존 `AuthStateProvider`, `ThemeProvider`는 thin compatibility adapter로 유지하다가 consumer audit 후 제거

Success criteria:
- 기존 auth/theme 흐름이 동작한다.
- provider/context 제거 또는 thin wrapper 전환 후에도 회귀가 없다.
- auth/theme 변경이 shell 전체 broad rerender로 번지지 않는다.

#### Phase 2B: Selected Member and Session-Sensitive State

- selected member 상태를 Zustand 기준으로 재정렬
- `selectedMemberId`와 selection UI status만 store에 두고, member detail은 TanStack Query key로 읽는다.
- 현재 `SelectedMemberContext`가 담당하는 auth-sensitive access precheck(`canAuthUserAccessMember`)는 제거하지 않고 유지한다. member detail query는 이 precheck가 성공한 뒤에만 실행되도록 contract를 고정한다.
- trainer/role-restricted flow에서는 unauthorized detail fetch를 먼저 시도하지 않는다. 실패 시에도 현재와 같은 “회원 선택 화면 유지 + 사용자 안전 메시지” UX를 유지한다.
- logout, auth bootstrap failure, center/user change, role downgrade 시 selected member reset contract를 고정한다.
- privileged cache invalidation과 route visibility recompute를 auth/session transition 순서에 포함한다.
- 기존 `SelectedMemberProvider`는 thin compatibility adapter로 유지하다가 page-by-page consumer audit 후 제거

Success criteria:
- selected member handoff가 유지된다.
- auth identity 변화 후 stale member context가 남지 않는다.
- route/session reset semantics가 문서와 구현에서 일치한다.
- selected member access precheck와 post-check UX가 기존 동작과 동일하게 유지된다.

#### Phase 3: Shell and Shared UI Replacement

- `DashboardLayout`, `HeaderLayout`, dashboard hero, nav surface를 antd `Layout`/`Menu`/`Card`/`Typography`로 교체
- 기존 custom `Modal`, `EmptyState`, `SkeletonLoader`, pagination/control surface를 antd 대응 컴포넌트로 교체
- global feedback 경로를 antd `App.useApp()` 기준으로 통일
  - `message`
  - `notification`
  - modal confirm
- CSS Modules에서 UI primitive 스타일 제거
- header/login UI에서는 raw backend error 문자열을 직접 노출하지 않고, 중앙 error mapper를 통한 sanitized copy만 사용
- broad page-level override를 제거하고 CSS Modules는 layout-specific concern에만 남긴다.
- shell replacement는 high-risk surface로 취급하고 desktop/tablet/narrow viewport collapse 규칙을 먼저 검증한다.

Success criteria:
- shell, header, common empty/loading/modal surface가 antd 기반으로 통일된다.
- antd static method context 문제 없이 feedback UI가 동일한 theme를 따른다.
- shell parity, theme parity, auth/session parity가 확인되기 전에는 Phase 4로 넘어가지 않는다.

#### Phase 4: Query Layer Standardization

- page별 `apiGet + local loading/error + useEffect` 패턴을 TanStack Query 기준으로 순차 전환
- query key factory 규칙 정의
  - `members.list(filters)`
  - `members.detail(memberId)`
  - `memberships.list(memberId)`
  - `reservations.list(filters)`
  - `products.list(filters)`
  - `trainers.list(filters)`
  - `access.list(filters)`
- mutation 성공 후 invalidation 표준 helper 도입
- 기존 debounce/dedupe가 필요한 입력 기반 검색은 `queryFn` + debounce input 경계를 분리해 유지
- list/detail/reference/search/mutation query policy matrix 정의
  - `staleTime`
  - `gcTime`
  - retry
  - focus/refetch
- auth endpoint와 `401/403`은 retry 제외 규칙을 둔다.
- `ApiClientError -> user-safe UI error` mapper를 shared path로 통일한다.
- per-query error surface에서 backend `detail`, `traceId`, stack-like text를 직접 렌더하지 않는다.
- query ownership은 feature module이 갖고, shared layer는 `QueryClient` defaults와 helper만 제공한다.
- page migration은 “legacy fetch/context” 또는 “Query/Zustand” 중 한 방향으로만 진행한다.

Success criteria:
- 새 query layer가 stale UI와 mutation 후 refresh를 일관되게 처리한다.
- 기존 auth refresh/retry 흐름과 충돌하지 않는다.
- 검색/autocomplete가 request churn 없이 동작한다.

#### Phase 5: Page Migration Waves

Wave 1A: shell-adjacent pages
- `Dashboard`
- `Login`

Wave 1B: interaction-heavy representative pages
- `Members`
- `Memberships`
- `Reservations`

Wave 2:
- `Access`
- `Lockers`
- `CRM`
- `Settlements`
- `Products`
- `Trainers`
- `GxSchedules`
- `TrainerAvailability`

각 wave에서:
- layout surface를 antd로 전환
- page state와 query를 새 기준으로 정렬
- CSS 정리
- regression test 갱신
- custom UI primitive dependency 제거
- typed smoke test, 401/refresh/invalidation check, rollback point 기록

virtualization / pagination threshold:
- 100개 이상 visible rows 또는 1,000개 이상 total records 예상 surface는 pagination + virtualization/windowing 후보로 검토
- 우선 후보: member search results, reservations, access logs, products, trainers

Success criteria:
- 페이지별 custom UI primitive 의존이 제거된다.
- page-scoped CSS가 layout 보조 수준으로 축소된다.
- render profile이 baseline 이상으로 악화되지 않는다.

#### Phase 6: Hardening, Validation, and Documentation Sync

- build/test/browser validation 수행
- 회귀 체크리스트 정리
- 아키텍처 문서와 실제 도입 상태 정합성 검증
- 필요 시 `docs/02_시스템_아키텍처_설계서.md` 와 다른 관련 문서 업데이트
- phase별 rollback note와 unfinished backlog를 고정
- negative security test와 route-guard verification 수행

Success criteria:
- 문서와 실제 구현이 더 이상 어긋나지 않는다.
- rollback point와 unfinished backlog가 명확하다.

## Alternative Approaches Considered

### 1. 문서만 수정하고 구현은 유지

- 장점: 가장 싸고 빠르다.
- 단점: 사용자의 목표와 반대이며, 이후 프론트 표준이 계속 흔들린다.
- 기각 이유: 이번 결정은 문서 정합성 회복이 아니라 실제 기준선 전환이다.

### 2. 신규 화면부터만 Ant Design 사용

- 장점: 초기 리스크가 낮다.
- 단점: custom UI와 antd가 장기간 공존해 이중 체계가 굳어진다.
- 기각 이유: 전면 도입 목표와 공통 UI 교체 원칙에 어긋난다.

### 3. 프론트엔드를 사실상 재작성

- 장점: 최종 일관성은 높다.
- 단점: 현재 shell, role gating, auth/session, selected member, page query 흐름을 한 번에 다시 검증해야 해 리스크가 크다.
- 기각 이유: 기존 재구축 자산과 테스트를 버릴 이유가 충분하지 않다.

## System-Wide Impact

### Interaction Graph

- 앱 부트:
  - `main.tsx` provider 구성
  - auth/theme bootstrap
  - router mount
  - shell/login render
- 로그인 성공:
  - auth mutation
  - access token 저장 및 api auth hooks 갱신
  - auth slice 갱신
  - route guard 재평가
  - sidebar/dashboard visibility 재계산
- 회원 선택:
  - selected member action
  - 권한 검사
  - member detail query
  - 관련 page panels rerender
  - downstream membership/reservation/access pages refresh
- mutation 성공:
  - page mutation success
  - query invalidation
  - active list/detail refetch
  - success feedback surface 표시

### Error & Failure Propagation

- transport layer는 계속 [`frontend/src/api/client.ts`](../../../frontend/src/api/client.ts) 의 `ApiClientError`를 사용한다.
- query layer 도입 후에도 401 refresh retry는 transport 책임으로 유지하고, TanStack Query는 그 위에서 pending/error/stale lifecycle만 담당한다.
- Ant Design modal/message/notification는 `App.useApp()` 기반으로만 사용해 provider context 손실을 피한다.
- Zustand slice 업데이트와 query invalidation이 같은 이벤트에서 섞일 때, 실패 시 partial state가 남지 않도록 success path에서만 전이시키는 규칙이 필요하다.
- refresh 실패는 query별 반복 토스트가 아니라 단일 session-expired event로 수렴시킨다.
- role visibility는 UX 보조일 뿐이며, protected-route enforcement와 backend authorization alignment를 대체하지 않는다.

### State Lifecycle Risks

- auth state를 Zustand로 옮길 때 localStorage/session bootstrap drift가 생길 수 있다.
- theme state를 옮길 때 DOM `data-theme` 적용 시점이 늦어지면 first paint flash가 생길 수 있다.
- selected member 상태를 global slice로 옮길 때 auth identity 변경 시 reset 누락 위험이 있다.
- query migration 중 일부 화면만 TanStack Query로 옮겨진 상태에서는 manual fetch와 invalidate 정책이 섞이며 stale data가 생길 수 있다.
- auth/session transition 시 selected member clear -> privileged cache invalidate -> route visibility recompute 순서가 어긋나면 stale authorization 또는 stale member context가 남을 수 있다.

### API Surface Parity

- `apiGet`, `apiPost`, `apiPatch`, `apiPut`, `apiDelete` helper는 유지한다.
- route guard, role visibility, auth refresh behavior, selected member 권한 검사 같은 도메인 계약은 UI 라이브러리 전환과 무관하게 동일해야 한다.
- mock/live mode 전환 surface는 login/header에서 동일하게 계속 제공돼야 한다.

### Integration Test Scenarios

1. 초기 진입 시 light/dark first paint와 antd theme가 일치한다.
2. JWT 로그인 후 role별 sidebar 메뉴와 protected route 접근이 기존과 동일하다.
3. selected member를 고른 뒤 memberships/reservations/access 화면 이동 시 컨텍스트가 유지되거나 의도된 규칙대로 리셋된다.
4. selected member access precheck 실패 시 unauthorized detail query를 발사하지 않고, 현재와 같은 안전 메시지와 selection 유지 UX를 제공한다.
5. mutation 성공 후 관련 list/detail query가 자동으로 갱신되고 stale UI가 남지 않는다.
6. modal/message/notification가 light/dark와 브랜드 토큰을 모두 올바르게 반영한다.

## Acceptance Criteria

### Functional Requirements

- [ ] `frontend`가 `Ant Design 5.x`, `Zustand`, `TanStack Query 5.x`를 실제 dependency로 포함한다.
- [ ] `main.tsx`가 `QueryClientProvider + ConfigProvider + antd App` 기반으로 재구성된다.
- [ ] auth, theme, selected member, global UI feedback 중 적어도 foundation-level 공유 상태가 Zustand로 이전된다.
- [ ] shell layout, header, dashboard 진입 surface가 Ant Design 기반으로 재구성된다.
- [ ] custom `Modal`, `EmptyState`, `SkeletonLoader` 같은 공통 UI가 Ant Design 대응 surface로 교체된다.
- [ ] 서버 상태 조회/변경의 기준이 TanStack Query로 정의되고, query key 및 invalidation 규칙이 문서화된다.
- [ ] `queryKeys` factory와 shared `ApiClientError -> UI error` mapper가 정의된다.
- [ ] Wave 1과 Wave 2에 포함된 전체 페이지가 새 기준으로 마이그레이션된다.
- [ ] 기존 login-first, role gating, selected member handoff UX는 유지된다.
- [ ] selected member access precheck와 unauthorized-selection UX가 기존 계약대로 유지된다.

### Non-Functional Requirements

- [ ] light/dark 전환과 first paint 품질이 기존 수준 이상으로 유지된다.
- [ ] auth/theme/member 변경 시 shell-wide broad rerender가 baseline보다 악화되지 않는다.
- [ ] selector/query 경계 설계로 broad rerender와 effect loop 회귀를 피한다.
- [ ] first-load JS 증가량이 baseline 대비 `+20%` 이내다.
- [ ] first-load CSS 증가량이 baseline 대비 `+15%` 이내다.
- [ ] focus/refetch로 인한 불필요한 refetch가 baseline 대비 증가하지 않는다.
- [ ] global CSS 크기와 책임 범위가 축소된다.
- [ ] Ant Design 도입 후에도 tablet width 기준 화면 사용성이 유지된다.
- [ ] 접근성 기본 계약이 후퇴하지 않는다.

### Quality Gates

- [ ] `frontend/npm test`
- [ ] `frontend/npm run build`
- [ ] 대표 페이지 브라우저 smoke
- [ ] 로그인, sidebar navigation, modal action, selected member flow 검증
- [ ] selected member unauthorized-selection flow 검증
- [ ] logout, refresh-failure, role downgrade, direct URL access negative test
- [ ] theme toggle, member switch, rapid navigation, repeated modal open/close churn smoke
- [ ] 문서 정합성 확인

## Risk Analysis & Mitigation

### Risk: UI 라이브러리와 기존 CSS 충돌

- mitigation:
  - foundation phase에서 global CSS 책임을 먼저 줄인다.
  - antd reset 적용 범위와 custom selectors 충돌을 점검한다.

### Risk: 상태 경계 혼선

- mitigation:
  - “Zustand는 앱/UI 상태, TanStack Query는 서버 상태” 원칙을 plan/PR에서 반복 검증한다.
  - selected member는 store ownership과 query ownership을 분리한다.

### Risk: feedback context 손실

- mitigation:
  - `message/notification/Modal.confirm`는 `App.useApp()`를 표준으로 강제한다.

### Risk: 점진 이행 중 stale data 또는 이중 fetch

- mitigation:
  - page별 migration 단위마다 query ownership을 완결시킨다.
  - manual fetch와 query fetch가 공존하는 기간을 최소화한다.
  - 한 페이지는 한 번에 한 방향으로만 migration한다.

### Risk: 기존 운영 UX 회귀

- mitigation:
  - login-first, sidebar role visibility, selected member handoff를 phase gate에 포함한다.

### Risk: IA regression disguised as component migration

- mitigation:
  - shell/navigation/workspace placement를 frozen contract로 두고 visual polish보다 먼저 검증한다.
  - narrow-width layout stability와 sidebar behavior를 대표 smoke에 포함한다.

### Risk: sensitive auth or backend diagnostics leaking into UI state

- mitigation:
  - token은 memory-only 유지, Zustand/query cache/localStorage 저장 금지
  - user-facing feedback는 sanitized mapper를 거치고 raw backend detail/trace id는 dev-only logging에 제한

## Resource Requirements

- 프론트엔드 구조를 이해하는 구현자 1명 이상
- representative page별 브라우저 검증 시간
- 필요 시 backend mock/live 환경 확인 시간

## Documentation Plan

- 이 계획 문서
- origin brainstorm 문서 cross-reference 유지
- 필요 시 [`docs/02_시스템_아키텍처_설계서.md`](../02_시스템_아키텍처_설계서.md) 의 프론트엔드 기술 스택 및 컨테이너 설명 검증
- migration 도중 새 규칙이 정해지면 `docs/notes/` 또는 `docs/solutions/`에 후속 기록

## Success Metrics

- shell 및 representative pages에서 custom shared UI 의존 제거
- auth/theme/member-context foundation이 Zustand 기준으로 정렬
- 대표 query flows가 TanStack Query 기준으로 통일
- 문서와 실제 frontend foundation stack이 일치
- baseline 대비 shell interaction churn과 불필요한 refetch가 악화되지 않음
- Wave 2까지 포함한 전체 shell route surface에서 legacy custom UI primitive 의존 제거

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-27-frontend-ant-design-zustand-brainstorm.md](../brainstorms/2026-03-27-frontend-ant-design-zustand-brainstorm.md)
  - Key decisions carried forward:
    - Ant Design 5.x 전면 도입
    - 셸 우선 재구축 후 페이지 순차 교체
    - Zustand는 앱/UI 상태 전용, 서버 상태는 TanStack Query 유지

### Internal References

- [`frontend/src/main.tsx`](../../../frontend/src/main.tsx)
- [`frontend/src/App.tsx`](../../../frontend/src/App.tsx)
- [`frontend/src/app/auth.tsx`](../../../frontend/src/app/auth.tsx)
- [`frontend/src/app/theme.tsx`](../../../frontend/src/app/theme.tsx)
- [`frontend/src/app/routes.ts`](../../../frontend/src/app/routes.ts)
- [`frontend/src/api/client.ts`](../../../frontend/src/api/client.ts)
- [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](../../../frontend/src/pages/members/modules/SelectedMemberContext.tsx)
- [`frontend/src/components/layout/DashboardLayout.tsx`](../../../frontend/src/components/layout/DashboardLayout.tsx)
- [`frontend/src/components/layout/HeaderLayout.tsx`](../../../frontend/src/components/layout/HeaderLayout.tsx)
- [`frontend/src/shared/ui/Modal.tsx`](../../../frontend/src/shared/ui/Modal.tsx)
- [`docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`](../solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)
- [`docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`](../solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md)
- [`docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md`](../solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md)
- [`docs/plans/2026-03-09-refactor-frontend-state-ownership-and-query-lifecycle-plan.md`](./2026-03-09-refactor-frontend-state-ownership-and-query-lifecycle-plan.md)
- [`docs/plans/2026-03-13-feat-frontend-field-ops-redesign-plan.md`](./2026-03-13-feat-frontend-field-ops-redesign-plan.md)

### External References

- Ant Design Customize Theme: https://ant.design/docs/react/customize-theme
- Ant Design ConfigProvider: https://ant.design/components/config-provider
- Ant Design App package / static methods context FAQ: https://ant.design/docs/react/faq
- Zustand docs: https://zustand.docs.pmnd.rs/
- TanStack Query React overview: https://tanstack.com/query/latest/docs/framework/react/overview
- TanStack Query QueryClient reference: https://tanstack.com/query/latest/docs/reference/QueryClient
