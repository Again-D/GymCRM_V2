---
title: Sprint 2 Core Ops Flow Execution Plan
type: feat
status: draft
date: 2026-05-08
origin: docs/plans/2026-05-08-002-feat-sprint2-core-ops-flow-plan.md
---

# Sprint 2 Core Ops Flow Execution Plan

## Overview

This plan breaks Sprint 2 into concrete execution tickets that can be implemented and reviewed incrementally.

Goal:
- keep Sprint 2 aligned with the core-ops flow plan
- sequence the work around the most sensitive contracts first
- preserve Sprint 1 security/compliance decisions while closing day-to-day operator gaps

## Ticket 1: Finalize Member Registration Required Fields

**Related items**
- `FR-MBR-001`
- Sprint 2 `U1`

**Problem**
- Member registration still misses required capture fields in the end-to-end create/edit flow.

**Work**
- Add required member registration fields to backend DTOs, validation, persistence mapping, and detail responses.
- Extend the existing member modal state and form rendering without splitting the workflow into a new screen.
- Preserve duplicate-contact validation and selected-member refresh behavior.

**Done when**
- Required member registration fields round-trip through create, read, and edit flows.
- Existing duplicate-phone safeguards still work without regressions.

**Validation**
- Backend tests for required field validation and duplicate-contact behavior.
- Frontend tests for form validation, submit flow, and selected-member refresh.

## Ticket 2: Choose and Implement the QR Bootstrap Contract

**Related items**
- `FR-ACC-001`
- Sprint 2 `U2`

**Problem**
- The member QR page cannot be implemented safely until the bootstrap contract for member-scoped access is fixed.

**Work**
- Choose the narrow QR bootstrap approach for this sprint, such as a signed access link or one-time token.
- Define the backend request/response contract that turns that bootstrap into QR issuance/refresh capability.
- Record the chosen contract in the API-facing docs if the endpoint shape changes.

**Done when**
- The team has one explicit QR bootstrap contract for Sprint 2.
- The chosen contract is strong enough to avoid introducing full member login/session scope.

**Validation**
- Contract-level backend tests for bootstrap success, invalid bootstrap, and expired bootstrap cases.
- API doc update if request/response shapes or endpoint rules change.

## Ticket 3: Implement the Member QR Page and Refresh Cycle

**Related items**
- `FR-ACC-001`
- `FR-ACC-003`
- `FR-ACC-004`
- Sprint 2 `U2`

**Problem**
- QR issuance exists, but members still lack a dedicated mobile-friendly QR page with a safe refresh lifecycle.

**Work**
- Add the dedicated member QR route and page.
- Reuse the current QR token service and TTL ceiling for display, expiry countdown, and refresh.
- Keep expired or invalid QR states visible as clear retry/error states rather than stale valid-looking views.

**Done when**
- A member can open the QR page, see a valid QR, and refresh it before expiry.
- The page never presents an expired token as currently valid.

**Validation**
- Backend QR token lifecycle tests.
- Frontend tests for initial load, countdown, refresh, expired-state handling, and phone-sized rendering.

## Ticket 4: Surface Access Alerts in the Operator Workflow

**Related items**
- `FR-ACC-005`
- Sprint 2 `U3`

**Problem**
- Access denial and abnormal-access signals exist, but they are not yet shaped as an operator-readable workflow.

**Work**
- Add an alert summary surface to the existing access page using current presence/events/alerts data.
- Highlight repeated-denial and attention-required states without introducing a second dashboard.
- Fail softly so alert issues do not break the rest of the access page.

**Done when**
- Operators can identify abnormal access at a glance from the current access workspace.
- Empty or temporarily unavailable alert data does not degrade the rest of the page.

**Validation**
- Frontend tests for alert rendering, empty states, and fetch-failure behavior.
- Manual verification that alert summary stays in sync with page refresh.

## Ticket 5: Lock the Reservation Policy Source of Truth

**Related items**
- `FR-RSV-004`
- `FR-RSV-005`
- `FR-RSV-006`
- `FR-RSV-009`
- Sprint 2 `U4`

**Problem**
- Waitlist promotion, cancellation cutoff, deduction timing, and reminder timing cannot be implemented cleanly until their source of truth is fixed.

**Work**
- Define the backend-owned source of truth for reservation policy values per center.
- Choose whether the first implementation reads persisted center config or documented backend defaults.
- Ensure the browser only receives resolved values and does not own policy constants.

**Done when**
- Reservation policy values have one explicit backend source of truth.
- API/service/UI responsibilities for policy resolution are unambiguous.

**Validation**
- Backend tests for resolved policy values by center.
- API contract review if resolved policy fields are exposed to the frontend.

## Ticket 6: Implement Waitlist Promotion and Cancellation Policy

**Related items**
- `FR-RSV-004`
- `FR-RSV-005`
- `FR-RSV-006`
- Sprint 2 `U4`

**Problem**
- GX reservation policy is incomplete until full classes, cancellation rules, and waitlist promotion become deterministic state transitions.

**Work**
- Add explicit waitlist and auto-promotion behavior to the reservation service layer.
- Apply cancellation cutoff logic using backend-resolved policy values.
- Preserve the current reservation lock semantics so simultaneous actions do not oversubscribe capacity.

**Done when**
- A GX cancellation can deterministically promote the next eligible waitlisted member.
- Cancellation after the cutoff follows the agreed backend policy and surfaces the expected business outcome.

**Validation**
- Integration tests for full-class waitlisting, cancellation, promotion, and race-sensitive flows.
- Error-path tests for promotion or enqueue failures.

## Ticket 7: Implement Deduction Timing and Reminder Dispatch Policy

**Related items**
- `FR-RSV-003`
- `FR-RSV-009`
- Sprint 2 `U4`

**Problem**
- PT/GX reservation lifecycle is not closed until deduction timing and reminder dispatch behavior are explicit and testable.

**Work**
- Implement deduction timing as backend policy, preserving current completion-time behavior unless center policy says otherwise.
- Reuse the current CRM queue and message history path for reminder dispatch and reservation-related notifications.
- Keep policy failures controlled and auditable rather than silently partial.

**Done when**
- PT deduction timing is explicit, center-scoped, and free of double-deduction regressions.
- Reminder dispatch records are created through the existing CRM path when policy requires them.

**Validation**
- Backend integration tests for deduction timing behavior and CRM enqueue side effects.
- Verification that reminder dispatch remains center-scoped and consistent with reservation state transitions.

## Ticket 8: Align the Reservation Workspace UX with Policy State

**Related items**
- `FR-RSV-004`
- `FR-RSV-005`
- `FR-RSV-006`
- `FR-RSV-009`
- Sprint 2 `U5`

**Problem**
- Backend reservation policy can land correctly while the reservation workspace still hides the policy state from desk operators.

**Work**
- Add UI labels and state surfaces for waitlist, cancellation cutoff, deduction timing, and reminder outcome.
- Keep the reservation page centered on the existing member-context workflow.
- Render backend-resolved policy state without duplicating policy rules in the browser.

**Done when**
- Desk staff can see the current reservation policy state from the existing reservation workspace.
- PT/GX flows still work from member context after the new policy surfaces are added.

**Validation**
- Frontend tests for waitlist state, cutoff messaging, policy-related errors, and state refresh.
- Manual verification that selected-member context survives reservation state transitions.

## Suggested Execution Order

1. Ticket 1: Finalize Member Registration Required Fields
2. Ticket 2: Choose and Implement the QR Bootstrap Contract
3. Ticket 3: Implement the Member QR Page and Refresh Cycle
4. Ticket 4: Surface Access Alerts in the Operator Workflow
5. Ticket 5: Lock the Reservation Policy Source of Truth
6. Ticket 6: Implement Waitlist Promotion and Cancellation Policy
7. Ticket 7: Implement Deduction Timing and Reminder Dispatch Policy
8. Ticket 8: Align the Reservation Workspace UX with Policy State

## Sprint Completion Criteria

- Member registration required fields are complete without dragging member photo scope into Sprint 2.
- Member QR bootstrap and refresh behavior are explicit, safe, and mobile-usable.
- Access alerts are actionable from the current access workspace.
- Reservation policy values, waitlist transitions, cancellation handling, deduction timing, and reminder dispatch are all backend-owned and visible in the UI.
- Any API contract changes are reflected in `docs/04_API_설계서.md`.

## Cross-Cutting Checks

- Keep center scoping and existing RBAC intact on every new API surface.
- Keep QR bootstrap and QR token lifecycle security-sensitive and explicitly tested.
- Keep backend and frontend DTOs aligned when new member or reservation policy fields are introduced.
- Update `docs/07_화면_정의서.md` if the member QR route, access alert summary, or reservation policy states materially change visible behavior.
- Prefer characterization coverage before extending member, access, and reservation flows that already exist.
