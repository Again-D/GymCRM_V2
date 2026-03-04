---
status: complete
priority: p2
issue_id: "048"
tags: [code-review, planning, architecture, operations]
dependencies: []
---

# Rollback 규칙이 전 트랙 feature flag 존재를 가정함

## Problem Statement

PR #28에서 추가된 운영 판단 규칙은 "임계치 초과 시 해당 트랙 feature flag 즉시 rollback"을 공통 규칙으로 정의한다. 그러나 현재 플랜 본문은 feature flag를 외부 연동(External Activation) 중심으로만 명시하고 있어 SAL/CRM/Security 트랙에 동일 규칙을 바로 적용하기 어렵다.

## Findings

- 공통 운영 판단 규칙이 전 트랙 feature flag rollback을 요구함.
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
  - `### Rollback Thresholds & Owners` 직하단 운영 판단 규칙
- 아키텍처 설명에서 feature flag는 외부연동 단계 활성화 중심으로만 기술되어 있음.
  - 같은 문서 `### Architecture` 섹션

## Proposed Solutions

### Option 1: 트랙별 rollback 메커니즘을 명시적으로 분기

**Approach:**
- ACC/SAL/CRM/Security 각각에 대해 `feature flag rollback` 또는 `safe-mode/queue pause/config toggle` 중 실제 가능한 메커니즘을 표로 명시
- 전 트랙 공통 문구를 제거하고 트랙별 실행 경로를 명확화

**Pros:**
- 운영 runbook의 실행 가능성 향상
- 온콜 대응 중 의사결정/조치 지연 방지

**Cons:**
- 각 도메인 소유자와 메커니즘 합의 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: 전 트랙 feature flag를 선행 과제로 강제

**Approach:**
- Phase 선행조건에 SAL/CRM/Security feature flag 도입 추가
- rollback 규칙은 현행 유지

**Pros:**
- 운영 모델 일관성 확보

**Cons:**
- 구현 범위 확대 및 일정 영향

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Option 1 채택: 전 트랙 공통 feature flag 가정을 제거하고, 트랙별 rollback 제어수단(Primary/Secondary) 표를 도입해 실행 경로를 분기한다.

## Technical Details

**Affected files:**
- `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`

## Acceptance Criteria

- [x] 트랙별 rollback 실행 메커니즘이 문서에 명시된다.
- [x] feature flag 미적용 트랙의 대체 롤백 경로가 정의된다.
- [x] 운영 판단 규칙과 아키텍처 섹션 간 모순이 제거된다.

## Work Log

### 2026-03-04 - Review Finding Captured

**By:** Codex

**Actions:**
- Reviewed PR #28 diff and rollback rule additions
- Cross-checked with architecture section assumptions

**Learnings:**
- 운영 규칙은 실제 제어 수단(feature flag/config toggle)이 존재하는 범위에서만 선언해야 한다.

## Resources

- PR: https://github.com/Again-D/GymCRM_V2/pull/28

### 2026-03-04 - Execution Complete

**By:** Codex

**Actions:**
- Replaced blanket feature-flag rollback wording with track-specific control wording
- Added Rollback Control Mechanisms by Track table (ACC/SAL/CRM/Security)
- Updated monitoring record rule to include control mechanism evidence

**Learnings:**
- 롤백 규칙은 보유한 제어수단을 기준으로 선언해야 운영 실행 가능성이 보장된다.
