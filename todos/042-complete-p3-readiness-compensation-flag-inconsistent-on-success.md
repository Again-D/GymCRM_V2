---
status: complete
priority: p3
issue_id: "042"
tags: [code-review, quality, observability]
dependencies: []
---

# Fix compensationSucceeded flag semantics in success path

`ReadinessResult` in normal success path sets `compensationTriggered=false` while `compensationSucceeded=true`, which is semantically inconsistent.

## Problem Statement

In success scenarios where no compensation runs, `compensationSucceeded` should not be `true`.
Current values can mislead downstream dashboards or human reviewers into interpreting compensation success events that never happened.

## Findings

- `backend/src/main/java/com/gymcrm/integration/ExternalIntegrationReadinessService.java:99-107`
- Current success return values:
  - `compensationTriggered = false`
  - `compensationSucceeded = true`
- Tests do not assert `compensationSucceeded` in the success scenario.

## Proposed Solutions

### Option 1: Set `compensationSucceeded=false` when compensation is not triggered

**Approach:** Adjust success-path return to `false` for `compensationSucceeded`; update tests.

**Pros:**
- Keeps current schema
- Minimal change

**Cons:**
- Ambiguity between "not attempted" and "attempted but failed" remains

**Effort:** 30-60 min

**Risk:** Low

---

### Option 2: Replace with tri-state/enum compensation status

**Approach:** Introduce status enum (`NOT_TRIGGERED`, `SUCCEEDED`, `FAILED`).

**Pros:**
- Clear semantics

**Cons:**
- Wider interface change

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `backend/src/main/java/com/gymcrm/integration/ExternalIntegrationReadinessService.java`
- `backend/src/test/java/com/gymcrm/integration/ExternalIntegrationReadinessServiceIntegrationTest.java`

**Database changes:**
- No

## Resources

- PR #22
- Merge commit: `ee0f85d19874d4e8e6b43c199ef9065ac4926026`

## Acceptance Criteria

- [x] Success path에서 `compensationTriggered=false`일 때 `compensationSucceeded`도 일관된 값으로 설정된다.
- [x] 테스트가 compensation 플래그 조합을 명시적으로 검증한다.

## Work Log

### 2026-03-04 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed readiness result schema and return branches
- Detected inconsistent flag pair in success branch

**Learnings:**
- Current assertions are outcome 중심으로만 검증되어 플래그 무결성 회귀를 놓칠 수 있다.

## Notes

- P3 품질 이슈이나 모니터링 해석 혼선을 줄이기 위해 빠른 정리가 권장됨.
