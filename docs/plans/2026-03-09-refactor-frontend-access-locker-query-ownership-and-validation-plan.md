---
title: "refactor: frontend access/locker query ownership and validation follow-up"
type: refactor
status: completed
date: 2026-03-09
---

# refactor: frontend access/locker query ownership and validation follow-up

## Overview

이 플랜은 PR `#61` 이후 남아 있던 frontend tail work를 정리하기 위해 작성됐고, 현재는 구현과 검증이 모두 끝난 상태다. 최종 결과로 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에 남아 있던 `access`/`lockers` read query ownership은 dedicated query hook으로 이동했고, jwt auth gate 검증 fallback과 reservations/settlements rendering guard 판단도 문서로 고정됐다.

아래 서술은 이 작업이 시작될 당시의 문제 정의와 실행 기준을 남겨 두기 위한 기록이며, 실제 완료 결과는 `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-access-locker-query-ownership-validation.md`에 반영돼 있다.

## Enhancement Summary

- Deepened on: `2026-03-09`
- Sections enhanced: `Local Research Summary`, `Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`, `Acceptance Criteria`, `Dependencies & Risks`
- Key additions:
  - `access`/`lockers` query ownership을 workspace-local state와 분리하는 경계 명시
  - mutation 후 reload parity와 post-reset stale-write 방지 계약 구체화
  - jwt auth gate 검증에서 `agent-browser` 한계와 대체 검증 사다리 명시
  - reservations/settlements `content-visibility` 적용/롤백 기준 명시

## Problem Statement / Motivation

작성 시점 기준으로 남아 있던 문제는 세 가지였다.

1. `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`가 여전히 `access presence/events`, `locker slots/assignments` read query를 직접 소유한다.
2. jwt 모드 검증은 로그인 화면/auth gate 확인과 proxy API cycle로는 닫혔지만, 실제 브라우저 post-login 전환은 `agent-browser` 상호작용 불안정성 때문에 완전히 자동 검증되지 않았다.
3. `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`, `/Users/abc/projects/GymCRM_V2/frontend/src/features/settlements/SettlementReportPanels.tsx`는 `deferred-list-surface` 적용 후보로 남아 있으나, 실제 체감 이득과 스크롤/포커스 안정성은 아직 정리되지 않았다.

이 범위를 정리하면 다음 효과가 있었다.
- `App.tsx`의 read-side orchestration을 더 줄일 수 있다.
- stale write / reset 계약을 access/locker까지 같은 기준으로 맞출 수 있다.
- auth regression 검증을 더 재현 가능하게 만들 수 있다.
- 남은 rendering guard 적용 여부를 문서화해 불필요한 최적화를 피할 수 있다.

## Local Research Summary

### Repo Findings

- 작성 당시 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에는 아래 read query가 직접 남아 있었다.
  - `loadAccessEvents()`
  - `loadAccessPresence()`
  - `loadLockerSlots()`
  - `loadLockerAssignments()`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceLoaders.ts`는 `shouldCommit` 기반 stale write guard 패턴을 이미 제공했고, 이 플랜에서는 이를 query hook의 주된 방어가 아니라 상위 조합 계층 보조 guard로 제한했다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useMembersQuery.ts`, `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductsQuery.ts`, `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/useReservationSchedulesQuery.ts`는 request-version guard 기반 query hook 기준선으로 사용됐다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessWorkspaceState.ts`, `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerWorkspaceState.ts`는 당시 이미 workspace-local state 경계가 분리돼 있었고, 이후 구현에서 read data/loading ownership도 dedicated query hook으로 이동했다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/auth/LoginScreen.tsx`는 표준 `form onSubmit` 구조지만, `agent-browser`가 controlled input submit을 안정적으로 트리거하지 못한 검증 로그가 남아 있다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`와 일부 패널 컴포넌트에는 이미 `deferred-list-surface`가 적용돼 있어 follow-up 적용 비교 기준이 있다.

### Institutional Learnings

- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-bundle-query-auth-lifecycle-validation.md`
  - jwt browser validation은 UI만으로 닫히지 않을 수 있으므로, API session cycle과 hook tests를 보조 근거로 남기는 방식이 유효했다.
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-react-workspace-lifecycle-validation.md`
  - `content-visibility`는 긴 리스트 surface에만 제한적으로 적용해야 하고, 모바일 스크롤/포커스 회귀를 같이 봐야 한다.
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`
  - 전면 SWR 도입보다 좁은 query hook ownership 정리가 우선이다.
- `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
  - query lifecycle은 UI와 분리하고, 필요한 경계에서만 debounce/cache/latest-request 패턴을 적용하는 편이 맞다.
- `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
  - navigation entry surface와 실제 동작 계약은 끝까지 일관되게 유지해야 한다.

### External Research Decision

이번 범위는 이미 이 저장소 안에서 패턴과 검증 로그가 충분히 축적돼 있다. 새로운 외부 API나 보안 정책 추가가 아니라 기존 React/Vite 앱의 후속 리팩토링이므로, 외부 조사는 생략한다.

### Research Insights

- PR `#61`로 `members/products/reservation schedules` query ownership과 `useAuthSession` 경계가 정리됐기 때문에, 이번 단계는 패턴 탐색이 아니라 남은 read path를 같은 규칙으로 맞추는 후속 작업이다.
- `access`와 `lockers`는 모두 mutation 이후 즉시 같은 화면에서 재조회해야 하는 워크스페이스라서, query hook은 단순 fetcher가 아니라 `reload/reset/invalidate` 계약을 명시적으로 가져야 한다.
- jwt 검증은 브라우저 자동화만으로 닫히지 않았고, 이전 검증 노트가 이미 `UI smoke + API session cycle + hook tests` 조합을 성공적으로 사용했다. 이번 플랜은 그 fallback ladder를 정식 기준으로 문서화하는 쪽이 더 안전하다.
- `content-visibility`는 이미 일부 패널에서 성공적으로 쓰이고 있지만, reservations/settlements는 상호작용 밀도가 높은 surface라서 적용 자체보다 `언제 적용하지 말아야 하는지`를 함께 적는 것이 중요하다.

## Proposed Solution

이번 후속 리팩토링은 네 개의 작업 묶음으로 나눈다.

1. `access` read query를 dedicated hook으로 이동
2. `lockers` read query를 dedicated hook으로 이동
3. jwt auth gate 브라우저 검증 경로를 `agent-browser` 기준으로 더 안정화하거나, 도구 한계를 명시적으로 우회하는 검증 절차를 코드/문서로 고정
4. reservations/settlements long-list surface의 `content-visibility` 적용 여부를 실제 smoke/profiler 기준으로 결정

핵심 원칙:
- query hook은 `data/loading/error/reload/reset/invalidate`를 소유한다.
- workspace-local state hook은 form, draft, mutation state, message를 계속 소유한다.
- access/locker query hook의 stale write 방지는 `request-version + explicit reset/invalidate`를 기본 규칙으로 강제한다.
- `shouldCommit`은 query hook 내부 대체 수단이 아니라, 상위 loader 조합 계층이 추가로 쓸 수 있는 보조 guard로만 취급한다.
- 검증 문서는 “도구 제약 때문에 무엇을 어떤 대체 근거로 닫았는지”까지 포함한다.

## Technical Approach

### Phase 1: Access Query Ownership Split

#### Scope
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessWorkspaceState.ts`
- 새 hook 후보:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessPresenceQuery.ts`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessEventsQuery.ts`
  - 또는 `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessQueries.ts`

#### Plan
- `access presence`와 `access events`를 read query hook으로 이동한다.
- `accessSelectedMemberId` 기반 reload 경로는 hook 또는 workspace loader contract에 그대로 연결한다.
- `reloadAccessData()`는 top-level helper로 남기더라도, 실제 state write는 query hook이 소유하게 바꾼다.
- query hook은 `requestIdRef` 같은 request-version counter를 직접 소유하고, `reset/invalidate`에서 반드시 이를 증가시켜 in-flight 요청을 무효화한다.
- logout/reset 이후 late response가 다시 state를 채우지 않도록 success/error/finally가 모두 현재 request-version에서만 commit되게 한다.
- `entry`/`exit` mutation 성공 후에는 `presence`와 `events`가 같은 invalidate 경로를 통해 다시 로드되도록 고정한다.

#### Research Insights
- `accessSelectedMemberId`, panel draft, entry/exit submission state는 계속 `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessWorkspaceState.ts`에 남고, query hook은 `presence/events/loading/error/reload/reset`만 소유해야 한다. 이 경계를 흐리면 기존 state ownership refactor를 되돌리게 된다.
- `presence`와 `events`를 각각 독립 hook으로 나눌 수는 있지만, mutation 후 둘을 함께 다시 불러야 하는 계약이 강하므로 최소한 상위 조합 hook이나 공통 invalidation helper가 필요하다.
- request-version guard는 `members/products/reservation schedules`와 같은 방식으로 구현하는 편이 더 단순하다. `useWorkspaceLoaders.ts`의 `shouldCommit` 패턴은 query hook 대체가 아니라 상위 조합 계층의 보조 guard로만 쓰고, reset 후 late success와 late finally가 모두 무시되는지 테스트로 묶어야 한다.
- access는 center-wide read와 member-scoped read가 섞여 있으므로, `selectedMemberId`가 바뀌어도 center-wide presence summary를 비워야 하는지 유지할지 계약을 먼저 고정해야 한다. 현재 방향에서는 보호 reset과 workspace reset에서만 전량 초기화하고, 일반 member change는 query reload로 닫는 편이 자연스럽다.

#### Validation Guidance
- logout 직전 `presence`/`events` 요청이 완료돼도 cleared state를 다시 채우지 않는 테스트를 추가한다.
- member change 직후 `entry`/`exit` mutation 성공이 이전 member 기준 결과를 섞지 않는지 확인한다.
- access panel error는 query failure와 mutation failure가 서로 덮어쓰지 않는지 smoke 또는 unit test로 확인한다.

#### Rationale
- `App.tsx`에 남은 read-side 병목 중 하나를 제거한다.
- access는 member-scoped + center-wide read가 함께 있으므로, query ownership 경계가 분명해야 유지보수가 쉽다.

### Phase 2: Locker Query Ownership Split

#### Scope
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerWorkspaceState.ts`
- 새 hook 후보:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerSlotsQuery.ts`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerAssignmentsQuery.ts`

#### Plan
- `locker slots`와 `locker assignments` read query를 dedicated hook으로 이동한다.
- `lockerFilters`는 workspace-local state에 남기고, query hook은 filter 기반 load/reload만 소유한다.
- `useLockerWorkspaceLoader`가 현재 받는 `loadLockerSlots`, `loadLockerAssignments` 계약은 유지하되, 내부 구현은 query hook으로 연결한다.
- 라커 배정/반납 후 reload 경로도 query hook을 통해서만 갱신되게 만든다.
- `members` shared query는 그대로 canonical source로 유지하고, locker query는 그 결과를 소비만 하도록 고정한다.
- locker query hook도 자체 `request-version`을 소유하고, protected reset/workspace reset 시 명시적으로 invalidate되도록 맞춘다.

#### Research Insights
- lockers는 shared `members` query와 가장 쉽게 중복 store를 만들 수 있는 화면이다. 이번 단계에서 `members`를 다시 feature-local로 끌어오지 않는다는 규칙을 명시적으로 유지해야 한다.
- `lockerFilters`와 assign/return draft는 workspace-local state에 남고, query hook은 `slots/assignments/loading/error/reload/reset`만 소유해야 한다. filter state까지 query hook이 가져가면 UI state와 read lifecycle이 다시 섞인다.
- 배정/반납 후에는 `slots`와 `assignments`가 항상 같은 transaction-like reload boundary로 움직여야 한다. 한쪽만 reload되면 실제 운영에서는 빈 슬롯 수와 배정 목록이 어긋난다.
- reset 이후 stale response 방지는 `members/products/reservation schedules`와 같은 request-version guard를 동일하게 적용한다. lockers는 filter가 들어가므로 cache보다 reset parity와 explicit invalidation이 우선이다.

#### Validation Guidance
- assign 후 `slots`와 `assignments`가 함께 갱신되는지 확인한다.
- return 후에도 같은 reload contract가 유지되는지 확인한다.
- logout 또는 unauthorized reset 이후 늦게 온 `slots/assignments` 응답이 state를 복구하지 않는지 테스트한다.
- shared members query가 비어 있는 상태에서 locker query hook이 중복 preload를 만들지 않는지 확인한다.

#### Rationale
- lockers는 `members` shared query와 결합돼 있기 때문에, shared preload와 workspace-local read를 구분하는 마지막 대표 사례다.
- 이 경계가 정리되면 access/lockers/dashboard 간 list ownership 혼선을 줄일 수 있다.

### Phase 3: Auth Gate Validation Hardening

#### Scope
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/auth/LoginScreen.tsx`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-bundle-query-auth-lifecycle-validation.md`
- 필요 시 `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useAuthSession.test.tsx`

#### Plan
- `agent-browser`에서 jwt login submit이 불안정했던 원인을 먼저 재현/정리한다.
- 가능한 경우:
  - semantic locator 또는 keyboard submit에 더 안정적인 구조로 미세 조정한다.
  - 예: input/button labeling, autofocus/submit focus 흐름, disabled timing 검토
- 불가능하거나 tooling issue가 명확하면:
  - 해당 제약을 검증 문서에 명시적으로 고정한다.
  - 대신 post-login 진입 검증을 더 신뢰도 높은 수단으로 보강한다.
- hook tests는 유지하고, 필요하면 login success path 자체를 한 건 더 추가한다.

#### Research Insights
- 현재까지의 evidence는 `앱이 로그인에 실패한다`가 아니라 `agent-browser가 controlled form submit을 안정적으로 재현하지 못한다`에 가깝다. 그래서 이 단계의 목표는 form을 억지로 도구에 맞추는 것이 아니라, 도구 한계와 앱 회귀를 구분하는 검증 체계를 고정하는 것이다.
- 검증 우선순위는 `1) 브라우저에서 auth gate 렌더 및 기본 입력 가능 확인`, `2) 가능하면 semantic submit 또는 keyboard submit`, `3) 실패 시 API session cycle(login/refresh/logout/invalidate)`, `4) hook/unit test` 순서로 명시하는 편이 좋다.
- `LoginScreen` 수정이 필요하더라도 접근성 개선과 일치하는 범위에서만 한다. 테스트 도구 때문에 비표준 DOM 구조나 우회 버튼을 추가하는 것은 피한다.
- validation note는 `무엇이 브라우저에서 성공했고`, `무엇이 도구 한계로 남았고`, `어떤 대체 근거로 auth correctness를 닫았는지`를 구분해 기록해야 다음 회차 리뷰가 같은 질문을 반복하지 않는다.

#### Validation Guidance
- prototype 모드와 jwt 모드를 같은 체크리스트 형식으로 비교 기록한다.
- 로그인 success path를 브라우저에서 끝까지 닫지 못하면, 그 사유와 API session cycle 결과를 같은 날짜의 검증 문서에 함께 남긴다.
- logout 후 auth gate 복귀와 refresh invalidation은 브라우저가 아니라도 API 기반 검증 결과를 포함한다.

#### Rationale
- 현재도 auth correctness는 테스트와 API cycle로 충분히 강하지만, 운영 전 smoke 재현성은 한 단계 더 올릴 가치가 있다.

### Phase 4: Rendering Guard Decision

#### Scope
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/settlements/SettlementReportPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`

#### Plan
- `agent-browser` 또는 수동 smoke로 reservations/settlements의 실제 긴 리스트 구간을 확인한다.
- 아래 기준으로 `deferred-list-surface` 적용 여부를 판단한다.
  - 데이터가 충분히 길어질 때 초기 렌더 부담이 체감되는가
  - 모바일 첫 스크롤 점프가 없는가
  - 포커스 이동/폼 입력에 간섭이 없는가
- 이득이 분명하면 적용하고, 아니면 “의도적으로 미적용” 결정도 검증 노트에 남긴다.

#### Research Insights
- reservations는 스케줄 표와 액션 입력이 같은 화면에 밀집돼 있어서, `content-visibility`가 렌더 이득보다 포커스/스크롤 회귀를 만들 가능성이 높다. 단순히 리스트가 길다는 이유만으로 적용하면 안 된다.
- settlements는 결과 테이블 길이가 길어질 수 있지만, 필터 변경 후 즉시 결과를 읽어야 하는 업무 성격상 첫 페인트보다 필터 상호작용과 스크롤 안정성이 더 중요할 수 있다.
- 이 단계의 성공 조건은 반드시 적용하는 것이 아니라, `적용`, `미적용`, `추가 데이터 필요` 중 하나를 근거와 함께 결정하는 것이다.
- 적용한다면 `contain-intrinsic-size`와 같은 보조 속성까지 함께 검토하고, 모바일 첫 스크롤 jump나 keyboard focus 손실이 보이면 바로 롤백하는 기준을 문서에 남겨야 한다.

#### Validation Guidance
- 최소 한 번은 모바일 뷰포트에서 첫 스크롤과 포커스 이동을 확인한다.
- short-list fixture와 long-list fixture가 다르면, short-list에서 이득이 거의 없는지도 기록한다.
- 최종 결론이 미적용이어도 검증 노트에 이유를 남겨 다음 회차에서 같은 실험을 반복하지 않게 한다.

#### Rationale
- 무조건 적용하는 것보다, 실제 surface 특성과 회귀 비용을 같이 보는 편이 안전하다.

## Alternative Approaches Considered

### 1. 남은 query를 전부 SWR/TanStack Query로 일괄 전환
장점:
- dedupe/cache 정책을 빠르게 통일할 수 있다.

단점:
- 지금까지 정리한 workspace reset 계약과 mutation coupling을 다시 크게 흔들게 된다.
- 이번 범위를 넘어서는 구조 변경이다.

결론:
- 보류. 현재 단계는 local hook ownership 완성이 우선이다.

### 2. access/lockers는 `App.tsx`에 유지하고 테스트만 보강
장점:
- 구현량이 적다.

단점:
- query ownership 기준이 화면마다 달라져 리팩토링이 반쯤 멈춘 상태로 남는다.

결론:
- 채택하지 않음.

## System-Wide Impact

### Interaction Graph
- 로그인/세션
  - app mount → `useAuthSession` bootstrap → auth gate 결정 → workspace preload
- access workspace
  - nav 진입 → shared members preload 확인 → access presence/events query load → entry/exit mutation → query reload
- locker workspace
  - nav 진입 → shared members preload 확인 → locker slots/assignments query load → assign/return mutation → query reload

### Error & Failure Propagation
- auth bootstrap 실패는 auth gate에서만 surface되고, workspace query로 전파되지 않는다.
- access/locker query 실패는 panel-level error로만 surface해야 하며, 전역 fatal state로 승격시키지 않는다.
- stale response는 reset 이후 무시돼야 한다. 그렇지 않으면 logout/unauthorized 이후 비워진 UI가 다시 채워진다.

### State Lifecycle Risks
- logout 직전 access/locker read가 in-flight인 경우, 늦은 응답이 reset된 state를 되살릴 수 있다.
- locker assign/return 후 reload contract가 분산되면 일부 리스트만 갱신되고 나머지가 stale할 수 있다.
- jwt login smoke가 계속 불안정하면 회귀 확인이 사람 의존적이 된다.

### API Surface Parity
- access/lockers는 dashboard/sidebar/section 진입에 따라 같은 read 결과를 보여야 한다.
- prototype/jwt 두 모드 모두 auth gate 이후 동일한 workspace 초기화 계약을 유지해야 한다.

### Integration Test Scenarios
- logout 직전 access presence/events 요청이 끝나도 reset 이후 state를 다시 채우지 않는다.
- logout 직전 locker slots/assignments 요청이 끝나도 reset 이후 state를 다시 채우지 않는다.
- locker assign/return 후 slots/assignments가 같은 reload contract로 갱신된다.
- jwt mode login success 후 workspace preload가 정상 작동하고, logout 후 auth gate로 복귀한다.

## Acceptance Criteria

### Functional Requirements
- [x] `access presence/events` read query가 dedicated hook 또는 조합 hook으로 이동한다.
- [x] `locker slots/assignments` read query가 dedicated hook으로 이동한다.
- [x] logout/reset 이후 access/locker read query의 late response가 state를 다시 채우지 않는다.
- [x] access entry/exit 이후 `presence`와 `events`가 같은 reload contract로 갱신된다.
- [x] locker assign/return 이후 `slots`와 `assignments`가 같은 reload contract로 갱신된다.
- [x] jwt auth gate 검증 경로가 코드 또는 검증 문서 기준으로 더 명확하게 정리된다.
- [x] reservations/settlements long-list rendering guard 적용 여부가 코드 또는 검증 문서로 결정된다.

### Non-Functional Requirements
- [x] `App.tsx`의 read-side orchestration 코드가 추가로 감소한다.
- [x] access/locker stale-write 방지 패턴이 members/products/reservations와 일관된다.
- [x] shared `members` source ownership이 lockers refactor 이후에도 변하지 않는다.
- [x] 브라우저 검증 문서가 도구 제약과 대체 근거를 명확히 설명한다.
- [x] `shouldCommit`는 query hook의 핵심 stale-write 방어가 아니라 상위 조합 guard로만 남는다.

### Quality Gates
- [x] `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` 통과
- [x] `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` 통과
- [x] access query hook regression test 추가
- [x] locker query hook regression test 추가
- [x] post-reset stale write regression test 추가
- [x] jwt auth gate validation note 갱신
- [x] long-list follow-up 결과를 검증 문서에 기록
- [x] `agent-browser` limitation과 API/session fallback 근거를 같은 검증 문서에 함께 남김

## Success Metrics
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에서 access/locker read query 구현이 사라지거나 현저히 축소된다.
- query ownership 규칙이 `members/products/reservations/settlements/crm/access/lockers` 전반에 일관되게 적용된다.
- jwt 모드 smoke 해석 기준이 문서상 명확해져 재검증 비용이 줄어든다.

## Dependencies & Risks

### Dependencies
- PR `#61`에서 도입한 query/auth hook 패턴 유지
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceLoaders.ts` 재사용
- `agent-browser` 실행 가능 환경

### Risks
1. access/locker mutation 후 reload contract 일부 누락
2. stale-write guard를 넣다가 loading 종료 타이밍이 꼬일 가능성
3. `agent-browser` 한계를 앱 코드 문제로 오인할 가능성
4. `content-visibility`를 잘못 적용해 모바일 UX를 악화시킬 가능성
5. refactor 중 `App.tsx`와 query hook이 같은 read path를 일시적으로 이중 소유할 가능성

### Mitigations
- query hook별 reset/reload/invalidate contract를 명시적으로 테스트한다.
- request-version guard와 `shouldCommit` 패턴을 기존 성공 사례와 동일하게 사용한다.
- auth validation 문서에 “도구 제약 vs 앱 회귀”를 분리해 기록한다.
- rendering guard는 적용보다 판정 자체를 목표로 둔다.
- access/locker migration은 `App.tsx`의 기존 inline load path를 제거하는 커밋 단위로 마무리해 partial ownership 상태를 남기지 않는다.

## Sources & References

### Internal References
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceLoaders.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useMembersQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductsQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessWorkspaceState.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerWorkspaceState.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/auth/LoginScreen.tsx`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-bundle-query-auth-lifecycle-validation.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-react-workspace-lifecycle-validation.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/useReservationSchedulesQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useAuthSession.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/auth/LoginScreen.tsx`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-bundle-query-auth-lifecycle-validation.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-react-workspace-lifecycle-validation.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`

### Institutional Learnings
- `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
- `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
