---
status: complete
priority: p2
issue_id: "134"
tags: [backend, frontend, docs, rbac]
dependencies: []
---

# System settings and user account management MVP

## Problem Statement

The app has admin-only account operations and a center profile table, but no concrete UI or API surface for:

- viewing/updating the current center profile
- listing center staff users
- using the existing account actions from a user management screen

These capabilities are needed to turn the RBAC plan's "policy buckets" into working product surfaces.

## Findings

- `centers` already contains `center_name`, `phone`, and `address` in `backend/src/main/resources/db/migration/V1__init_core_tables.sql`.
- `AuthController` already exposes admin-only account mutation actions, but no list endpoint.
- Frontend routing only includes the existing sidebar sections; there is no settings or user account page yet.
- Mock API mode will need new entries for the added endpoints or the frontend tests/pages will fail on missing mock responses.

## Proposed Solutions

### Option 1: Add dedicated center + user-account feature slices

**Approach:** Implement a small backend feature package for center settings, extend the auth controller/service/repository for list support, then add dedicated frontend pages and mock API entries.

**Pros:**
- Matches the current repo structure and keeps changes bounded
- Makes the new capability explicit in API and UI
- Works cleanly in both JWT and mock modes

**Cons:**
- Touches backend, frontend, and docs in one delivery
- Requires careful query/paging implementation for user roles

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Implement the dedicated backend APIs, add the admin-only frontend pages and navigation, update mock data, and sync the API contract docs in the same delivery unit.

## Technical Details

Affected files are expected to include:

- backend center feature package for entity/repository/service/controller/DTOs
- `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
- `backend/src/main/java/com/gymcrm/common/auth/service/AuthAccessRevocationService.java`
- `backend/src/main/java/com/gymcrm/common/auth/repository/AuthUserRepository.java`
- `backend/src/main/java/com/gymcrm/common/auth/repository/AuthUserJpaRepository.java`
- frontend routes, `App.tsx`, new settings/user-account pages, and mock data
- `docs/04_API_설계서.md`

Database schema changes are not expected; the existing `centers` and `users` tables are intended to support the MVP.

## Resources

- Plan: `docs/plans/2026-04-17-001-feat-system-settings-and-user-account-management-mvp-plan.md`
- Reference auth controller: `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
- Reference route table: `frontend/src/app/routes.ts`

## Acceptance Criteria

- [x] Center profile can be read and patched through `/api/v1/centers/me`
- [x] Staff users can be listed through `/api/v1/auth/users`
- [x] Admin-only governance rules are enforced server-side
- [x] Sidebar and routes show the new admin-only pages
- [x] Mock mode supports the new endpoints
- [x] API docs are updated with the new contract
- [x] Tests pass for the new backend and frontend behavior

## Work Log

### 2026-04-17 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the feature plan and repo patterns for auth, routing, and query hooks
- Confirmed the center profile table already exists
- Confirmed the auth controller has admin-only mutation endpoints but no user list endpoint
- Identified frontend route and mock-data updates needed for new pages

**Learnings:**
- The implementation can stay within existing patterns without a schema migration
- User listing will need a paging-friendly query strategy because roles are many-to-many
- Mock mode needs explicit coverage for each new API route

### 2026-04-17 - Implementation Complete

**By:** Codex

**Actions:**
- Implemented center profile APIs, user list API, frontend pages, mock responses, and API docs
- Fixed the blank-search user list query so the live page no longer errors on first load
- Verified the new pages on the `5173` frontend against the refreshed `8080` backend

**Learnings:**
- The users-list query needed a blank-search-safe predicate to avoid PostgreSQL type inference issues on first load
- The live frontend must point at the refreshed backend process for the new endpoint behavior to show up

## Notes

- No dependency blockers were identified during discovery.
