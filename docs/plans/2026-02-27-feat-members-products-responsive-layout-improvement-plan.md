---
title: "feat: Improve responsive layout for members/products list surfaces"
type: feat
status: completed
date: 2026-02-27
origin: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md
---

# feat: Improve responsive layout for members/products list surfaces

## Overview

회원/상품 탭에서 목록 패널 가독성을 데스크톱 중간 폭과 모바일/태블릿 모두에서 개선한다. 목표는 “목록 탐색 우선” UX를 유지하면서, 화면 폭이 줄어들어도 테이블 가로 스크롤과 폼/목록 동시 노출로 인한 밀집도를 단계적으로 줄이는 것이다.

본 계획은 **Desktop 개선 + Mobile/Tablet 개선**을 분리된 단계로 진행한다.

## Problem Statement / Motivation

현재 구조는 목록 중심으로 정리되었지만, 다음 문제가 남아 있다.

- 전역 테이블 최소폭(`min-width: 680px`) 때문에 특정 폭에서 수평 스크롤이 여전히 발생 가능
  - `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:568`
- `list-shell`이 `overflow: auto` 기반이라, 컨테이너 폭이 줄면 사용자 체감상 가독성이 급격히 떨어짐
  - `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:555`
- members/products 섹션은 현재 `workspace-grid-single`이지만, 폼/검색/테이블 밀도를 장치 폭별로 더 세분화할 필요가 있음
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MembersSection.tsx:9`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductsSection.tsx:9`

왜 지금 필요한가:
- 운영 포털은 데스크/태블릿 혼합 환경에서 사용되므로, 반응형 품질이 곧 업무 처리 속도와 오류율에 직접 영향
- 기존 브레인스토밍의 “운영 안정화 우선” 결정과 일치 (see brainstorm: `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`)

## Research Summary

### Internal Findings

- 최근 UI 작업은 기능 추가보다 IA/레이아웃 정합성 개선으로 성과를 냈다.
  - `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
- members/products 분리 surface 작업이 이미 반영되어, 이번 개선은 CSS/레이아웃 중심의 저위험 보강으로 진행 가능
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md`
- 전역 row affordance 정리도 완료되어(030 complete), 이제 “레이아웃 가독성”에 집중 가능
  - `/Users/abc/projects/GymCRM_V2/todos/030-complete-p3-table-row-pointer-affordance-mismatch-after-button-entry.md`

### Institutional Learnings

- 운영형 포털에서는 “한 화면 과밀”보다 “업무 단계별 가독성”이 우선이다 (see brainstorm).
- 반응형은 단순 브레이크포인트 추가보다, 실제 업무 단위(검색/리스트/편집 진입)의 우선순위 재배치가 중요.

### External Research Decision

외부 리서치는 생략한다. 이유:
- UI 반응형 보강 작업으로 위험도가 낮고,
- 코드베이스 내 선행 사례/학습 문서가 충분하며,
- 현재 기술 스택(CSS + React)에서 문제 지점이 명확하다.

## SpecFlow Analysis (Manual)

### Primary Flows

1. members/products 탭 진입 → 검색 조건 입력/초기화 → 목록 확인
2. 목록에서 `편집` 버튼 진입 → 오버레이 수정 → 저장 후 목록 재확인
3. 좁은 화면(태블릿/모바일)에서 동일 플로우 수행 시 가독성과 스크롤 안정성 확보

### Edge Cases

- 긴 상품명/회원명으로 컬럼 폭이 커지는 경우
- iPad 세로(약 768~834px)에서 툴바/테이블 간 줄바꿈 과밀
- 모바일에서 키보드 오픈 시 검색 입력/버튼 영역 겹침
- empty state 및 error notice가 테이블 영역을 과도하게 밀어내는 경우

### Gaps to Address

- 데스크톱 중간 폭(약 1200~1400)과 태블릿 폭(768~1024)에 대한 별도 규칙이 없음
- 전역 `table min-width`가 도메인별 요구와 무관하게 동일 적용됨

## Proposed Solution

### Chosen Direction

**2단계 반응형 전략**

- **Phase A (Desktop/Tablet-first):** members/products 전용 반응형 규칙 추가
  - 중간 폭에서 가독성 우선으로 컬럼/간격/툴바 레이아웃을 재조정
- **Phase B (Mobile polish):** 800px 이하에서 검색/액션/테이블 표시 전략 최적화
  - 필요 시 특정 보조 컬럼 축약 또는 줄바꿈 전략 적용

(브레인스토밍의 “운영 안정화 우선, 범위 분리” 원칙을 그대로 적용. see brainstorm)

## Technical Considerations

- 변경 중심 파일:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductManagementPanels.tsx`
  - (필요 시) `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MembersSection.tsx`
  - (필요 시) `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductsSection.tsx`
- API/백엔드 계약 변화 없음 (frontend-only)
- 접근성 유지:
  - 버튼 기반 편집 진입 유지
  - 포커스 이동/표시 훼손 금지

## System-Wide Impact

- **Interaction graph:** CSS 및 렌더 구조 보강이 주 대상. 비즈니스 로직 호출 체인 변화 없음.
- **Error propagation:** 기존 API 오류 표시는 동일 (`NoticeText`)로 유지.
- **State lifecycle risks:** 레이아웃 변경으로 인한 상태 유실 리스크는 낮음.
- **API surface parity:** members/products 공통 패턴을 함께 수정해 파편화 방지.
- **Integration test scenarios:**
  - members/products 각각에서 `조회 → 편집 → 저장` 시나리오를 데스크톱/모바일 뷰포트로 수동 검증.

## Implementation Phases

### Phase 1: Desktop/Tablet Responsive Baseline

- [x] `frontend/src/styles.css`에 members/products 전용 반응형 규칙 추가 (`@media` 구간: 1400, 1200, 1024 인근)
- [x] `frontend/src/styles.css`에서 테이블 최소폭 정책을 전역 고정값에서 “도메인별/구간별” 전략으로 조정
- [x] `frontend/src/features/members/MemberManagementPanels.tsx` 컬럼 밀도 점검(필요 시 표시 우선순위 조정)
- [x] `frontend/src/features/products/ProductManagementPanels.tsx` 컬럼 밀도 점검(필요 시 표시 우선순위 조정)

### Phase 2: Mobile/Small Tablet Optimization

- [x] `frontend/src/styles.css`에서 800px 이하 toolbar/grid 간격 및 액션 버튼 배치 최적화
- [x] `frontend/src/features/members/MemberManagementPanels.tsx` 모바일 가독성 보강(열 축약/줄바꿈 정책)
- [x] `frontend/src/features/products/ProductManagementPanels.tsx` 모바일 가독성 보강(열 축약/줄바꿈 정책)
- [x] 모바일 키보드 오픈 상황에서 입력/버튼/리스트 상호 간섭 점검

### Phase 3: Validation & Regression

- [x] `frontend` 빌드 검증: `npm run build`
- [x] 수동 검증 아티팩트 작성: `docs/testing/artifacts/`에 members/products 데스크톱/태블릿/모바일 캡처 저장
- [x] 검증 로그 작성: `docs/notes/`에 레이아웃 회귀 체크리스트 기록
- [x] todo 상태 업데이트 및 완료 파일 정리 (`todos/`)

## Acceptance Criteria

### Functional / UX

- [x] 1280px 전후 데스크톱에서 members/products 테이블 수평 스크롤 빈도가 기존 대비 유의미하게 감소한다.
- [x] 768~1024px 태블릿 폭에서 검색/액션/목록 영역이 겹치지 않고 자연스럽게 배치된다.
- [x] 800px 이하 모바일에서 조회/편집 진입 버튼 사용성이 유지된다.
- [x] 버튼 기반 편집 진입 접근성(키보드 포커스 포함)이 유지된다.

### Quality

- [x] `frontend`에서 `npm run build` 통과
- [x] members/products 핵심 플로우 수동 회귀(조회/초기화/편집 진입/저장/오류 표시) 완료

## Success Metrics

- 데스크톱 중간 폭에서 “가로 스크롤 필요” 제보/재현률 감소
- 태블릿/모바일 데모 시 목록 탐색 시간 단축(정성)
- 반응형 관련 신규 회귀(todo) 0건

## Dependencies & Risks

### Dependencies

- 현재 surface 분리 구조(PR #9, #10, #11 머지 상태) 유지
- 공통 스타일 체계와 패널 컴포넌트 재사용

### Risks

- CSS 예외 규칙 증가로 유지보수 복잡도 상승
- 컬럼 축약 시 정보 손실 가능성
- 브레이크포인트 경계에서 레이아웃 점프

### Mitigation

- 전역 규칙보다 “도메인 컨테이너 스코프” 우선
- 컬럼 축약 시 툴팁/보조텍스트로 핵심 정보 보완
- 3개 뷰포트(Desktop/Tablet/Mobile) 고정 체크리스트 운영

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md)
- Prior plan: [2026-02-27-feat-members-products-list-form-surface-separation-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md)
- UI learnings: [admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)
- Current style baseline: `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:374`
- Table baseline: `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:568`
- Members section: `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MembersSection.tsx:9`
- Products section: `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductsSection.tsx:9`

## Post-Deploy Monitoring & Validation

No additional operational monitoring required: frontend responsive layout/UI readability improvement only, with no backend/API/data contract changes.
