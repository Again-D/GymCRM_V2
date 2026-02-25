---
status: complete
priority: p3
issue_id: "022"
tags: [code-review, frontend, ux, reservation]
dependencies: []
---

# Reservation Create Form State Persists When Switching Selected Member

## Problem Statement

When the operator selects a different member, the reservation create form state (`membershipId`, `scheduleId`, `memo`) is not reset. This can leave a previously selected membership/schedule in component state even though the visible options are now for another member.

The backend correctly rejects mismatched member/membership combinations, but the UX becomes confusing because the submit button can remain enabled and then fail with a server-side error.

## Findings

- Reservation form reset occurs on full protected-UI clear and after successful reservation create, but not during member switch:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:680`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1315`
- Member selection changes call `loadMemberDetail(memberId)` directly from the member list:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:2515`
- `loadMemberDetail(...)` resets purchase-related state but not reservation create form state:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:717`

## Proposed Solutions

### Option 1: Reset reservation form on member change (Recommended)

**Approach:** In `loadMemberDetail(...)` (or immediately before calling it), clear `reservationCreateForm`, reservation panel messages/errors, and any reservation action transient state tied to the previous member.

**Pros:**
- Prevents stale hidden values
- Minimal code change

**Cons:**
- Operators lose in-progress memo text when switching members

**Effort:** Small
**Risk:** Low

---

### Option 2: Preserve state but validate selected values against current member options

**Approach:** On render/effect, clear only invalid `membershipId` and keep other draft fields.

**Pros:**
- More ergonomic for frequent member switching

**Cons:**
- More logic and edge cases

**Effort:** Small-Medium
**Risk:** Low-Medium

## Recommended Action

Reset reservation create form and reservation panel transient messages when switching selected member (`loadMemberDetail(...)`). This removes stale `membershipId/scheduleId/memo` values tied to the previous member and keeps submit state aligned with current options.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

## Resources

- **Branch:** `codex/feat-phase7-reservations-usage-deduction-foundation`

## Acceptance Criteria

- [ ] Switching selected member clears invalid reservation form selections
- [ ] Reservation submit button state reflects current member's valid options
- [ ] Manual check confirms no mismatched-member reservation create error from stale hidden value path

## Work Log

### 2026-02-25 - Review Finding Created

**By:** Codex

**Actions:**
- Traced reservation form state lifecycle in `App.tsx`
- Confirmed reset on logout/success path but not on member switch path
- Assessed UX impact and proposed low-risk reset fix

### 2026-02-25 - Fix Implemented

**By:** Codex

**Actions:**
- Added reservation form/message reset in `loadMemberDetail(...)` before fetching next member detail
- Cleared reservation action submitting state on member switch
- Verified frontend compiles with `npm run build`
