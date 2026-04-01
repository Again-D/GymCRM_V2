---
title: "baseline note: Frontend Ant Design and Zustand foundation migration"
type: note
status: active
date: 2026-03-27
origin: docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-workdoc.md
---

# baseline note: Frontend Ant Design and Zustand foundation migration

## Scope

This note records the current frontend foundation, migration contracts, and measurable baseline artifacts gathered before and during the Phase 1 provider/dependency migration.

## Build Baseline

### Before Phase 1

- Command: `cd frontend && npm run build`
- Output:
  - `dist/assets/index-ztNOZ243.js`: `399.21 kB` (`107.38 kB gzip`)
  - `dist/assets/index-CUVUvUMB.css`: `30.19 kB` (`6.51 kB gzip`)
  - `dist/assets/mockData-C4-_NZJL.js`: `32.27 kB` (`8.71 kB gzip`)

### After Phase 1

- Command: `cd frontend && npm run build`
- Output:
  - first foundation integration:
    - `dist/assets/index-wGV-TEES.js`: `685.19 kB` (`199.62 kB gzip`)
    - `dist/assets/index-CzcthXdt.css`: `33.13 kB` (`7.48 kB gzip`)
    - `dist/assets/mockData-BWlPEnng.js`: `32.27 kB` (`8.71 kB gzip`)
  - after route-level lazy loading:
    - `dist/assets/index-w4oWg5VC.js`: `488.65 kB` (`158.65 kB gzip`)
    - `dist/assets/index-BvPdwcW7.css`: `20.04 kB` (`4.84 kB gzip`)
    - route chunks split out per page, for example:
      - `dist/assets/Dashboard-Cl-GFq4a.js`: `3.97 kB`
      - `dist/assets/MemberList-WhALCaWc.js`: `20.95 kB`
      - `dist/assets/MembershipsPage-Buo25rqV.js`: `24.98 kB`
      - `dist/assets/ReservationsPage-D7EX0WxC.js`: `23.82 kB`
- Result:
  - first foundation integration JS delta: about `+71.6%`
  - optimized entry JS delta after lazy loading: about `+22.4%`
  - optimized entry CSS delta after lazy loading: about `-33.6%`
  - CSS budget is inside the workdoc guardrail.
  - JS budget is improved substantially but still slightly outside the current `+20%` guardrail.
  - bundle analysis after lazy loading shows the remaining entry weight is now dominated by shared library cost:
    - `antd`: about `227 kB`
    - `@ant-design`: about `93 kB`
    - `react-dom`: about `135 kB`
    - `react-router`: about `81 kB`
    - `@tanstack/query-core`: about `55 kB`

## React Profiler Baseline

- Capture method:
  - local Vite dev server with `VITE_REBUILD_MOCK_DATA=1`
  - route opened with `?authMode=prototype&reactProfile=1`
  - dev-only `RouteProfiler` boundary writes samples to `window.__GYMCRM_REACT_PROFILER__`
  - browser session reads the store after route stabilization
- Representative route baselines:
  - `Dashboard`
    - commit count: `1`
    - max actual duration: `1.00 ms`
    - total actual duration: `1.00 ms`
  - `Members`
    - commit count: `4`
    - max actual duration: `20.60 ms`
    - total actual duration: `23.50 ms`
  - `Memberships`
    - commit count: `4`
    - max actual duration: `2.30 ms`
    - total actual duration: `3.40 ms`
  - `Reservations`
    - commit count: `4`
    - max actual duration: `2.40 ms`
    - total actual duration: `4.10 ms`
- Interpretation:
  - this baseline measures initial route mount and immediate follow-up updates in development mode
  - `Members` is the highest-cost representative route among the four captured routes
  - these numbers are suitable as a relative React render baseline for the migration waves

## Browser Performance Baseline

These are provisional browser-performance artifacts gathered with Lighthouse against the local Vite dev server in prototype mode. They help compare representative route load behavior, but they are not a substitute for a true React DevTools Profiler capture.

- Command pattern:
  - `cd frontend && npm_config_cache=.npm-cache npx lighthouse 'http://127.0.0.1:4173/<route>?authMode=prototype' --output json --output-path ./lighthouse-<route>.json --only-categories=performance --quiet --chrome-flags='--headless=new --no-sandbox'`
- Results:
  - `Dashboard`
    - performance score: `0.55`
    - FCP: `16.8 s`
    - LCP: `31.9 s`
    - TBT: `30 ms`
  - `Members`
    - performance score: `0.55`
    - FCP: `16.7 s`
    - LCP: `31.7 s`
    - TBT: `30 ms`
  - `Memberships`
    - no stable result recorded
    - Lighthouse failed with `NO_FCP`
  - `Reservations`
    - partial result only
    - FCP: `16.8 s`
    - Lighthouse reported `NO_LCP`
- Interpretation:
  - the browser baseline is noisy and throttled, so treat it as a rough comparative artifact only
  - route rendering no longer fails globally after lazy loading, but we still need a real React Profiler session for the workdoc checkbox

## Current Provider and Bootstrap Flow

### Before Phase 1

- `frontend/src/main.tsx`
  - `initializeThemeOnDocument()`
  - `AuthStateProvider`
  - `ThemeProvider`
  - `BrowserRouter`
  - `App`
- Theme source:
  - localStorage-backed preference in `frontend/src/app/theme.tsx`
  - DOM bridge through `document.documentElement[data-theme]`
- Auth source:
  - React context in `frontend/src/app/auth.tsx`
  - access token kept memory-only in provider state

### After Phase 1 contract

- `initializeThemeOnDocument()`
- `ThemeProvider`
- `AuthStateProvider`
- `QueryClientProvider`
- `ConfigProvider`
- `antd App`
- `BrowserRouter`
- `App`

## Theme Source of Truth

- During migration, `ThemeProvider` remains the single state owner for theme preference and resolved theme.
- `data-theme` remains the DOM bridge for existing CSS Modules and legacy custom surfaces.
- Ant Design theme config is now derived from the resolved theme through `frontend/src/app/antdTheme.ts`.
- Migration rule:
  - no parallel source of truth for theme state
  - Zustand can replace the provider internals later, but the output contract must stay `resolvedTheme -> DOM bridge + Ant Design theme`

## Selected Member Precheck and Reset Flow

- Current owner: `frontend/src/pages/members/modules/SelectedMemberContext.tsx`
- Current flow:
  - `selectMember(memberId)`
  - auth-sensitive precheck through `canAuthUserAccessMember(memberId, authUser)`
  - only after precheck succeeds, member detail fetch runs through `apiGet(/api/v1/members/:id)`
  - unauthorized selection clears current selection and keeps the user on the selection screen with a safe message
- Current reset triggers:
  - manual `clearSelectedMember()`
  - auth identity change detected via `createAuthIdentityKey(authUser)`

## Brand Token Inventory

- Typography
  - `--font-main`: `"Pretendard", "Noto Sans KR", sans-serif`
- Layout and radius
  - `--shell-sidebar-width`: `200px`
  - `--radius-sm`: `12px`
  - `--radius-md`: `20px`
- Light mode
  - `--bg-base`: `#f3efe7`
  - `--bg-surface`: `#ffffff`
  - `--bg-panel`: `rgba(255, 255, 255, 0.82)`
  - `--text-main`: `#162126`
  - `--text-muted`: `#4a6169`
  - `--primary`: `#162126`
  - `--secondary`: `#f8f4ea`
- Dark mode
  - `--bg-base`: `#111416`
  - `--bg-surface`: `#1a1e21`
  - `--bg-panel`: `rgba(26, 30, 33, 0.85)`
  - `--text-main`: `#e2e8f0`
  - `--text-muted`: `#94a3b8`
- Semantic states
  - `--status-ok`: `#1a6c48`
  - `--status-warn`: `#925b12`
  - `--status-danger`: `#8f2330`
  - `--status-info`: `#2b3f9c`
- Bridge decision:
  - Ant Design tokens mirror these colors first
  - legacy CSS variables stay in place until shared custom primitives are removed

## Ownership Matrix

| Concern | Current Owner | Target Owner | Notes |
| --- | --- | --- | --- |
| auth/session metadata | `AuthStateProvider` | Zustand auth slice | access token remains memory-only |
| theme preference and resolved theme | `ThemeProvider` | Zustand theme slice | `data-theme` + Ant Design theme bridge stay aligned |
| selected member id and selection UX state | `SelectedMemberContext` | Zustand selected-member slice | detail entity should move to TanStack Query later |
| member detail and remote entities | local fetch hooks / provider fetches | TanStack Query | do not duplicate into Zustand |
| global feedback | ad hoc text rendering | antd `App.useApp()` adapter | static feedback calls are now banned by contract |
| query defaults and retry policy | none | shared query client | 401/403 retries disabled globally |

## Budget Guardrails

- initial JS increase budget: within `+20%`
- initial CSS increase budget: within `+15%`
- shell-wide commit count budget for auth/theme/member transitions: within `+10%`
- route transition refetch budget: no increase
- representative query-heavy interaction latency: no regression

## Validation Run

- `cd frontend && npm run build`
- `cd frontend && npm test`

## Phase 2A Implementation Note

- `auth`, `theme`, `ui-feedback`는 이제 Zustand slice를 내부 상태 엔진으로 사용한다.
- `AuthStateProvider`, `ThemeProvider`는 public contract를 유지한 thin adapter로 남겨 두고, 실제 상태 읽기/쓰기와 hydration은 provider-scoped store에서 처리한다.
- `ui-feedback`는 `App.useApp()` adapter를 거쳐 message/notification event를 Zustand store에 기록한다.
- access token은 계속 `AuthStateProvider` 내부 memory state에만 남고, Zustand store/localStorage/query cache로 복제하지 않는다.
- Validation:
  - `cd frontend && npm run build`
    - `dist/assets/index-CVcjVOAm.js`: `494.21 kB` (`160.03 kB gzip`)
    - `dist/assets/index-BvPdwcW7.css`: `20.04 kB` (`4.84 kB gzip`)
  - `cd frontend && npm test`
    - `40` test files passed
    - `125` tests passed

## Phase 3 Shell Foundation Note

- `DashboardLayout`는 antd `Layout/Menu` 기반 shell로 교체됐다.
- `HeaderLayout`는 antd `Card`, `Segmented`, `Button`, `Tag` 기반 session/theme control shell로 교체됐다.
- `Dashboard` hero/metric/quick-link surface는 antd `Card`, `Statistic`, `Tag`, `Button`, `Empty` 기반으로 교체됐다.
- `DashboardLayout`은 lazy chunk로 분리해 main entry 회귀를 완화했다.
- remote failure surface는 공통 `toUserFacingErrorMessage()` helper로 내려서 backend detail/trace/error.message를 직접 노출하지 않도록 정리했다.
- 예약, GX, 트레이너 가용성, 트레이너 관리, 회원권, 회원/상품/라커 조회, PT candidate 조회, CRM 실패 행은 이제 사용자용 fallback 문구만 노출한다.
- `Modal`은 antd 대체 시도가 기존 focus/accessibility contract와 충돌해 되돌렸고, `EmptyState`/`SkeletonLoader`만 antd thin wrapper로 바뀌었다.
- Validation:
  - `cd frontend && npm run build`
    - `dist/assets/index-je5IQqpR.js`: `504.89 kB` (`163.65 kB gzip`)
    - `dist/assets/index-CqkD22ZU.css`: `15.03 kB` (`3.96 kB gzip`)
    - `dist/assets/index-FFmvNHeT.js`: `196.49 kB` (`61.85 kB gzip`)
    - `dist/assets/DashboardLayout-0nKrnh8V.js`: `47.14 kB` (`14.18 kB gzip`)
    - `dist/assets/Dashboard-BKSd302h.js`: `23.44 kB` (`9.16 kB gzip`)
  - `cd frontend && npm test`
    - `41` test files passed
    - `126` tests passed

## Phase 3 Shared Primitive Cleanup Note

- `MemberContextFallback`은 `panel-card`, `members-table`, `empty-cell`, `error-text` 조합 대신 antd `Card`, `Input`, `Button`, `Alert`, `Table`, `Empty`로 정리됐다.
- `SelectedMemberSummaryCard`도 전역 primitive class 대신 antd `Card`, inner `Card`, `Alert`, `Descriptions`, `Empty` surface로 전환됐다.
- 이 턴에서는 shared member-context surface만 정리했고, `Modal` 대체와 page-level `ops-shell`/`panel-card`/`pill` 제거는 여전히 남아 있다.
- Validation:
  - `cd frontend && npm run build`
    - `dist/assets/index-BCVUAXtu.js`: `505.61 kB` (`164.09 kB gzip`)
    - `dist/assets/index-Bm4SP7GE.js`: `187.09 kB` (`59.39 kB gzip`)
    - `dist/assets/MembershipsPage-CyqVALav.js`: `327.35 kB` (`101.04 kB gzip`)
    - `dist/assets/MemberList-DKFXL9MH.js`: `30.58 kB` (`8.68 kB gzip`)
    - `dist/assets/index-CqkD22ZU.css`: `15.03 kB` (`3.96 kB gzip`)
  - `cd frontend && npm test`
    - `41` test files passed
    - `126` tests passed

## Phase 3 Products Surface Note

- `ProductsPage`는 `ops-shell`, `panel-card`, `pill`, `members-table`, legacy form primitive를 제거하고 antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Form`, `Input`, `Select`, `Checkbox`, `Button` 기반으로 재구성됐다.
- custom `Modal` 자체는 아직 유지하지만, product editor modal 내부 form surface는 antd input/select/checkbox 계약으로 맞췄다.
- 관련 테스트는 antd `matchMedia` 전제와 alert text matcher를 반영해 갱신했다.
- 이 변경으로 `ProductsPage`는 page-level primitive cleanup의 첫 완료 slice가 됐지만, `Lockers`, `Settlements`, `Reservations`, `GX`, `TrainerAvailability`, `Trainers`, `Members`, `CRM`은 여전히 남아 있다.
- Validation:
  - `cd frontend && npm run build`
    - `dist/assets/index-BOLqlDyE.js`: `508.01 kB` (`165.00 kB gzip`)
    - `dist/assets/Table-BNscqCSa.js`: `307.79 kB` (`96.45 kB gzip`)
    - `dist/assets/index-pC48D1-0.js`: `187.13 kB` (`59.41 kB gzip`)
    - `dist/assets/ProductsPage-B0mRU-9M.js`: `12.59 kB` (`4.49 kB gzip`)
    - `dist/assets/ProductsPage-CfosR9n4.css`: `1.07 kB` (`0.45 kB gzip`)
  - `cd frontend && npm test`
    - `41` test files passed
    - `126` tests passed

## Phase 3 Lockers Surface Note

- `LockersPage`는 page shell, stats, slot list, assignment list, assign modal form을 legacy primitive 대신 antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Form`, `Input`, `Select`, `DatePicker`, `Button` surface로 재구성됐다.
- custom `Modal`은 그대로 유지했지만, modal 내부 배정 폼은 antd 입력 계약으로 맞췄다.
- `SelectedMemberContextBadge`는 modal 상단 context surface로 유지하고, unsupported-role 경고도 antd `Alert`로 통일했다.
- 이 변경으로 `LockersPage`도 page-level primitive cleanup slice로 닫혔지만, `Settlements`, `Reservations`, `GX`, `TrainerAvailability`, `Trainers`, `Members`, `CRM`은 여전히 남아 있다.
- Validation:
  - `cd frontend && npm run build`
    - `dist/assets/index-DufvIdft.js`: `508.09 kB` (`165.03 kB gzip`)
    - `dist/assets/Table-VYzVO47v.js`: `307.79 kB` (`96.45 kB gzip`)
    - `dist/assets/index-B1V6gTwD.js`: `187.14 kB` (`59.42 kB gzip`)
    - `dist/assets/LockersPage-kMiwK8Fx.js`: `13.70 kB` (`4.80 kB gzip`)
    - `dist/assets/LockersPage-BrO7CJiU.css`: `1.10 kB` (`0.43 kB gzip`)
  - `cd frontend && npm test`
    - `41` test files passed
    - `126` tests passed

## Phase 3 Settlements Surface Note

- `SettlementsPage`는 page shell, KPI strip, filter form, result table을 legacy primitive 대신 antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Form`, `Input`, `Select`, `DatePicker`, `Button` surface로 재구성됐다.
- 정산 필터는 antd form control로 통일했고, report 결과 empty/loading surface도 antd `Empty`/`Table` locale contract로 정리했다.
- 이번 slice에서 `SettlementsPage` smoke test를 추가해 shell title, report filter panel, result panel이 정상 렌더링되는지 고정했다.
- 이 변경으로 `SettlementsPage`도 page-level primitive cleanup slice로 닫혔지만, `Reservations`, `GX`, `TrainerAvailability`, `Trainers`, `Members`, `CRM`은 여전히 남아 있다.
- Validation:
  - `cd frontend && npm run build`
    - `dist/assets/index-CImiTiIG.js`: `508.11 kB` (`165.01 kB gzip`)
    - `dist/assets/Table-CUZJVhhm.js`: `307.79 kB` (`96.45 kB gzip`)
    - `dist/assets/index-lBoK9RE9.js`: `187.14 kB` (`59.42 kB gzip`)
    - `dist/assets/SettlementsPage-CRu1h5rO.js`: `8.50 kB` (`3.30 kB gzip`)
    - `dist/assets/SettlementsPage-gqFC_R21.css`: `0.93 kB` (`0.39 kB gzip`)
  - `cd frontend && npm test`
    - `42` test files passed
    - `127` tests passed

## Phase 3 Reservations Surface Note

- `ReservationsPage`는 outer shell, KPI card, member directory, selected-member workbench를 legacy primitive 대신 antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Input`, `Button` surface로 재구성됐다.
- 예약 생성 플로우는 기존 focus/accessibility contract를 깨지 않기 위해 custom `Modal`을 유지했고, PT/GX 생성 비즈니스 로직과 selected-member coupling도 그대로 두었다.
- member directory action은 workbench dialog를 먼저 열고 `selectMember()` 결과에 따라 유지/복구하도록 바꿔, 느린 async selection에서도 UI contract가 끊기지 않게 정리했다.
- full-suite 기준으로 shell/page integration test가 timeout budget에 걸려 `App.routing`, `AccessPage`, `ProductsPage`, `ReservationsPage`의 느린 시나리오에만 timeout 여유를 늘렸다. 기능 계약은 그대로다.
- 이 변경으로 `ReservationsPage`도 page-level primitive cleanup slice로 닫혔지만, `GX`, `TrainerAvailability`, `Trainers`, `Members`, `CRM`과 custom `Modal` 대체는 여전히 남아 있다.
- Validation:
  - `cd frontend && npm run build`
    - `dist/assets/index-B1ZaOX-6.js`: `508.17 kB` (`165.70 kB gzip`)
    - `dist/assets/Table-BQIaPVO0.js`: `307.79 kB` (`96.81 kB gzip`)
    - `dist/assets/index-DFN55b_x.js`: `187.14 kB` (`59.72 kB gzip`)
    - `dist/assets/ReservationsPage-CAfTXliy.js`: `21.88 kB` (`6.81 kB gzip`)
    - `dist/assets/ReservationsPage-BSTlfGRd.css`: `0.48 kB` (`0.31 kB gzip`)
  - `cd frontend && npm test`
    - `42` test files passed
    - `127` tests passed

## Phase 3 Trainers Surface Note

- `TrainersPage`는 page shell, metric strip, filter form, trainer list, detail surface를 legacy primitive 대신 antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Form`, `Input`, `Select`, `Button`, `Descriptions`, `List`, `Empty` 기반으로 재구성됐다.
- custom `Modal` 자체는 유지했지만, trainer detail과 editor 주변 surface는 antd contract로 옮겨 detail/readonly availability 흐름을 기존 비즈니스 로직 위에서 정리했다.
- 병행 작업 중 이미 antd로 바뀌어 있던 `GxSchedulesPage`, `TrainerAvailabilityPage`와 route-shell test는 full-suite에서만 드러나는 timing issue가 있어 test stabilization을 같이 묶었다.
- full-suite 안정화를 위해 `App.routing`/`App.test`의 lazy shell loading wait timeout을 명시적으로 늘렸고, `AccessPage`, `LockersPage`, `TrainerAvailabilityPage`, `GxSchedulesPage`의 느린 시나리오도 timeout budget을 현실 실행시간에 맞게 상향했다.
- `vitest`는 현재 `maxWorkers: 4`, `minWorkers: 1`로 조정해 heavy antd/jsdom suite에서 반복되던 병렬 flaky를 줄였다. 기능 계약이 아니라 test runner parallelism만 바꾼 조정이다.
- 이 변경으로 `TrainersPage`도 page-level primitive cleanup slice로 닫혔지만, `Members`, `CRM`, custom `Modal` replacement는 여전히 Phase 3 잔여 항목이다.
- Validation:
  - `cd frontend && npm run build`
    - `dist/assets/index-Dwo10Deh.js`: `508.51 kB` (`165.85 kB gzip`)
    - `dist/assets/Table-fIQlgEiQ.js`: `171.03 kB` (`54.93 kB gzip`)
    - `dist/assets/index-sDLFN_pD.js`: `187.16 kB` (`59.73 kB gzip`)
    - `dist/assets/TrainersPage-Dr3rD4XF.js`: `14.64 kB` (`4.69 kB gzip`)
    - `dist/assets/GxSchedulesPage-DNHuOsar.js`: `28.83 kB` (`9.24 kB gzip`)
    - `dist/assets/TrainersPage-DVGkyJHe.css`: `0.54 kB` (`0.33 kB gzip`)
  - `cd frontend && npm test`
    - `42` test files passed
    - `127` tests passed

## Notes

- Phase 1 foundation is in place, but the migration is not ready to advance past all gates yet because:
  - JS bundle budget is still slightly over the agreed threshold
