---
title: "feat: Separate list and form surfaces in members/products tabs"
type: feat
status: active
date: 2026-02-27
---

# feat: Separate list and form surfaces in members/products tabs

## Overview

회원 관리/상품 관리 탭에서 목록 패널과 등록·수정 폼 패널이 항상 동시에 렌더링되어 중간 해상도에서 목록 영역이 과도하게 좁아지고, 테이블 가로 스크롤이 빈번히 발생한다.

본 계획은 탭 기본 화면을 **목록 우선(single-surface)** 으로 전환하고, 신규 등록/특정 항목 수정은 별도 surface(모달 또는 페이지)로 분리하여 정보 밀도와 가독성을 개선한다.

## Problem Statement / Motivation

현재 구조의 핵심 문제:
- 2열 고정형 workspace 레이아웃: `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:374`
- 전역 테이블 최소폭(`min-width: 680px`)으로 인해 좁은 목록 영역에서 수평 스크롤 유발: `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:564`
- 회원/상품 섹션이 동일한 2열 split-view를 사용: 
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MembersSection.tsx:9`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductsSection.tsx:9`

결과적으로 사용자 입장에서 “목록 탐색 → 선택 → 수정” 흐름에서 목록 가독성이 먼저 훼손된다.

## Research Summary

### Internal Pattern Findings
- 최근 UI 리팩터링은 정보구조(IA) 재배치 중심으로 진행되었고, 단순 스타일 조정보다 surface 분리가 효과적이었다.
  - `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
- 현재 `App.tsx`는 이미 탭 단위 orchestration 구조를 갖추고 있어, members/products 탭에서만 독립적으로 surface 전략을 바꾸기 좋다.
  - 상태/핸들러 참고: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:597`, `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:634`, `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1416`, `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1427`

### Institutional Learnings
- 운영형 포털 UX 개선 시, “한 화면에 모든 정보”보다 업무 단계 분리(탐색/입력)를 우선하는 것이 효과적이었다.
- 권한 UX(`ROLE_DESK`)는 폼 surface 분리 후에도 동일 정책으로 유지되어야 한다.

### External Research Decision
- 본 작업은 프론트엔드 surface/정보구조 조정이며 현재 코드베이스에 충분한 패턴과 선행 학습 문서가 있어 외부 리서치는 생략한다.

## SpecFlow Analysis (Manual)

### Primary User Flows
1. 회원/상품 탭 진입 → 목록 확인/검색
2. `신규 등록` 클릭 → 폼 surface 열림 → 저장 성공 → 목록 반영
3. 목록 행 클릭 → 수정 surface 열림 → 저장 성공 → 목록 반영
4. 편집 취소/닫기 → 목록 컨텍스트(필터, 스크롤, 선택 상태) 유지

### Edge Cases
- 저장 실패 시: 에러 메시지 표시 + 입력값 보존
- 권한 제한(`ROLE_DESK`): 편집 surface 진입 차단 또는 read-only로 일관 처리
- 탭 이동/새로고침: surface open state 정합성 유지
- 모바일: 모달 대신 풀스크린 페이지/시트로 전환 필요

### Gaps to Address
- route 없는 단일 App 구조에서 “deep-link 가능한 편집 상태”를 어디까지 지원할지 결정 필요
- 기존 `memberFormMode`/`productFormMode`와 신규 surface state 간 중복 관리 최소화 필요

## Proposed Solution

### Chosen Direction

**단계적 하이브리드 전략**
- 1차: members/products 기본 화면을 목록 중심으로 단순화
- 1차: 등록/수정은 **modal/drawer surface** 로 분리 (빠른 적용)
- 2차(선택): 필요 시 route 기반 detail page로 승격

이 방식은 큰 UX 개선을 빠르게 달성하면서, 추후 deep-link 요구가 생기면 페이지형으로 확장 가능하다.

## Technical Considerations

### UI Architecture
- members/products 탭에서 `ListView`와 `FormSurface`를 분리
- `FormSurfaceMode = "create" | "edit" | "closed"` 상태 도입
- 기존 `startCreateMember/startCreateProduct`는 surface open 트리거로 전환

### State Management
- 기존 폼 상태(`memberForm`, `productForm`)는 유지
- 추가 상태:
  - `isMemberFormOpen`, `memberFormSurfaceMode`
  - `isProductFormOpen`, `productFormSurfaceMode`
- 저장 성공 시 close + 목록 reload + 필요한 경우 선택 행 복원

### Accessibility
- 모달 사용 시 focus trap, ESC close, 배경 스크롤 잠금, `aria-modal` 적용
- 모바일에서는 full-screen sheet 스타일로 전환 권장

### Security / Authorization
- `ROLE_DESK`의 product edit 제한은 기존 정책을 그대로 반영
- UI 차단과 백엔드 권한(`403`)이 불일치하지 않도록 유지

## System-Wide Impact

- **Interaction graph**: 변경 범위는 frontend 렌더/상태 orchestration 중심이며 backend API 계약 변화 없음
- **Error propagation**: API 오류 처리 방식(`errorMessage`) 재사용, 신규 surface에서도 동일 메시지 경로 유지
- **State lifecycle risks**: surface close/open 시 폼 초기화 타이밍 실수로 데이터 유실 가능성 있음
- **API surface parity**: members/products 탭만 대상, memberships/reservations 흐름은 비대상
- **Integration scenarios**: `list -> open form -> submit success/fail -> list refresh`를 회원/상품 각각 검증 필요

## Implementation Plan

### Phase 1: Surface Infrastructure
- [x] 공통 `OverlayPanel`(또는 `ModalFormSurface`) 컴포넌트 추가
- [x] 열림/닫힘 상태, ESC, backdrop click, focus 기본 동작 구현
- [x] 모바일에서 full-screen 스타일 적용

### Phase 2: Members Tab Migration
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`를 목록 전용 렌더 중심으로 정리
- [x] 회원 등록/수정 폼을 별도 surface 컴포넌트로 이동
- [x] `startCreateMember`/row click 시 surface open 동작으로 전환
- [x] 저장 성공/실패/취소 UX 정합성 검증

### Phase 3: Products Tab Migration
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductManagementPanels.tsx`를 목록 전용 렌더 중심으로 정리
- [x] 상품 등록/수정 폼을 별도 surface 컴포넌트로 이동
- [x] `ROLE_DESK` 제한 정책이 surface에서도 동일 동작하도록 보장
- [x] 상태 토글/등록 모드 전환 UX 점검

### Phase 4: Polishing and Regression
- [x] 불필요한 2열 의존 CSS 제거 또는 축소
- [ ] members/products에서 가로 스크롤 발생 빈도 재측정
- [ ] 빌드/수동 회귀 테스트 수행

## Alternatives Considered

### A. 완전 페이지 분리(route 기반 create/edit)
- 장점: deep-link, 브라우저 히스토리, 확장성 우수
- 단점: 현재 단일 App 구조에서 작업 범위가 큼
- 판단: 2차 후보로 유보

### B. 현 구조 유지 + 브레이크포인트 조정만 수행
- 장점: 작업량 최소
- 단점: 근본 문제(탐색 surface와 입력 surface 혼합) 미해결
- 판단: 단기 완화책으로만 의미

## Acceptance Criteria

### Functional
- [x] members 탭 기본 진입 시 목록만 노출되고, 신규/행 선택 시 폼이 별도 surface로 열린다
- [x] products 탭 기본 진입 시 목록만 노출되고, 신규/행 선택 시 폼이 별도 surface로 열린다
- [x] 저장 성공 시 목록에 결과가 반영되고 사용자 맥락(검색/선택)이 유지된다

### UX / Layout
- [ ] 1280px 전후 해상도에서 members/products 목록 가독성이 개선되고 수평 스크롤 빈도가 유의미하게 감소한다
- [ ] 모바일에서 폼 surface가 사용 가능한 형태(풀스크린/시트)로 동작한다

### Authorization
- [x] `ROLE_DESK` 사용자는 products 편집/등록 제한이 동일하게 유지된다

### Quality
- [x] `npm run build` 통과
- [ ] 수동 회귀: login/logout, members create/edit, products create/edit, desk restriction

## Success Metrics

- members/products 탭에서 사용자의 “목록 우선 탐색” 완료 시간 단축(정성 측정)
- 수동 QA에서 “가로 스크롤로 목록 확인 불편” 이슈 재현률 감소
- 탭 전환/등록/수정 관련 회귀 버그 0건

## Dependencies & Risks

### Dependencies
- 기존 members/products 분리 컴포넌트 구조 유지
- 공통 UI(`PanelHeader`, `NoticeText`)와 스타일 체계 활용

### Risks
- open/close 상태와 기존 form mode 상태 중복으로 인한 버그
- 모달 접근성 미흡 시 키보드 사용성 저하
- 모바일에서 입력 UI 충돌(키보드/스크롤)

### Mitigation
- surface 상태를 단일 source로 유지
- 접근성 체크리스트(ESC, tab order, initial focus) 포함
- 모바일 최소 2개 viewport 수동 검증

## Sources & References

- UI 해결 사례: `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
- 현재 members 섹션: `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MembersSection.tsx`
- 현재 products 섹션: `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductsSection.tsx`
- 현재 레이아웃 스타일: `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:374`
- 현재 테이블 최소폭: `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:564`
- orchestration 진입점: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1517`

## Post-Deploy Monitoring & Validation

No additional operational monitoring required: frontend-only UI surface refactor with no backend/API contract change.
