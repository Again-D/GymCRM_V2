---
title: "feat: Add admin-assisted password recovery guidance"
type: feat
status: active
date: 2026-04-29
origin: docs/brainstorms/2026-04-29-forgot-password-admin-reset-requirements.md
---

# feat: Add admin-assisted password recovery guidance

## Overview

This plan makes the forgotten-password path explicit without adding a new self-service recovery workflow. Users who cannot log in will be directed to the existing center-admin reset process, while admins will see the recovery path called out in the user-accounts workspace and in the supporting docs. The implementation deliberately avoids backend API changes, database changes, or any new recovery-request state; it only makes the existing operational path easier to discover and support. (see origin: docs/brainstorms/2026-04-29-forgot-password-admin-reset-requirements.md)

---

## Problem Frame

The product already has the technical pieces needed for password recovery by administration: users can log in, admins can reset passwords, and the changed password still flows through the existing forced-change lifecycle.

What is missing is discoverability and support clarity:

- A user who cannot remember their password has no clear in-app guidance about what to do next.
- The admin-facing account workspace does not explicitly frame password reset as the recovery path for forgotten passwords.
- The user manual and screen definition talk about login and password change, but not the operational fallback for forgotten passwords.

The goal is to make the recovery path visible at the moment users need it, while keeping the current product boundaries intact.

---

## Requirements Trace

- R1-R3: recovery is admin-assisted, not a new in-app self-service request flow, and it reuses the existing account reset operation.
- R4-R5: the login screen should tell users to contact the center admin instead of implying a separate recovery form.
- R6-R8: the existing admin reset path remains the canonical recovery route, stays inside the current center, and does not change role boundaries.

**Origin actors:** A1 (최종 사용자), A2 (관리자 운영자), A3 (센터 지원 채널)

**Origin flows:** F1 (비밀번호 분실 후 복구 요청 전달), F2 (복구 후 재진입)

**Origin acceptance examples:** AE1 (covers R1, R3, R4, R6), AE2 (covers R2, R5, R7)

---

## Scope Boundaries

- No backend API changes.
- No database schema changes.
- No new password-recovery request queue, approval queue, or recovery status tracking.
- No email/SMS/MFA-based identity verification flow.
- No change to the existing `/my-account` password-change flow.
- No change to password policy or session invalidation behavior.

---

## Context & Research

### Relevant Code and Patterns

- `frontend/src/pages/Login.tsx`
  The login screen already has a clean split between live login and mock preset modes, which makes it the right place for a short recovery hint.
- `frontend/src/pages/Login.test.tsx`
  Existing coverage is minimal and gives a small surface for adding content-focused assertions.
- `frontend/src/pages/user-accounts/UserAccountsPage.tsx`
  The admin account workspace already contains the reset action and password-status affordances.
- `frontend/src/pages/user-accounts/UserAccountsPage.test.tsx`
  This page already has behavior tests around account creation and can absorb a copy-focused assertion without expanding scope.
- `frontend/src/pages/my-account/MyAccountPage.tsx`
  Useful as a contrast point: this is the self-service password-change surface, not the forgotten-password recovery surface.
- `docs/ops/selfhosted-staging-runbook.md`
  The existing ops runbooks show the lightweight documentation style to mirror for an operator-facing handoff note.
- `docs/07_화면_정의서.md`
  The UI spec already documents the account management and my-account surfaces and can be updated to clarify where forgotten-password recovery belongs.
- `docs/GymCRM_V2_User_Manual_Report_Ready.md`
  The operational manual already explains login, account management, and my-account; it should be the place to clarify the support fallback.

### Institutional Learnings

- `docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
  Auth and shell boundaries are easiest to keep understandable when the user-facing guidance is explicit at the point of entry.

### External References

- None needed. The repo already contains the relevant login, admin reset, and manual patterns.

---

## Key Technical Decisions

- Keep the recovery path operational rather than productized.
  The app will explain how to get help, but it will not create a new recovery object or workflow state.
- Reuse the existing admin password reset as the canonical recovery action.
  That keeps the implementation aligned with the current auth lifecycle instead of inventing a parallel path.
- Keep the login hint generic and center-scoped.
  The user should be told to contact the center admin rather than shown a hard-coded contact detail that may differ by site.
- Place the user-facing guidance on the login screen and the operator-facing guidance in the account-management workspace.
  Users should see the next step immediately; admins should see the same story where they already manage accounts.
- Add a small operator handoff note in docs/ops so support has a canonical checklist for what to verify before resetting a password.
- Keep the docs aligned with the UI copy.
  The manual and screen definition should say the same thing the interface says so support does not drift.

---

## Open Questions

### Resolved During Planning

- The recovery model is admin-assisted rather than self-service.
- The implementation will not introduce backend or database changes.
- The existing admin reset action remains the canonical recovery path.
- The login-screen copy will tell users to contact the center admin, not a specific support contact.
- A lightweight operator handoff note will live in docs/ops and define the minimal recovery checklist.

### Deferred to Implementation

- Exact wording of the login-page helper text.
- Exact wording of the user-accounts workspace note.
- Exact contents of the operator handoff checklist in docs/ops.

---

## Implementation Units

- [x] U1. **Add login-screen recovery guidance**

**Goal:** Make it obvious on the login screen that forgotten passwords are handled by the center admin rather than by a separate self-service recovery flow.

**Requirements:** R1-R5

**Dependencies:** None

**Files:**
- Modify: `frontend/src/pages/Login.tsx`
- Test: `frontend/src/pages/Login.test.tsx`

**Approach:**
- Add a short, non-interactive recovery hint near the existing login form in both live and mock modes.
- Keep the current login inputs, preset buttons, and submission behavior unchanged.
- Use language that points users to the existing center-admin reset path without implying a new request form or approval queue.

**Patterns to follow:**
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/my-account/MyAccountPage.tsx`
- `frontend/src/pages/Login.test.tsx`

**Test scenarios:**
- Happy path: the live login page renders a clear admin-assisted recovery hint near the form.
- Happy path: the mock login page shows the same recovery hint alongside the existing preset buttons.
- Edge case: the new hint does not remove, rename, or disable the existing login fields and submit button.
- Integration: login errors still surface through the existing auth error area while the recovery hint remains visible.

**Verification:**
- Users who forget their password can see the next step on the login screen without any authentication flow changes.

- [x] U2. **Make the admin reset path obvious in user accounts**

**Goal:** Surface the forgotten-password recovery path in the existing admin account workspace so operators can find it without being taught a new workflow.

**Requirements:** R1-R3, R5-R8

**Dependencies:** None

**Files:**
- Modify: `frontend/src/pages/user-accounts/UserAccountsPage.tsx`
- Test: `frontend/src/pages/user-accounts/UserAccountsPage.test.tsx`

**Approach:**
- Add a compact helper note near the account actions that frames password reset as the recovery path for forgotten passwords.
- Keep the existing reset action, table columns, and role restrictions unchanged.
- Make the note operationally useful rather than instructional fluff, so admins can recognize which action to use immediately.

**Patterns to follow:**
- `frontend/src/pages/user-accounts/UserAccountsPage.tsx`
- `frontend/src/pages/user-accounts/UserAccountsPage.test.tsx`

**Test scenarios:**
- Happy path: the user-accounts page shows a concise note that forgotten-password recovery uses the existing admin reset action.
- Happy path: the note appears alongside the existing create/reset controls for super-admin and admin users.
- Edge case: the note does not change the password-status tags, table rows, or action availability.
- Integration: the existing reset action still opens and behaves the same way, with the new copy acting only as guidance.

**Verification:**
- Admins can find the recovery path from the workspace where they already manage accounts, without introducing new workflow state.

- [x] U3. **Sync the screen definition and user manual**

**Goal:** Align the operational docs with the new recovery wording so support guidance and the product UI say the same thing.

**Requirements:** R1-R8

**Dependencies:** U1, U2

**Files:**
- Modify: `docs/07_화면_정의서.md`
- Modify: `docs/GymCRM_V2_User_Manual_Report_Ready.md`

**Approach:**
- Update the login and account-management sections so they describe admin-assisted recovery instead of a self-service forgotten-password flow.
- Clarify that `/my-account` remains the place for normal password changes, not for a forgotten-password recovery request.
- Keep the wording consistent with the new login-screen and user-accounts copy.

**Patterns to follow:**
- `docs/07_화면_정의서.md`
- `docs/GymCRM_V2_User_Manual_Report_Ready.md`

**Test expectation:** none -- documentation-only.

**Verification:**
- The screen definition and user manual match the new login and admin-reset guidance, reducing support drift.

- [x] U4. **Add an operator handoff note**

**Goal:** Give support staff a lightweight, canonical checklist for handling forgotten-password requests before they reach the reset action.

**Requirements:** R1-R8

**Dependencies:** U1, U2

**Files:**
- Add: `docs/ops/admin-assisted-password-recovery-handoff.md`

**Approach:**
- Document the minimal handoff steps an operator should follow before using the existing admin reset action.
- Keep the note short, center-scoped, and consistent with the generic login guidance.
- Focus on operational clarity, not on creating a new workflow or tracking state.

**Patterns to follow:**
- `docs/ops/selfhosted-staging-runbook.md`
- `docs/ops/staging-super-admin-bootstrap.md`

**Test expectation:** none -- documentation-only.

**Verification:**
- Support has a single place to check the forgotten-password checklist without introducing new product behavior.

---

## System-Wide Impact

- **Interaction graph:** login screen guidance points users to the existing admin reset path; the admin reset path stays in user accounts; `/my-account` remains the separate self-service password-change surface.
- **Error propagation:** no new backend errors are introduced; existing admin reset failures continue to surface through the current account-management action.
- **State lifecycle risks:** no new persisted state is added, so the main risk is guidance drift rather than data corruption.
- **API surface parity:** no new API surface is expected; the plan intentionally reuses the current reset operation.
- **Integration coverage:** the login screen and user-accounts workspace need copy-level test coverage, while the docs need a direct wording pass.
- **Support handoff:** operators also need a lightweight checklist so the recovery flow is not inferred differently across centers.
- **Unchanged invariants:** auth login, password policy, session invalidation, and the current center scope remain unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| The login hint is too subtle and users still assume self-service recovery exists | Keep the wording direct and place it where the user sees it before submitting credentials |
| Admins miss the recovery path inside the account workspace | Add a short note near the existing reset controls instead of burying the guidance in docs only |
| Support docs drift from the live UI copy | Update the screen definition and user manual in the same delivery unit |
| Operators interpret the recovery process differently across centers | Add a minimal docs/ops checklist that standardizes the handoff before reset |
| The plan accidentally expands into a new recovery workflow | Keep the scope boundary explicit: no backend, DB, queue, or status-tracking changes |

---

## Documentation / Operational Notes

- Update the login and admin-account wording in the UI and manual together so support can use the same terminology as the interface.
- The canonical recovery action stays with center admins; the app should never imply that a separate forgotten-password request is now available.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-29-forgot-password-admin-reset-requirements.md](docs/brainstorms/2026-04-29-forgot-password-admin-reset-requirements.md)
- Related code: [frontend/src/pages/Login.tsx](frontend/src/pages/Login.tsx)
- Related code: [frontend/src/pages/user-accounts/UserAccountsPage.tsx](frontend/src/pages/user-accounts/UserAccountsPage.tsx)
- Related docs: [docs/07_화면_정의서.md](docs/07_화면_정의서.md)
- Related docs: [docs/GymCRM_V2_User_Manual_Report_Ready.md](docs/GymCRM_V2_User_Manual_Report_Ready.md)
