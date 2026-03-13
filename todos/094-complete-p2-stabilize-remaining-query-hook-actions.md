---
status: complete
priority: p2
issue_id: "094"
tags: [code-review, frontend, architecture, react, hooks]
dependencies: []
---

# Stabilize remaining query hook actions

## Problem Statement

The memberships effect-loop fix stabilized `useSelectedMemberMembershipsQuery` and `useProductsQuery`, but most other frontend query hooks still expose fresh action function references on every render. Several pages already compensate by omitting those actions from `useEffect` dependency arrays. That keeps the app working today, but it reintroduces the exact pattern that caused the memberships `Maximum update depth exceeded` incident and makes future refactors risky.

## Findings

- `frontend/src/pages/crm/modules/useCrmHistoryQuery.ts:20` and `frontend/src/pages/crm/modules/useCrmHistoryQuery.ts:65` return unstable `loadCrmHistory` / `resetCrmHistoryQuery`, while `frontend/src/pages/crm/CrmPage.tsx:46` uses an effect that intentionally depends only on `isLiveCrmRoleSupported`.
- `frontend/src/pages/access/modules/useAccessQueries.ts:22`, `frontend/src/pages/access/modules/useAccessQueries.ts:65`, and `frontend/src/pages/access/modules/useAccessQueries.ts:102` expose unstable loaders/reloaders, while `frontend/src/pages/access/AccessPage.tsx:99` omits them from the effect dependency list.
- The same pattern exists in `frontend/src/pages/settlements/modules/useSettlementReportQuery.ts:27`, `frontend/src/pages/lockers/modules/useLockerQueries.ts:22`, `frontend/src/pages/reservations/modules/useReservationTargetsQuery.ts:29`, and `frontend/src/pages/reservations/modules/useReservationSchedulesQuery.ts:12`.
- This is now a known failure mode: the memberships workspace hit a real `Maximum update depth exceeded` loop before its hook actions were stabilized.

## Proposed Solutions

### Option 1: Apply the stable-action pattern to all query hooks

**Approach:** Use `useCallback` for public actions and `useLatestRef` for default filter providers or mutable inputs, mirroring the fixed memberships/products hooks.

**Pros:**
- Removes a known class of React effect bugs.
- Makes exhaustive-deps-compatible code practical again.

**Cons:**
- Touches multiple hooks and associated tests.

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 2: Encapsulate page effects in stable page-local wrappers

**Approach:** Leave hook internals mostly as-is, but wrap unstable actions in page-level callbacks that are safe to reference from effects.

**Pros:**
- Smaller changes in the short term.
- Can be applied incrementally page by page.

**Cons:**
- Leaves the underlying hook API sharp-edged.
- Easier to miss in future pages.

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `frontend/src/pages/crm/modules/useCrmHistoryQuery.ts`
- `frontend/src/pages/access/modules/useAccessQueries.ts`
- `frontend/src/pages/settlements/modules/useSettlementReportQuery.ts`
- `frontend/src/pages/lockers/modules/useLockerQueries.ts`
- `frontend/src/pages/reservations/modules/useReservationTargetsQuery.ts`
- `frontend/src/pages/reservations/modules/useReservationSchedulesQuery.ts`
- Related page effects in `CrmPage.tsx`, `AccessPage.tsx`, `SettlementsPage.tsx`, `LockersPage.tsx`, and `ReservationsPage.tsx`

**Related components:**
- Query/action orchestration hooks
- Page-level data loading effects

**Database changes (if any):**
- Migration needed? No

## Resources

- Runtime fix reference: `docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md`
- Frontend review on 2026-03-13

## Acceptance Criteria

- [ ] Remaining query hooks expose stable public action references
- [ ] Page effects can include the actions they call without reintroducing loops
- [ ] Add regression tests covering rerender stability for converted hooks
- [ ] Full frontend test suite passes after the refactor

## Work Log

### 2026-03-13 - Initial Discovery

**By:** Codex

**Actions:**
- Re-reviewed frontend query hooks after the memberships loop fix
- Compared stable and unstable hook patterns across memberships, products, CRM, access, settlements, lockers, and reservations
- Traced where pages currently omit hook actions from effect dependency arrays to avoid rerender churn

**Learnings:**
- The memberships incident was not isolated; the same hook API shape still exists in several modules
- A consistent hook contract will reduce both runtime risk and review overhead

### 2026-03-13 - Resolution

**By:** Codex

**Actions:**
- Stabilized the remaining frontend query-hook actions with `useCallback`, and used latest-ref patterns where hooks depend on mutable defaults or auth scope
- Updated page effects in access, CRM, settlements, lockers, products, and reservations so they can safely depend on the actions they call
- Added rerender-stability regression tests for CRM, access, settlements, lockers, reservation targets, and reservation schedules query hooks
- Re-ran `cd frontend && npm test`

**Learnings:**
- Stable hook APIs let page effects become both exhaustive-deps-safe and easier to reason about
- Regression tests on function identity are a lightweight way to prevent effect-loop bugs from reappearing
