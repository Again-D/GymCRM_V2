---
status: complete
priority: p2
issue_id: "011"
tags: [code-review, backend, auth, configuration, reliability]
dependencies: []
---

# Security Mode Bean Selection Can Break with Uppercase `APP_SECURITY_MODE`

## Problem Statement

`SecurityModeSettings` accepts `app.security.mode` case-insensitively by normalizing values (e.g. `JWT` → `jwt`), but the `CurrentUserProvider` implementations are selected via `@ConditionalOnProperty(havingValue=...)`, which matches the raw property value. If the environment sets `APP_SECURITY_MODE=JWT` or `PROTOTYPE`, the normalized settings will proceed while the conditional beans may not be created.

This creates a configuration inconsistency that can break startup (`NoSuchBeanDefinitionException` for `CurrentUserProvider`) or select the wrong runtime behavior depending on exact property casing.

## Findings

- `SecurityModeSettings` explicitly normalizes to lowercase and accepts `prototype|jwt` case-insensitively:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/SecurityModeSettings.java:12`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/SecurityModeSettings.java:32`
- `SecurityContextCurrentUserProvider` bean activation requires raw property value exactly `jwt`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/SecurityContextCurrentUserProvider.java:10`
- `PrototypeCurrentUserProvider` bean activation requires raw property value exactly `prototype`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/PrototypeCurrentUserProvider.java:8`

## Proposed Solutions

### Option 1: Remove `@ConditionalOnProperty` from providers and choose implementation explicitly (Recommended)

Use one `CurrentUserProvider` bean factory in configuration that branches on `SecurityModeSettings`.

Pros:
- Single source of truth (`SecurityModeSettings`)
- No raw-property casing mismatch

Cons:
- Slightly more wiring code

Effort: Small
Risk: Low

### Option 2: Make property matching exact and fail fast in docs/tests

Keep conditionals, but document lowercase-only and add startup tests for invalid casing.

Pros:
- Minimal code change

Cons:
- Fragile and easy to misconfigure

Effort: Small
Risk: Medium

## Recommended Action

<!-- Fill during triage -->

## Technical Details

Affected files:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/SecurityModeSettings.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/SecurityContextCurrentUserProvider.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/PrototypeCurrentUserProvider.java`

Acceptance Criteria:
- [ ] `APP_SECURITY_MODE=JWT` and `APP_SECURITY_MODE=jwt` behave identically
- [ ] `APP_SECURITY_MODE=PROTOTYPE` and `APP_SECURITY_MODE=prototype` behave identically
- [ ] Startup test covers mixed-case mode values

## Work Log

### 2026-02-24 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed Phase 5 security mode normalization and bean wiring
- Found normalization/conditional-property mismatch on mode casing
