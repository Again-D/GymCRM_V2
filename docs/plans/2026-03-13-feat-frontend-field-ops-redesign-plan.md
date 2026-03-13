---
title: "feat: Frontend field ops redesign"
type: feat
status: active
date: 2026-03-13
origin: docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md
---

# feat: Frontend field ops redesign

## Enhancement Summary

**Deepened on:** 2026-03-13  
**Sections enhanced:** 9  
**Primary inputs used:** local repo research, institutional learnings, accessibility/theme official references, matched skill guidance

### Skills Applied

- `frontend-design`
  - distinctive, non-generic product tone를 실제 대표 화면 기준으로 고정하는 방향
- `vercel-react-best-practices`
  - visual refactor 중에도 re-render churn, effect regression, bundle drift를 피하는 관점
- `test-browser`
  - representative page 우선 브라우저 smoke와 artifact capture를 phase gate에 포함

### Key Improvements

1. modal 접근성 계약을 단순 체크리스트가 아니라 구현 전제 조건으로 구체화했다.
2. theme 관련 선행 문서뿐 아니라 현재 코드 트리에서의 구현 공백 가능성을 반영해 phase 0 감사 항목을 추가했다.
3. desktop/tablet/theme/role 조합별 validation matrix와 phase gate를 명시해 “예쁘게 보이는지”가 아니라 “운영 흐름이 유지되는지”로 검증 축을 고정했다.

### New Considerations Discovered

- 현재 `frontend/src` 검색 기준으로 `matchMedia`, `data-theme`, `resolvedTheme` 흔적이 바로 보이지 않아, 이번 redesign은 style polish 이전에 실제 theme foundation 상태를 재확인해야 한다.
- modal redesign은 WAI modal dialog guidance 수준의 포커스 복귀, initial focus, ESC close, `aria-modal` 계약을 먼저 고정하지 않으면 page마다 drift가 생길 가능성이 높다.
- representative pages만 바꾼 뒤 phase 2에서 확장할 때 가장 큰 리스크는 로직이 아니라 visual contract drift와 responsive overload다.

## Overview

현재 rebuild 프론트엔드를 기존 UI 복원이 아닌 새로운 `field-ops console` 톤으로 재디자인한다. 방향은 "빠르고 선명한 현장 운영툴"이며, 세부 인상은 "데스크 운영의 정돈감 + 현장 보드의 즉시성"이다. 주요 입력/처리는 모달 중심으로 재배치하고, 1차에서는 대표 화면을 기준 샘플로 완성한 뒤 2차에서 나머지 전체 화면으로 확장한다. 이 방향과 범위는 [브레인스토밍 문서]( /Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md )에서 합의된 결정들을 그대로 계승한다.

최종 목표는 "예쁜 관리자 화면"이 아니라, 프론트 전체가 하나의 운영 콘솔처럼 보이고 동작하는 상태다. 성공 기준은 시각 완성도 자체보다 현장 업무 처리 속도, 상태 판독성, 액션 명확성 개선에 둔다. (see brainstorm: `docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`)

## Problem Statement

현재 프론트는 구조적으로는 `sidebar shell + page-level CSS modules + workspace-local state/query hooks` 방향으로 정리되어 있지만, 시각 경험은 여전히 기본 스타일 인상이 강하다.

주요 문제는 다음과 같다.

- `DashboardLayout`, `Login`, workspace 화면들이 같은 제품 톤으로 묶여 보이지 않는다.
- 업무 화면이 조회/처리/상태 위계를 강하게 드러내지 못해 "운영 콘솔"보다 "기본 프로토타입"처럼 보인다.
- 추가 요구사항에서 필요한 모달 중심 처리 surface가 아직 디자인 원칙으로 정리되어 있지 않다.
- light/dark를 동시 고려한 토큰/컴포넌트 문법이 완성되지 않아 향후 확장 시 화면별 편차가 커질 수 있다.
- 태블릿 대응을 고려해야 하지만, 현재는 "깨지지 않는지" 수준의 대응에 더 가깝다.

## Proposed Solution

브레인스토밍에서 선택한 `Approach B: 완전 신톤 + 대표 화면 우선 적용`을 구현 계획으로 구체화한다. 핵심은 한 번에 전체를 바꾸는 것이 아니라 다음 순서로 끌고 가는 것이다.

1. foundation layer를 먼저 고정한다.
   - light/dark 토큰
   - shell rhythm
   - modal language
   - 상태/액션 hierarchy
   - desktop/tablet responsive rules

2. representative surfaces를 먼저 완성한다.
   - `DashboardLayout`
   - `Login`
   - `Members`
   - `Memberships`
   - `Reservations`

3. representative surfaces에서 검증된 visual contract를 나머지 전체 화면으로 확장한다.
   - `Access`
   - `CRM`
   - `Lockers`
   - `Settlements`
   - `Products`
   - empty/loading/error states and auxiliary shell surfaces

4. 최종적으로는 모든 화면이 같은 정보 우선순위, 같은 상태 표현 문법, 같은 modal ergonomics, 같은 theme contract를 공유하도록 수렴시킨다.

## Research Summary

### Origin Brainstorm

- 기준 문서: [docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md)
- carry-forward decisions:
  - 기존 UI 복원이 아니라 완전 신톤으로 간다.
  - 주요 입력/처리는 모달 중심이다.
  - 1차는 `DashboardLayout`, `Login`, `Members`, `Memberships`, `Reservations`다.
  - 2차는 나머지 전체 화면이다.
  - light/dark를 1차부터 함께 설계한다.
  - 성공 기준은 시각 완성도보다 업무 처리 속도와 가독성이다.

### Repo Research

- shell route와 login-first 진입 구조는 [`frontend/src/App.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx) 에서 이미 안정적으로 정리되어 있다.
- 현재 shell-local style ownership은 [`frontend/src/components/layout/DashboardLayout.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/DashboardLayout.tsx) + [`frontend/src/components/layout/DashboardLayout.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/DashboardLayout.module.css) 로 옮겨져 있다.
- representative workspace 중 `Members`, `Memberships`, `Reservations`는 모두 page-level ownership과 selected-member handoff 구조를 이미 갖추고 있다.
- theme lifecycle 관련 선행 설계는 `themePreference`, `resolvedTheme`, `data-theme`, `matchMedia`, `localStorage` 패턴을 이미 정리해두었다.

### Institutional Learnings

- sidebar/login-first 구조를 무너뜨리지 말아야 한다:
  - [docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)
- theme는 `data-theme` 토큰 스코프와 first-paint contract를 지켜야 한다:
  - [docs/plans/2026-03-04-feat-dashboard-theme-refactor-light-dark-phase1-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-04-feat-dashboard-theme-refactor-light-dark-phase1-plan.md)
  - [docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md)
- modal/drawer surface 선행 가드라인은 이미 존재한다:
  - [docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md)
  - 특히 focus trap, ESC close, scroll lock, `aria-modal` 규칙을 계승해야 한다.
- memberships loop incident가 보여준 것처럼 UI 리팩터도 hook stability와 effect dependency를 건드릴 수 있다:
  - [docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md](/Users/abc/projects/GymCRM_V2/docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md)

### Official Reference Additions

- WAI APG modal dialog pattern:
  - [WAI-ARIA Authoring Practices: Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
  - 적용 포인트: focus trap, initial focus placement, close 후 trigger focus 복귀, `aria-modal` + labelled dialog contract
- MDN theme/media guidance:
  - [Window.matchMedia()](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
  - [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-color-scheme)
  - 적용 포인트: system theme 감지는 media query 기반으로 처리하고, light/dark token scope는 CSS media/theme contract와 정렬한다.

### External Research Decision

외부 리서치는 이번 계획에서 생략한다. 이유는 현재 저장소 내부에 theme lifecycle, workspace ownership, modal guidance, sidebar IA, responsive validation 기록이 충분히 쌓여 있고, 이번 작업의 핵심이 신규 프레임워크 도입이 아니라 existing React/Vite frontend의 UI redesign이기 때문이다.

## SpecFlow Analysis

### User Flow Overview

1. 로그인 전 진입
   - `/login` 진입
   - light/dark first paint 적용
   - live 로그인 또는 mock preset 진입
   - 로그인 성공 후 shell 진입

2. shell 탐색
   - 사이드바에서 workspace 전환
   - 현재 선택된 member context 유지
   - 화면별 empty/loading/error surface 일관성 유지

3. members 중심 진입
   - 회원 검색/필터
   - 회원 선택
   - 회원 상세 컨텍스트 확인
   - membership/reservation workspace로 handoff

4. modal 중심 처리
   - membership purchase/hold/resume/refund
   - reservation create/check-in/complete/cancel/no-show
   - future phase의 access/locker/crm/products actions

5. theme flow
   - system/light/dark 전환
   - reload 후 preference 복원
   - light/dark 모두에서 동일 구조 유지

### Flow Gaps To Handle In Plan

- 모달을 여는 entry point가 desktop/tablet 양쪽에서 충분히 빠르게 노출되는지 확인 필요
- member context가 없는 상태에서 modal trigger가 어떻게 disabled/guard 되는지 화면별 규칙 필요
- unsupported-role 화면에서 액션 버튼/모달 진입 경로가 다시 열리지 않도록 재검증 필요
- theme가 first paint부터 맞더라도 modal/backdrop/overlay depth가 light/dark 모두에서 충분히 읽히는지 검증 필요
- 태블릿 폭에서 sidebar, table, modal이 동시에 과밀해지지 않도록 breakpoint contract 필요
- login 화면에서도 mock/live mode 차이가 새 visual language 안에서 혼란 없이 구분되는지 규칙 필요
- destructive modal에서 confirm/cancel hierarchy가 theme와 상태색에 따라 흐려지지 않는지 확인 필요

### Critical Planning Questions Resolved By Default

- modal state를 URL에 넣을지:
  - 아니오. existing shell/router decision을 유지하고 local UI state로 둔다.
- drawer/panel과 혼합할지:
  - 이번 redesign에서는 모달 중심으로 간다. drawer로 임의 변경하지 않는다.
- mobile-first로 갈지:
  - 아니오. desktop 우선, tablet 적극 대응이다.

## Technical Approach

### Architecture

이번 작업은 로직 리라이트가 아니라 visual system redesign이다. 다만 구현은 다음 경계를 명확히 지켜야 한다.

- `index.css`
  - reset, token, shared primitive, shared accessibility utility만 유지
- `*.module.css`
  - shell/page/component-local layout and polish ownership 담당
- React pages/components
  - state/query ownership은 유지하고, markup structure는 modal language와 hierarchy에 맞게 조정
- theme layer
  - root `data-theme` + CSS custom properties 기반 유지
- modal layer
  - reusable modal primitive 또는 shared modal contract를 먼저 확정하고 page actions에 연결

### Research Insights

**Best Practices:**
- theme preference와 resolved theme는 계속 분리해서 다루고, DOM `data-theme` 반영은 단일 경로로 유지한다.
- visual refactor에서도 page-level state/query ownership은 그대로 두고, interaction logic를 effect보다 event path에 두는 쪽이 안전하다.
- modal은 page마다 bespoke markup를 만들기보다, shared primitive 또는 at least shared contract를 먼저 고정한 뒤 콘텐츠만 바꾸는 편이 drift를 줄인다.

**Performance Considerations:**
- representative pages의 table/list surfaces는 cosmetic refactor 중에도 long-list rendering cost를 키우지 않아야 한다.
- modal open/close state는 local transient state로 두고 global subscription을 만들지 않는다.
- theme switching은 repaint가 크므로 color token 교체 중심으로 유지하고, layout-affecting transitions는 최소화한다.

**Implementation Details:**
- current source scan 기준 `frontend/src`에서 `matchMedia`, `data-theme`, `resolvedTheme` 경로가 바로 드러나지 않는다.
- 따라서 phase 0의 첫 작업은 “existing theme foundation still alive?” audit이며, 문서상 계약만 믿고 polish를 시작하면 안 된다.

**Anti-Patterns To Avoid:**
- representative phase에서 새 utility를 전역 CSS로 다시 대량 추가
- modal open state와 selected member reset state를 한 effect에 섞는 것
- theme 구현이 문서상 계약과 실제 코드가 불일치한 상태로 디자인 작업을 먼저 진행하는 것

### Design System Contract

- typography:
  - default browser-like rhythm에서 벗어나 운영 도구형 hierarchy를 만든다.
- color:
  - status-first palette를 사용하고 semantic token을 light/dark 공통 이름으로 정의한다.
- spacing:
  - 과한 whitespace보다 operational density를 우선한다.
- states:
  - hover, focus, selected, disabled, loading, unsupported 상태를 명시적으로 설계한다.
- tables and lists:
  - row scan speed와 selected context readability를 우선한다.
- modals:
  - title, supporting context, primary action, destructive action hierarchy가 명확해야 한다.

### Modal Accessibility Contract

- dialog container는 명시적 제목과 닫기 affordance를 가진다.
- open 시 initial focus target이 predictable 해야 한다.
  - destructive confirm modal: confirm이 아니라 설명 또는 cancel/close 쪽에 초기 focus를 두는 편이 안전한지 화면별 판단 필요
  - form modal: 첫 번째 유효 입력 필드 또는 제목 직후의 설명 영역
- keyboard trap은 modal 내부에 한정하고, close 후 trigger focus를 복귀시킨다.
- `Escape` close, backdrop click, scroll lock 정책을 page마다 달리하지 않는다.
- `aria-modal`, accessible name, 필요 시 description association을 공통 규약으로 둔다.
- desktop/tablet에서 modal max width, max height, internal scroll policy를 동일 문법으로 유지한다.

### Theme Contract Additions

- light/dark는 구조를 바꾸지 않고 semantic token만 바꾸는 방식으로 유지한다.
- shell, table, modal, badge, destructive action, backdrop가 두 테마에서 동일 hierarchy를 유지해야 한다.
- system theme 감지 계약은 [`matchMedia`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) 기반으로 유지하고, CSS 색상 대응은 [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-color-scheme) 및 root theme token scope와 정렬한다.
- first-paint mismatch가 생기면 field-ops tone보다 “불안정한 앱” 인상이 먼저 오므로, theme flash 방지는 visual polish보다 우선한다.

### Implementation Phases

#### Phase 0: Foundation Contract

목표:
- redesign 작업 전에 공통 foundation을 고정한다.

작업:
- current shell/page styles inventory 작성
- current theme implementation audit (`data-theme`, persisted preference, system detection, first-paint path)
- light/dark semantic token map 정의
- shared primitives ownership 재정의
- modal primitive contract 정의
- desktop/tablet breakpoint contract 정의
- representative screenshots baseline 확보
- representative modals information architecture sketch 작성

deliverables:
- updated token/ownership plan note
- modal behavior checklist
- validation matrix draft
- theme foundation audit note

success criteria:
- 이후 representative page 작업이 foundation 재논의 없이 진행 가능하다.
- `index.css` vs `*.module.css` ownership이 다시 흔들리지 않는다.
- theme foundation의 실제 코드 경로와 문서 계약이 일치한다.

#### Phase 1: Representative Surfaces

목표:
- 새 시각 언어와 modal language를 대표 화면에서 먼저 고정한다.

대상:
- `frontend/src/components/layout/DashboardLayout.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/members/MemberList.tsx`
- `frontend/src/pages/members/components/MemberListSection.tsx`
- `frontend/src/pages/memberships/MembershipsPage.tsx`
- `frontend/src/pages/reservations/ReservationsPage.tsx`

작업:
- shell/sidebar/top-area 재디자인
- login screen을 field-ops entry screen으로 재디자인
- members list/detail scan hierarchy 재디자인
- memberships actions를 modal 중심으로 재구성
- reservations actions를 modal 중심으로 재구성
- representative pages의 empty/loading/error/unsupported states 통일
- theme variants 적용
- tablet breakpoint에서 layout tension 조정

success criteria:
- representative pages가 같은 제품처럼 보인다.
- modal interaction이 keyboard, focus, backdrop, scroll 측면에서 안정적이다.
- member selection handoff가 시각적으로 더 명확하다.
- login shell 진입과 mock/live auth 차이가 시각적으로도 혼란 없이 구분된다.
- light/dark 양쪽에서 representative modal surfaces가 충분한 대비를 가진다.

#### Phase 2: Full Frontend Expansion

목표:
- phase 1 contract를 나머지 전체 화면에 확장한다.

대상:
- `frontend/src/pages/access/AccessPage.tsx`
- `frontend/src/pages/crm/CrmPage.tsx`
- `frontend/src/pages/lockers/LockersPage.tsx`
- `frontend/src/pages/settlements/SettlementsPage.tsx`
- `frontend/src/pages/products/ProductsPage.tsx`
- supplementary shell/empty/loading/error surfaces

작업:
- representative pattern reuse
- tables/forms/status cards/summary surfaces alignment
- role-gated screens visual parity
- modal conversion where required by product surface
- tablet responsiveness alignment

success criteria:
- 모든 workspace가 공통 visual contract를 공유한다.
- 특정 workspace만 구식 rebuild UI처럼 보이는 이질감이 사라진다.
- role-gated workspace도 “막힌 화면”이 아니라 같은 제품 안의 intentional blocked state처럼 보인다.

#### Phase 3: Hardening, Validation, and Polish

목표:
- final target state에 맞게 전체 경험을 마감한다.

작업:
- contrast/focus/accessibility pass
- theme flicker/reload validation
- modal stress validation
- desktop/tablet browser smoke
- screenshot diff or manual artifact capture
- plan/solution docs update

success criteria:
- final acceptance criteria와 validation matrix를 모두 충족한다.
- 브라우저에서 "운영 콘솔" 인상이 일관되게 느껴진다.

## Alternative Approaches Considered

### A. 기존 UI 복원 중심

브레인스토밍에서 배제했다. 과거 기대와는 빨리 맞출 수 있지만, 현재 rebuild 구조와 modal/dark 요구사항을 함께 만족시키기 어렵다. (see brainstorm: `docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`)

### B. 디자인 시스템만 먼저 만들고 페이지는 나중에 적용

구조적으로는 깔끔하지만, 사용자 체감 개선이 늦다. 실제 화면 검증 없이 추상 시스템만 앞서갈 위험이 있어 이번엔 대표 화면 우선 전략을 택한다. (see brainstorm: `docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`)

## System-Wide Impact

### Interaction Graph

- theme toggle
  - shell control → theme preference state → root `data-theme` update → CSS variable scope 변경 → all pages restyle
- member selection
  - members workspace action → `SelectedMemberProvider` state update → memberships/reservations/access/... context badge 및 dependent queries/UI reset
- modal action
  - page action trigger → modal local state open → confirm/cancel → existing page hook mutation/query reload → panel feedback/state refresh

### Error & Failure Propagation

- UI redesign 자체는 business API contract를 바꾸지 않는다.
- modal confirm paths는 기존 mutation errors를 동일하게 표시해야 한다.
- modal close 시 오류 메시지를 지울지 유지할지 화면별 정책이 필요하다.
- theme persistence/localStorage failure는 기존 in-memory fallback contract를 유지해야 한다.

### State Lifecycle Risks

- modal open state가 selected member/context와 어긋나면 stale UI가 생길 수 있다.
- page markup 재구성 과정에서 unstable callback/effect deps를 다시 도입할 위험이 있다.
- theme/application shell 변경이 first-paint contract를 깨면 flash/flicker regressions가 생길 수 있다.
- backdrop/scroll lock 구현이 table/page scroll과 충돌할 수 있다.

### API Surface Parity

- JWT login flow와 mock auth preset flow 모두 같은 shell/login redesign을 거쳐야 한다.
- unsupported role screens도 visual redesign 후 동일한 gating contract를 유지해야 한다.
- workspace-local query hooks는 visual refactor 때문에 호출 조건이 변하지 않아야 한다.

### Integration Test Scenarios

- login page light/dark + JWT redirect + authenticated shell entry
- members selection → memberships modal open/submit/cancel → feedback/render 유지
- members selection → reservations modal open/submit/status mutation → list refresh 유지
- unsupported role in phase 2 screens에서 action buttons/modal entries 차단 유지
- theme reload after persisted preference + modal open overlay contrast in both themes
- tablet-width sidebar + dense table + modal open 조합에서도 조작 가능
- selected member가 바뀐 직후 stale modal content가 남지 않음

## Acceptance Criteria

### Functional Requirements

- [ ] redesign은 [브레인스토밍 문서](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md)의 key decisions를 그대로 반영한다.
- [ ] `DashboardLayout`, `Login`, `Members`, `Memberships`, `Reservations`가 representative surfaces로 먼저 완성된다.
- [ ] 주요 입력/처리 액션은 모달 중심으로 제공된다.
- [ ] 2차에서 나머지 전체 화면이 같은 visual contract로 확장된다.
- [ ] shell/sidebar/login-first/member handoff 기존 구조는 유지된다.

### Non-Functional Requirements

- [ ] light/dark 모두에서 first-paint theme contract가 유지된다.
- [ ] focus visibility, keyboard navigation, `aria-modal`, scroll lock, ESC close가 modal 전반에서 동작한다.
- [ ] desktop 우선 구조를 유지하면서 tablet에서도 핵심 업무 흐름이 사용 가능하다.
- [ ] UI 밀도와 상태 가독성이 현재 대비 개선된다.

### Quality Gates

- [ ] affected frontend tests pass
- [ ] theme-related tests or smoke checks pass
- [ ] representative pages browser validation complete
- [ ] phase 2 확장 후 full affected-page smoke validation complete
- [ ] relevant docs updated

## Success Metrics

- representative pages screenshot/브라우저 확인 시 "기본 스타일" 인상이 제거된다.
- 동일 업무를 수행할 때 다음 액션 탐색 시간이 줄어든다.
- 상태 badge, selected context, destructive actions가 더 빠르게 구분된다.
- 태블릿 폭에서 가시성 저하나 조작 frustration가 크게 줄어든다.

## Dependencies & Prerequisites

- existing theme lifecycle contract (`themePreference`, `resolvedTheme`, `data-theme`) 이해
- current module.css ownership 구조 유지
- modal primitive or modal contract 정의 선행
- representative screenshots or visual checkpoints 확보

## Risk Analysis & Mitigation

- risk: scope creep
  - mitigation: phase 1 representative surfaces 완료 전 phase 2 착수 금지
- risk: global CSS re-growth
  - mitigation: new selector ownership review gate 추가
- risk: theme flicker regression
  - mitigation: first-paint validation and reload smoke required
- risk: modal accessibility debt
  - mitigation: modal checklist를 공통 gate로 사용
- risk: visual refactor causing logic regressions
  - mitigation: tests + browser smoke + query/effect review 함께 수행

## Token-Cost Efficiency Plan

- foundation decisions를 먼저 고정해 구현 중 재논의를 줄인다.
- phase별로 `index.css/shared primitives + target page + target module.css`만 읽는 narrow context를 유지한다.
- representative pages에서 pattern을 고정한 뒤, phase 2에서는 복제와 조정 중심으로 확장한다.
- style edits와 logic edits를 섞지 않고, 필요한 경우 modal/state 연결만 별도 patch로 분리한다.
- 브라우저 검증은 representative sample 우선으로 돌리고, phase gate 통과 후 나머지 화면으로 확대한다.
- desktop/tablet, light/dark, admin/trainer 조합을 한 번에 전부 읽지 말고 validation matrix 기준으로 대표 조합부터 순차 확인한다.
- representative phase에서 승인된 modal/token pattern은 phase 2에서 그대로 복제하고, 예외가 필요한 화면만 추가 검토한다.

## Validation Matrix

| Surface | Desktop Light | Desktop Dark | Tablet Light | Tablet Dark | Role Notes |
|---|---|---|---|---|---|
| Login | required | required | required | recommended | mock/live both |
| DashboardLayout | required | required | required | recommended | admin + trainer |
| Members | required | required | required | recommended | selected member handoff |
| Memberships modal flows | required | required | required | recommended | member-selected and empty state |
| Reservations modal flows | required | required | required | recommended | member-selected and empty state |
| Phase 2 blocked screens | required | recommended | required | optional | unsupported role gating |

## Phase Gates

### Gate A: Foundation Freeze

- theme foundation audit complete
- modal accessibility contract documented
- token ownership agreement fixed
- baseline artifacts captured

### Gate B: Representative Approval

- phase 1 representative pages browser smoke pass
- no console/runtime regressions on representative routes
- dark mode reload and modal overlay checks pass
- tablet-width usability checks pass

### Gate C: Full Rollout Approval

- phase 2 pages align with representative contract
- blocked/unsupported states remain intact
- full affected-route smoke complete
- docs/artifacts updated

## Documentation Plan

- implementation plan validation note
- browser smoke artifacts for representative pages
- final solution or rollout summary if notable issues were solved during redesign

## Sources & References

### Origin

- Brainstorm document: [docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md)
  - key decisions carried forward:
    - 완전 신톤
    - representative-first rollout
    - modal-centered interaction
    - light/dark from phase 1
    - speed/readability over visual polish

### Internal References

- Shell routing and login-first entry:
  - [frontend/src/App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx)
- Shell layout:
  - [frontend/src/components/layout/DashboardLayout.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/DashboardLayout.tsx)
- Login:
  - [frontend/src/pages/Login.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/Login.tsx)
- Representative members workspace:
  - [frontend/src/pages/members/MemberList.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/MemberList.tsx)
  - [frontend/src/pages/members/components/MemberListSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- Representative memberships workspace:
  - [frontend/src/pages/memberships/MembershipsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/memberships/MembershipsPage.tsx)
- Representative reservations workspace:
  - [frontend/src/pages/reservations/ReservationsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx)

### Related Plans and Learnings

- [docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)
- [docs/plans/2026-03-04-feat-dashboard-theme-refactor-light-dark-phase1-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-04-feat-dashboard-theme-refactor-light-dark-phase1-plan.md)
- [docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md)
- [docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md)
- [docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md](/Users/abc/projects/GymCRM_V2/docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md)

## Final Review Checklist

- [x] brainstorm key decisions are reflected
- [x] chosen approach matches brainstorm recommendation
- [x] constraints and success criteria from brainstorm are captured
- [x] no open questions remain unresolved
- [x] `origin` frontmatter points to the brainstorm file
- [x] representative-first, full expansion, and final target are all explicitly planned
