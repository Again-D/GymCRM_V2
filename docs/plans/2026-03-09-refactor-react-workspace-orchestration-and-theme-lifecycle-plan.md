---
title: "refactor: React workspace orchestration and theme lifecycle"
type: refactor
status: completed
date: 2026-03-09
---

# refactor: React workspace orchestration and theme lifecycle

## Enhancement Summary
**Deepened on:** 2026-03-09  
**Sections enhanced:** Overview, Local Research Summary, Proposed Solution, Technical Approach, Acceptance Criteria, Sources & References

### Key Improvements
1. workspace loader hook 분리 시 stale-response guard와 dependency 경계를 더 구체화했다.
2. `WorkspaceMemberPicker`의 query hook 분리 범위를 React 공식 guidance와 현재 React 버전 제약까지 반영해 정교화했다.
3. theme hook의 `matchMedia`/`localStorage` 예외 처리와 `content-visibility` 적용 조건을 브라우저 문서 기준으로 보강했다.

### New Considerations Discovered
- 현재 프로젝트의 React 18.3 계열에서는 `useEffectEvent`를 전제로 바로 설계하지 말고, ref 기반 최신 callback 패턴을 기본값으로 두는 편이 안전하다.
- `content-visibility: auto`는 접근성 트리를 유지하지만, 실제 UI에 적용할 때는 `contain-intrinsic-size`를 함께 설계하지 않으면 스크롤 점프가 생길 수 있다.

## Overview

최근 PR #58, PR #59를 통해 workspace-local 상태와 member search query lifecycle의 1차 정리는 끝났다. 다음 단계는 `App.tsx`에 남아 있는 workspace 초기화 orchestration, `WorkspaceMemberPicker`의 UI/async 결합, theme lifecycle effect 묶음, 긴 리스트 렌더링 완충 장치를 정리해 React 성능/유지보수 기준을 한 단계 더 끌어올리는 것이다.

이번 범위는 기능 추가가 아니라 **프론트엔드 orchestration 책임 축소와 lifecycle 경계 명확화**에 초점을 둔다. 특히 Vercel React best practices의 다음 규칙을 직접 겨냥한다.

- `client-swr-dedup`
- `rerender-dependencies`
- `rerender-derived-state-no-effect`
- `rerender-move-effect-to-event`
- `advanced-use-latest`
- `client-event-listeners`
- `rendering-content-visibility`

## Problem Statement

현재 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`는 workspace-local state bundle을 상당수 분리한 이후에도 여전히 다음 책임을 넓게 소유한다.

- 인증 bootstrap / refresh wiring
- workspace 진입 시점의 초기 fetch orchestration
- theme preference / resolved theme / DOM 반영 / storage persistence / media-query subscription
- workspace member picker search loader 연결

이 구조는 이전보다 훨씬 나아졌지만, 아직도 다음 리스크가 남아 있다.

1. `App.tsx`의 `useEffect`가 탭별 데이터 초기화까지 직접 소유해 변경 영향 범위가 넓다.
2. `WorkspaceMemberPicker`가 render UI와 debounce/request-id/loading/error를 함께 들고 있어 재사용 경계가 흐리다.
3. theme 관련 effect가 여러 개로 분산되어 있어 파생 상태와 DOM side-effect의 경계가 약하다.
4. 회원/출입/CRM/상품 같은 목록 화면은 현재 데이터 규모에서는 버티지만, 긴 리스트에 대한 렌더링 완충 전략이 없다.

## Motivation

이 작업은 단순 미관 정리가 아니다. 이후 기능 추가 시 다음 비용을 줄이기 위한 구조 정리다.

- 새 workspace 추가 또는 기존 workspace 초기화 정책 변경 시 `App.tsx` 수정 범위 최소화
- UI 컴포넌트와 async lifecycle을 분리해 테스트 가능한 경계 확보
- theme 관련 회귀를 한 곳에서 관리
- 대형 센터 데이터에서 목록 렌더 지연 가능성 선제 완화

## Local Research Summary

### Repo Findings

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1118` 이후에 탭 진입/인증/테마 관련 orchestration effect가 집중되어 있다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx`는 debounce, request id guard, loading/error, row rendering을 함께 처리한다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceMemberSearchLoader.ts`는 cache/in-flight dedupe만 담당하며, UI 상태는 담당하지 않는다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1195` 이후 theme lifecycle이 `resolvedTheme derive`, DOM 반영, `localStorage` write, `matchMedia` listener로 분산돼 있다.

### Institutional Learnings

- `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
  - 탐색 구조와 workspace 책임 경계는 한 번 정리한 뒤 다시 뒤섞지 않는 것이 중요하다.
- `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
  - `useDeferredValue`만으로는 네트워크 debounce를 대체할 수 없고, fetch lifecycle은 별도 경계로 다뤄야 한다.
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`
  - 지금 단계에서는 SWR 전면 도입보다 workspace-local query와 orchestration split이 우선이다.
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-product-locker-crm-settlement-state-ownership-validation.md`
  - workspace-local state split은 끝났지만, `App.tsx`는 여전히 orchestration 책임을 크게 소유한다.

### External Research Decision

강한 로컬 컨텍스트가 있고, 이번 범위는 기존 React/Vite 앱의 구조 정리다. 다만 React 공식 문서와 MDN의 브라우저 API 문서를 기준 참고로만 추가 반영한다.

### Research Insights

**React 공식 guidance**
- custom hook으로 effect를 추출할 때는 “reactive trigger”와 “latest value access”를 분리하는 것이 핵심이다. 현재 코드베이스와 React 버전 기준에서는 `useRef` 기반 최신 callback 보존 패턴이 가장 무난하다.
- `useDeferredValue`는 렌더 우선순위를 조절하는 도구이지 네트워크 debounce를 대체하지 않는다. 따라서 picker query hook에서도 debounce는 별도 네트워크 경계로 유지해야 한다.

**Browser API guidance**
- MDN 기준 `matchMedia()`는 현재 브라우저 전반에서 안정적이지만, 즉시 조회(`matches`)와 변경 구독(`change`)을 분리해서 다루는 쪽이 구조상 명확하다.
- MDN 기준 `localStorage`는 `SecurityError` 가능성이 있으므로 hook 내부에서 예외를 삼키고 in-memory fallback을 유지하는 전략이 맞다.
- MDN 기준 `content-visibility: auto`는 접근성 트리를 유지하지만, 실용적으로는 `contain-intrinsic-size`를 같이 두어 오프스크린 구간의 기본 크기를 안정화해야 한다.

## Proposed Solution

후속 리팩토링을 네 개의 묶음으로 나눈다.

1. `App.tsx`에 남은 workspace initialization effect를 workspace-specific loader hook으로 이동
2. `WorkspaceMemberPicker`의 async query lifecycle을 전용 hook으로 분리
3. theme lifecycle을 `useThemePreference` 계열 hook으로 통합
4. 긴 리스트 화면에 `content-visibility` 또는 equivalent rendering guard를 점진 적용

핵심 원칙은 다음과 같다.

- shared cross-workspace context만 `App.tsx`에 둔다.
- workspace-local fetch lifecycle은 workspace hook 또는 shared query hook으로 내린다.
- render에서 계산 가능한 값은 effect로 재생성하지 않는다.
- UI 컴포넌트는 가능하면 “상태를 모르는 view”에 가깝게 유지한다.
- virtualization까지 즉시 가지 말고, CSS 레벨의 완충부터 적용한다.

## Technical Approach

### Phase 1: Workspace Orchestration Extraction

#### Scope

`App.tsx`에 남은 다음 effect를 분리한다.

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1127` reservations member-load effect
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1143` access workspace init
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1160` locker workspace init
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1177` settlement workspace init
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1186` CRM workspace init

#### Plan

- `useReservationsWorkspaceLoader`
- `useAccessWorkspaceLoader`
- `useLockerWorkspaceLoader`
- `useSettlementWorkspaceLoader`
- `useCrmWorkspaceLoader`

형태로 분리하되, 각 hook은 다음만 받는다.

- `enabled` 또는 `activeNavSection === ...` 결과 boolean
- 필요한 shared identifiers (`selectedMemberId`, `isAuthenticated`)
- 실제 fetcher 함수 references
- workspace-local error setter 또는 callback

#### Shared Preload Ownership

이번 단계에서 shared preload ownership은 아래처럼 고정한다.

- `members`, `products`, 인증 사용자/토큰 컨텍스트는 계속 `App.tsx`의 app-shared state로 유지한다.
- workspace loader hook은 shared preload를 **직접 소유하지 않는다**. 필요 시 `ensureMembersLoaded()` 같은 shared preload helper 또는 stable fetcher를 호출해 “소비”만 한다.
- `access`와 `lockers`처럼 `members` preload가 필요한 workspace는 hook 내부에서 `loadMembers()`를 임의 호출하지 않고, app-shared preload boundary를 통해서만 접근한다.
- Phase 1의 목표는 “workspace-local init effect 분리”이지 “shared list ownership 이동”이 아니다. shared preload ownership 변경은 별도 후속 범위로 남긴다.
- 중복 fetch 방지를 위해 shared preload helper는 최소한 `이미 rows가 있으면 skip` 규칙을 보장해야 하며, 필요하면 기존 app-level dedupe를 재사용한다.

구현 후보는 두 가지 중 하나로 제한한다.

1. `App.tsx`가 `ensureMembersLoaded` / `ensureProductsLoaded` 같은 stable helper를 내려준다.
2. shared preload helper hook를 만들되, 내부 state ownership은 여전히 `App.tsx`에 남긴다.

이 단계에서는 `members` preload를 각 workspace loader hook으로 분산 소유하는 방식은 채택하지 않는다.

#### Rules Applied

- `rerender-dependencies`: effect dependency를 primitive boundary 중심으로 좁힌다.
- `rerender-move-effect-to-event`: 탭 진입과 member switch처럼 명확한 trigger를 hook 내부에서 캡슐화한다.
- `advanced-use-latest`: 필요 시 fetcher ref를 사용해 effect 의존성 노이즈를 줄인다.

#### Expected Outcome

- `App.tsx`는 “무엇을 연결하는지”만 남고 “언제 어떤 탭을 초기화하는지”는 workspace별 hook이 담당한다.

#### Research Insights

**Implementation details**
- loader hook은 `enabled`가 `false`일 때 early return하는 단순한 effect 구조를 유지한다.
- fetcher 함수 identity가 자주 바뀌는 구조라면 hook 내부에 `fetcherRef`를 두고 최신 함수만 보존한다.
- reservations처럼 `selectedMemberId`에 반응하는 loader는 “enabled + selectedMemberId primitive”만 dependency로 두고, panel error setter는 최신 ref 또는 stable callback으로 받는 편이 안전하다.
- shared preload가 필요한 workspace loader는 `ensureMembersLoaded()` 완료 후 자기 workspace fetch를 진행하는 2단계 구조를 사용한다.

**Edge cases**
- 탭 전환 중 이전 Promise가 늦게 resolve되는 경우를 막기 위해 request id 또는 cancelled flag가 각 hook 안에 유지돼야 한다.
- logout 또는 protected reset 직후 비동기 응답이 도착해 state를 되살리지 않도록, hook 내부에서 `enabled` 해제 시 stale response를 무시해야 한다.
- access/locker처럼 members preload를 겸하는 loader는 members list fetch 실패와 workspace fetch 실패를 같은 panel error에 합칠지 분리할지 먼저 결정해야 한다.
- shared preload가 이미 진행 중일 때 다른 workspace가 같은 preload를 다시 시작하지 않도록 호출 경계를 하나로 묶어야 한다.

**Testing guidance**
- `agent-browser` 수동 스모크에서 탭 연속 전환, 회원 전환 직후 재조회, logout 후 재로그인 초기화까지 확인한다.
- 가능한 경우 loader hook별로 “disabled면 fetch 안 함”, “enabled 전환 시 1회 fetch”, “stale response 무시”를 unit test로 직접 검증한다.

### Phase 2: Workspace Member Picker Query Hook

#### Scope

현재 `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx` 내부에 있는 다음 책임을 분리한다.

- query state
- debounce state
- request id race guard
- loading / error / rows
- loadMembers ref 관리

#### Plan

`/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceMemberPickerQuery.ts`를 추가한다.

예상 반환 형태:

```ts
const {
  query,
  setQuery,
  rows,
  visibleRows,
  loading,
  error,
  reload
} = useWorkspaceMemberPickerQuery({
  loadMembers,
  maxVisibleResults: 8,
  debounceMs: 250
});
```

`WorkspaceMemberPicker`는 다음만 남긴다.

- input 렌더
- row list 렌더
- select action trigger
- notice/help text 렌더

#### Rules Applied

- `client-swr-dedup`: 현재 범위에서는 SWR 전면 도입 대신 narrow hook에서 dedupe/cached loader를 소비한다.
- `advanced-use-latest`: load callback ref를 hook 내부에서 관리한다.
- `rerender-dependencies`: UI 컴포넌트의 effect 수를 줄인다.

#### Non-Goals

- SWR 전면 도입은 이번 범위에서 하지 않는다.
- members workspace 전체 검색과 직접 진입 picker를 하나의 global query store로 합치지 않는다.

#### Research Insights

**Implementation details**
- query hook은 최소한 `query`, `setQuery`, `rows`, `loading`, `error`, `reload`, `visibleRows`까지만 소유하고, member selection state는 UI 쪽에 남겨도 된다.
- 현재 React 버전에서는 `useEffectEvent`를 전제로 설계하지 말고, `loadMembersRef.current = loadMembers` 패턴을 hook 내부로 이동하는 쪽이 현실적이다.
- `visibleRows`는 단순 slice이므로 무거운 memoization 없이 hook 내부에서 바로 계산해도 충분하다.

**Edge cases**
- 빈 query로 돌아갈 때 debounce timer를 기다리지 말고 즉시 base result를 요청해야 UX가 덜 답답하다.
- 동일 query 재입력 시 로더 캐시가 결과를 재사용하더라도, UI는 이전 error를 즉시 지워야 한다.
- query hook 분리 후에도 selecting 상태와 search loading 상태를 섞지 않도록 state ownership을 분명히 나눈다.

**Testing guidance**
- query 입력 연타 후 마지막 검색어 결과만 남는지 검증
- 동일 query 재검색 시 로더 호출 수가 불필요하게 늘지 않는지 검증
- 실패 후 재시도(`reload`)가 정상 동작하는지 검증

### Phase 3: Theme Lifecycle Hook

#### Scope

현재 `App.tsx`의 theme 관련 로직:

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1195`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1199`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1206`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1221`

#### Plan

`/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useThemePreference.ts`로 통합한다.

책임 분리:

- hook input/output
  - `themePreference`
  - `setThemePreference`
  - `resolvedTheme`
- hook internal side-effects
  - localStorage persistence
  - `document.documentElement.dataset.theme` write
  - `matchMedia` listener subscription

파생 규칙:

- `resolvedTheme`는 가능하면 render-time derive로 유지
- `localStorage` key는 기존 `gymcrm.themePreference` 유지
- 시스템 테마 follow는 hook 내부 listener가 담당
- 기존 대시보드 theme phase에서 확정한 **no-flicker / first-paint contract**를 그대로 유지한다.

#### First-Paint Contract

이 refactor는 구조 개선이지만, 다음 동작 계약은 변경하지 않는다.

- persisted `light`/`dark` preference가 있으면 새로고침 직후 첫 가시 페인트부터 해당 theme가 적용되어야 한다.
- `system` 모드에서는 초기 렌더 직전에 읽을 수 있는 브라우저 값(`matchMedia().matches`)을 기준으로 first paint theme를 결정해야 한다.
- `data-theme`를 effect에서만 뒤늦게 반영해 초기 페인트가 잘못된 theme로 나오는 구조는 허용하지 않는다.
- 구현 방식은 work 단계에서 결정하되, 최소한 현재 phase1 theme work에서 확보한 no-flicker behavior와 동등하거나 더 나아야 한다.

#### Rules Applied

- `rerender-derived-state-no-effect`
- `client-localstorage-schema`
- `client-event-listeners`

#### Expected Outcome

- `App.tsx`에서 theme 관련 effect와 브라우저 API 접근이 제거된다.

#### Research Insights

**Implementation details**
- hook 내부 공개 API는 `themePreference`, `setThemePreference`, `resolvedTheme` 세 개만 유지한다.
- `resolvedTheme`는 render-time derive를 우선하고, DOM `data-theme` 반영만 effect로 남긴다.
- `matchMedia('(prefers-color-scheme: dark)')`는 즉시 `matches`를 읽는 경로와 `change` listener 경로를 같은 hook 내부에 묶는다.
- 초기 theme 결정은 기존 phase1 contract를 깨지 않도록 first-paint 시점에 맞춘다. 필요하면 현재 구조를 유지하고 hook은 로직 응집만 담당한다.

**Browser constraints**
- MDN 기준 `matchMedia()`는 즉시 조회와 변경 구독을 모두 지원하므로 현재 구조에 적합하다.
- MDN 기준 `localStorage`는 정책/브라우저 환경에 따라 `SecurityError`가 날 수 있으므로, 읽기/쓰기/삭제 모두 `try/catch` 경계를 유지해야 한다.
- private browsing이나 저장 차단 환경에서는 persisted preference가 없다고 가정하고 시스템 기본값으로 계속 동작하는 설계가 맞다.

**Testing guidance**
- persisted `light`/`dark`에서 새로고침 직후 첫 화면이 올바른 theme인지 확인
- 저장값 없음 + 시스템 다크/라이트
- 저장값 light/dark + 새로고침
- `system` 상태에서 OS theme 변경 이벤트 반응
- `localStorage` 읽기/쓰기 예외 모킹 시에도 hook이 죽지 않는지 검증

### Phase 4: Rendering Guard for Long Lists

#### Scope

후보 화면:

- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MembersSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductsSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/AccessSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/CrmSection.tsx`

#### Plan

1. 먼저 `styles.css`에 opt-in 유틸 클래스를 추가한다.
   - 예: `.deferred-list-surface { content-visibility: auto; contain-intrinsic-size: 720px; }`
2. 긴 카드/테이블 wrapper에만 선택적으로 부여한다.
3. 실제 체감 개선이 없거나 레이아웃 점프가 크면 rollback 가능하게 작은 범위부터 적용한다.

#### Rules Applied

- `rendering-content-visibility`

#### Non-Goals

- virtualization 라이브러리 도입은 이번 단계에서 하지 않는다.
- 표 전체 구조 변경은 하지 않는다.

#### Research Insights

**Implementation details**
- MDN 예시처럼 `content-visibility: auto; contain-intrinsic-size: auto 500px;` 계열 구성이 기본값이다. 이 프로젝트에서는 실제 패널 평균 높이에 맞춰 `720px` 전후 intrinsic size를 탐색한다.
- 먼저 스크롤이 길고 fold 아래에 자주 놓이는 surface에만 적용한다. 초기 렌더부터 바로 보이는 hero/summary 패널에는 쓰지 않는다.

**Accessibility / UX**
- `content-visibility: auto`는 접근성 트리를 유지하므로 긴 리스트 완충용으로는 비교적 안전하다.
- 다만 intrinsic size가 너무 작거나 크면 스크롤 위치 체감이 흔들릴 수 있으므로 모바일과 데스크톱 둘 다 확인해야 한다.

**Rollback criteria**
- 레이아웃 점프가 눈에 띄게 발생
- 포커스 이동이나 키보드 탐색이 어색해짐
- 긴 리스트가 아닌 짧은 surface까지 indiscriminate하게 적용되는 경우

## Alternative Approaches Considered

### 1. SWR 또는 TanStack Query를 전면 도입

장점:
- request dedupe, cache, revalidation을 빠르게 표준화 가능

단점:
- 현재 앱은 workspace reset 정책과 local form state가 강하게 얽혀 있어, 지금 도입하면 수명 정책이 더 복잡해진다.
- 최근 정리한 workspace-local hooks를 다시 한 번 크게 흔들 수 있다.

결론:
- 보류. 현재는 workspace hook / query hook 단위 분리가 우선.

### 2. `App.tsx`를 추가로 쪼개지 않고 현 상태 유지

장점:
- 당장 작업량이 적음

단점:
- effect orchestration이 계속 상위에 남아 이후 기능 추가 때 다시 영향 범위가 넓어진다.

결론:
- 장기적으로 유지비가 높아 채택하지 않음.

### 3. 곧바로 virtualization 도입

장점:
- 큰 데이터에서 가장 강한 렌더 최적화

단점:
- 현재 데이터 규모와 UI 복잡도 대비 과하다.
- 운영 테이블 UX와 높이 계산 이슈가 먼저 생길 수 있다.

결론:
- `content-visibility` 먼저 적용 후 필요 시 재평가.

## System-Wide Impact

### Interaction Graph

- 탭 전환
  - `SidebarNav`/dashboard action → `activeNavSection` 변경 → workspace loader hook 활성화 → 해당 fetcher 호출 → workspace-local state 업데이트
- 회원 선택
  - `loadMemberDetail(memberId)` → `selectedMemberId`/`selectedMember` 변경 → memberships/reservations reset hook 반응 → reservations loader hook 재평가
- 테마 변경
  - `TopBar` 토글 → `setThemePreference` → theme hook 내부 persist + DOM `data-theme` update → CSS variable scope 변경

### Error & Failure Propagation

- workspace loader fetch 실패는 각 workspace panel error로 귀속돼야 하며, `App.tsx` 전역 에러로 승격하지 않는다.
- theme persistence 실패(localStorage 접근 불가)는 UI 동작을 막지 않고 in-memory 상태로 계속 진행한다.
- `matchMedia` 미지원 브라우저는 현재 fallback 유지.

### State Lifecycle Risks

- loader hook 분리 시 stale response guard가 사라지면 탭 전환/회원 전환 뒤 이전 응답이 덮어쓸 수 있다.
- picker query hook 분리 시 cache loader와 UI query state가 다시 뒤엉키지 않도록 경계를 유지해야 한다.
- `content-visibility` 적용 시 intrinsic size가 부적절하면 스크롤 점프 가능성이 있다.

### API Surface Parity

- 백엔드 API 계약 변경은 없다.
- 프론트 공개 UI surface는 유지하며, 내부 hook 구조만 바뀐다.
- 대시보드 quick action, 사이드바, 탭 직접 진입 흐름이 동일하게 작동해야 한다.

### Integration Test Scenarios

- memberships/reservations direct-entry 진입 후 member select → 기존 로더/폼 reset 정상
- access/locker/CRM/settlement 탭 전환 시 각 workspace 초기 조회 정상
- theme preference `system/light/dark` 변경 후 새로고침/OS theme 변경 반영 정상
- 긴 리스트 화면에서 렌더는 정상이고 스크롤/상호작용이 깨지지 않음

## SpecFlow Review

이번 리팩토링은 신규 사용자 플로우보다 구조 정리이지만, 다음 edge case를 acceptance criteria에 반영한다.

- 탭을 빠르게 전환할 때 이전 workspace 응답이 현재 탭 UI를 덮어쓰지 않는다.
- member switch 직후 memberships/reservations workspace loader가 stale 데이터와 섞이지 않는다.
- theme를 `system`으로 둔 상태에서 OS theme 변경 시 즉시 반영된다.
- `content-visibility` 적용 후에도 좁은 화면에서 목록이 잘리지 않는다.

## Acceptance Criteria

### Functional

- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에서 access/locker/settlement/CRM/reservations 초기화 effect가 workspace loader hook으로 이동한다.
- [x] `WorkspaceMemberPicker`는 async query lifecycle을 직접 소유하지 않고, 별도 query hook을 사용한다.
- [x] theme preference/resolved theme/browser side-effects가 전용 hook으로 이동한다.
- [x] 긴 리스트 surface에 opt-in rendering guard가 적용된다.
- [x] shared preload ownership(`members`, `products`, auth context`)이 app-shared boundary로 문서화되고, workspace loader hook은 그 경계를 소비만 한다.
- [x] theme refactor가 기존 no-flicker / first-paint contract를 유지한다.

### Non-Functional

- [x] 기존 workspace direct-entry/member switch/reset 동작에 회귀가 없다.
- [x] `App.tsx`의 effect/브라우저 API 직접 사용 수가 눈에 띄게 줄어든다.
- [x] workspace query/search behavior는 기존 `debounce + cache + in-flight dedupe` 계약을 유지한다.
- [x] render guard 적용으로 레이아웃 깨짐이나 눈에 띄는 점프가 없다.
- [x] shared preload 사용 workspace 간 중복 preload 호출이 새로 생기지 않는다.
- [x] persisted theme reload 시 초기 잘못된 테마 페인트가 발생하지 않는다.

### Quality Gates

- [x] `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` 통과
- [x] `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` 통과
- [x] `agent-browser` 또는 수동 브라우저 스모크로 memberships, reservations, access, theme toggle, long-list surface 확인
- [x] 변경된 hook 경계에 맞는 최소 테스트 추가
- [x] theme hook에 대해 `matchMedia`/`localStorage` 예외 또는 변경 이벤트를 다루는 테스트 추가
- [x] picker query hook 또는 workspace loader hook 중 최소 1개 이상에서 stale-response 보호 테스트 추가
- [x] persisted theme reload/first-paint 회귀를 확인하는 수동 또는 자동 검증 추가
- [x] shared preload helper 또는 preload boundary에 대해 중복 호출 방지 검증 추가

## Success Metrics

- `App.tsx`의 workspace/theme orchestration 코드가 유의미하게 감소한다.
- picker UI 컴포넌트의 effect 수가 감소한다.
- theme 관련 브라우저 API 접근이 단일 hook으로 모인다.
- 긴 리스트 화면 첫 렌더/스크롤 체감이 악화되지 않는다.

## Dependencies & Risks

### Dependencies

- 기존 workspace hooks와 reset contracts 유지
- `agent-browser` 기반 스모크 검증 환경
- 현재 `vitest` 테스트 러너 유지

### Risks

1. loader hook 분리 중 stale-response 보호가 약해질 수 있음
2. theme hook 분리 중 기존 localStorage/OS theme 동작 회귀 가능성
3. `content-visibility` 적용 후 일부 패널 높이 계산/스크롤 UX 변화 가능성

### Mitigations

- request id 또는 `useLatest` 기반 stale guard 유지
- theme 관련 regression test 또는 최소 smoke checklist 추가
- render guard는 opt-in 클래스부터 작게 적용

## Implementation Phases

### Phase 1

- workspace loader hook interfaces 정의
- shared preload ownership 문서화 (`members`, `products`, auth context`)
- `ensureMembersLoaded` 또는 동등한 shared preload boundary 정의
- access/locker/settlement/CRM/reservations 순으로 이동
- 기존 effect 제거

### Phase 2

- `useWorkspaceMemberPickerQuery` 추가
- `WorkspaceMemberPicker` 단순화
- 기존 member search loader contract 유지

### Phase 3

- `useThemePreference` hook 추가
- 기존 phase1 theme no-flicker contract 보존 방식 결정
- `App.tsx` theme effect 제거
- theme smoke + reload verification

### Phase 4

- `content-visibility` 유틸 추가
- 후보 리스트 surface에 점진 적용
- 모바일/스크롤 smoke 검증

## Documentation Plan

- 필요 시 다음 노트 추가
  - `docs/notes/YYYY-MM-DD-workspace-loader-hook-validation.md`
  - `docs/notes/YYYY-MM-DD-theme-hook-validation.md`
  - `docs/notes/YYYY-MM-DD-rendering-guard-validation.md`
- 구조 변경이 재사용 가치가 크면 compound solution 문서로 승격

## Sources & References

### Internal

- Current orchestration shell: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- Workspace member search loader: `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceMemberSearchLoader.ts`
- Picker UI: `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx`
- Theme initialization reference: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-04-feat-dashboard-theme-refactor-light-dark-phase1-plan.md`
- Recent state split plan: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-state-ownership-and-query-lifecycle-plan.md`

### Institutional Learnings

- `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
- `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-product-locker-crm-settlement-state-ownership-validation.md`

### Rule Mapping

- Vercel React best practices: `client-swr-dedup`, `rerender-dependencies`, `rerender-derived-state-no-effect`, `advanced-use-latest`, `client-event-listeners`, `rendering-content-visibility`
- React official docs (Context7): custom hooks for effect extraction, latest-value access via refs / effect event guidance, `useDeferredValue` semantics
- MDN: `matchMedia()`, `localStorage`, `content-visibility`

### External References

- React docs: [Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies)
- React docs: [useDeferredValue](https://react.dev/reference/react/useDeferredValue)
- React docs: [useEffectEvent](https://react.dev/reference/react/useEffectEvent)
- MDN: [Window.matchMedia()](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
- MDN: [Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- MDN: [content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility)
