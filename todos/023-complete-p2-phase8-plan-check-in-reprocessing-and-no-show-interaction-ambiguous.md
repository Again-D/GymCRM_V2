---
status: complete
priority: p2
issue_id: "023"
tags: [code-review, plan, reservation, attendance, policy]
dependencies: []
---

# Phase 8 Plan Leaves Check-in Reprocessing and NO_SHOW Interaction Ambiguous

## Problem Statement

The Phase 8 plan now defines `check-in` as metadata-only and adds a `NO_SHOW` terminal state, but it still does not explicitly lock two operational policies:

1. Can `check-in` be executed multiple times (idempotent/no-op/overwrite/CONFLICT)?
2. Can a reservation with `checked_in_at` already set still be marked `NO_SHOW`?

These decisions directly affect backend validation, UI button state, and test expectations.

## Findings

- `Rule 2-1` defines `check-in` as metadata-only but does not specify reprocessing semantics:
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-feat-phase8-attendance-checkin-and-usage-event-hardening-plan.md:92`
- `NO_SHOW` timing is fixed, but no rule clarifies whether a checked-in reservation is eligible for `NO_SHOW`:
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-feat-phase8-attendance-checkin-and-usage-event-hardening-plan.md:78`
- P8-5 says to test `check-in` reprocessing policy, but the expected result is not defined in canonical rules:
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-feat-phase8-attendance-checkin-and-usage-event-hardening-plan.md:187`

## Proposed Solutions

### Option 1: Lock conservative policy (Recommended)

**Approach:**
- `check-in` is allowed only once while `CONFIRMED`; second `check-in` returns `CONFLICT`
- `NO_SHOW` is forbidden if `checked_in_at` is already set

**Pros:**
- Operationally intuitive
- Simplifies UI actions and backend conditions
- Prevents contradictory attendance signals

**Cons:**
- Mistakes require explicit admin correction flow later

**Effort:** Small
**Risk:** Low

---

### Option 2: Idempotent `check-in` + still allow `NO_SHOW`

**Approach:**
- Repeated `check-in` returns success/no-op
- `NO_SHOW` can still be set after `check-in` if after `end_at`

**Pros:**
- More tolerant to repeated button presses

**Cons:**
- Creates contradictory semantics (`checked_in_at` + `NO_SHOW`)
- Harder for reporting logic

**Effort:** Small
**Risk:** Medium

## Recommended Action

Option 1 적용 완료.

- `check-in`은 `CONFIRMED` 상태에서 1회만 허용, 재호출은 `CONFLICT`
- `checked_in_at`가 존재하는 예약은 `NO_SHOW` 불가
- 계획서/서비스/API/UI/테스트에 동일 규칙 반영 완료

## Technical Details

Affected files:
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-feat-phase8-attendance-checkin-and-usage-event-hardening-plan.md`

## Resources

- Phase 8 plan review pass (2026-02-25)

## Acceptance Criteria

- [x] Canonical rules define `check-in` reprocessing behavior (CONFLICT vs idempotent no-op)
- [x] Canonical rules define whether `checked_in_at` blocks `NO_SHOW`
- [x] P8-2/P8-4/P8-5 sections and Acceptance Criteria reflect the chosen policy consistently

## Work Log

### 2026-02-25 - Review Finding Created

**By:** Codex

**Actions:**
- Re-reviewed Phase 8 plan after policy hardening updates
- Confirmed prior findings were addressed
- Identified remaining ambiguity between `check-in` metadata and `NO_SHOW` policy interaction

### 2026-02-25 - Completed

**By:** Codex

**Actions:**
- 권장안(Option 1)을 계획서 canonical rules에 고정
- P8-2 서비스 규칙, P8-4 UI 가드, P8-5 테스트 기준까지 일관 반영 확인
- 관련 구현/검증 로그가 정책과 정렬됨을 확인하고 todo `complete` 전환
