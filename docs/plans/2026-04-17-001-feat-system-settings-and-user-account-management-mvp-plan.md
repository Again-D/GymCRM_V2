---
title: "feat: System settings (center profile) + user account management (MVP)"
type: feat
status: draft
date: 2026-04-17
origin: docs/brainstorms/2026-04-15-role-admin-manager-rbac-alignment-requirements.md
---

# feat: System settings (center profile) + user account management (MVP)

## Overview

Implement two admin-only surfaces that were intentionally left as “policy buckets” during RBAC alignment:

1. **System settings (MVP): Center profile** (center name / phone / address)
2. **User account management (MVP): Staff list + operational actions** (revoke-access / role / status)

Both are center-scoped, server-enforced, and visible in the sidebar only to `ROLE_ADMIN`.

## Problem Frame

The codebase already enforces admin-only *account operations* via `/api/v1/auth/users/*` (revoke-access/role/status), but there is no user-list endpoint and no UI surface.

The database already has a `centers` table with the exact center profile fields needed, but there is no API/UI surface to view or update them.

We need concrete, repo-grounded endpoints and UI pages so “system settings” and “user account management” are real capabilities rather than documentation-only buckets.

## Requirements Trace (Origin)

- System settings (center profile): R24-R29, R39-R40
- User account management (MVP): R16-R23, R30-R38, R32-R34
- Cross-cutting RBAC enforcement: R13-R15

## Scope Boundaries

- No user onboarding/invites (deferred by R23).
- No policy-value settings (reservation rules, internal flags, security mode toggles) beyond center profile (R24).
- No multi-role user model changes.
- No cross-center super-admin console; all flows use the current center context.
- `address_detail` is deferred to a later iteration and stays out of the MVP contract.

## Context & Research (Repo-Grounded)

### Existing DB Surfaces

- `centers` table already contains `center_name`, `phone`, `address` (+ many other columns not in MVP).
  - Source: `backend/src/main/resources/db/migration/V1__init_core_tables.sql`
- `users` is already center-scoped (`center_id`) and has `user_status`, plus `user_roles` for role assignment.
  - Auth domain entity maps: `backend/src/main/java/com/gymcrm/common/auth/entity/AuthUserEntity.java`

### Existing Auth Operations (Backend)

- Already implemented (admin-only): `POST /api/v1/auth/users/{userId}/revoke-access`, `/role`, `/status`.
  - `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
- Audit events already exist and are shown in the audit UI: `ACCOUNT_ACCESS_REVOKE`, `ACCOUNT_ROLE_CHANGE`, `ACCOUNT_STATUS_CHANGE`.
  - `backend/src/main/java/com/gymcrm/common/auth/service/AuthAccessRevocationService.java`
  - `frontend/src/pages/audit/AuditLogsPage.tsx`

### Frontend Navigation Pattern

- Sidebar sections are defined by `frontend/src/app/routes.ts` and routed in `frontend/src/App.tsx`.
- Mock API mode requires entries in `frontend/src/api/mockData.ts` for new endpoints.

## Key Technical Decisions

- **Decision: Add explicit APIs for the missing surfaces.**
  - User list: new `GET /api/v1/auth/users` (admin-only, center-scoped, filter/search/page).
  - Center profile: new `GET/PATCH /api/v1/centers/me` (admin-only, center-scoped).

- **Decision: Keep existing `AccessPolicies` enforcement style.**
  - Use `@PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)` for both features.

- **Decision: Enforce governance server-side (not only UI).**
  - Center admin must not grant/revoke `ROLE_ADMIN` (R32).
  - Role change via account management is limited to `ROLE_MANAGER|ROLE_DESK|ROLE_TRAINER` for `ROLE_ADMIN` actors (R33).

## Open Questions (Resolve Before Implementation)

- No blocking questions remain for the MVP scope.

## Proposed API Contracts

### User Account Management

**List users**
- `GET /api/v1/auth/users`
- AuthZ: `PROTOTYPE_OR_ADMIN`
- Query params:
  - `q` (optional): matches userName or loginId
  - `roleCode` (optional): one of `ROLE_ADMIN|ROLE_MANAGER|ROLE_DESK|ROLE_TRAINER`
  - `userStatus` (optional): `ACTIVE|INACTIVE`
  - `page` (optional, default 1)
  - `size` (optional, default 20)
- Response (enveloped):
  - `items[]`: `userId`, `loginId`, `userName`, `roleCode`, `userStatus`, `lastLoginAt`, `accessRevokedAfter`
  - `page`: `page`, `size`, `totalItems`, `totalPages`

**Operational actions (already exist)**
- `POST /api/v1/auth/users/{userId}/revoke-access`
- `POST /api/v1/auth/users/{userId}/role` (UI offers only `ROLE_MANAGER|ROLE_DESK|ROLE_TRAINER`)
- `POST /api/v1/auth/users/{userId}/status` (ACTIVE ↔ INACTIVE)

### System Settings (Center Profile)

**Read profile**
- `GET /api/v1/centers/me`
- AuthZ: `PROTOTYPE_OR_ADMIN`
- Response: `centerId`, `centerName`, `phone`, `address`

**Update profile**
- `PATCH /api/v1/centers/me`
- AuthZ: `PROTOTYPE_OR_ADMIN`
- Request: `centerName`, `phone`, `address`
- Response: same as read profile

## Implementation Units

- [x] **Unit 1: Backend center profile API**
  - Goal: Provide `GET/PATCH /api/v1/centers/me` backed by the `centers` table.
  - Approach:
    - Create new feature package (example): `backend/src/main/java/com/gymcrm/center/`
    - Add `CenterSettingsController` with `@PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)`.
    - Implement a minimal repository layer (JPA) for `centers` table read/update by `center_id`.
    - Validate inputs as trimmed non-empty for `centerName`; normalize `phone/address` as trimmed (allow null/blank policy explicit in implementation).
  - Files (expected):
    - Add: `backend/src/main/java/com/gymcrm/center/controller/CenterSettingsController.java`
    - Add: `backend/src/main/java/com/gymcrm/center/dto/request/UpdateCenterProfileRequest.java` (record)
    - Add: `backend/src/main/java/com/gymcrm/center/dto/response/CenterProfileResponse.java` (record)
    - Add: `backend/src/main/java/com/gymcrm/center/service/CenterSettingsService.java`
    - Add: `backend/src/main/java/com/gymcrm/center/repository/CenterJpaRepository.java`
    - Add: `backend/src/main/java/com/gymcrm/center/entity/CenterEntity.java`
  - Test scenarios:
    - Admin can read profile and sees current values.
    - Admin can update centerName/phone/address and read reflects changes.
    - Non-admin (manager/trainer) gets 403 in JWT mode.
  - Tests (expected):
    - Add: `backend/src/test/java/com/gymcrm/center/CenterSettingsApiIntegrationTest.java`

- [x] **Unit 2: Backend user list API + governance hardening**
  - Goal: Add the missing list API and ensure server-side governance aligns with R32/R33.
  - Approach:
    - Add `GET /api/v1/auth/users` in `AuthController` (or a new controller under `/api/v1/auth`).
    - Implement list in `AuthUserRepository` using a paging-friendly query strategy.
      - Note: Many-to-many roles + paging needs care; prefer “IDs first then fetch roles” or a query-layer approach.
    - Add explicit enforcement:
      - Reject role change to `ROLE_ADMIN` when actor is `ROLE_ADMIN` (already enforced via `ensureRoleChangeAllowed`).
      - Additionally, for `ROLE_ADMIN` actors, reject any requestedRoleCode outside `ROLE_MANAGER|ROLE_DESK|ROLE_TRAINER` (R33) even if the regex allows it.
  - Files (expected):
    - Modify: `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
    - Modify: `backend/src/main/java/com/gymcrm/common/auth/service/AuthAccessRevocationService.java`
    - Modify: `backend/src/main/java/com/gymcrm/common/auth/repository/AuthUserRepository.java`
    - Modify: `backend/src/main/java/com/gymcrm/common/auth/repository/AuthUserJpaRepository.java`
    - Modify: `backend/src/test/java/com/gymcrm/auth/AuthControllerIntegrationTest.java`
  - Test scenarios:
    - Admin can list staff users with paging, q search, role/status filters.
    - Manager cannot access list endpoint (403).
    - Admin cannot assign `ROLE_ADMIN` via role change endpoint (403 / access denied).
    - Admin can assign `ROLE_MANAGER|ROLE_DESK|ROLE_TRAINER`.

- [x] **Unit 3: Frontend pages + sidebar navigation**
  - Goal: Provide admin-only UI surfaces and wire them to backend.
  - Approach:
    - Extend `frontend/src/app/routes.ts` `NavSectionKey` union to include `settings` and `userAccounts`.
    - Add sidebar route:
      - `/settings` label “시스템 설정” (admin-only)
      - `/user-accounts` label “사용자 계정 관리” (admin-only)
    - Implement:
      - `CenterSettingsPage`: read-only view with “수정” -> edit mode -> 저장/취소 (R39).
      - `UserAccountsPage`: table with search/filter/paging; row actions with confirmation and result feedback (R37-R38).
    - Use existing API client helpers from `frontend/src/api/client.ts`.
  - Files (expected):
    - Modify: `frontend/src/app/routes.ts`
    - Modify: `frontend/src/App.tsx`
    - Add: `frontend/src/pages/settings/CenterSettingsPage.tsx`
    - Add: `frontend/src/pages/settings/modules/types.ts`
    - Add: `frontend/src/pages/settings/modules/useCenterProfileQuery.ts`
    - Add: `frontend/src/pages/settings/modules/useUpdateCenterProfileMutation.ts`
    - Add: `frontend/src/pages/user-accounts/UserAccountsPage.tsx`
    - Add: `frontend/src/pages/user-accounts/modules/types.ts`
    - Add: `frontend/src/pages/user-accounts/modules/useUserAccountsQuery.ts`
    - Add: `frontend/src/pages/user-accounts/modules/useAccountOpsMutations.ts`
  - Test scenarios:
    - Admin sees both sidebar items; manager does not.
    - CenterSettingsPage: toggles view/edit; save updates; cancel reverts.
    - UserAccountsPage: search/filter/paging works; row actions call APIs and show success/error.

- [x] **Unit 4: Frontend mock API + tests**
  - Goal: Keep mock mode and tests stable.
  - Approach:
    - Add mock responses for:
      - `GET /api/v1/auth/users?...`
      - `GET /api/v1/centers/me`
      - `PATCH /api/v1/centers/me`
    - Add minimal tests for route gating and basic rendering.
  - Files (expected):
    - Modify: `frontend/src/api/mockData.ts`
    - Add/Modify: `frontend/src/App.routing.test.tsx` (or page tests)

- [x] **Unit 5: API documentation sync**
  - Goal: Make external contract visible and track change history.
  - Approach:
    - Update `docs/04_API_설계서.md`:
      - Add the 3 new endpoints (GET users, GET/PATCH center profile).
      - Ensure roles column matches admin-only constraint.
      - Record the change in Appendix C (version/date/author/summary).
  - Files (expected):
    - Modify: `docs/04_API_설계서.md`

## Risks & Mitigations

- **Paging with many-to-many roles can duplicate rows**
  - Mitigation: implement an ID paging query then fetch-with-roles in a second query, or use a query repository pattern for the list endpoint.

- **Prototype mode bypasses auth**
  - Mitigation: rely on JWT-mode integration tests for 403 checks; prototype mode remains “demo friendly” by design.

- **Role code drift between UI options and server enforcement**
  - Mitigation: UI restricts options to R33 set; server validates for `ROLE_ADMIN` actor and returns 403/validation error consistently.

## Verification Checklist (Implementation-Time)

- [x] Backend: new endpoints return `ApiResponse.success` envelopes and honor `@PreAuthorize`.
- [x] Backend: list endpoint supports q/filters/page and remains center-scoped.
- [x] Frontend: sidebar visibility and route access match `ROLE_ADMIN` only.
- [x] Mock mode: new pages load without “No mock response configured” errors.
- [x] Docs: `docs/04_API_설계서.md` updated + Appendix C entry added.
