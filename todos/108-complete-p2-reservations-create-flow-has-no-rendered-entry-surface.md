---
status: complete
priority: p2
issue_id: "108"
tags: [code-review, frontend, reservations, quality]
dependencies: []
---

# Reservations workbench exposes a create handler but no rendered create modal or form

## Problem Statement

[`frontend/src/pages/reservations/ReservationsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx) shows a `신규 예약 등록` button inside the reservation workbench, and the page defines `isNewModalOpen`, `reservationCreateForm`, and `handleReservationCreateSubmit()`. However, the component never renders a second modal or any form fields for `membershipId`, `scheduleId`, or `memo`.

As a result, operators can click the create entry point, but there is no visible UI surface to complete the reservation. The page contains most of the state and mutation logic for creation, but the final entry surface is missing from the render tree.

## Findings

- [`ReservationsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx) defines `isNewModalOpen` state at line 89 and sets it to `true` from the `신규 예약 등록` button at lines 364-370.
- The same file defines `handleReservationCreateSubmit()` at lines 145-180 and validates `membershipId`, `scheduleId`, and `memo`.
- `rg` over the file shows `isNewModalOpen`, `handleReservationCreateSubmit`, and the form field names are only defined in state/handler code and never used in a rendered `<Modal>` or `<form>` subtree.
- The rendered JSX only includes the directory panel and the reservation workbench modal. There is no create-reservation modal after line 469 where the workbench modal closes.
- There is no page-level [`ReservationsPage.test.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.test.tsx), so this missing create surface is not covered by UI regression tests.

## Proposed Solutions

1. Render a dedicated create-reservation modal wired to the existing state and submit handler.
   - Pros: matches the existing page design, reuses current state/mutation logic, and closes the broken loop with minimal architectural churn.
   - Cons: still leaves the page fairly large unless the modal content is extracted.
   - Effort: medium.

2. Extract the create form into a focused child component and mount it as a modal from `ReservationsPage`.
   - Pros: improves readability and makes the create flow easier to test in isolation.
   - Cons: slightly broader refactor than the minimal fix.
   - Effort: medium.

3. Remove the `신규 예약 등록` trigger until the create surface is implemented.
   - Pros: avoids exposing a dead-end primary action to operators.
   - Cons: hides a needed workflow instead of finishing it.
   - Effort: small.

## Recommended Action


## Technical Details

- Affected page: [`frontend/src/pages/reservations/ReservationsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx)
- Create mutation hook: [`frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts)
- Membership availability source: [`frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts)

## Acceptance Criteria

- [ ] Clicking `신규 예약 등록` opens a visible modal or equivalent create surface.
- [ ] The create surface renders selectable 예약 대상 회원권, 일정, and optional 메모 inputs.
- [ ] Submitting the form calls the existing create mutation and refreshes reservations, memberships, and target counts.
- [ ] Closing the create surface resets local create-form state.
- [ ] A UI-level regression test proves the create entry point opens the rendered surface.

## Work Log

### 2026-03-20 - Review finding captured

**By:** Codex

**Actions:**
- Reviewed [`ReservationsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx) for the new-reservation flow.
- Confirmed that the page defines create state and submit logic but only renders the directory panel and workbench modal.
- Searched the file for `isNewModalOpen`, `handleReservationCreateSubmit`, `membershipId`, `scheduleId`, and `memo` usage and found no rendered create modal or form subtree.

**Learnings:**
- The create flow is not missing business logic; it is missing the final rendered entry surface.
- This kind of issue is easy to miss when hooks and handlers exist, but there is no page-level test asserting the button actually opens a form.

### 2026-03-20 - Create modal rendered and page test added

**By:** Codex

**Actions:**
- Added a dedicated create-reservation modal to [`frontend/src/pages/reservations/ReservationsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx), wired to the existing `isNewModalOpen`, `reservationCreateForm`, and `handleReservationCreateSubmit` flow.
- Rendered selectable 예약 회원권, 수업 일정, and 메모 inputs using the already-loaded memberships and schedule queries.
- Added close/reset handling so the create form is cleared when the modal closes or after a successful submit.
- Added [`frontend/src/pages/reservations/ReservationsPage.test.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.test.tsx) to verify the button opens the modal and mock-mode creation completes.

**Learnings:**
- The existing create mutation and refresh logic were already usable; the defect was confined to the render tree and missing UI coverage.
- A page-level test is the right guard here because hook tests alone cannot detect a missing modal mount.

## Resources

- [`frontend/src/pages/reservations/ReservationsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx)
- [`frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts)
- [`frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts)
