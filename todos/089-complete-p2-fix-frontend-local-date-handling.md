---
status: complete
priority: p2
issue_id: "089"
tags: [code-review, frontend, timezone, date-handling, reservations, memberships]
dependencies: []
---

# Fix frontend local date handling

## Problem Statement

The frontend derives business dates with `toISOString().slice(0, 10)` in multiple workspace flows. In Korea this uses the UTC day, so users working shortly after local midnight can see "today" resolve to the previous calendar day. That shifts reservation eligibility, membership hold/refund defaults, locker assignment defaults, settlement date ranges, and member filter presets by one day.

## Findings

- `frontend/src/pages/memberships/modules/useMembershipPrototypeState.ts:90` and `frontend/src/pages/memberships/modules/useMembershipPrototypeState.ts:98` derive default dates and date arithmetic from UTC-formatted strings.
- `frontend/src/pages/reservations/ReservationsPage.tsx:90` computes `businessDateText` with `new Date().toISOString().slice(0, 10)`, so reservable memberships can be filtered against the wrong day.
- `frontend/src/pages/settlements/modules/types.ts:30`, `frontend/src/pages/lockers/modules/types.ts:49`, and `frontend/src/pages/members/modules/useMembershipDateFilter.ts:11` repeat the same UTC-date pattern for default form values and preset filters.
- The project timezone is `Asia/Seoul`, so this is a real production risk, not just a test-only quirk.

## Proposed Solutions

### Option 1: Introduce shared local-date helpers

**Approach:** Add a single frontend utility for `today`, `formatLocalDate`, and `addDaysLocal`, then replace all `toISOString().slice(0, 10)` date-only usage in UI/workspace code.

**Pros:**
- Fixes the bug consistently across all workspaces.
- Reduces repeated date logic and future regressions.

**Cons:**
- Requires touching several modules and updating tests.

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Patch each affected module independently

**Approach:** Replace UTC date derivation locally in memberships, reservations, settlements, lockers, and member filters without introducing a shared helper.

**Pros:**
- Small local diffs.
- Lower coordination cost if only one flow is urgent.

**Cons:**
- Easy to miss one caller.
- Keeps duplicated date logic in the codebase.

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `frontend/src/pages/memberships/modules/useMembershipPrototypeState.ts`
- `frontend/src/pages/reservations/ReservationsPage.tsx`
- `frontend/src/pages/settlements/modules/types.ts`
- `frontend/src/pages/lockers/modules/types.ts`
- `frontend/src/pages/members/modules/useMembershipDateFilter.ts`

**Related components:**
- Membership purchase/hold/refund forms
- Reservation creation eligibility
- Locker assignment defaults
- Settlement report default range
- Member period filter presets

**Database changes (if any):**
- Migration needed? No

## Resources

- `docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
- Frontend review run on 2026-03-13 (`npm test`, `npm run build`)

## Acceptance Criteria

- [ ] All date-only defaults use local business dates rather than UTC slices
- [ ] Reservation eligibility uses the local current date
- [ ] Membership, locker, and settlement defaults stay correct across local midnight in `Asia/Seoul`
- [ ] Automated tests cover a timezone edge case near local midnight

## Work Log

### 2026-03-13 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed workspace state modules and date helpers across the frontend
- Verified repeated `toISOString().slice(0, 10)` usage in membership, reservation, settlement, locker, and filter code
- Assessed impact against the project's `Asia/Seoul` runtime context

**Learnings:**
- The same UTC-date pattern is duplicated across several workspaces
- The bug affects business rules, not just display formatting

### 2026-03-13 - Resolution

**By:** Codex

**Actions:**
- Added shared local-date helpers in `frontend/src/shared/date.ts`
- Replaced UTC date-only derivation in membership, reservation, settlement, locker, and member-filter modules
- Added `frontend/src/shared/date.test.ts` to cover local date formatting and date math
- Verified with `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- Centralizing date-only logic makes timezone-sensitive business rules much safer
- Local calendar values and ISO timestamps should be treated as separate concerns
