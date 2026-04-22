---
title: "feat: Auto-generate locker codes from zone + number and add batch locker registration"
type: feat
status: completed
date: 2026-04-22
origin: docs/01_요구사항_분석서.md
---

# feat: Auto-generate locker codes from zone + number and add batch locker registration

## Overview

This plan records the locker registration update that moved locker creation away from client-entered `lockerCode` values and into server-generated codes derived from `lockerZone + lockerNumber`. The same delivery also added a batch registration flow in the locker workspace so operators can register multiple slots from one modal instead of creating them one by one. (see origin: `docs/01_요구사항_분석서.md`)

The implementation keeps the existing locker assignment and return flows intact. The only contract shift is how new locker slots are created and how the front-end surfaces that creation workflow.

## Problem Frame

Before this change, the locker domain had backend support for creating slots, but the front-end had no registration surface and the code field itself was still treated as a free-form input. That left three gaps:

- Operators had no in-app registration experience for new locker inventory.
- Locker codes could drift from the intended business naming convention if the client supplied them manually.
- Batch onboarding of a new locker area required repetitive single-row creation, which is slow and error-prone.

The new behavior resolves those gaps by making `lockerZone` and `lockerNumber` the authoritative creation inputs and by generating the final code server-side.

## Requirements Trace

- FR-LKR-001: locker inventory visibility remains the primary read surface for the locker workspace.
- FR-LKR-002: locker assignment continues to use existing available slot selection.
- FR-LKR-006: locker zone and grade remain first-class classification fields.
- FR-LKR-007: operators can register lockers by entering zone and number, the system auto-generates the code, and batch registration is supported.

## Scope Boundaries

- No new locker-code pattern validator was added beyond the generated `ZONE-NN` format.
- No schema redesign was introduced; the existing locker slot storage model remains the source of truth.
- No additional locker lifecycle features were added, such as key-loss handling, pricing automation, or expiry management.
- The assignment and return flows were not reworked beyond consuming the newly created slots.

## Context & Research

### Relevant Code and Patterns

- `backend/src/main/java/com/gymcrm/locker/LockerController.java`
  Locker endpoints already live under `/api/v1/lockers`, so the new create and batch routes could stay on the same surface.
- `backend/src/main/java/com/gymcrm/locker/LockerService.java`
  Business logic already sits behind a thin controller, which made it the right place to normalize zone/number inputs and build the final locker code.
- `backend/src/main/java/com/gymcrm/locker/LockerSlotRepository.java`
  Slot persistence already enforces center-scoped uniqueness on locker code, so server-side generation needed to preserve that contract.
- `frontend/src/pages/lockers/LockersPage.tsx`
  The lockers page already owns the read surface and assignment modal, making it the natural place for a registration modal.
- `frontend/src/pages/lockers/modules/useLockerPrototypeState.ts`
  Workspace state already centralizes locker mutations, so batch registration logic can live beside assignment and return handlers.
- `frontend/src/api/mockData.ts`
  Mock mode already simulates locker reads and mutations, so the same registration flow needed a mock-path mirror.
- `docs/04_API_설계서.md`
  The locker API contract had to be updated alongside implementation so the new batch endpoint and auto-generation rule are explicit.

### Institutional Learnings

- `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`
  Contract changes and implementation should be updated together, or the next delivery inherits drift.
- `docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
  Workspace actions are safer when the shell state and local action state are explicit rather than implied.

### External References

- None required. The repo already had enough locker and API patterns to implement this safely without additional outside research.

## Key Technical Decisions

- Generate `lockerCode` on the backend from `lockerZone` plus `lockerNumber`.
  This keeps the database as the canonical store for the final code and prevents client-side drift.
- Normalize `lockerZone` to uppercase.
  That keeps code generation stable and makes filtering consistent with the existing locker list behavior.
- Use a two-digit number format for numbers below 100.
  This preserves readable codes such as `A-01` while still allowing larger numbers to stay numeric.
- Support batch registration as an atomic operation.
  If one row is invalid, the whole submission fails so operators do not end up with partial inventory.
- Keep mock mode behavior aligned with live mode.
  The front-end uses the same shape and error semantics in both modes, which keeps the workspace testable.
- Treat docs updates as part of the same delivery.
  The requirements analysis and API spec now describe the same creation contract as the code.

## Implementation Units

- [x] **Unit 1: Move locker creation to zone + number inputs and generate codes server-side**

  **Goal:** Replace client-entered locker codes with server-generated codes derived from locker zone and number, while preserving the existing create slot API surface.

  **Requirements:** FR-LKR-007

  **Dependencies:** None

  **Files:**
  - Modify: `backend/src/main/java/com/gymcrm/locker/LockerController.java`
  - Modify: `backend/src/main/java/com/gymcrm/locker/LockerService.java`
  - Modify: `backend/src/test/java/com/gymcrm/locker/LockerServiceIntegrationTest.java`
  - Add: `backend/src/test/java/com/gymcrm/locker/LockerApiIntegrationTest.java`

  **Approach:**
  - Change the create request DTO to accept `lockerZone` and `lockerNumber` instead of `lockerCode`.
  - Build the final locker code in the service layer so the client never supplies it directly.
  - Keep the existing single-create path, but reuse the batch normalization logic so the contract stays consistent.
  - Add a batch endpoint that accepts `items[]` and returns all created slots in one response.

  **Patterns to follow:**
  - `backend/src/main/java/com/gymcrm/locker/LockerController.java`
  - `backend/src/main/java/com/gymcrm/locker/LockerService.java`
  - `backend/src/main/java/com/gymcrm/locker/LockerSlotRepository.java`

  **Test scenarios:**
  - Happy path: a single create request generates `ZONE-NN` code server-side.
  - Happy path: batch create returns the created slots in request order.
  - Edge case: locker zone is normalized to uppercase before persistence.
  - Edge case: locker number below 100 is zero-padded to two digits.
  - Error path: invalid or empty zone/number fails the whole batch.
  - Integration: list queries return the generated locker code through the root `/api/v1/lockers` path.

  **Verification:**
  - Locker creation no longer depends on client-entered locker codes, and the persisted record always has a generated code.

- [x] **Unit 2: Add the front-end locker registration modal and batch mutation state**

  **Goal:** Let operators register lockers from the locker page through an editable multi-row modal.

  **Requirements:** FR-LKR-007

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `frontend/src/pages/lockers/LockersPage.tsx`
  - Modify: `frontend/src/pages/lockers/modules/useLockerPrototypeState.ts`
  - Modify: `frontend/src/pages/lockers/modules/types.ts`
  - Modify: `frontend/src/pages/lockers/modules/useLockerPrototypeState.test.tsx`

  **Approach:**
  - Add a dedicated registration modal beside the existing assignment modal.
  - Store batch rows in workspace-local state and expose row add/update/remove helpers from the hook.
  - Preview the generated locker code per row so operators can verify the final value before submit.
  - Keep the modal submission path aligned with the live API and the mock API.

  **Patterns to follow:**
  - `frontend/src/pages/lockers/LockersPage.tsx`
  - `frontend/src/pages/lockers/modules/useLockerPrototypeState.ts`
  - `frontend/src/pages/members/modules/useMemberListState.ts`

  **Test scenarios:**
  - Happy path: a valid row set submits successfully and surfaces the success message.
  - Edge case: adding and removing rows preserves a minimum of one editable row.
  - Error path: any invalid row blocks the batch submit.
  - Error path: duplicate generated codes inside the same modal are rejected.
  - Integration: the batch mutation invalidates the locker queries after success.

  **Verification:**
  - The locker page can create multiple slots without leaving the screen, and the generated code is visible before submission.

- [x] **Unit 3: Mirror the new locker registration flow in mock mode and tests**

  **Goal:** Keep mock mode and test coverage aligned with the live locker creation contract.

  **Requirements:** FR-LKR-007

  **Dependencies:** Unit 1 and Unit 2

  **Files:**
  - Modify: `frontend/src/api/mockData.ts`
  - Modify: `frontend/src/pages/lockers/modules/useLockerQueries.test.tsx`
  - Modify: `frontend/src/pages/lockers/modules/useLockerPrototypeState.test.tsx`

  **Approach:**
  - Add mock handlers for single create and batch create on `/api/v1/lockers` and `/api/v1/lockers/batch`.
  - Generate locker codes in mock mode with the same zone/number rule as live mode.
  - Keep mock data reset behavior deterministic so the tests stay stable across runs.

  **Patterns to follow:**
  - `frontend/src/api/mockData.ts`
  - `frontend/src/pages/lockers/modules/useLockerPrototypeState.test.tsx`

  **Test scenarios:**
  - Happy path: mock batch create returns created slots and a success message.
  - Edge case: mock create rejects duplicate generated codes in the same payload.
  - Error path: mock create rejects blank zone or invalid number inputs.
  - Integration: the live-mode test stubs fetch against `/api/v1/lockers/batch`.

  **Verification:**
  - Mock mode and live mode both speak the same locker registration contract, so the page behaves consistently during tests and local development.

- [x] **Unit 4: Sync requirements and API documentation with the new contract**

  **Goal:** Record the new locker registration behavior in the requirements analysis and API spec.

  **Requirements:** FR-LKR-007

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `docs/01_요구사항_분석서.md`
  - Modify: `docs/04_API_설계서.md`

  **Approach:**
  - Add a functional requirement for locker registration and batch entry.
  - Update the locker API table to describe server-generated codes and the batch registration endpoint.
  - Record the contract change in the API appendix so future changes can be tracked.

  **Patterns to follow:**
  - `docs/04_API_설계서.md`
  - `docs/01_요구사항_분석서.md`

  **Test scenarios:**
  - Documentation-only unit; no runtime test needed.

  **Verification:**
  - The requirements doc, API doc, and implementation all describe the same locker registration workflow.

## Validation

- Frontend tests passed for locker query and locker prototype state behavior.
- Frontend production build passed.
- Backend integration tests passed for the locker service and API routes.

## Change Log

- 2026-04-22: Completed implementation record for locker zone/number auto-generation, batch registration, mock parity, and documentation sync.
