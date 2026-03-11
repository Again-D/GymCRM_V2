---
status: complete
priority: p2
issue_id: "075"
tags: [testing, backend, isolation]
dependencies: []
---

# Isolate AccessServiceIntegrationTest from shared dev DB state

## Problem Statement

`AccessServiceIntegrationTest` fails intermittently because it relies on shared dev DB state. The test expects a single open session but observes prior rows from other runs or tests, breaking the full `./gradlew test` baseline.

## Findings

- Failure: expected open session count `1` but observed `9` in `AccessServiceIntegrationTest.activeMemberWithEligibleMembershipCanEnterAndExit`.
- Root cause: tests run against shared `gymcrm_dev` without isolation; `currentCenterId` defaults to `1` in prototype mode.
- The same failure reproduces on `main`, so it is not caused by current JPA/OpenAPI changes.

## Proposed Solutions

### Option 1: Per-test random center id

**Approach:** Use `@DynamicPropertySource` to set `app.prototype.default-center-id` to a random long per test class.

**Pros:**
- Minimal schema impact
- No cross-test interference
- Keeps production behavior intact

**Cons:**
- Requires Spring test property customization

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Hard cleanup of related tables

**Approach:** TRUNCATE/DELETE tables (`member_access_sessions`, `access_events`, related domain tables) at `@BeforeEach`.

**Pros:**
- Deterministic test isolation

**Cons:**
- Risk of interfering with other tests
- Slower test runs, requires table list maintenance

**Effort:** 1-2 hours

**Risk:** Medium

---

### Option 3: In-memory DB for this test class

**Approach:** Override datasource to H2/Testcontainers for the class.

**Pros:**
- Strong isolation

**Cons:**
- Diverges from production SQL semantics
- Higher setup cost

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

Adopt Option 2: clean center-scoped rows in `AccessServiceIntegrationTest` before and after each test to avoid shared DB interference, while keeping center id at `1` to match current service behavior.

## Acceptance Criteria

- [x] `AccessServiceIntegrationTest` passes when run alone
- [x] `./gradlew test` no longer fails due to this test
- [x] No other tests regress

## Work Log

### 2026-03-09 - Investigation and plan

**By:** Codex

**Actions:**
- Reproduced failure on worktree and on `main`
- Identified shared DB state and default center id as root cause
- Chose per-class random center id as the least invasive fix

**Learnings:**
- Shared dev DB state causes cross-test flakiness when tests depend on fixed center id

### 2026-03-09 - Fix applied

**By:** Codex

**Actions:**
- Removed `@Transactional` in `AccessServiceIntegrationTest` and added center-scoped cleanup before/after tests
- Deleted dependent rows in CRM/access/membership/payment tables in a safe order
- Re-ran `./gradlew test --tests com.gymcrm.access.AccessServiceIntegrationTest` and full `./gradlew test`

**Learnings:**
- Center-scoped cleanup is the least invasive fix while `MemberService` still hardcodes `center_id = 1`
