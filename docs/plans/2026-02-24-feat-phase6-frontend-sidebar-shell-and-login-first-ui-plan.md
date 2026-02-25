---
title: feat: Phase 6 프론트 관리자 포털 사이드바 셸/로그인 우선 UI 정리
type: feat
status: completed
date: 2026-02-24
origin: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md
---

# feat: Phase 6 프론트 관리자 포털 사이드바 셸/로그인 우선 UI 정리

## Overview

현재 프론트엔드는 `JWT 로그인`까지는 도입되었지만, 실제 관리자 포털 화면은 여전히 프로토타입 시절의 단일 페이지 중심 구조(`App.tsx` 내 대형 탭+패널 집합) 형태다. 이번 Phase 6에서는 기능 범위를 늘리지 않고, 기존 핵심 업무(회원/상품/회원권 구매·홀딩·해제·환불)를 **사이드바 기반 정보구조(IA)** 로 재배치하고, **로그인 후 진입하는 운영 UI** 로 정리한다.

브레인스토밍에서 확정된 “관리자 포털 중심, 핵심 데스크 업무 우선” 결정을 그대로 유지하며 (see brainstorm: `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`), Phase 5에서 도입한 JWT/RBAC를 기반으로 프론트 UX를 운영형 셸로 정돈하는 단계다.

## Branch / Execution Context

- 작업 브랜치: `codex/feat-phase6-frontend-sidebar-shell` (생성 완료)
- 기준 브랜치: `main` (PR #1 merge 이후 상태)
- 전제: Phase 5 (`JWT + Refresh + RBAC + traceId`) 완료본 위에서 작업

## Problem Statement

현재 UI는 기능 자체는 동작하지만 운영 화면 관점에서 다음 문제가 있다.

- `frontend/src/App.tsx`가 로그인 게이트, 회원/상품 CRUD, 회원권 업무 UI까지 모두 포함하는 대형 컴포넌트 (`2384` lines)
- 상단 탭(`회원 관리`, `상품 관리`)만 있고, 실제 업무 흐름(회원권 구매/홀딩/환불)이 회원 상세 패널 내부에 묶여 있어 탐색 구조가 약함
- 배경/셸 스타일이 폴리시되었지만, “운영 포털” 정보구조(좌측 네비게이션 + 콘텐츠 영역 + 상태영역)와는 여전히 다름
- JWT 로그인 도입 이후에도 화면 메시지/레이아웃이 “프로토타입 단일화면 데모” 성격을 강하게 띰

참고 기준:
- JWT 로그인/세션/refresh 및 RBAC는 이미 구현/검증 완료 (`docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md`)
- 현재 프론트 auth client는 bearer + refresh retry + cookie 기반 세션 복구 지원 (`/Users/abc/projects/GymCRM_V2/frontend/src/shared/api/client.ts`)
- Vite dev proxy(`/api`) 기반 same-origin 개발 설정 이미 존재 (`/Users/abc/projects/GymCRM_V2/frontend/vite.config.ts`)

## Goals

1. **사이드바 기반 앱 셸 도입**
- 기능을 좌측 네비게이션(탭) 기준으로 분류해 탐색성을 개선

2. **로그인 우선 진입 UX 정리**
- JWT 모드에서 로그인 완료 전에는 보호 화면이 보이지 않도록 구조를 명확히 유지
- 로그인 후 “관리자 포털 홈/업무 섹션”으로 자연스럽게 진입

3. **UI 시각 정리 (배경 포함)**
- 배경색/배경 레이어를 운영 포털 분위기에 맞게 재설계
- 기존 가독성/반응형/접근성 개선 사항 유지

4. **기능 회귀 없이 구조 개선**
- 회원/상품 CRUD, 회원권 구매/홀딩/해제/환불 동작은 그대로 유지
- API 계약/도메인 로직 변경은 최소화

## Non-Goals (Out of Scope)

- 신규 도메인 기능 추가 (예약/출입/라커/정산/CRM)
- RBAC 정책 변경 (Phase 5 권한 매트릭스 유지)
- 백엔드 인증 로직 재설계 (JWT/refresh/traceId 유지)
- React Router 기반 다중 URL 라우팅 전면 도입 (이번 단계는 내부 상태 기반 셸 재구성 우선)
- 디자인 시스템/컴포넌트 라이브러리 도입

## Brainstorm Decisions Carried Forward

아래 결정은 그대로 유지한다.

- 관리자 포털 중심 범위 유지 (회원 모바일 웹 미포함)  
  (see brainstorm: `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`)
- 핵심 데스크 업무 중심 범위 유지 (회원/상품/회원권 구매·홀딩·환불)  
  (see brainstorm: `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`)
- 단일 센터 기본값 유지 (`centerId=1` 중심 개발/검증)
- 후속 단계에서 도입한 JWT/RBAC를 운영 기본값으로 사용 (Phase 5 결과 반영)

## Research Summary (Local)

### Repo Research

- 현재 프론트 앱은 `App.tsx` 단일 파일 내 상태/핸들러/UI가 집중되어 있음 (`/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`)
- 로그인 화면과 메인 포털 화면이 동일 컴포넌트 내부 조건부 렌더링으로 관리됨 (`securityMode`, `isJwtMode`, `isAuthenticated`)
- 메인 포털의 탐색 구조는 상단 `tabbar` 기반 (`회원 관리`, `상품 관리`)이며, 실질 업무 대부분은 `workspace-grid` 내부 패널 묶음으로 렌더링됨
- 스타일은 CSS 변수 기반이라 테마/배경 변경에 유리 (`/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:1`)

### Institutional Learnings (`docs/solutions/`)

- 정책/상태 변경 시 백엔드와 UI를 함께 정렬해야 혼란/회귀를 줄일 수 있음  
  (see solution: `docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md`)

이번 작업에 적용:
- 사이드바 구조 변경 중에도 `HOLDING 환불 불가` 등 정책 안내/버튼 노출 조건을 UI에서 유지
- UI 재배치 시 행동 가능/불가 상태를 레이아웃 변경으로 흐리지 않기

## External Research Decision

이번 작업은 **기존 기술 스택(React + Vite + 기존 CSS 구조) 내 프론트 UI 재구성**이 중심이고, 보안/결제/외부 API 신규 도입이 없다. 또한 Phase 5에서 JWT 인증 흐름은 이미 구현/검증되었다.

따라서 **외부 리서치는 생략**하고, 현재 코드/문서 기준으로 계획을 수립한다.

## Proposed Information Architecture (Sidebar)

권장안: 좌측 사이드바 + 상단 유틸 바 + 메인 콘텐츠 2단 구조

### Sidebar Tabs (Phase 6 In)

1. `대시보드`
- 간단한 안내/현재 모드/로그인 사용자/빠른 진입 링크
- 기존 hero 카드 정보(시스템 모드, 핵심 범위 안내, route preview 일부)를 축약 배치

2. `회원 관리`
- 회원 목록 + 검색/필터
- 회원 등록/수정 폼
- 회원 상세 요약

3. `회원권 업무`
- 선택된 회원 기준 회원권 구매/홀딩/해제/환불
- 이번 세션 회원권/결제 이력 표
- 현재 `회원 상세` 내부에 섞여 있는 membership actions를 독립 섹션으로 이동

4. `상품 관리`
- 상품 목록 + 필터
- 상품 등록/수정 폼
- 상태 변경

### Why This IA

- 기존 핵심 범위를 유지하면서도 “회원 CRUD”와 “회원권 업무”를 시각적으로 분리해 밀도를 낮출 수 있음
- 현재 구현의 상태 모델(선택 회원 기반 회원권 처리)을 그대로 활용 가능
- 완전한 페이지 라우팅 도입 없이도 운영 포털 느낌을 크게 개선 가능

## Login-First UX Policy (Phase 6 Canonical)

Phase 5에서 도입한 JWT 모드를 기본 운영 경로로 고정한다.

- `jwt` 모드:
  - 미인증 상태에서는 로그인 화면만 노출
  - 로그인 성공 후 사이드바 셸 진입
  - 새로고침 시 refresh cookie 기반 세션 복구 시도 후 셸 복귀
- `prototype` 모드:
  - 개발/디버그 전용으로 유지
  - UI 상에서 운영 기본 경로가 아님을 명확히 배지/문구로 표시

추가 정리 목표:
- 로그인 화면과 메인 포털 화면의 시각 언어를 통일 (같은 제품, 다른 단계로 보이도록)
- 인증 실패/세션 만료/권한 부족 메시지의 위치와 표현을 일관화

## Visual Direction (Background / Theme)

현재 warm 톤 배경은 가독성은 좋지만, 운영 포털 구조 강조보다 “데모 카드” 느낌이 강하다. Phase 6에서는 CSS 변수 체계를 유지하면서 아래 방향으로 재정의한다.

권장 시각 방향:
- 배경: 단색이 아닌 레이어드(gradient + subtle pattern) 유지
- 메인 배경 톤: 기존 웜톤보다 약간 차분한 **stone / sand / slate 계열**
- 사이드바: 메인 콘텐츠와 분리되는 약간 더 진한 톤
- 콘텐츠 패널: 밝은 카드 + 높은 가독성
- 액센트: 현재 브랜드 계열(오렌지/테라코타) 유지 가능, 과도한 채도는 억제

디자인 제약:
- 다크모드 전환은 이번 단계 범위 외
- 브랜드 컬러 재정의가 아니라 “레이아웃/계층감” 강화가 우선

## Technical Approach

### Frontend Refactor Strategy (Incremental)

현재 `App.tsx`가 크기 때문에, 레이아웃 변경과 기능 회귀 방지를 위해 단계적으로 분리한다.

#### 1) App Shell 분리

도입 대상(예시):
- `components/layout/AdminShell`
- `components/layout/SidebarNav`
- `components/layout/TopUtilityBar`
- `components/layout/ContentFrame`

목표:
- 로그인 게이트와 “인증 후 앱 셸” 책임 분리
- 기존 상태/핸들러는 우선 `App.tsx`에 유지해도 됨 (1차는 layout split 중심)

#### 2) Workspace View 분리

점진적 분리 대상(예시):
- `MemberWorkspace`
- `MembershipOperationsWorkspace`
- `ProductWorkspace`
- `DashboardWorkspace`

주의:
- 초기 단계에서는 prop drilling이 늘어도 허용 (YAGNI)
- 단, 타입 alias와 핸들러 계약은 명시적으로 정리

#### 3) Style Layer 재구성

- CSS 변수 (`:root`) 유지
- 레이아웃 관련 클래스 추가:
  - `.portal-shell`
  - `.sidebar`
  - `.sidebar-nav`
  - `.content-shell`
  - `.content-header`
  - `.page-section`
- 기존 클래스는 단계적으로 축소/재사용

### State Management Strategy

이번 단계에서는 전역 상태 라이브러리 추가 없이 `App.tsx` 상태를 유지한다.

추가 상태 최소안:
- `activeNavSection` (`dashboard | members | memberships | products`)
- 사이드바 collapse 상태 (선택)

재사용 상태:
- `selectedMember`, `members`, `products`, `memberMembershipsByMemberId`, `memberPaymentsByMembershipId`
- auth/session 상태 (`securityMode`, `authUser`, `accessToken`, `authBootstrapping`, `authError`)

## SpecFlow Analysis (UI Refactor Focus)

### Primary User Flows

1. `JWT 로그인 → 대시보드 진입 → 회원 관리 탭 → 회원 선택 → 회원권 업무 탭 → 구매/홀딩/해제/환불`
2. `JWT 로그인 → 상품 관리 탭 → 상품 조회/수정/상태변경`
3. `새로고침 → refresh cookie 세션 복구 → 마지막 선택 섹션 또는 기본 섹션 표시`

### Edge Cases / Risks

- 로그인 전 health/bootstrap 실패 시 보호 UI 노출되면 안 됨 (`securityMode=unknown` 분기 유지)
- `DESK` 권한 사용자에서 상품 변경 버튼 노출/비노출 정책이 레이아웃 변경 중 깨질 수 있음
- `회원권 업무` 탭에서 `selectedMember`가 없는 상태 처리(placeholder/CTA 필요)
- `HOLDING` 환불 UI 가드 문구/버튼 숨김 로직이 섹션 분리 후 회귀할 수 있음
- 모바일에서 사이드바가 화면을 과도하게 점유할 수 있음 (drawer/stack fallback 필요)

### SpecFlow-Driven Acceptance Additions

- 회원 미선택 상태에서 `회원권 업무` 탭 진입 시 에러 대신 안내 UI 표시
- `HOLDING` 상태 회원권에서 환불 버튼 비노출 + 안내 문구 유지
- `DESK` 로그인 시 상품 변경 액션 접근 차단 UX(버튼 숨김 또는 disabled + 안내) 확인

## Implementation Plan (Phase 6)

### P6-1. IA / Layout Skeleton

- 사이드바 + 콘텐츠 셸 구조 추가
- 기존 `tabbar`를 사이드바 네비게이션으로 대체
- 로그인 화면 / 인증 후 셸 조건부 렌더 구조 정리

Deliverables:
- 레이아웃 컴포넌트 초안
- `activeNavSection` 상태 도입
- 기본 대시보드 섹션 렌더

### P6-2. 회원 / 회원권 UI 분리 재배치

- 기존 회원 탭 화면을 `회원 관리`와 `회원권 업무` 섹션으로 분리
- 회원권 구매/홀딩/환불/결제이력 UI를 독립 섹션으로 이동
- 선택 회원 컨텍스트 안내 UI 추가

Deliverables:
- `회원권 업무` 섹션 placeholder/empty state
- 기존 기능 회귀 없는 액션 핸들러 연결

### P6-3. 상품 관리 섹션 정리

- 상품 목록/폼/상태변경 패널을 사이드바 기반 셸에 맞게 재배치
- `ROLE_DESK` 사용자 UX(변경 금지) 표시 정리

Deliverables:
- 상품 섹션 전용 헤더/필터/폼 구조
- 권한 기반 액션 렌더링 재검증

### P6-4. Visual Theme / Background Refresh

- 배경색/배경 레이어 재정의
- 사이드바/콘텐츠 패널 계층감 강화
- 모바일/태블릿 반응형 보정

Deliverables:
- CSS 변수 업데이트
- responsive breakpoints 점검

### P6-5. JWT Login-First UX Polish & Regression

- 로그인 화면 톤 정리 (앱 셸과 시각적 연결성)
- refresh 복구/로그아웃/401 재시도 흐름 회귀 검증
- 에러 메시지/traceId 표기 위치 점검

Deliverables:
- 수동/브라우저 검증 로그
- 문서 업데이트 (실행/테스트/제약사항)

## File Impact (Expected)

핵심 변경 예상:
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/api/client.ts` (필요 시 에러 표기/훅 인터페이스만)
- `/Users/abc/projects/GymCRM_V2/frontend/vite.config.ts` (변경 가능성 낮음)

신규 파일 가능성:
- `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/*`
- `/Users/abc/projects/GymCRM_V2/frontend/src/components/workspaces/*`

## Testing / Validation Plan

### Automated

- `frontend`: `npm run build`
- 영향 범위에 따라 최소 컴포넌트 테스트 또는 기존 타입/빌드 검증 유지

### Manual / Browser (Required)

JWT 모드 기준:
1. 로그인 전 로그인 화면만 노출
2. 로그인 성공 후 사이드바 셸 진입
3. 회원 관리 → 회원 선택
4. 회원권 업무 → 구매 → 홀딩 → 해제 → 환불
5. 상품 관리 조회/수정(권한별 검증 포함)
6. 새로고침 후 세션 복구
7. 로그아웃 후 로그인 화면 복귀

Prototype 모드 기준(회귀 최소 확인):
1. 셸 렌더 정상
2. no-auth 배지/경고 메시지 유지

## Risks & Mitigations

### Risk 1: 대형 `App.tsx` 리팩터링 중 기능 회귀
- Mitigation: layout split → workspace split 순서로 단계적 변경
- Mitigation: 단계마다 `npm run build` + 핵심 수동 플로우 확인

### Risk 2: 상태 의존 UI(회원 선택/회원권 액션) 깨짐
- Mitigation: `selectedMember` 기반 empty/placeholder 상태를 먼저 명시적으로 설계
- Mitigation: 액션 버튼/가드(`HOLDING 환불 불가`) 회귀 체크리스트에 고정

### Risk 3: 권한 UX와 백엔드 RBAC 불일치
- Mitigation: UI에서 `DESK` 제약을 반영하되, 최종 보안은 백엔드 `403`에 의존
- Mitigation: `CENTER_ADMIN`, `DESK` 계정 브라우저 검증 시나리오 분리

## Acceptance Criteria

- [x] JWT 모드 미인증 상태에서 로그인 화면만 노출되고, 인증 후에만 관리자 포털 셸이 보인다
- [x] 관리자 포털 UI가 사이드바 탭 기준으로 최소 `대시보드 / 회원 관리 / 회원권 업무 / 상품 관리`로 분리된다
- [x] 기존 핵심 업무 플로우(회원/상품 CRUD, 회원권 구매/홀딩/해제/환불)가 기능 회귀 없이 동작한다
- [x] `HOLDING` 상태 환불 UI 가드(버튼 비노출 + 안내 문구)가 유지된다
- [x] `ROLE_DESK`에서 상품 변경 금지 UX가 명확히 표현되고, 백엔드 `403`과 모순되지 않는다
- [x] 배경색/레이아웃 계층감이 개선되고 모바일(좁은 화면)에서도 레이아웃이 깨지지 않는다
- [x] `frontend` 빌드 성공 및 JWT 모드 핵심 수동/브라우저 검증 로그가 문서화된다

## Deliverables

- 프론트 UI 구조 리팩터링 코드 (사이드바 셸 + 섹션 분리)
- 스타일 테마/배경 업데이트
- JWT 로그인 기준 수동 검증 로그
- 필요 시 범위/실행 가이드 문서 업데이트 (`README`, `docs/notes/*`)

## Recommended Next Step

→ `/prompts:workflows-work`로 Phase 6 구현 시작 (P6-1부터: 셸/사이드바 레이아웃 골격)
