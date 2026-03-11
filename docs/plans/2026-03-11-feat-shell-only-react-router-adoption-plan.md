---
title: feat: adopt shell-only React Router for admin sections
type: feat
status: active
date: 2026-03-11
---

# feat: adopt shell-only React Router for admin sections

## Enhancement Summary

**Deepened on:** 2026-03-11  
**Sections enhanced:** scope boundary, route contract, state ownership, migration strategy, verification plan

### Key Improvements
1. `shell-only routing`의 범위를 `섹션 URL 반영`으로만 고정하고, `selectedMemberId` 같은 업무 상태는 URL에서 제외했다.
2. 현재 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx` 조합 구조를 유지하면서도 `activeNavSection`을 URL로 치환하는 점진적 도입 경로를 명시했다.
3. refresh/deep-link 이득은 얻되, workspace reset, auth bootstrap, loader stale-response 계약은 깨지지 않도록 검증 포인트를 추가했다.
4. `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx`를 sidebar/dashboard/shared navigation metadata의 canonical source로 끌어올리는 방향을 추가했다.
5. `BrowserRouter` 기반 1차 도입과 이후 detail/query routing으로 확장하는 전환 경계를 분리했다.

## Overview
현재 프런트는 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx` 내부 상태로 섹션을 전환한다. 이번 작업은 `React Router`를 전면 도입하지 않고, `dashboard`, `members`, `memberships`, `reservations`, `access`, `lockers`, `products`, `crm`, `settlements` 같은 상위 섹션만 URL로 반영하는 `shell-only routing`을 도입한다.

이번 범위에서는 `selectedMemberId`, 상세 모달 open 상태, 검색어, 필터, workspace-local form state는 여전히 React state에 남긴다.

### Research Insights

**Why this fits the repo now**
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`는 여전히 auth bootstrap, selected member, 각 workspace query/state/reset을 조합하는 상위 shell이다.
- 현재 구조에서 `full routing`까지 가면 URL과 internal workspace state를 한 번에 맞춰야 해서 회귀 범위가 커진다.
- `shell-only`는 `activeNavSection`만 URL로 치환하므로 가장 작은 라우팅 도입이다.

**Vercel React best-practice alignment**
- `bundle-conditional`: 섹션 기준 lazy panel split과 자연스럽게 결합 가능
- `rerender-derived-state-no-effect`: 현재 섹션은 URL에서 직접 derive하고, 별도 sync effect를 최소화해야 함
- `advanced-init-once`: auth bootstrap은 기존처럼 app-level에서 한 번만 유지

**Router choice for this phase**
- 현재 `/Users/abc/projects/GymCRM_V2/frontend/src/main.tsx`는 단순 root render 구조이므로 `BrowserRouter`가 가장 작은 도입이다.
- `createBrowserRouter`나 data router는 loader/action 체계까지 함께 설계하게 만들어 범위를 키운다.
- 이번 단계는 URL 반영만 목표이므로 `BrowserRouter + useLocation/useNavigate + <Navigate>` 조합으로 충분하다.

## Problem Statement / Motivation
현재 앱은 사이드바 기반 운영 콘솔이지만 URL이 섹션 상태를 반영하지 않는다. 그 결과 다음 문제가 있다.

- 새로고침 시 현재 섹션 복원이 약하다.
- 직접 진입 가능한 운영 화면 URL이 없다.
- 북마크/공유/브라우저 뒤로가기의 가치가 낮다.
- `activeNavSection`이 여전히 `App.tsx` 내부 상태로만 관리된다.

반면 지금 즉시 `memberId`까지 포함한 전면 라우팅으로 가면 `selectedMember`, auth reset, workspace reset, stale response guard를 다시 큰 폭으로 맞춰야 한다.

### Research Insights

**What we are not solving yet**
- `/members/:memberId`
- `/reservations?memberId=123`
- 모달 open 상태 복원
- 검색/필터 query param 동기화

이것들은 모두 후속 단계에서 별도 상태 ownership 정리가 더 된 뒤 다뤄야 한다.

## Proposed Solution
`react-router-dom`을 도입하고, 앱 shell 수준에서만 route를 분리한다.

1. `/Users/abc/projects/GymCRM_V2/frontend/src/main.tsx`에 router provider를 도입한다.
2. `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`는 기존처럼 auth/session/workspace coordinator 역할을 유지한다.
3. 현재 `activeNavSection`은 URL pathname에서 derive한다.
4. 사이드바와 dashboard quick action은 `setActiveNavSection(...)` 대신 route navigation을 사용한다.
5. section component 렌더 분기는 route 기반으로 바꾸되, 기존 lazy panel 구조와 workspace state wiring은 유지한다.

### Research Insights

**Recommended route surface**
- `/`
- `/login`
- `/dashboard`
- `/members`
- `/memberships`
- `/reservations`
- `/access`
- `/lockers`
- `/products`
- `/crm`
- `/settlements`

**Recommended non-goals**
- `memberId`, modal state, filter state를 URL에 넣지 않음
- nested route tree를 크게 만들지 않음
- data router migration까지 같이 하지 않음

**Recommended route table shape**
- `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx`는 shell navigation과 preview/detail metadata를 같은 파일에서 관리하되, export를 명시적으로 분리하는 것이 좋다.
- 권장 구조는 `shellRoutes`와 `routePreviewRoutes`의 이중 export다.
- `shellRoutes`만 이번 라우팅 구현의 canonical source로 사용한다.
- 기존 preview/detail route 항목(`/members/:memberId`, `/products/new`)은 `routePreviewRoutes` 또는 별도 `allRoutes`에 남기고, sidebar/dashboard/App section derive에서는 읽지 않는다.
- `key`: 기존 section identity
- `path`: shell URL
- `label`: sidebar/dashboard 표시용 이름
- `description`: sidebar 설명
- `protected`: JWT 모드에서 인증 필요 여부
- `showInSidebar`: 사이드바 노출 여부
- `showInDashboard`: dashboard quick action 노출 여부
- `shellRoutes` metadata를 `SidebarNav`, `DashboardSection`, `App.tsx`가 같이 써야 hardcoded route drift를 막을 수 있다.
- `routePreview`는 기존처럼 non-shell preview use case를 위해 유지하되, shell navigation source와 혼용하지 않는다.

## Scope
포함:
- `react-router-dom` 의존성 추가
- shell route table 추가
- sidebar/dashboard navigation을 route navigation으로 전환
- URL에서 active section derive
- 새로고침 시 같은 section 유지

제외:
- member detail route
- query param filters
- selected member state URL 동기화
- nested detail routes
- backend 변경

### Research Insights

**Boundary to preserve**
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`는 이번 단계에서도 state coordinator로 유지
- 각 workspace hook은 route-aware가 아니라 여전히 selected member / auth / filter state만 봄
- auth screens는 route-aware가 되더라도 기존 bootstrap/login/unknown-security gating 순서는 유지

**Explicitly out of route state**
- `selectedMemberId`
- `selectedMember`
- `isDetailOpen` 같은 modal booleans
- 회원 검색어, 예약 검색어, 상품/트레이너/기간 필터
- reservation/member/access workspace-local pagination state

이 항목들을 route에 넣기 시작하면 shell-only가 아니라 detail/query routing으로 넘어간다.

## Technical Considerations
### Routing Contract
- `/`는 `/dashboard`로 보낸다.
- `pathname`에서 현재 섹션을 계산한다.
- 잘못된 경로는 `/dashboard`로 보낸다.
- 로그인되지 않은 JWT 모드에서는 protected section 접근 시 로그인 화면으로 보낸다.
- prototype 모드에서는 `/login`으로 강제 redirect 하지 않는다.
- 이번 단계에서는 `returnTo` query param을 도입하지 않는다.

### State Ownership
- URL이 소유하는 상태:
  - 현재 상위 section
- React state가 계속 소유하는 상태:
  - `selectedMemberId`
  - `selectedMember`
  - membership/reservation/access/locker/crm/settlement/product workspace state
  - modal open state
  - 검색어와 필터

### File Candidates
- `/Users/abc/projects/GymCRM_V2/frontend/src/main.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx`

### Research Insights

**Migration shape**
- 기존 `routes.tsx`는 route preview metadata로 이미 존재하므로, 파일은 유지하되 export를 `shellRoutes`와 `routePreviewRoutes`로 분리하는 쪽이 가장 안전하다.
- `SidebarNav`는 button navigation이므로, `Link` 또는 `navigate()`로 바꿔도 역할은 거의 동일
- `DashboardSection` quick action도 동일한 navigation contract를 재사용해야 navigation surface inconsistency를 피함
- `routePreview`는 dashboard의 "최근 활동/API 라우트 프리뷰" 용도로만 남기고, section navigation과 의도적으로 분리한다.

**Composition shape**
- `/Users/abc/projects/GymCRM_V2/frontend/src/main.tsx`
  - `<BrowserRouter><App /></BrowserRouter>` 정도만 추가
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
  - `useLocation()`으로 active section derive
  - 섹션 분기와 auth gate/fallback orchestration 유지
- `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx`
  - button 기반이어도 되지만 navigation은 `navigate(path)`를 사용
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx`
  - 기존 `onNavigate(sectionKey)` 대신 route metadata 기반 navigation 사용

**Avoid this trap**
- `pathname -> local state -> render`와 `local state -> navigate -> render`를 동시에 유지하면 이중 source of truth가 된다.
- 이번 작업에서는 `activeNavSection` state를 제거하거나, 최소한 pathname에서만 derive되게 해야 한다.

**Recommended fallback behavior**
- unknown path: `/dashboard`
- protected path in JWT unauthenticated state: login/auth gate
- authenticated user on `/login`: dashboard로 보정할지 여부를 구현 시 명확히 하나로 고정
- bootstrapping 중에는 route를 먼저 바꾸기보다 현재 bootstrap screen을 우선 유지

## System-Wide Impact
- 브라우저 뒤로가기/앞으로가기 동작이 section 전환과 일치하게 된다.
- 새로고침 시 현재 section이 유지된다.
- sidebar/dashboard quick actions/content header가 같은 route source를 공유하게 된다.
- selected member context는 여전히 route와 독립이므로, `/reservations`로 새로 진입했을 때 선택 회원이 비어 있는 상태는 정상으로 본다.

### Research Insights

**Expected UX shift**
- 사용자는 "탭 전환"처럼 보던 동작을 이제 URL 이동으로 경험한다.
- 하지만 내부 업무 흐름은 그대로 유지되므로, 큰 정보 구조 재학습은 필요 없다.

**Known tradeoff**
- refresh 후 현재 section은 복원되지만, `selectedMember`는 복원되지 않을 수 있다.
- 이건 이번 단계에서 의도된 제한이다.
- 따라서 `/reservations` 새로고침 후 member picker/list view로 돌아오는 동작은 정상으로 간주한다.

## Acceptance Criteria
- [x] `/Users/abc/projects/GymCRM_V2/frontend/package.json`에 `react-router-dom`이 추가된다.
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/main.tsx`가 router provider로 앱을 감싼다.
- [ ] `/dashboard`, `/members`, `/memberships`, `/reservations`, `/access`, `/lockers`, `/products`, `/crm`, `/settlements` 진입이 가능하다.
- [x] 잘못된 경로는 `/dashboard`로 보정된다.
- [x] sidebar navigation이 URL을 변경한다.
- [x] dashboard quick action도 같은 route navigation을 사용한다.
- [ ] refresh 후 같은 section이 유지된다.
- [x] `selectedMemberId`와 modal/filter state는 URL에 저장되지 않는다.
- [x] JWT 모드에서 unauthenticated 상태는 protected section 대신 login/auth gate로 이어진다.
- [x] prototype 모드에서는 `/login` 없이 section route 진입이 가능하다.
- [x] `/` 진입 시 `/dashboard`로 정리된다.
- [x] `/Users/abc/projects/GymCRM_V2/frontend && npm run build` 통과

### Quality Gates
- [x] 최소한 route fallback 동작 검증
- [x] sidebar와 dashboard가 같은 route surface를 쓰는지 검증
- [ ] prototype/jwt 모드에서 refresh 진입 검증
- [x] `activeNavSection` 이중 source of truth 제거 여부 확인
- [ ] browser back/forward가 section 전환과 일치하는지 확인
- [x] JWT unauthenticated 상태에서 redirect loop가 없는지 확인
- [ ] section route 전환만으로 `selectedMember`가 불필요하게 reset되지 않는지 확인
- [ ] `/login`과 protected route 사이 auth bootstrap 시각 차이로 flicker/flash redirect가 없는지 확인

### Testing Notes
- 단위/컴포넌트 테스트:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.routing.test.tsx`로 `/`, unknown path, JWT unauth protected route redirect 확인
  - `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.test.tsx`로 sidebar link surface 확인
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.test.tsx`로 dashboard quick action link surface 확인
  - `MemoryRouter`로 `/dashboard`, `/members`, `/reservations` seed 진입 확인
  - unknown path 진입 시 fallback 확인
  - JWT unauthenticated 조건에서 protected route 접근 시 auth gate 확인
- 수동 브라우저 테스트:
  - sidebar 클릭
  - dashboard quick action 클릭
  - 새로고침
  - 브라우저 뒤로가기/앞으로가기
  - prototype/jwt 각각에서 `/members` 직접 진입

### Validation Log
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-11-shell-routing-validation-log.md`

## Implementation Steps
1. `/Users/abc/projects/GymCRM_V2/frontend/package.json`에 `react-router-dom` 추가
2. `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx`를 `shellRoutes`와 `routePreviewRoutes` export로 분리
3. `/Users/abc/projects/GymCRM_V2/frontend/src/main.tsx`에 `BrowserRouter` 도입
4. `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에서 pathname 기반 active section derive
5. `activeNavSection` local state 제거 또는 pathname-derived read-only로 축소
6. `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx`를 route navigation으로 전환
7. `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx` quick action을 같은 route contract로 전환
8. `/`, unknown path, JWT unauthenticated protected path fallback 정리
9. build, route smoke, refresh/back-forward 검증

## Risks & Dependencies
- `App.tsx`에서 section source of truth가 두 개가 되면 회귀가 생긴다.
- auth bootstrap과 route fallback이 엉키면 login/dashboard redirect loop가 생길 수 있다.
- selected member state를 URL에 넣지 않으므로, 일부 사용자는 refresh 후 member context 소실을 경험할 수 있다. 이번 단계에서는 허용된 tradeoff로 본다.
- route metadata가 sidebar/dashboard/content header에서 따로 복제되면 다시 drift가 생긴다.
- shell route와 preview/detail route export 경계가 흐리면 non-goal route가 navigation surface로 새어 나올 수 있다.

### Research Insights

**When to go beyond shell-only later**
- member context를 deep-link 해야 하는 운영 요구가 생길 때
- 브라우저 새로고침 후 같은 상세 업무 상태 복원이 필요해질 때
- `/members/:memberId`, `/reservations?memberId=` 같은 직접 진입 가치가 명확해질 때
- search/filter/pagination state를 URL로 남겨야 하는 운영 요구가 생길 때

그 전까지는 shell-only가 비용 대비 가장 안전하다.

## Follow-up Work
- `memberId` 기반 detail route 검토
- filter/query param sync 검토
- reservations/memberships member-context URL화 검토
- shell-only 도입 후 route usage 패턴을 보고 full routing 필요성 재판단

## Sources & References
- `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-11-react-router-adoption-comparison-brainstorm.md`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx`
- `/Users/abc/projects/GymCRM_V2/.agents/skills/vercel-react-best-practices/SKILL.md`
