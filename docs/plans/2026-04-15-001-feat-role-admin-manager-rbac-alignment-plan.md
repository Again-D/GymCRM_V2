---
title: "feat: Align ROLE_ADMIN / ROLE_MANAGER RBAC boundaries"
type: feat
status: completed
date: 2026-04-15
origin: docs/brainstorms/2026-04-15-role-admin-manager-rbac-alignment-requirements.md
---

# feat: Align ROLE_ADMIN / ROLE_MANAGER RBAC boundaries

## Overview

Introduce a center-level `ROLE_ADMIN` (gym owner/director) distinct from `ROLE_MANAGER` (vice-director/manager), and enforce admin-only access for:

- Member deletion
- System settings
- User account management

This plan aligns backend authorization, frontend role gates, and documentation so the same RBAC model is consistently enforced and explainable.

## Problem Frame

The repo currently treats `ROLE_MANAGER` as the top operational role for most center management flows (and the dev seed "center-admin" user is `ROLE_MANAGER`). The system architecture doc, however, describes an `ROLE_ADMIN` role with a matrix that makes member deletion/system settings/user account management admin-only.

We need to align implementation and docs to the clarified product intent:

- `ROLE_ADMIN`: center-level top operational role (gym owner/director)
- `ROLE_MANAGER`: operational role below admin (vice-director/manager)
- `ROLE_MANAGER` must be blocked from the three sensitive capabilities above
- `ROLE_SUPER_ADMIN` (if present) remains a separate platform/global role, not redefined here

(see origin: `docs/brainstorms/2026-04-15-role-admin-manager-rbac-alignment-requirements.md`)

## Requirements Trace

- R1-R4: Role hierarchy & shared operational baseline
- R5: Member deletion is admin-only
- R6: System settings is admin-only
- R7: User account management is admin-only
- R8-R10: Manager restrictions, including read-vs-write safety
- R11-R12: Documentation/contract alignment
- R13-R15: Role assignment rules, server-side enforcement, and center boundary

## Scope Boundaries

- Not redefining `ROLE_TRAINER` / `ROLE_DESK` semantics beyond adding `ROLE_ADMIN` parity where appropriate.
- Not switching to a true multi-role user model; current implementation stores a single role in `user_roles`.
- UI information architecture is out of scope except where necessary to enforce/communicate the new RBAC boundaries.

## Context & Research

### Stack & RBAC Patterns

**Backend**
- Spring Boot (Spring Security with method-level authorization).
- Authorization is primarily enforced via `@PreAuthorize(AccessPolicies.XXX)` on controllers.
- `AccessPolicies` uses SpEL `hasAnyRole('SUPER_ADMIN','MANAGER',...)` (Spring adds `ROLE_` prefix internally).
- JWT auth injects a single `GrantedAuthority` using the role code string (e.g., `ROLE_MANAGER`).

Relevant files:
- `backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`
- `backend/src/main/java/com/gymcrm/common/auth/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/gymcrm/common/config/OpenApiConfig.java` (documents role matrix via `x-role-matrix`)

**Frontend**
- React + TypeScript.
- Route visibility/access is controlled via `visibleRoles` / `allowedRoles` lists in `frontend/src/app/routes.ts`.
- Runtime auth state normalizes to `authUser.primaryRole` and `authUser.roles[]` (roles list is effectively single-role today).

Relevant files:
- `frontend/src/app/routes.ts`
- `frontend/src/app/auth.tsx`
- `frontend/src/app/roles.ts`

### Current Canonical Role Contract (Observed)

Backend role set actively used in code paths and validations:
- `ROLE_SUPER_ADMIN`, `ROLE_MANAGER`, `ROLE_DESK`, `ROLE_TRAINER`

Signals:
- `AccessPolicies` only references SUPER_ADMIN/MANAGER/DESK/TRAINER (no ADMIN).
- `AuthController.UpdateUserRoleRequest` regex only allows the same set (no ADMIN).
- `AuthAccessRevocationService.normalizeRoleCode` only allows the same set (no ADMIN).
- Dev/staging seeded "center-admin" user is inserted with `ROLE_MANAGER`.

Role storage:
- Roles are stored in `roles` and assigned via `user_roles`; many services use `actor.roleCode()` as the canonical runtime contract.

Relevant files:
- `backend/src/main/java/com/gymcrm/common/auth/bootstrap/DevAdminUserSeeder.java`
- `backend/src/main/java/com/gymcrm/common/auth/service/AuthAccessRevocationService.java`
- `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
- `backend/src/main/resources/db/migration/V40__remove_center_admin_role.sql` (legacy role convergence to manager)

### Documentation Signals (Most Relevant)

- `docs/02_시스템_아키텍처_설계서.md` defines `ROLE_ADMIN` and includes a matrix where:
  - Member deletion / system settings / user account management are admin-only.
- `docs/03_데이터베이스_설계서.md` role examples differ from current implementation and do not mention `ROLE_ADMIN`.

## Key Technical Decisions

- **Decision: Add `ROLE_ADMIN` as a first-class role code in storage and runtime.**
  Rationale: We must enforce admin-only capabilities server-side; relying on “manager but with hidden UI” is explicitly rejected in requirements (R14).

- **Decision: Preserve `ROLE_SUPER_ADMIN` as platform/global override, separate from center RBAC.**
  Rationale: Requirements scope explicitly avoids re-defining platform/global role semantics; implementation already treats SUPER_ADMIN as special in some services.

- **Decision: Keep current method-security pattern; extend it.**
  Rationale: Controllers already consistently use `@PreAuthorize(AccessPolicies.XXX)`. Introducing a different enforcement mechanism would increase drift.

- **Decision (assumption, confirm during implementation): Treat trainer creation/status mutation as “user account management”.**
  Rationale: Trainer management code creates and mutates `users` + `user_roles` via auth repositories; if “user account management” is admin-only, these write operations should be admin-only.

## Open Questions

### Resolved During Planning

- `ROLE_ADMIN` vs `ROLE_SUPER_ADMIN` relationship:
  - `ROLE_SUPER_ADMIN`: platform/global, can act across centers when a center is explicitly supplied (existing patterns already do this in some services).
  - `ROLE_ADMIN`: center-level top role, restricted to current center.

### Deferred to Implementation

- Exact “system settings” inventory:
  - Repo currently has no obvious `/settings` controller/routes; we must define what counts as “system settings” in the current product surface before enforcing.
- Member deletion semantics:
  - Member entity supports soft-delete fields (`is_deleted`, `deleted_at`, `deleted_by`) but there is no delete API yet. Implement behavior as soft-delete unless product clarifies hard-delete needs.
- Role assignment governance:
  - Who may grant/revoke `ROLE_ADMIN` within a center (and how bootstrap works) needs a concrete rule. At minimum, prevent self-promotion (R13).

## Implementation Units

- [x] **Unit 1: RBAC Surface Inventory + Doc Alignment**

**Goal:** Turn the three admin-only capability buckets into a concrete, repo-grounded inventory (controllers/routes/services/UI actions), and align docs accordingly.

**Requirements:** R5-R7, R10-R12, R14-R15

**Dependencies:** None

**Files:**
- Modify: `docs/02_시스템_아키텍처_설계서.md` (clarify `ROLE_SUPER_ADMIN` vs center roles; reconcile MEMBER role mention if still relevant)
- Modify: `docs/03_데이터베이스_설계서.md` (role list examples; ensure it matches actual storage and role codes)
- Modify: `docs/04_API_설계서.md` (if member deletion endpoint or account-management authorization changes affect external contract)
- Reference (origin): `docs/brainstorms/2026-04-15-role-admin-manager-rbac-alignment-requirements.md`

**Approach:**
- Identify current “user account management” endpoints (already exists under `/api/v1/auth/users/*`) and any other user-mutating endpoints (e.g., trainer creation/status).
- Confirm whether any “system settings” surface exists today; if absent, document “no-op now” and what will be gated once introduced.
- Define “member deletion” as a specific API/UI action (likely soft delete).

**Patterns to follow:**
- Keep docs consistent with actual role codes used in code and tokens (backend uses `ROLE_...` values).

**Test scenarios:**
- Test expectation: none (documentation-only unit).

**Verification:**
- A reviewer can point to a concrete list of endpoints/UI actions that constitute the three admin-only capability buckets.

- [x] **Unit 2: Add ROLE_ADMIN to Backend Role Contract (Storage + Auth + Policy Constants)**

**Goal:** Make `ROLE_ADMIN` a recognized role across storage, token/runtime, policy constants, and OpenAPI role-matrix documentation.

**Requirements:** R1-R4, R11-R12, R14

**Dependencies:** Unit 1 (doc alignment can land in parallel, but policy naming should reflect final terminology)

**Files:**
- Create: `backend/src/main/resources/db/migration/V41__add_admin_role.sql` (or next Flyway version)
- Modify: `backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`
- Modify: `backend/src/main/java/com/gymcrm/common/config/OpenApiConfig.java`
- Modify: `backend/src/main/java/com/gymcrm/common/auth/bootstrap/DevAdminUserSeeder.java`
- Modify: `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java` (request validation)
- Modify: `backend/src/main/java/com/gymcrm/common/auth/service/AuthAccessRevocationService.java` (normalize/allow list)

**Approach:**
- Insert `ROLE_ADMIN` into `roles` table via Flyway.
- Extend `AccessPolicies` to include admin in “manager-level” policies where admin should have parity (and introduce a stricter admin-only policy for the three sensitive capability buckets).
- Update `OpenApiConfig.resolveRoleMatrix` so Swagger role matrix includes `ROLE_ADMIN` in any policy where it is allowed.
- Update dev/staging seed user to reflect “owner” semantics:
  - either seed as `ROLE_ADMIN`, or add a config switch to choose seeded role (preferred if tests rely on manager seed).
- Expand role validation allow-lists to include `ROLE_ADMIN`.

**Patterns to follow:**
- Authorization consistency is `@PreAuthorize(AccessPolicies.XXX)`; keep policy strings centralized.
- Spring `hasRole('ADMIN')` maps to authority `ROLE_ADMIN`.

**Test scenarios:**
- Integration: Auth login/me returns `roleCode=ROLE_ADMIN` for seeded admin user when configured.
- Integration: Updating user role to `ROLE_ADMIN` is accepted only when actor is authorized by the governance rule (see Unit 4 governance decisions).
- Unit/Integration: OpenAPI `x-role-matrix` includes `ROLE_ADMIN` for the relevant operations in dev profile (spot-check 1-2 endpoints).

**Verification:**
- Backend can authenticate a user with `ROLE_ADMIN` and treat it as a valid authority throughout request handling.

- [x] **Unit 3: Backend Enforcement for Admin-only Capabilities**

**Goal:** Enforce server-side 403 barriers for manager on member deletion, system settings (as applicable), and user account management.

**Requirements:** R5-R9, R13-R15

**Dependencies:** Unit 2

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
- Modify: `backend/src/main/java/com/gymcrm/common/auth/service/AuthAccessRevocationService.java` (governance)
- Modify: `backend/src/main/java/com/gymcrm/trainer/service/TrainerService.java` (if trainer mutations are admin-only)
- Modify/Create: Member deletion endpoints and services
  - Modify: `backend/src/main/java/com/gymcrm/member/controller/MemberController.java`
  - Modify: `backend/src/main/java/com/gymcrm/member/service/MemberService.java`
  - Modify: `backend/src/main/java/com/gymcrm/member/repository/MemberRepository.java` (and/or query repo) as needed
- Tests:
  - Modify/Create: `backend/src/test/java/com/gymcrm/auth/RbacAuthorizationIntegrationTest.java`
  - Modify/Create: `backend/src/test/java/com/gymcrm/auth/AuthOperationalAccessRevokeIntegrationTest.java`
  - Modify/Create: `backend/src/test/java/com/gymcrm/auth/AuthControllerIntegrationTest.java`

**Approach:**
- User account management:
  - Move `/api/v1/auth/users/{userId}/revoke-access`, `/role`, `/status` to an admin-only policy.
  - Add explicit governance rules in service-level checks to prevent self-promotion and restrict who can grant/revoke `ROLE_ADMIN`.
- Member deletion:
  - Add a delete API (soft delete recommended) that sets `is_deleted=true` and records `deleted_at`/`deleted_by`.
  - Restrict this endpoint to admin-only policy.
- System settings:
  - If there are existing “settings-like” endpoints (inventory from Unit 1), apply admin-only policy.
  - If none exist, document “no-op enforcement” and keep a placeholder checklist item for when the feature lands.
- Center boundary:
  - Ensure all admin-only operations are scoped to `CurrentUserProvider.currentCenterId()` and cannot mutate other centers (R15).

**Patterns to follow:**
- Consistent error shape: 403 with `ACCESS_DENIED` (existing integration tests assert this).
- Use `CurrentUserProvider` for center/user context.

**Test scenarios:**
- Integration: `ROLE_MANAGER` calling account-management endpoints receives 403 `ACCESS_DENIED`.
- Integration: `ROLE_ADMIN` calling account-management endpoints succeeds and produces expected audit events (where applicable).
- Integration: `ROLE_MANAGER` calling member delete endpoint receives 403; `ROLE_ADMIN` succeeds.
- Integration: Cross-center attempts (when actor is not SUPER_ADMIN) are rejected.

**Verification:**
- For at least one sensitive endpoint, UI hiding is not required for security: direct API calls from a manager token are blocked.

- [x] **Unit 4: Frontend Role Gates for ROLE_ADMIN Parity + Admin-only UI Actions**

**Goal:** Ensure frontend role gates recognize `ROLE_ADMIN` and do not leak admin-only actions to managers.

**Requirements:** R10-R12, R14

**Dependencies:** Unit 2 (role exists), Unit 3 (member deletion API exists before wiring UI)

**Files:**
- Modify: `frontend/src/app/routes.ts` (include `ROLE_ADMIN` in allowed/visible roles where admin should have access)
- Modify: `frontend/src/app/auth.tsx` (update auth presets so "admin" preset uses `ROLE_ADMIN`, and add/keep a manager preset for testing)
- Modify: `frontend/src/pages/members/modules/useMemberManagementState.ts` (add admin-only delete gating when delete exists; keep existing manage gating for create/update/deactivate)
- Modify: Trainer management UI as needed (confirm scope via Unit 1 inventory)
  - Likely: `frontend/src/pages/trainers/TrainersPage.tsx` and related modules
- Tests:
  - Update/extend existing role-based tests such as:
    - `frontend/src/pages/members/modules/useMemberManagementState.test.tsx`
    - `frontend/src/app/auth.test.tsx`
    - `frontend/src/app/routes.test.ts` (if present) or add coverage adjacent to route access logic

**Approach:**
- Treat `ROLE_ADMIN` as a superset of `ROLE_MANAGER` for most operational pages.
- For admin-only actions, gate at the action level (buttons, forms) and ensure API errors are handled gracefully.
- Add/retain a manager runtime preset so role regression tests can still cover manager behavior.

**Patterns to follow:**
- Route access: `allowedRoles` / `visibleRoles` checked through `hasAnyRole`.
- Prefer consistent role checks through `frontend/src/app/roles.ts`.

**Test scenarios:**
- Unit/UI: `ROLE_ADMIN` can access routes that manager can (parity).
- Unit/UI: `ROLE_MANAGER` cannot see/trigger member deletion action (once introduced).
- Unit/UI: `ROLE_MANAGER` cannot access user account management UI surfaces (if/when present).

**Verification:**
- A user logged in as manager can navigate operational pages but does not see admin-only destructive actions.

- [x] **Unit 5: Fixtures + Integration Test Matrix for ADMIN vs MANAGER**

**Goal:** Update seeded identities and tests so the repo has explicit coverage for ADMIN-vs-MANAGER boundaries.

**Requirements:** R5-R9, R13-R15

**Dependencies:** Units 2-4

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/common/auth/bootstrap/DevAdminUserSeeder.java`
- Modify/Create: `backend/src/test/java/com/gymcrm/auth/RbacAuthorizationIntegrationTest.java`
- Modify/Create: `backend/src/test/java/com/gymcrm/auth/AuthOperationalAccessRevokeIntegrationTest.java`
- Modify/Create: other integration tests that currently assume "center-admin" is `ROLE_MANAGER` (search: role assertions in tests)
- Modify: `frontend/src/app/auth.tsx` and related tests to include both admin and manager presets

**Approach:**
- Ensure tests have two distinct actors:
  - an `ROLE_ADMIN` actor (owner)
  - an `ROLE_MANAGER` actor (manager)
- Keep SUPER_ADMIN behavior unchanged; add explicit tests only where it intersects with new governance rules.

**Test scenarios:**
- Integration: manager forbidden on admin-only endpoints, admin allowed (account mgmt and member deletion).
- Integration: manager can still perform existing non-sensitive operational flows (characterization to avoid accidental breakage).
- Integration: governance: manager cannot self-promote to admin; admin cannot self-promote to super admin; only allowed actors can assign roles per defined rule.

**Verification:**
- CI/local runs exercise both roles with clear pass/fail outcomes tied to the new boundaries.

## System-Wide Impact

- **Auth contract surfaces:** JWT claims provide a single role authority; adding `ROLE_ADMIN` impacts:
  - backend role validation allow-lists
  - frontend route gating lists
  - dev seed identities used in tests and local runs
- **Error propagation:** 403 `ACCESS_DENIED` must remain consistent across UI and direct API calls.
- **Center boundary risks:** Ensure admin-only operations remain center-scoped; only SUPER_ADMIN may legitimately cross center boundaries (existing pattern uses explicit `centerId` in some services).
- **Documentation drift risk:** docs currently differ on role names (`ROLE_MEMBER` mentioned in architecture doc vs actual frontend/backend roles). The plan explicitly includes doc reconciliation.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Ambiguity in “user account management” scope (trainer management, role/status changes, invitations) | Inventory in Unit 1, and explicitly gate write operations first; keep read-only access separate |
| Existing tests assume seeded "center-admin" is `ROLE_MANAGER` | Add separate admin and manager fixtures/presets; avoid brittle coupling to one seed identity |
| Introducing `ROLE_ADMIN` without consistent policy constants leads to drift | Centralize via `AccessPolicies` + keep OpenAPI role matrix in sync |
| System settings surface is not yet implemented | Treat as inventory + placeholder enforcement checklist; do not invent new product surfaces during RBAC alignment |

## Documentation / Operational Notes

- Update role definitions and access matrix in docs to match the clarified center role hierarchy and the actual runtime role codes.
- If a new member deletion endpoint is added, update `docs/04_API_설계서.md` and record change history as required by AGENTS.md rules.

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-15-role-admin-manager-rbac-alignment-requirements.md`
- Related docs:
  - `docs/02_시스템_아키텍처_설계서.md`
  - `docs/03_데이터베이스_설계서.md`
- Backend patterns:
  - `backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`
  - `backend/src/main/java/com/gymcrm/common/auth/JwtAuthenticationFilter.java`
  - `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
  - `backend/src/main/java/com/gymcrm/common/auth/service/AuthAccessRevocationService.java`
  - `backend/src/main/java/com/gymcrm/common/auth/bootstrap/DevAdminUserSeeder.java`
  - `backend/src/main/resources/db/migration/V40__remove_center_admin_role.sql`
- Frontend patterns:
  - `frontend/src/app/routes.ts`
  - `frontend/src/app/auth.tsx`
  - `frontend/src/app/roles.ts`
