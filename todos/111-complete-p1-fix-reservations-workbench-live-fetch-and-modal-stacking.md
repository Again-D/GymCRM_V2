---
status: complete
priority: p1
issue_id: "111"
tags: [code-review, frontend, reservations, regression]
dependencies: []
---

# Fix reservations workbench live fetch and modal stacking

## Problem Statement

`ReservationsPage` was issuing the selected-member reservation fetch against a non-existent `/api/v1/members/{id}/reservations` endpoint, producing live-mode 404s in the browser console. The same screen also opened the "신규 예약 등록" modal on top of the existing workbench modal, leaving two modal layers active at once and making page scroll/overlay behavior feel broken.

## Findings

- `frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts` queried `/api/v1/members/${memberId}/reservations`, but the backend only exposes `GET /api/v1/reservations?memberId=...`.
- `frontend/src/pages/reservations/ReservationsPage.tsx` opened the new-reservation modal without closing the workbench modal, creating nested body-scroll locks via the shared `Modal` component.
- Existing tests covered the mock create flow, but did not assert the live reservation-list path or the single-modal invariant.

## Proposed Solutions

### Option 1: Align with the existing reservations API and replace modal stacking

**Approach:** Query `GET /api/v1/reservations?memberId=...` and switch modal flow so the new-reservation modal temporarily replaces the workbench, then returns to it after close/create.

**Pros:**
- Fixes the live 404 without backend changes.
- Removes double modal overlays and restores predictable scrolling.
- Keeps the current UI structure intact.

**Cons:**
- Requires a small amount of modal state choreography.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Add a backend member-scoped reservations endpoint

**Approach:** Introduce `/api/v1/members/{memberId}/reservations` on the server and leave the frontend as-is.

**Pros:**
- Minimal frontend changes.

**Cons:**
- Adds duplicate API surface for no product gain.
- Does not solve the stacked modal scroll issue.

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

Use the existing reservations list endpoint as the source of truth and keep only one modal open at a time in the reservation workbench flow.

## Technical Details

**Affected files:**
- `frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts`
- `frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.test.tsx`
- `frontend/src/pages/reservations/ReservationsPage.tsx`
- `frontend/src/pages/reservations/ReservationsPage.test.tsx`

**Related components:**
- Reservation workbench modal flow
- Shared modal body-scroll locking behavior

**Database changes (if any):**
- No schema change required

## Resources

- **User report date:** 2026-03-23
- **Page:** `frontend/src/pages/reservations/ReservationsPage.tsx`

## Acceptance Criteria

- [x] Live selected-member reservation fetches use an existing backend route.
- [x] Opening "신규 예약 등록" no longer leaves the workbench modal mounted underneath.
- [x] Closing or submitting the create modal returns the user to the workbench when a member is selected.
- [x] Tests cover both the live fetch path and the modal transition behavior.

## Work Log

### 2026-03-23 - Investigation and Fix

**By:** Codex

**Actions:**
- Reviewed `ReservationsPage`, the selected-member reservations hook, and the shared `Modal` component.
- Confirmed the live fetch path pointed at a non-existent endpoint while the backend already supported `GET /api/v1/reservations?memberId=...`.
- Updated the modal transition so the create modal replaces the workbench and reopens it on close/create.
- Added regression assertions for the live fetch URL and the one-modal-at-a-time workflow.

**Learnings:**
- The 404 and the scroll complaint came from two separate regressions in the same interaction path.
- Nested modal state is enough to create "scroll is broken" reports even when the shared modal lock itself is functioning as designed.
