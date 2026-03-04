---
title: "feat: Refactor dashboard UI to reference style with light/dark theme foundation"
type: feat
status: completed
date: 2026-03-04
origin: docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md
---

# feat: Refactor dashboard UI to reference style with light/dark theme foundation

## Enhancement Summary
**Deepened on:** 2026-03-04  
**Sections enhanced:** Overview, Research Summary, Technical Considerations, Implementation Phases, Acceptance Criteria, Sources & References

### Key Improvements
1. 테마 상태 모델(`system | light | dark`)과 실제 적용 테마(`light | dark`)의 분리 기준을 명시했다.
2. 초기 페인트 깜빡임(FOUC) 방지를 위한 적용 시점/우선순위 원칙을 구체화했다.
3. 접근성/회귀 검증을 위한 테스트 매트릭스와 정량 기준(대비/키보드/저장 복원)을 추가했다.

### New Considerations Discovered
- 저장값이 존재할 때는 시스템 이벤트 변경을 무시해야 사용자 의도가 유지된다.
- `prefers-reduced-motion` 환경에서 테마 전환 애니메이션을 사실상 제거해야 접근성 기대와 맞는다.

## Overview
레퍼런스 이미지 톤(운영형 다크 대시보드)을 기준으로 GymCRM 대시보드 시각 구조를 재정비하고, 라이트/다크 모드를 지원하는 공통 테마 기반을 도입한다. 1차 범위는 **대시보드 우선 적용**이며, 이후 동일한 토큰/컴포넌트 규칙을 전체 탭으로 확장 가능한 구조를 만든다 (see brainstorm: `docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md`).

## Problem Statement / Motivation
현재 UI는 사이드바 기반 정보구조 자체는 안정화되었지만, 대시보드의 시각 위계/밀도/톤이 레퍼런스 수준의 운영형 인상과 차이가 있다.

- 테마가 `light` 고정(`color-scheme: light`)이라 사용자 선호 및 OS 설정 반영이 불가능
  - `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:2`
- TopBar/Sidebar/Dashboard 카드가 동일 톤 체계로 묶이지 않아, 대시보드 중심 시각 집중도가 낮음
  - `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/TopBar.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx`

왜 지금 필요한가:
- 대시보드는 운영자가 가장 자주 보는 진입 화면이며, 첫 인상/가독성 품질이 전체 UX 신뢰도에 직접 영향을 준다.
- 2차 전체 탭 확장 전에 테마 토큰·전환 정책을 대시보드에서 안정화해야 회귀 비용을 줄일 수 있다 (see brainstorm).

## Research Summary

### Local Research (Repo + Learnings)
- 기존 학습 문서에서 “스타일 폴리시보다 IA/업무단위 정렬이 우선” 원칙이 확인됨. 현재는 IA가 정리된 상태이므로, 이번 작업은 시각/테마 계층 강화가 적절함.
  - `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
- 현재 코드 구조는 레이아웃 컴포넌트 분리가 이미 되어 있어(TopBar/SidebarNav/DashboardSection), 기능 로직 변경 없이 UI/테마 리팩터링 가능.

### External Research Decision
외부 리서치는 생략한다.
- 주제는 저위험 프론트엔드 시각/테마 개선
- 레퍼런스 방향과 브레인스토밍 결정이 이미 명확
- 코드베이스 내부 패턴과 선행 문서가 충분

### Research Insights (Framework/Standards)
- CSS 변수 기반 테마는 토큰 스코프(`:root[data-theme=...]`)로 분리할 때 전체 탭 확장 시 재사용성이 높다.
- 시스템 설정 기반 초기 테마는 `prefers-color-scheme`를 기준으로 하고, 사용자 저장값이 있으면 저장값을 우선한다.
- 테마 토글은 시맨틱 버튼(`aria-pressed`) 또는 스위치 역할(`role="switch"`, `aria-checked`)로 노출해 보조기기 해석 가능성을 보장한다.
- 모션 민감 사용자 환경은 `prefers-reduced-motion` 조건에서 전환 효과를 축소/제거한다.

## Proposed Solution

### Chosen Direction
**2단계 전략(대시보드 우선 → 전체 탭 확장 준비)**

1. **Phase 1 (이번 계획 범위)**
   - 대시보드 화면 시각 리팩터링
   - 테마 상태 모델 도입(시스템 설정 우선, 사용자 오버라이드 localStorage)
   - TopBar 우측 토글 스위치 추가
   - 즉시 전환 + 최소 애니메이션 정책 반영

2. **Phase 2 (후속 계획)**
   - Phase 1에서 확정된 토큰/상태 규칙을 members/products/reservations/access/기타 탭으로 확장

(모든 결정은 브레인스토밍 합의사항을 그대로 계승. see brainstorm: `docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md`)

## Out of Scope (Phase 1)
- members/products/reservations/access/crm/settlements/lockers 탭의 시각 리디자인
- 백엔드 API, 인증/권한 로직, 데이터 모델 변경
- 대시보드 신규 비즈니스 위젯/통계 API 추가
- 디자인 시스템 전면 재정의(폰트 교체, 컴포넌트 전수 리네이밍)

## Technical Considerations
- **State source of truth**
  - 앱 최상위에서 `themePreference`(system|light|dark) + `resolvedTheme`(light|dark) 관리
  - 시스템 설정은 `matchMedia('(prefers-color-scheme: dark)')`로 감지
- **Persistence**
  - 사용자 수동 선택 시 localStorage 키 저장 (예: `gymcrm.themePreference`)
  - 저장값이 없으면 시스템값 사용
- **DOM application strategy**
  - 루트(`html` 또는 `body`/`#root`)에 `data-theme="light|dark"`를 부여하고 CSS 변수 스코프 전환
- **Animation policy**
  - 색상 전환 transition 최소화(짧은 duration, 핵심 속성만)
  - `prefers-reduced-motion` 환경에서는 전환 효과 최소/제거
- **Scope guardrail**
  - API 호출/도메인 상태/업무 흐름 변경 금지 (UI 계층만 수정)

### Research Insights

**Best Practices**
- `themePreference`는 사용자 의도, `resolvedTheme`는 실제 렌더 상태로 분리해 조건 분기 복잡도를 낮춘다.
- 토글 상태를 TopBar에 두되 실제 스타일 적용은 루트 속성(`data-theme`)에서 단일 책임으로 처리한다.
- 테마 토큰은 Phase 1부터 `surface`, `text`, `border`, `accent`, `state` 그룹으로 네이밍해 Phase 2 확장 비용을 줄인다.

**Implementation Details**
```ts
type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "gymcrm.themePreference";

// precedence:
// 1) localStorage preference (if valid)
// 2) system preference (matchMedia)
// 3) fallback = light
```

**Edge Cases**
- localStorage 접근 예외(프라이빗/정책 제한) 발생 시 앱이 깨지지 않고 시스템값으로 진행해야 한다.
- 저장된 값이 손상되었을 때(`invalid string`) 안전하게 `system`으로 복귀해야 한다.
- 토글 연타 시 상태 경쟁이 없어야 하며 마지막 입력이 일관되게 반영되어야 한다.

**Validation Hooks**
- 루트 엘리먼트에 적용된 `data-theme` 값을 테스트에서 직접 검증 가능하도록 유지한다.
- 토글 컴포넌트는 `aria-label` 또는 명시적 텍스트를 제공해 자동화 테스트 선택자를 안정화한다.

## System-Wide Impact
- **Interaction graph**: 테마 토글 액션은 렌더 계층(TopBar → App 루트 class/data-theme → CSS 변수)만 변경. 비즈니스 API 체인 영향 없음.
- **Error propagation**: 네트워크/백엔드 에러 플로우 영향 없음. localStorage 접근 실패(브라우저 정책) 시 시스템 테마 fallback 필요.
- **State lifecycle risks**: 잘못된 초기화 순서 시 첫 페인트 깜빡임(FOUC) 가능. 초기 테마 결정 시점을 앱 초기 렌더 전에 고정 필요.
- **API surface parity**: Phase 1은 대시보드 우선이지만, 토큰 네이밍은 전체 탭 확장 가능한 공통 prefix로 설계.
- **Integration test scenarios**:
  - 최초 방문(저장값 없음) → 시스템 테마 반영
  - 토글 변경 후 새로고침 → 저장된 선호 복원
  - 토글 후 대시보드 내 카드/사이드바/탑바 대비 유지

## SpecFlow Analysis
- **Happy path**
  - 사용자 접속 → 시스템 다크 감지 → 다크 UI 표시
  - 사용자 라이트로 전환 → 즉시 반영 → 재접속 시 라이트 유지
- **Failure/edge cases**
  - localStorage 비활성/예외: 시스템 기본값으로 무중단 동작
  - 시스템 테마 변경 이벤트: 사용자 저장값이 없을 때만 자동 반영
  - 토글 접근성: 키보드 탭/엔터/스페이스로 조작 가능
- **Scope boundaries**
  - 대시보드 외 탭은 기능 회귀 금지, 시각적 토큰 일부 적용은 허용하되 기능 변경 금지

## Implementation Phases

### Phase 1: Theme Foundation (App/TopBar/CSS Token Layer)
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에 테마 preference/resolved state 및 초기화 로직 추가
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에서 시스템 테마 감지 + localStorage 읽기/쓰기 처리
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/TopBar.tsx`에 우측 토글 스위치 UI 추가
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`에 `:root[data-theme="light"]`, `:root[data-theme="dark"]` 토큰 스코프 추가
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`의 `color-scheme` 전략을 다크/라이트 대응으로 수정
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`에 `@media (prefers-reduced-motion: reduce)` 대응 추가
- [x] 테마 토글 접근성 속성(`aria-pressed` 또는 `role="switch"` + `aria-checked`) 반영

### Phase 2: Dashboard Visual Refactor (Reference-style Direction)
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx` 레이아웃/카드 구조를 레퍼런스 톤에 맞게 재구성
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`에서 대시보드 카드/패널/통계 블록/우측 액티비티 영역 스타일 보강
- [x] `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx`와 `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/TopBar.tsx`의 시각 위계(톤/경계/상태) 정렬
- [x] 최소 애니메이션 정책 반영(과한 모션 제거, 상태 인지 가능한 최소 전환만 유지)
- [x] 데스크톱(1440), 태블릿(1024), 모바일(390) 3개 기준 뷰포트에서 레이아웃 깨짐 없음 확인

### Phase 3: Validation & Regression
- [x] `frontend` 빌드 검증: `/Users/abc/projects/GymCRM_V2/frontend`에서 `npm run build`
- [x] 수동 회귀: 대시보드 외 핵심 탭 진입/조회/기존 액션 정상 동작 확인
- [x] 테마 시나리오 수동 검증 로그 작성
  - `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-04-dashboard-theme-phase1-validation.md`
- [x] UI 캡처 저장
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/2026-03-04-dashboard-light.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/2026-03-04-dashboard-dark.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/2026-03-04-dashboard-theme-toggle-topbar.png`

#### Validation Matrix (Required)
- [x] Case A: 저장값 없음 + 시스템 다크 → 초기 다크 렌더
- [x] Case B: 저장값 없음 + 시스템 라이트 → 초기 라이트 렌더
- [x] Case C: 수동 라이트 저장 후 시스템 다크 변경 → 라이트 유지
- [x] Case D: 수동 다크 저장 후 새로고침 → 다크 유지
- [x] Case E: localStorage 접근 실패 시 에러 없이 시스템값 fallback
- [x] Case F: 키보드(Tab/Enter/Space)로 토글 조작 가능

## Acceptance Criteria

### Functional
- [x] TopBar 우측 토글로 라이트/다크 전환이 즉시 반영된다.
- [x] 사용자 수동 선택은 localStorage에 저장되고 재접속 시 복원된다.
- [x] 저장값이 없을 때 시스템 설정(`prefers-color-scheme`)을 기본 적용한다.

### UX / Accessibility
- [x] 대시보드가 레퍼런스와 유사한 시각 위계(사이드바-상단바-카드 중심 레이아웃)를 제공한다. (동일 시점 캡처 2장 이상으로 내부 리뷰 승인)
- [x] 전환 애니메이션은 최소화되어 시각 피로를 유발하지 않는다.
- [x] 토글 스위치는 키보드 접근 가능하며 포커스 가시성을 보장한다.
- [x] 라이트/다크 모두 핵심 텍스트 대비가 유지된다.
- [x] 핵심 텍스트/배경 대비가 WCAG AA(일반 텍스트 4.5:1)를 충족한다.

### Regression / Quality
- [x] `npm run build` 통과
- [x] 대시보드 외 탭에서 기능/API 흐름 회귀가 없다.

## Success Metrics
- 대시보드 초기 인상/가독성 개선에 대한 내부 리뷰 통과
- 테마 관련 버그(초기 깜빡임, 저장 미복원, 토글 미동작) 0건
- Phase 2(전체 탭 확장) 계획 수립 시 재사용 가능한 토큰/테마 구조 확보

## Definition of Done (Phase 1)
- Implementation Phases의 모든 체크박스 완료
- Acceptance Criteria의 Functional/UX/Regression 항목 모두 충족
- `docs/notes/2026-03-04-dashboard-theme-phase1-validation.md` 검증 로그 작성 완료
- `docs/testing/artifacts/2026-03-04-dashboard-*.png` 증적 업로드 완료
- 후속 전체 탭 확장용 Phase 2 별도 계획 파일 생성 또는 todo 등록 완료 (`/Users/abc/projects/GymCRM_V2/todos/050-pending-p2-dashboard-theme-phase2-all-tabs-expansion.md`)

## Dependencies & Risks

### Dependencies
- 현재 사이드바 기반 워크스페이스 구조 유지
- TopBar/SidebarNav/DashboardSection 컴포넌트 분리 구조 활용

### Risks
- 초기 렌더 시 테마 깜빡임(FOUC)
- 다크 테마 대비 부족으로 가독성 저하
- Phase 1 범위에서 전체 탭까지 동시 변경 시 범위 팽창

### Mitigation
- 초기 테마 결정 로직을 렌더 초기 단계에 배치
- 색상 토큰은 대비 점검 기준(텍스트/배경/경계)으로 검증
- 계획 범위를 대시보드 우선으로 강제하고 전체 탭 확장은 별도 후속 이슈로 분리

## Sources & References
- **Origin brainstorm:** [`docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md`](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md)
  - carried-forward decisions: 대시보드 우선, 시스템 테마 우선 + 로컬 저장, TopBar 토글, 최소 애니메이션
- UI learning: [`docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`](/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)
- Current dashboard surface: `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx`
- Current top bar: `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/TopBar.tsx`
- Current sidebar: `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx`
- Current global styles: `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`
- Theme media query reference: `https://developer.mozilla.org/docs/Web/CSS/@media/prefers-color-scheme`
- Reduced motion reference: `https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion`
- Web Storage reference: `https://developer.mozilla.org/docs/Web/API/Window/localStorage`

## Post-Deploy Monitoring & Validation
No additional operational monitoring required: frontend visual/theme behavior change only, with no backend/API/data contract changes.
