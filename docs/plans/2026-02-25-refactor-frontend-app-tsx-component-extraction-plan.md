---
title: refactor: 프론트엔드 App.tsx 컴포넌트 분리 및 책임 정리
type: refactor
status: active
date: 2026-02-25
origin: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md
---

# refactor: 프론트엔드 App.tsx 컴포넌트 분리 및 책임 정리

## Overview

현재 프론트엔드의 관리자 포털 UI는 `frontend/src/App.tsx` 단일 파일에 타입 정의, 유틸 함수, 상태 관리, API 호출 핸들러, 탭별 렌더링이 집중되어 있다. 최신 상태 기준 `App.tsx`는 약 `3,111` lines이며, 인증 게이트부터 회원/상품/회원권/예약 화면까지 모두 한 컴포넌트에서 처리한다.

이번 리팩터링의 목표는 기능 추가 없이, 현재 동작을 유지한 채 화면/도메인 단위 컴포넌트로 분리하여 재사용성과 유지보수성을 높이는 것이다. 브레인스토밍에서 확정된 “관리자 포털 중심 + 핵심 데스크 업무 우선” 방향은 그대로 유지한다 (see brainstorm: `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`).

## Problem Statement / Motivation

현재 구조의 주요 문제:

- `App.tsx` 단일 파일 과밀화: 상태, 비즈니스 핸들러, 렌더링이 한 곳에 혼재 (`frontend/src/App.tsx:584`)
- 탭별 대형 JSX 블록이 길어 코드 탐색/수정 범위가 큼 (`dashboard`, `members`, `memberships`, `reservations`, `products`)
- 도메인 경계(회원/상품/회원권/예약)와 UI 경계(레이아웃/패널/폼)가 분리되지 않아 재사용이 어려움
- 회귀 위험 증가: 작은 UI 수정도 `App.tsx` 전반에 영향 가능
- 향후 기능 확장(출입/라커/정산 등) 시 동일 패턴으로 파일 비대화가 가속될 가능성 높음

## Proposed Solution

`App.tsx`를 한 번에 “완전 재설계”하지 않고, **점진적 분리(incremental extraction)** 전략으로 분해한다.

핵심 원칙:

- 1차는 동작 보존 우선 (API 계약/상태 모델 변경 최소화)
- 먼저 **렌더링 컴포넌트 분리**, 이후 필요 시 **커스텀 훅/도메인 모듈** 분리
- 공통 UI와 도메인 섹션을 분리하되, 초기에 prop drilling 증가를 허용 (YAGNI)
- 파일 이동보다 “책임 경계 명확화”를 우선

## Technical Considerations

### Current Structure Snapshot (Local Research)

로컬 코드 조사 결과:

- 메인 앱 컴포넌트 시작: `frontend/src/App.tsx:584`
- 대형 상태 선언 블록: `frontend/src/App.tsx:585`
- 데이터 로딩 함수 묶음: `loadMembers`, `loadProducts`, `loadReservationsForMember` 등 (`frontend/src/App.tsx:702`, `frontend/src/App.tsx:751`, `frontend/src/App.tsx:818`)
- 도메인 액션 핸들러 묶음: 로그인/로그아웃, 회원/상품 저장, 회원권 구매/홀딩/해제/환불, 예약 생성/취소/완료 (`frontend/src/App.tsx:931` 이후)
- 회원권 업무 렌더 헬퍼: `renderMembershipOperationsPanels()` (`frontend/src/App.tsx:1405`)
- 탭별 메인 조건부 렌더 분기: `frontend/src/App.tsx:2085` 이후

이미 분리되어 있는 모듈:

- API 클라이언트는 `frontend/src/shared/api/client.ts`로 분리되어 있어, 화면 컴포넌트 분리와 충돌이 적음
- 라우트 미리보기 데이터는 `frontend/src/app/routes.tsx`에 분리됨

### Recommended Target Structure (Phase-in)

권장 디렉터리 구조 (예시):

```text
frontend/src/
  app/
    AppShell.tsx
    types.ts                # App 전역에서 공유되는 최소 타입 (필요 시)
  components/
    layout/
      TopBar.tsx
      SidebarNav.tsx
      ContentHeader.tsx
    ui/
      Panel.tsx
      NoticeMessage.tsx
      EmptyState.tsx
  features/
    auth/
      AuthGate.tsx
      LoginForm.tsx
    dashboard/
      DashboardSection.tsx
    members/
      MembersSection.tsx
      MemberListPanel.tsx
      MemberFormPanel.tsx
      MemberDetailPanel.tsx
    memberships/
      MembershipsSection.tsx
      MembershipPurchasePanel.tsx
      MembershipListPanel.tsx
      PaymentsListPanel.tsx
    reservations/
      ReservationsSection.tsx
      ReservationCreatePanel.tsx
      ReservationSchedulesPanel.tsx
      ReservationListPanel.tsx
    products/
      ProductsSection.tsx
      ProductListPanel.tsx
      ProductFormPanel.tsx
      ProductDetailPanel.tsx
  shared/
    api/
      client.ts
    utils/
      format.ts             # formatDate / formatCurrency / formatDateTime
```

### Extraction Strategy (What Moves First)

1. **Pure/presentational components first**
- 입력값과 콜백만 받는 패널/섹션부터 분리
- 상태 변경 로직은 일단 `App.tsx`에 남김

2. **Shared UI primitives second**
- 반복되는 `panel`, `notice`, `placeholder-card`, `list-shell` 패턴을 공통 UI로 추출
- CSS 클래스는 기존 유지 (리스크 최소화)

3. **Utilities/types third**
- `formatDate`, `formatCurrency`, `formatDateTime`, `errorMessage` 등 순수 유틸 추출
- 타입은 “공유되는 것만” 추출 (초기 과분리 방지)

4. **Hooks/services last (optional)**
- 필요 시 `useMembersWorkspace`, `useProductsWorkspace` 같은 훅으로 상태/핸들러 묶음 분리
- 이번 리팩터링의 필수 조건은 아님

## System-Wide Impact

### Interaction Graph

이 리팩터링은 UI 구조 변경이지만, 다음 상호작용 체인은 그대로 보존되어야 한다.

- 로그인 폼 제출 → `handleLoginSubmit` → auth 상태 갱신 → 보호 UI 렌더 분기 변경
- 회원 선택(row click) → `loadMemberDetail` → 선택 회원 상태 갱신 → 회원권/예약 탭의 대상 회원 변경
- 회원권 액션(홀딩/해제/환불) → API 호출 → 세션 캐시(`memberMembershipsByMemberId`, `memberPaymentsByMemberId`) 갱신 → 관련 패널 재렌더
- 예약 생성/체크인/완료/취소/노쇼 → API 호출 → 예약 목록/회원권 잔여횟수(세션 반영) 갱신

### Error Propagation

- 현재 오류 표시는 섹션별 message/error state로 분리되어 있음 (`memberPanelError`, `productFormError`, `reservationPanelError` 등)
- 컴포넌트 분리 후에도 “에러를 어디서 보여주는지” 책임이 흐려지지 않도록, 상위(컨테이너)에서 메시지 상태를 소유하고 하위 패널은 표시만 담당하도록 유지

### State Lifecycle Risks

- `selectedMember` 변경 시 회원권/예약 폼 초기화 로직이 함께 동작하므로, 분리 과정에서 이 연쇄 초기화가 누락되기 쉬움
- `clearProtectedUiState()`는 여러 섹션 상태를 동시에 리셋하므로, 컴포넌트 추출 후에도 단일 오케스트레이션 포인트를 유지해야 함
- 회원권 액션 draft/refund preview와 같이 `membershipId` 기반 record state는 하위 컴포넌트로 이동 시 stale prop 위험이 있음

### API Surface Parity

- 백엔드 API endpoint 및 payload는 변경하지 않음
- `shared/api/client.ts` 계약(`apiGet/apiPost/apiPatch`, `ApiClientError`) 유지
- 컴포넌트 추출로 인한 prop interface 추가는 프론트 내부 API로 간주하며 명시적 타입 선언 필요

### Integration Test Scenarios

단위 테스트만으로 놓치기 쉬운 통합 시나리오:

- JWT 모드 미인증 상태에서 로그인 화면만 노출되고, 로그인 성공 후 포털 셸로 전환되는지
- 회원 선택 후 `회원권 업무`/`예약 관리` 탭에서 선택 회원 요약과 액션 대상이 일관되게 유지되는지
- 회원권 환불 미리보기/확정 흐름에서 메시지/에러 표시 위치가 분리 후에도 유지되는지
- 예약 체크인/완료/취소/노쇼 처리 후 예약 목록과 관련 세션 상태 표시가 정상 갱신되는지
- DESK 권한에서 상품 변경 버튼 disabled/안내 문구가 분리 후에도 유지되는지

## SpecFlow Analysis (Refactor Scope)

이번 작업은 기능 추가가 아니라 구조 리팩터링이므로, 주요 사용자 플로우의 **화면 동등성(parity)** 확보가 핵심이다.

### Primary Flows To Preserve

1. `앱 진입 → 보안 모드 판별 → (JWT 모드면) 로그인 → 포털 진입`
2. `회원 관리 → 회원 조회/선택 → 회원 상세 확인`
3. `회원 선택 → 회원권 업무 → 구매/홀딩/해제/환불`
4. `회원 선택 → 예약 관리 → 예약 생성/체크인/완료/취소/노쇼`
5. `상품 관리 → 상품 조회/선택 → 등록/수정/상태 변경`

### Edge Cases To Explicitly Guard

- `selectedMember`가 없는 상태에서 `memberships/reservations` 진입 시 안내 패널 노출
- `securityMode === "unknown"` 상태 화면 유지
- `authBootstrapping` 중 로딩 화면 유지
- `ROLE_DESK` 권한 제한 UI 유지
- 빈 테이블/빈 리스트 empty state 유지

### Spec Gaps / Clarifications (Resolved For This Plan)

- 이번 리팩터링에서 React Router 도입/페이지 라우팅 분리는 범위 밖
- Zustand/Redux 등 상태관리 라이브러리 도입은 범위 밖
- CSS Modules/Tailwind 전환은 범위 밖

## Implementation Phases

### Phase 1: Baseline & Safety Net

- 현재 `App.tsx` 기능 동작 기준선 확보 (수동 체크리스트 작성)
- `App.tsx` 내부 섹션 경계에 주석/영역 정리 (임시, 추출 작업용)
- 추출 우선순위와 props 계약 초안 작성

Deliverables:

- `docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md` (본 문서)
- 구현 시 사용할 수동 회귀 체크리스트 초안 (PR 본문 또는 TODO)

### Phase 2: Layout / Auth Gate Extraction

목표:

- `App.tsx`의 상단 셸/레이아웃/인증 게이트 조건부 렌더를 별도 컴포넌트로 분리

후보 파일:

- `frontend/src/features/auth/AuthGate.tsx`
- `frontend/src/features/auth/LoginForm.tsx`
- `frontend/src/components/layout/SidebarNav.tsx`
- `frontend/src/components/layout/TopBar.tsx`
- `frontend/src/components/layout/ContentHeader.tsx`

Acceptance checkpoint:

- 탭 전환/로그인/로그아웃 동작 동일
- 렌더링 조건 분기(`authBootstrapping`, `unknown`, `jwt unauthenticated`) 동일

### Phase 3: Section-Level Extraction (도메인 탭 단위)

목표:

- 대형 조건부 렌더 블록을 탭별 섹션 컴포넌트로 분리

후보 파일:

- `frontend/src/features/dashboard/DashboardSection.tsx`
- `frontend/src/features/members/MembersSection.tsx`
- `frontend/src/features/memberships/MembershipsSection.tsx`
- `frontend/src/features/reservations/ReservationsSection.tsx`
- `frontend/src/features/products/ProductsSection.tsx`

전략:

- 1차는 `App.tsx`가 상태/핸들러를 소유하고, 섹션 컴포넌트에 props로 전달
- 탭별 “선택 회원 필요” 가드는 각 섹션 내부 또는 공통 Guard 컴포넌트로 일관화

### Phase 4: Panel-Level Extraction (재사용 가능한 단위)

목표:

- 회원/상품/예약/회원권 섹션 내부 패널을 분리하여 가독성 개선 및 재사용성 확보

우선순위 높은 패널:

- 회원 목록/폼/상세 패널
- 상품 목록/폼/상세 패널
- 예약 생성/스케줄 목록/예약 목록 패널
- 회원권 구매 패널 / 회원권 목록 패널 / 결제 이력 패널

주의:

- `MembershipListPanel` 내부 액션 셀(홀딩/해제/환불)은 복잡도가 높아 하위 컴포넌트로 한 단계 더 쪼개는 것을 허용

### Phase 5: Utility / Type Consolidation (Optional but Recommended)

목표:

- 순수 유틸/반복 타입을 `shared/utils` 및 기능별 타입 파일로 이동

후보:

- `frontend/src/shared/utils/format.ts`
- `frontend/src/features/*/types.ts`

주의:

- 타입을 과도하게 분산시키지 말고 “실제 공유되는 타입”만 이동

## Acceptance Criteria

### Functional Requirements

- [ ] 기존 탭 기능(`dashboard`, `members`, `memberships`, `reservations`, `products`) 동작이 유지된다
- [ ] 로그인/로그아웃/보안모드 분기 UI가 기존과 동일하게 동작한다
- [ ] 회원 선택 기반 회원권/예약 화면 동작이 유지된다
- [ ] DESK 권한 기반 상품 변경 제한 UI가 유지된다
- [x] API endpoint/payload 계약 변경 없이 프론트 구조만 개선된다

### Structural / Maintainability Requirements

- [x] `frontend/src/App.tsx`에서 탭별 대형 JSX 블록이 별도 섹션 컴포넌트로 분리된다
- [x] `frontend/src/App.tsx`의 역할이 “상태 orchestration + 상위 분기” 중심으로 축소된다
- [x] 공통 레이아웃/메시지/패널 패턴 중 최소 2개 이상이 재사용 컴포넌트로 추출된다
- [x] 새 컴포넌트 props 타입이 명시적으로 선언되어 추론 의존이 과도하지 않다

### Quality Gates

- [x] TypeScript 빌드/타입체크 통과
- [ ] 수동 회귀 테스트(로그인, 회원 선택, 회원권 액션, 예약 액션(생성/체크인/완료/취소/노쇼), 상품 수정) 수행
- [ ] PR에서 리팩터링 범위와 비범위(기능 변경 없음)가 명확히 설명된다

## Success Metrics

- `App.tsx` 라인 수가 유의미하게 감소하고(목표: 탭 JSX 대형 블록 제거), 신규 변경 시 수정 파일 범위가 도메인별로 국소화됨
- 동일한 UI 패턴(패널 헤더/공지/빈 상태)을 중복 마크업 대신 공통 컴포넌트로 재사용 가능
- 이후 Phase 기능 추가(출입/라커/정산 등) 시 `features/<domain>` 구조로 확장 가능한 기반 확보

## Dependencies & Risks

### Dependencies

- 현재 `frontend/src/App.tsx` 구현 동작이 기준선 (리팩터링 중 기능 변경 금지)
- `frontend/src/shared/api/client.ts` 및 백엔드 API 계약 안정성
- 기존 CSS 클래스 체계(`frontend/src/styles.css`) 재사용 가능성

### Risks

- Prop drilling 증가로 컴포넌트 인터페이스가 과도하게 커질 수 있음
- 추출 과정에서 상태 초기화/메시지 표시 위치가 변질될 수 있음
- 회원권 액션 셀(홀딩/해제/환불) 분리 시 이벤트/preview 상태 wiring 오류 가능성 높음

### Mitigations

- 섹션 단위 추출 후 즉시 수동 검증 (한 번에 패널까지 가지 않기)
- “순수 렌더 컴포넌트” 우선 추출로 상태 변경 리스크 축소
- 고복잡도 블록(회원권 액션 셀)은 마지막 단계로 분리

## Non-Goals (Out of Scope)

- 신규 기능 추가 (출입/라커/정산/CRM 등)
- API 스펙 변경 및 백엔드 로직 변경
- 전역 상태관리 라이브러리 도입 (Redux/Zustand 등)
- React Router 기반 URL 라우팅 전환
- 스타일 시스템 전면 교체(Tailwind/CSS Modules/디자인 시스템 도입)

## Suggested Implementation Notes (for `/prompts:workflows-work`)

- 먼저 `Section` 컴포넌트만 분리하고, 패널 내부 마크업은 그대로 붙여넣어 동작 parity 확보
- 이후 `Panel`/`Notice`/`EmptyState` 추출로 중복 정리
- 마지막에 유틸/타입 이동으로 import 정리

예시 스텝 (파일명 포함):

```tsx
// frontend/src/features/members/MembersSection.tsx
export type MembersSectionProps = {
  members: MemberSummary[];
  selectedMemberId: number | null;
  // ...기존 App.tsx 상태/핸들러 중 members 탭에 필요한 것만 전달
};

export function MembersSection(props: MembersSectionProps) {
  // 1차 추출에서는 기존 JSX를 거의 그대로 이동 (동작 보존 우선)
  return <section className="workspace-grid">{/* members tab JSX */}</section>;
}
```

## Research Summary

### Origin Brainstorm (Used as Foundation)

Found brainstorm from `2026-02-23`: `gym-crm-product`. Using as foundation for planning.

이번 계획에 반영한 핵심 결정:

- 관리자 포털 중심 범위 유지 (회원 모바일 웹 미포함)
- 프로토타입 핵심 업무 중심 범위 유지 (회원/상품/회원권, 이후 예약 확장 포함)
- 기능 확장보다 운영 가능한 구조와 유지보수성 우선

출처: `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`

### Repo Research

- `frontend/src/App.tsx` 단일 파일에 상태/핸들러/렌더링 집중 (`frontend/src/App.tsx:584`)
- 탭 분기 구조는 이미 존재하며, 컴포넌트 추출에 적합한 경계가 명확함 (`frontend/src/App.tsx:2085`)
- API 접근은 `frontend/src/shared/api/client.ts`에 분리되어 있어 UI 분리와 독립적으로 유지 가능
- 스타일 클래스 기반 설계(`panel`, `workspace-grid`, `membership-ops-shell`, `sidebar`)가 있어 UI 컴포넌트 추출 시 CSS 변경을 최소화할 수 있음 (`frontend/src/styles.css`)

### Institutional Learnings (`docs/solutions/`)

- `docs/solutions/` 하위 디렉터리에는 관련 문서가 존재함 (초기 탐색 시 `docs/solutions/*.md` 기준으로만 확인해 누락됨)
- 예시: 예약/회원권 상태 무결성 관련 문서가 `docs/solutions/database-issues/`에 존재하므로, 예약/회원권 UI 리팩터링 회귀 점검 시 참고 가능

## External Research Decision

이번 작업은 기존 React + Vite + CSS 구조 안에서의 **프론트엔드 리팩터링**이며, 외부 API/보안/결제 정책 변경이 없다. 코드베이스 내부 패턴과 현재 구현 맥락이 더 중요하므로 **외부 리서치는 생략**한다.

## Sources & References

- **Origin brainstorm:** `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md` (관리자 포털 중심/핵심 업무 우선 결정)
- Current app entry and state orchestration: `frontend/src/App.tsx:584`
- Membership operations render helper: `frontend/src/App.tsx:1405`
- Main tab conditional rendering blocks: `frontend/src/App.tsx:2085`
- API client abstraction: `frontend/src/shared/api/client.ts`
- Route preview config: `frontend/src/app/routes.tsx`
- Shared style classes used across panels/layout: `frontend/src/styles.css`
