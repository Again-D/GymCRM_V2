---
status: complete
priority: p2
issue_id: "044"
tags: [code-review, planning, requirements]
dependencies: []
---

# Align ACC Must coverage target with requirements

## Problem Statement

`docs/01_요구사항_분석서.md`에서 ACC Must는 `FR-ACC-001~005`인데, 신규 계획 문서의 Acceptance Criteria는 `001~003`만 목표로 명시한다.
이 상태로 진행하면 Must 요구사항 충족 정의가 계획 단계에서 축소되어 추후 완료 판정/범위 관리에 혼선이 발생한다.

## Findings

- 계획 문서:
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md:179`
  - "ACC Must(001~003)"
- 요구사항 문서:
  - `docs/01_요구사항_분석서.md:250-254`
  - ACC Must는 `001~005`

## Proposed Solutions

### Option 1: ACC Must를 001~005로 확장해 동일 플랜 내 반영

**Approach:**
- Acceptance Criteria와 Phase 12-A/12-B 경계를 조정해 `ACC-004/005`도 명시적으로 포함

**Pros:**
- 요구사항 문서와 직접 정렬
- 완료 판정 기준이 명확

**Cons:**
- 12-A 범위가 커질 수 있음

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: 004/005를 별도 Phase로 분리하고 Must 예외 사유를 명시

**Approach:**
- 현재 문서에 "ACC Must split rationale" 섹션 추가
- 004/005의 목표 시점(예: 12-D)과 배경 명시

**Pros:**
- 단계 분할이 명확
- 범위 과부하 완화

**Cons:**
- 예외 관리 문서화가 필요

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

Option 2 채택: ACC Must를 `001~005`로 유지하되 구현 단계를 `12-A(001~003)`와 `12-D(004~005)`로 명시 분할한다. Acceptance Criteria를 요구사항과 정렬하고 phase 매핑을 완료 판정 기준으로 고정한다.

## Technical Details

**Affected files:**
- `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- `docs/01_요구사항_분석서.md`

## Resources

- Plan: `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- Requirement: `docs/01_요구사항_분석서.md`

## Acceptance Criteria

- [x] 계획 문서에서 ACC Must 범위가 요구사항 문서와 일치하거나, 불일치 사유/분리 일정이 명시된다.
- [x] Phase별 ACC 커버리지 매핑(001~005)이 문서에 남는다.

## Work Log

### 2026-03-04 - Initial Discovery

**By:** Codex

**Actions:**
- Compared post-Phase11 plan acceptance criteria against requirement FR table
- Identified ACC Must coverage contraction (001~005 -> 001~003)

**Learnings:**
- Must 범위는 단계 분할하더라도 예외 근거와 일정이 반드시 함께 필요하다.

## Notes

- Protected artifact 정책 준수: `docs/plans/*` 삭제/제외 제안 없음.

### 2026-03-04 - Execution Complete

**By:** Codex

**Actions:**
- Updated acceptance target from ACC Must(001~003) to ACC Must(001~005)
- Added Phase 12-D to explicitly cover FR-ACC-004/005 with deliverables and quality gates
- Added ACC phase mapping acceptance item: `12-A(001~003) + 12-D(004~005)`

**Learnings:**
- Must 항목을 단계 분할할 때는 범위 축소가 아니라 매핑 명시로 관리해야 완료 판정이 흔들리지 않는다.
