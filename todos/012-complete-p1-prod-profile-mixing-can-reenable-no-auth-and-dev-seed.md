---
status: complete
priority: p1
issue_id: "012"
tags: [code-review, backend, security, configuration, operations]
dependencies: []
---

# Mixed `prod` + `dev/staging` Profiles Can Re-enable no-auth and Dev Admin Seed

## Problem Statement

Phase 5 intends `no-auth` and dev admin auto-seeding to be limited to `dev/staging` only, but both checks currently use `anyMatch(dev|staging)` semantics. If a deployment is misconfigured with mixed active profiles (e.g. `prod,dev`) and an override re-enables prototype no-auth, the guard passes and startup does not fail. The same mixed-profile setup can also allow dev admin seed execution in a production-like environment.

This is a production-footgun because it weakens previously established safety guarantees under realistic profile misconfiguration scenarios.

## Findings

- `PrototypeModeGuard` only checks `isNoAuthAllowedProfileActive()` and does not fail when `prod` is also active:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/PrototypeModeGuard.java:27`
- `PrototypeModeSettings.isNoAuthAllowedProfileActive()` returns true if **any** active profile is `dev` or `staging`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/PrototypeModeSettings.java:33`
- `PrototypeModeSettings` already has `isProdProfileActive()`, but the guard does not combine it:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/PrototypeModeSettings.java:29`
- `DevAdminUserSeeder` uses the same `anyMatch(dev|staging)` logic and can seed if mixed profiles include `dev`/`staging`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/bootstrap/DevAdminUserSeeder.java:61`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/bootstrap/DevAdminUserSeeder.java:105`

## Proposed Solutions

### Option 1: Treat `prod` as exclusive deny (Recommended)

Block no-auth and dev seeding whenever `prod` is active, even if `dev/staging` is also active.

Pros:
- Restores strong production guardrails
- Minimal code change

Cons:
- Mixed profiles that currently “work” will fail fast (intended)

Effort: Small
Risk: Low

### Option 2: Enforce exact allowed profile set

Require active profiles to be a subset of `{dev,staging}` for these features.

Pros:
- Strict and explicit

Cons:
- More logic and more edge cases (custom local profiles)

Effort: Small-Medium
Risk: Low

## Recommended Action

<!-- Fill during triage -->

## Technical Details

Affected files:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/PrototypeModeGuard.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/PrototypeModeSettings.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/bootstrap/DevAdminUserSeeder.java`

Acceptance Criteria:
- [ ] `prod` active profile present + `APP_PROTOTYPE_NO_AUTH_ENABLED=true` always fails startup (even with `dev`/`staging` also active)
- [ ] `prod` active profile present prevents dev admin seed execution
- [ ] Regression tests cover mixed-profile cases (`prod,dev`)

## Work Log

### 2026-02-24 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed profile gating logic for no-auth guard and dev admin seeding
- Confirmed both features use `anyMatch(dev|staging)` and do not explicitly deny `prod`
