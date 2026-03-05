---
status: complete
priority: p2
issue_id: "050"
tags: [frontend, theme, dashboard, phase2, code-review]
dependencies: ["2026-03-04-feat-dashboard-theme-refactor-light-dark-phase1-plan"]
---

# Dashboard Theme Phase2: All Tabs Expansion

## Problem Statement
Phase 1에서 대시보드 중심 테마 리팩터링과 토글/저장 정책이 적용되었으나, members/products/reservations/access/lockers/crm/settlements 탭까지의 시각 일관성 확장은 아직 남아 있다.

## Findings
- Phase 1에서 공통 테마 상태와 루트 토큰 스코프(`data-theme`)는 도입 완료.
- 일부 탭은 기존 라이트 기반 대비/경계 스타일이 남아 테마 일관성이 부분적이다.

## Proposed Solutions
1. 공통 토큰 우선 확장
- 장점: 중복 스타일 감소
- 단점: 초기 영향 범위 큼
- 노력: Medium

2. 탭별 점진 확장
- 장점: 회귀 제어 용이
- 단점: 기간 증가
- 노력: Medium

## Recommended Action
공통 테이블 스타일 계층에서 hover 배경을 `--table-row-hover-bg` 토큰으로 통일해 members/products/memberships/reservations/access/lockers/crm/settlements 탭의 행 상호작용 색상을 테마별로 일관화한다. 기존 토글/저장 동작은 변경하지 않고 CSS 토큰 확장만 적용한다.

## Technical Details
- 대상: `frontend/src/styles.css`, 각 feature section/panel 컴포넌트
- 목표: 대시보드 수준의 명암/경계/포커스/상태 일관화

## Acceptance Criteria
- [x] 전체 주요 탭에서 라이트/다크 전환 시 레이아웃/가독성 유지
- [x] 토글 접근성/저장 정책은 기존 동작 유지
- [x] 각 탭 핵심 플로우 회귀 없음

## Work Log
- 2026-03-04: Phase 1 완료 후 후속 확장 todo 생성
- 2026-03-05: 공통 테이블 hover 토큰(`--table-row-hover-bg`) 도입, 멤버 전용 hover 의존 제거, `npm run build` 통과 확인

## Resources
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-04-feat-dashboard-theme-refactor-light-dark-phase1-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md`
