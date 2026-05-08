---
title: Password Policy
type: ops
status: active
date: 2026-05-08
related: NFR-013
---

# Password Policy

## Requirement

`NFR-013`: Strong password composition rule. 90-day rotation recommendation.

## Policy Decision

**Rotation enforcement mode: soft recommendation (not forced rotation).**

Rationale: forced rotation is not required by the current compliance baseline and
creates usability friction. A soft recommendation is surfaced in the UI and API response
so operators are aware their password is overdue without being locked out mid-session.

## Composition Rule (enforced)

Implemented in `AuthAccountLifecycleService.validatePasswordPolicy()`.

- Minimum 8 characters
- At least one letter (A-Z, a-z)
- At least one digit (0-9)
- At least one special character (non-alphanumeric)

This applies on creation, reset, and change.

## 90-Day Rotation Recommendation (soft)

The `password_changed_at` column (added in V44 migration) tracks the last time a user
actively changed their password. On initial account creation or admin reset, the
`password_change_required` flag is set to `true` — the user must set their own password
before this column is stamped.

**Threshold**: 90 days (configurable via `app.security.password-rotation-reminder-days`, default 90).

**How the reminder is surfaced**:

- The `/api/v1/auth/me` and `/api/v1/auth/login` response includes a boolean field
  `passwordRotationRecommended: true` when the threshold is exceeded.
- The frontend should display a non-blocking notice prompting the user to change their password.
- No API calls are blocked. The user can dismiss the notice and continue working.

**Logic**: `AuthUser.isPasswordChangeRecommended(thresholdDays)` computes this flag
using `password_changed_at`, falling back to `last_login_at` when `password_changed_at`
is null.

## Tracking

- `password_changed_at` is stamped by `AuthUserRepository.updatePassword()` only when
  `passwordChangeRequired = false` (i.e., user-initiated change, not admin reset).
- Admin-initiated resets leave `passwordChangeRequired = true`, forcing the user to set
  their own password first, which then stamps `password_changed_at`.

## Status

- [x] Composition rule implemented
- [x] `password_changed_at` column added (V44 migration)
- [x] `AuthUser.isPasswordChangeRecommended()` method available
- [x] Policy decision documented (soft recommendation)
- [x] `passwordRotationRecommended` computed in `AuthService.UserSession`
- [ ] `AuthMeResponse` does not yet include `passwordRotationRecommended` — field is computed in `AuthService.UserSession` but omitted from the controller response DTO (`AuthController.AuthMeResponse`). Needs a deliberate decision: expose as-is, or keep server-side only.
- [ ] Frontend notice not implemented (blocked by above)

## Open Decision

`passwordRotationRecommended` is intentionally excluded from the current `AuthMeResponse`.
Before exposing it to the frontend, confirm:
1. Should the field appear in `GET /api/v1/auth/me` response only, or also in the login response?
2. Is the frontend expected to show a dismissable banner, a modal, or a passive indicator?

Until this is confirmed, the field remains internal to `AuthService.UserSession` and is not surfaced via API.
