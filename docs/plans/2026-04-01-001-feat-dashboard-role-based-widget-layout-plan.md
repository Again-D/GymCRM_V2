---
title: "feat: 대시보드 역할별 모듈식 위젯 레이아웃"
status: completed
date: 2026-04-01
origin: docs/brainstorms/2026-03-30-dashboard-role-based-widgets-requirements.md
---

# feat: 대시보드 역할별 모듈식 위젯 레이아웃

## Problem Frame

현재 Dashboard.tsx는 활성 모듈 개수 및 라우트 링크 목록만 표시하는 빈 화면이다.
원장/관리자, 데스크/매니저, 트레이너는 각자 필요로 하는 운영 정보가 다름에도 동일한 정적 화면을 본다.
본 플랜은 사용자의 권한을 인식해 역할별로 최적화된 위젯(KPI 카드, 리스트 카드) 조합을 렌더링하는
컨테이너 기반 대시보드로 전면 재구성한다.

(see origin: docs/brainstorms/2026-03-30-dashboard-role-based-widgets-requirements.md)

---

## Key Planning Decisions

| 결정 | 내용 | 근거 |
|---|---|---|
| BFF API 불필요 | 기존 `/api/v1/access/presence`, `/api/v1/members`, `/api/v1/reservations/schedules`, `/api/v1/reservations/gx/snapshot` 개별 엔드포인트를 위젯 단에서 병렬 호출 | 도메인 API가 이미 충분히 세분화되어 있으며 React Query 캐시로 중복 호출 방지 가능 |
| 위젯 격리 디렉토리 신설 | `frontend/src/pages/dashboard/widgets/` | 기존 페이지 컴포넌트와 완전 독립. 위젯은 queryKeys를 직접 소비하고 routing context 없이 동작 |
| Mock 데이터 활용 | 신규 API 엔드포인트 추가 없음. 기존 `mockData.ts`의 presence/schedules/members mock 데이터를 그대로 소비 | 백엔드 변경 없이 프론트엔드만 완결되어야 함 |
| 역할 매핑은 순수 함수 | `getDashboardWidgetConfig(authUser)` 함수가 위젯 배열을 반환. `Dashboard.tsx`는 이 배열만 순회하여 렌더링 | 역할 판단 로직이 UI에 섞이지 않게 하여 테스트 용이성 확보 |
| 위젯 내 네비게이션 링크 제공 | 각 위젯 하단에 해당 상세 페이지로 이동하는 `<Link>` 포함 | 위젯은 요약만 보여주고, 디테일은 기존 도메인 페이지로 위임 |

---

## High-Level Technical Design

> 이 다이어그램은 의도된 접근 방식을 설명하는 방향성 가이드이며, 구현 명세가 아닙니다.

```
Dashboard.tsx
  └─ getDashboardWidgetConfig(authUser)  ← 역할별 위젯 배열 반환 (순수 함수)
       │
       ├─ ADMIN/CENTER_ADMIN → [AccessSummaryWidget, MetricsSummaryWidget, ScheduleOverviewWidget]
       ├─ MANAGER/DESK       → [AccessSummaryWidget, ScheduleOverviewWidget, CrmActionWidget]
       └─ TRAINER            → [TrainerScheduleWidget, CrmActionWidget]

위젯 컴포넌트 (각각 독립적 useQuery 호출)
  ├─ AccessSummaryWidget      → apiGet("/api/v1/access/presence")
  ├─ MetricsSummaryWidget     → apiGet("/api/v1/members") (신규 등록 합계 계산)
  ├─ ScheduleOverviewWidget   → apiGet("/api/v1/reservations/gx/snapshot?month=...")
  ├─ TrainerScheduleWidget    → apiGet("/api/v1/reservations/schedules") + authUser.userId 필터
  └─ CrmActionWidget          → apiGet("/api/v1/members") (만료임박/홀딩 필터)
```

### 역할별 위젯 노출 정책 요약

| 역할 | AccessSummary | MetricsSummary | ScheduleOverview | TrainerSchedule | CrmAction |
|---|:---:|:---:|:---:|:---:|:---:|
| SUPER_ADMIN / CENTER_ADMIN | ✓ | ✓ | ✓ | - | - |
| MANAGER / DESK | ✓ | - | ✓ | - | ✓ |
| TRAINER | - | - | - | ✓ | ✓ |

---

## Implementation Units

### Unit 1: 위젯 디렉토리 및 공통 타입 스캐폴딩

- **Goal**: 위젯 컴포넌트들이 공유할 타입과 헬퍼를 준비하고, 대시보드 역할 매핑 함수를 순수 함수로 구현한다.
- **Requirements**: R1, R3 (see origin)
- **Dependencies**: 없음 (기존 `app/roles.ts`, `app/auth.tsx` 타입 활용)
- **Files**:
  - `frontend/src/pages/dashboard/widgets/types.ts` ← 신규 생성
  - `frontend/src/pages/dashboard/widgets/dashboardConfig.ts` ← 신규 생성
  - `frontend/src/pages/dashboard/widgets/dashboardConfig.test.ts` ← 신규 생성
- **Approach**:
  - `WidgetId` 타입: `"accessSummary" | "metricsSummary" | "scheduleOverview" | "trainerSchedule" | "crmAction"`
  - `DashboardWidgetConfig` 타입: `{ id: WidgetId; component: React.ComponentType<WidgetBaseProps> }`
  - `getDashboardWidgetConfig(authUser)` 순수 함수: `PrototypeAuthUser | null`을 받아 `DashboardWidgetConfig[]` 반환
  - 역할 판단은 `authUser.primaryRole`의 `switch/case` 또는 `hasAnyRole()` 조합으로 처리
  - 미인증(null) 사용자에게는 빈 배열 반환
- **Patterns to follow**: `frontend/src/app/roles.ts`의 `hasAnyRole()` 사용 패턴
- **Test scenarios**:
  - `getDashboardWidgetConfig` - CENTER_ADMIN 사용자 → `["accessSummary", "metricsSummary", "scheduleOverview"]` 반환
  - `getDashboardWidgetConfig` - DESK 사용자 → `["accessSummary", "scheduleOverview", "crmAction"]` 반환
  - `getDashboardWidgetConfig` - TRAINER 사용자 → `["trainerSchedule", "crmAction"]` 반환
  - `getDashboardWidgetConfig` - null 사용자 → 빈 배열 반환
  - `getDashboardWidgetConfig` - SUPER_ADMIN → ADMIN과 동일한 위젯 반환
- **Verification**: `dashboardConfig.test.ts` 전체 통과. 각 역할별 위젯 ID 배열이 요구사항 정책과 일치.

---

### Unit 2: AccessSummaryWidget — 실시간 출입 현황

- **Goal**: 오늘의 입장 허가 건수, 현재 입장 인원 수를 Statistic 카드로 표시한다.
- **Requirements**: R4 (see origin)
- **Dependencies**: Unit 1
- **Files**:
  - `frontend/src/pages/dashboard/widgets/AccessSummaryWidget.tsx` ← 신규 생성
  - `frontend/src/pages/dashboard/widgets/AccessSummaryWidget.test.tsx` ← 신규 생성
- **Approach**:
  - `useQuery`로 `/api/v1/access/presence` 호출. `queryKeys.access.list({ scope: "presence" })` 사용.
  - `staleTime: queryPolicies.list.staleTime` 적용.
  - `AccessPresenceSummary.openSessionCount`, `todayEntryGrantedCount`, `todayEntryDeniedCount`를 Ant Design `<Statistic>` 3개로 표시.
  - 로딩 중: `<Skeleton.Input active />` placeholder.
  - 에러 시: `<Alert type="warning">` 인라인 표시.
  - 위젯 하단: `/access` 링크로 이동하는 `<Button type="link">` 제공.
- **Patterns to follow**: `frontend/src/pages/access/modules/useAccessQueries.ts`의 `useQuery` 호출 패턴, `Dashboard.module.css`의 `.moduleCard` 스타일
- **Test scenarios**:
  - Mock API mode에서 렌더링 시: `openSessionCount` 값이 화면에 표시됨
  - 로딩 중: Skeleton이 렌더링되고 Statistic 값이 보이지 않음
  - 에러 시 (`query.error` 주입): "출입 현황" 문자열을 포함한 경고 메시지 노출
  - 출입 관리 링크(`/access`)가 DOM에 존재함
- **Verification**: 테스트 전체 통과. 실제 mock mode로 앱 실행 시 숫자가 정상 렌더링됨.

---

### Unit 3: MetricsSummaryWidget — 매출 및 주요 지표

- **Goal**: 금월 신규 회원 등록 수, 활성 회원 수를 KPI 카드로 표시한다.
- **Requirements**: R6 (see origin)
- **Dependencies**: Unit 1
- **Files**:
  - `frontend/src/pages/dashboard/widgets/MetricsSummaryWidget.tsx` ← 신규 생성
  - `frontend/src/pages/dashboard/widgets/MetricsSummaryWidget.test.tsx` ← 신규 생성
- **Approach**:
  - `useQuery`로 `/api/v1/members` 호출. `queryKeys.members.list({})` 사용.
  - 반환된 `MemberSummary[]`를 클라이언트 사이드에서 집계:
    - `활성 회원 수` = `memberStatus === "ACTIVE"` 카운트
    - `금월 신규 등록` = `joinDate`가 이번 달인 것 카운트
  - Ant Design `<Statistic>` 2개 + 구분선으로 표시.
  - 위젯 하단: `/members` 링크.
  - **중요**: 정산(매출) API가 현재 리포트 형식(`/api/v1/settlements/report`)이라 날짜 파라미터가 필요하고 응답 형식이 복잡함. 초기 구현에서는 **매출 수치 대신 회원 지표**로 제한한다. (Scope Boundary: 복잡한 차트 제외)
- **Patterns to follow**: `frontend/src/pages/members/modules/useMembersQuery.ts`의 쿼리 패턴
- **Test scenarios**:
  - Mock mode에서 렌더링 시: "활성 회원" 레이블이 화면에 보임
  - ACTIVE 회원 수가 mock data 기준 올바르게 집계됨 (2명)
  - `/members` 링크가 DOM에 존재함
  - 로딩 중: Skeleton placeholder 렌더링
- **Verification**: 테스트 전체 통과.

---

### Unit 4: ScheduleOverviewWidget — 오늘의 스케줄 관제

- **Goal**: 오늘 날짜의 GX/PT 수업 일정을 리스트 형태로 요약해서 보여준다.
- **Requirements**: R5 (see origin)
- **Dependencies**: Unit 1
- **Files**:
  - `frontend/src/pages/dashboard/widgets/ScheduleOverviewWidget.tsx` ← 신규 생성
  - `frontend/src/pages/dashboard/widgets/ScheduleOverviewWidget.test.tsx` ← 신규 생성
- **Approach**:
  - `useQuery`로 `/api/v1/reservations/gx/snapshot?month=YYYY-MM` 호출. `queryKeys.gxSchedules.list({ month })` 사용.
  - `GxScheduleSnapshot.generatedSchedules`에서 오늘 날짜(YYYY-MM-DD)의 수업만 필터링.
  - Ant Design `<List>` 컴포넌트로 시간 순 정렬하여 표시. 항목당: `className`, `startAt~endAt`, `currentCount/capacity`.
  - 스케줄이 없으면 `<Empty description="오늘 예정된 수업이 없습니다." />`.
  - 위젯 하단: `/gx-schedules` 링크.
- **Patterns to follow**: `frontend/src/pages/gx-schedules/modules/useGxScheduleSnapshotQuery.ts`의 `getCurrentMonthValue()` 활용 패턴
- **Test scenarios**:
  - Mock mode에서 오늘 날짜에 일치하는 GX 스케줄이 존재할 때: 수업명이 리스트에 렌더링됨
  - 스케줄이 없을 때 (빈 배열): "오늘 예정된 수업이 없습니다." 메시지 표시
  - `/gx-schedules` 링크가 DOM에 존재함
- **Verification**: 테스트 전체 통과.

---

### Unit 5: TrainerScheduleWidget — 트레이너 본인 스케줄

- **Goal**: 로그인한 트레이너의 오늘 PT/GX 수업 일정과 예약된 수강생을 표시한다.
- **Requirements**: R7 (see origin)
- **Dependencies**: Unit 1
- **Files**:
  - `frontend/src/pages/dashboard/widgets/TrainerScheduleWidget.tsx` ← 신규 생성
  - `frontend/src/pages/dashboard/widgets/TrainerScheduleWidget.test.tsx` ← 신규 생성
- **Approach**:
  - `useAuthState()`로 `authUser.userId` 획득.
  - `useQuery`로 `/api/v1/reservations/schedules` 호출. `queryKeys.reservations.list({ scope: "schedules" })` 사용.
  - 반환된 `ReservationScheduleSummary[]`를 `trainerUserId === authUser.userId`로 필터링해 본인 수업만 표시.
  - 오늘 날짜 기준 수업 시간 순 정렬 후 `<List>` 렌더링. 항목: `slotTitle`, `startAt`, `currentCount/capacity`.
  - 위젯 하단: `/reservations` 링크.
- **Patterns to follow**: `useAuthState()` import 패턴, `useReservationSchedulesQuery.ts`의 `apiGet` 호출
- **Test scenarios**:
  - TRAINER(userId=41) 컨텍스트에서 렌더링 시: userId=41에 해당하는 수업만 필터링되어 표시됨
  - 오늘 날짜에 본인 수업이 없을 때: "오늘 예정된 수업이 없습니다." 표시
  - 다른 트레이너 수업(userId=42)은 목록에서 제외됨
  - `/reservations` 링크가 DOM에 존재함
- **Verification**: 테스트 전체 통과.

---

### Unit 6: CrmActionWidget — CRM 액션 대상자 목록

- **Goal**: 회원권 만료임박 / 홀딩 / 없음 상태 회원을 빠르게 파악해 CRM 메시지 발송이나 재결제 유도를 돕는다.
- **Requirements**: R8 (see origin)
- **Dependencies**: Unit 1
- **Files**:
  - `frontend/src/pages/dashboard/widgets/CrmActionWidget.tsx` ← 신규 생성
  - `frontend/src/pages/dashboard/widgets/CrmActionWidget.test.tsx` ← 신규 생성
- **Approach**:
  - `useQuery`로 `/api/v1/members` 호출. `queryKeys.members.list({})` 사용.
  - `membershipOperationalStatus`가 `"만료임박"` | `"만료"` | `"없음"` | `"홀딩중"`인 회원만 필터링.
  - Ant Design `<List>` 렌더링: `memberName`, `phone`, 회원권 상태 Tag.
  - 최대 5건만 표시하고, 더 있으면 "N명 더 있음..." 표기.
  - 위젯 하단: `/members` 링크.
  - TRAINER의 경우: 기존 트레이너-회원 매핑이 백엔드 API에 없으므로, 필터링 없이 전체 목록에서 5건 최대 표시. (Deferred: 트레이너 담당 회원 필터링은 추후 `/api/v1/trainers/{id}/members` API 연동 시 개선)
- **Patterns to follow**: MetricsSummaryWidget의 members 쿼리 사용 패턴
- **Test scenarios**:
  - Mock mode에서 렌더링 시: 만료임박/만료/없음 상태 회원이 목록에 포함됨
  - "정상" 상태 회원만 있을 때: 목록이 비거나 "대상자 없음" 표시
  - 최대 5건 초과 회원이 있을 때: "N명 더 있음..." 텍스트 노출
  - `/members` 링크가 DOM에 존재함
- **Verification**: 테스트 전체 통과.

---

### Unit 7: Dashboard.tsx 재구성 — 위젯 컨테이너 레이아웃

- **Goal**: `Dashboard.tsx`를 기존 정적 정보 화면에서 역할별 위젯 Grid 컨테이너로 전면 교체한다.
- **Requirements**: R1, R2, R3 (see origin)
- **Dependencies**: Unit 1-6 모두 완료 후
- **Files**:
  - `frontend/src/pages/Dashboard.tsx` ← 수정
  - `frontend/src/pages/Dashboard.module.css` ← 수정
  - `frontend/src/pages/Dashboard.test.tsx` ← 수정
- **Approach**:
  - `useAuthState()`에서 `authUser` 획득.
  - `getDashboardWidgetConfig(authUser)` 호출로 렌더링할 위젯 배열 수신.
  - 기존 `heroCard`의 정적 metric 카드(활성 모듈 수, 셸 경로 수, 콘솔 모드)를 제거한다.
  - 헤로 섹션(제목, 사용자 인사말)은 간소화하여 유지한다.
  - 위젯 Grid: `display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));` 기준으로 `Dashboard.module.css`에 `.widgetGrid` 클래스 추가.
  - 각 위젯은 독립적인 `<Card>` 래퍼를 가지며, 위젯 컴포넌트가 내부적으로 Ant Design `<Card>` 사용.
  - 위젯이 0개(미인증)일 때: `<Empty>` 표시.
  - `isMockMode` 배지는 헤로 섹션에 유지.
- **Patterns to follow**: 기존 `Dashboard.tsx`의 `<Flex vertical gap={24}>` 레이아웃, `Dashboard.module.css`의 `.moduleGrid` 스타일 참조
- **Test scenarios**:
  - CENTER_ADMIN 컨텍스트에서 렌더링 시: AccessSummaryWidget, MetricsSummaryWidget, ScheduleOverviewWidget이 DOM에 존재함 (역할 식별 텍스트로 확인)
  - TRAINER 컨텍스트에서 렌더링 시: TrainerScheduleWidget, CrmActionWidget이 DOM에 존재함
  - DESK 컨텍스트에서 렌더링 시: MetricsSummaryWidget이 DOM에 **없음**
  - null authUser: Empty 컴포넌트 또는 위젯 없음 상태 렌더링
  - 기존 "활성 모듈" 텍스트가 DOM에 더 이상 존재하지 않음
- **Verification**: `Dashboard.test.tsx` 전체 통과. Mock mode로 앱 실행 후 각 프리셋(`prototype-admin`, `jwt-trainer`)에서 역할별 위젯이 올바르게 표시됨.

---

## Sequencing

```
Unit 1 (types + config)
  → Unit 2, 3, 4, 5, 6  (위젯 5개, 병렬 구현 가능)
       → Unit 7 (Dashboard.tsx 재구성, 모든 위젯 완료 후)
```

Unit 2-6은 상호 독립이므로 병렬 구현 또는 선호 순서로 진행 가능.

---

## Test File Summary

| 구현 파일 | 테스트 파일 |
|---|---|
| `widgets/dashboardConfig.ts` | `widgets/dashboardConfig.test.ts` |
| `widgets/AccessSummaryWidget.tsx` | `widgets/AccessSummaryWidget.test.tsx` |
| `widgets/MetricsSummaryWidget.tsx` | `widgets/MetricsSummaryWidget.test.tsx` |
| `widgets/ScheduleOverviewWidget.tsx` | `widgets/ScheduleOverviewWidget.test.tsx` |
| `widgets/TrainerScheduleWidget.tsx` | `widgets/TrainerScheduleWidget.test.tsx` |
| `widgets/CrmActionWidget.tsx` | `widgets/CrmActionWidget.test.tsx` |
| `pages/Dashboard.tsx` | `pages/Dashboard.test.tsx` |

---

## Deferred Implementation Notes

- **트레이너 담당 회원 필터링**: CrmActionWidget에서 TRAINER 역할 시 담당 회원만 보여주는 기능은 백엔드에 `/api/v1/trainers/{id}/members` 또는 동등한 필터링 API가 없어 현재 보류. 구현 시 판단.
- **매출 KPI**: 정산 리포트 API가 날짜 범위 파라미터가 필요한 복잡한 구조라 MetricsSummaryWidget에서 제외. 추후 간소화된 집계 API 추가 시 연동.
- **위젯 로딩 상태**: 각 위젯이 독립적으로 데이터를 요청하므로 화면 내 부분적 로딩 상태가 자연스럽게 발생함. 위젯별 Skeleton을 기본으로, 전체 대시보드 레벨의 글로벌 로딩 인디케이터는 구현하지 않음.

---

## Dependencies and Constraints

- **백엔드 변경 없음**: 기존 API 엔드포인트만 사용. Mock data 범위 내에서 완결.
- **라우트 변경 없음**: `/dashboard` 경로는 유지.
- **Ant Design 5.x**: `<Statistic>`, `<List>`, `<Skeleton>`, `<Alert>`, `<Empty>`, `<Card>` 컴포넌트 사용.
- **CSS Modules**: 위젯 스타일은 `Dashboard.module.css` 또는 인라인 Ant Design style prop으로 처리.
- **QueryClient**: 대시보드의 위젯들은 기존 앱 루트의 `QueryClientProvider` 범위 내에서 동작.
