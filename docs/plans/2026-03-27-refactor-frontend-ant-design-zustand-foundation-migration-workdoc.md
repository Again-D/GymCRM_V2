---
title: "workdoc: Frontend Ant Design and Zustand foundation migration"
type: workdoc
status: active
date: 2026-03-27
origin: docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-plan.md
---

# workdoc: Frontend Ant Design and Zustand foundation migration

## Goal

`frontend`를 `Ant Design 5.x + Zustand + TanStack Query 5.x` 기준선으로 전환한다. 이 문서는 설명용 계획서가 아니라, `workflows-work`에서 바로 집행할 수 있는 작업 순서와 phase gate를 정리한 실행 문서다.

기본 원칙:

- 기존 login-first, sidebar shell, role gating, selected member handoff UX는 유지
- 서버 상태는 TanStack Query, 앱/UI 상태는 Zustand
- access token은 memory-only 유지
- `App.useApp()` 기반 feedback adapter 강제
- `selectedMember`는 precheck 후 detail query 실행
- legacy path와 new path를 한 페이지 안에서 장기간 혼용하지 않음

## References

- Primary plan: [docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-plan.md)
- Origin brainstorm: [docs/brainstorms/2026-03-27-frontend-ant-design-zustand-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-27-frontend-ant-design-zustand-brainstorm.md)

## Global Done Criteria

- [x] `frontend`에 `antd`, `zustand`, `@tanstack/react-query`가 실제 도입됨
- [x] top-level provider contract가 고정됨
- [x] auth/theme/selected-member/global feedback state 경계가 문서와 구현에서 일치함
- [x] query key factory와 shared error mapper가 도입됨
- [x] Wave 1A, Wave 1B, Wave 2 전체 페이지가 새 기준으로 마이그레이션됨
- [x] legacy custom shared UI primitive 의존이 제거됨
- [x] selected member unauthorized-selection UX가 기존 계약대로 유지됨
- [ ] JS/CSS/rerender/refetch budget을 넘지 않음
- [ ] 관련 문서와 실제 구현 상태가 일치함

## Phase 0: Baseline and Contracts

### Tasks

- [x] `Dashboard`, `Members`, `Memberships`, `Reservations`의 React Profiler baseline 기록
- [x] initial JS/CSS baseline 기록
- [x] auth/theme/bootstrap/provider 흐름 현행 파악
- [x] selected member precheck/reset 흐름 현행 파악
- [x] brand token inventory 작성
- [x] migration ownership matrix 확정
- [x] budget 수치 확정 및 문서화

### Required Outputs

- [x] baseline note 또는 artifact 경로
- [x] token inventory
- [x] ownership matrix
- [x] measurable budget

### Gate

- [x] baseline 없이 다음 phase로 넘어가지 않음
- [x] provider order와 theme source-of-truth가 문서로 확정됨

## Phase 1: Dependency and Provider Layer

### Tasks

- [x] `frontend/package.json`에 `antd`, `zustand`, `@tanstack/react-query` 추가
- [x] `main.tsx`를 아래 순서로 재구성
- [x] `theme bootstrap -> auth/store hydration -> QueryClientProvider -> ConfigProvider -> antd App -> BrowserRouter`
- [x] antd `reset.css` 단일 import 적용
- [x] theme bridge 구현
- [x] `App.useApp()` 기반 feedback adapter 추가
- [x] refresh failure 처리 순서 고정

### Required Outputs

- [x] provider contract 반영 코드
- [x] theme token 초안
- [x] feedback adapter

### Gate

- [x] unauthenticated login-first behavior 유지
- [x] first paint theme flash 없음
- [x] shell 밖 feedback context 누락 없음

## Phase 2A: Zustand App State

### Tasks

- [x] auth slice 도입
- [x] theme slice 도입
- [x] ui-feedback slice 도입
- [x] 기존 `AuthStateProvider`, `ThemeProvider`를 thin adapter로 전환
- [x] typed action/state 규칙 적용

### Type Rules

- [x] `Readonly` state 사용
- [x] initial slice는 `satisfies` 사용
- [x] `any`, 무분별한 `Partial`, untyped payload 금지

### Gate

- [x] auth/theme 동작 동일
- [x] shell-wide broad rerender 회귀 없음
- [x] raw token이 store/localStorage/query cache에 저장되지 않음

## Phase 2B: Selected Member and Session-Sensitive State

### Tasks

- [x] selected-member slice 도입
- [x] store에는 `selectedMemberId`와 selection UI status만 저장
- [x] member detail은 TanStack Query key 기반으로 조회
- [x] existing auth-sensitive precheck 유지
- [x] logout/auth bootstrap failure/center change/role downgrade reset 규칙 반영
- [x] 기존 `SelectedMemberProvider`를 thin adapter로 전환

### Gate

- [x] unauthorized detail query를 먼저 발사하지 않음
- [x] unauthorized-selection 시 현재와 같은 안전 메시지/selection 유지 UX 동작
- [x] auth identity 변화 후 stale selected member 없음

## Phase 3: Shell and Shared UI Replacement

### Tasks

- [x] `DashboardLayout`를 antd `Layout/Menu` 기반으로 교체
- [x] `HeaderLayout`를 antd 기준으로 교체
- [x] dashboard hero/card surface 교체
- [x] custom `Modal`, `EmptyState`, `SkeletonLoader` 대체
- [x] raw backend error 문자열 노출 제거
- [x] CSS Modules에서 primitive styling 제거

### Gate

- [x] shell parity 확보
- [x] theme parity 확보
- [x] auth/session parity 확보
- [x] 위 3개 충족 전에는 Phase 4 금지

## Phase 4: Query Layer Standardization

### Tasks

- [x] `queryKeys` factory 추가
- [x] shared `ApiClientError -> UI error` mapper 추가
- [x] feature별 query ownership 명확화 (Reservations)
- [x] manual fetch/useEffect 패턴을 TanStack Query로 전환 (Reservations)
- [x] list/detail/reference/search/mutation policy matrix 적용
- [x] debounce/autocomplete가 필요한 search path 유지 (Reservation Targets)

### Query Rules

- [x] raw string key 금지
- [x] ad hoc array literal key 금지
- [x] `401/403` 및 auth endpoint retry 제외
- [x] query state를 Zustand에 넣지 않음
- [x] per-query error surface에서 raw backend detail/traceId 노출 금지

### Gate

- [x] stale UI와 invalidation 동작 일관됨 (Reservations)
- [x] auth refresh/retry 흐름과 충돌 없음
- [x] search/autocomplete request churn 없음 (Fixed via useQuery keyword)

## Phase 5: Page Migration Waves

### Wave 1A

- [x] `Dashboard`
- [x] `Login`

### Wave 1B

- [x] `Members`
- [x] `Memberships`
- [x] `Reservations`

### Wave 2

- [x] `Access`
- [x] `Lockers`
- [x] `CRM`
- [x] `Settlements`
- [x] `Products`
- [x] `Trainers`
- [x] `GxSchedules`
- [x] `TrainerAvailability`

### Per-Page Rules

- [ ] 한 페이지는 legacy path 또는 new path 중 한 방향으로만 전환
- [ ] custom UI primitive dependency 제거
- [ ] typed smoke test 추가 또는 갱신
- [ ] 401/refresh/invalidation check 수행
- [ ] rollback point 기록

### Large List Rule

- [ ] 100 visible rows 또는 1,000 total records 이상 예상 시 virtualization/windowing 검토
- [ ] 우선 후보: member search results, reservations, access logs, products, trainers

### Gate

- [x] Wave 1A 완료 후 shell-level 회귀 없음
- [ ] Wave 1B 완료 후 representative flows 회귀 없음
- [ ] Wave 2 완료 후 전체 shell route legacy primitive 제거

## Phase 6: Hardening and Documentation

### Tasks

- [x] `frontend/npm run build`
- [x] `frontend/npm test`
- [x] representative browser smoke 수행
- [x] negative security test 수행
- [x] churn/regression smoke 수행
- [ ] 문서 정합성 반영

### Required Validation

- [x] login-first flow
- [ ] sidebar navigation
- [ ] modal open/close
- [x] selected member handoff
- [ ] selected member unauthorized-selection flow
- [ ] logout
- [ ] refresh failure
- [ ] role downgrade
- [x] direct URL access negative test
- [x] theme toggle
- [ ] member switch
- [x] rapid navigation
- [ ] repeated modal open/close

### Gate

- [ ] 문서와 실제 구현이 일치함
- [ ] unfinished backlog와 rollback note가 남아 있음

### Current Hardening Note

- `frontend/npm run build`는 2026-03-30 기준 통과했다.
- `frontend/npm test`는 2026-03-30 기준 전체 `43`개 파일, `124`개 테스트가 통과했다.
- representative browser smoke / direct URL negative check / rapid route churn smoke는 `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-30-frontend-foundation-phase6-browser-smoke-validation.md`에 기록했다.
- 남은 hardening 항목은 logout/refresh failure/role downgrade/repeated modal open-close 검증과 문서 정합성 반영이다.

## Budget Guardrails

- [ ] initial JS 증가량: baseline 대비 `+20%` 이내
- [ ] initial CSS 증가량: baseline 대비 `+15%` 이내
- [ ] auth/theme/member 전환 시 shell-wide commit count: baseline 대비 `+10%` 이내
- [ ] focus/route transition 기반 불필요 refetch: baseline 대비 증가 금지
- [ ] representative query-heavy flow interaction latency: baseline 대비 악화 금지

## Work Log Template

각 phase 또는 wave 완료 시 아래를 남긴다.

- [ ] changed files
- [ ] validation run
- [ ] browser smoke result
- [ ] regression 여부
- [ ] next rollback point
- [ ] 남은 blockers

## Suggested Execution Order

1. Phase 0 완료
2. Phase 1 완료
3. Phase 2A 완료
4. Phase 2B 완료
5. Phase 3 완료
6. Phase 4 완료
7. Wave 1A
8. Wave 1B
9. Wave 2
10. Phase 6 마감
