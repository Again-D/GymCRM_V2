---
status: complete
priority: p2
issue_id: "084"
tags: [code-review, frontend, auth, prototype]
dependencies: []
---

# Make JWT auth parity exercisable in the runtime prototype

## Problem Statement

The rebuild prototype documents JWT/prototype auth parity, but the runtime app always boots with a static prototype auth state unless a test injects an override. That means the actual running prototype cannot exercise JWT bootstrapping or authenticated/unauthenticated transitions without source edits, which weakens the value of the parity claim in PR review.

## Findings

- `frontend-rebuild/src/app/auth.tsx` originally exposed only a static context with default `securityMode: "prototype"` and a hard-coded admin user.
- `frontend-rebuild/src/main.tsx` mounts `<AuthStateProvider>` without any runtime source for auth state.
- `frontend-rebuild/src/App.tsx` had route behavior for JWT unauth/authenticated cases, but those paths were effectively test-only unless the provider was manually overridden.
- As a result, browser smoke of the running prototype did not prove real JWT parity.

## Proposed Solutions

### Option 1: Add runtime auth mode/bootstrap adapter

**Approach:** Load auth state from env or a small bootstrap module that can emulate prototype vs jwt states at runtime.

**Pros:**
- Makes parity demonstrations honest and repeatable
- Keeps App route contract testable and visible in browser smoke

**Cons:**
- More runtime wiring in the prototype
- Slightly larger scope for an experiment branch

**Effort:** Medium

**Risk:** Low-Medium

---

### Option 2: Downgrade the parity claim and document test-only scope

**Approach:** Leave code as-is, but clearly document that JWT parity is only covered by unit tests in this prototype.

**Pros:**
- No code changes
- Accurate expectations

**Cons:**
- Prototype is less convincing as a replacement candidate
- Browser validation remains weaker

**Effort:** Small

**Risk:** Medium

## Recommended Action

Implemented Option 1. The runtime prototype now has a stateful auth bootstrap adapter that can intentionally run as prototype, JWT anonymous, JWT admin, or JWT trainer without source edits. The login page and shell sidebar expose those presets directly so route parity can be exercised in a real browser session.

## Technical Details

**Affected files:**
- `frontend-rebuild/src/app/auth.tsx`
- `frontend-rebuild/src/app/auth.test.tsx`
- `frontend-rebuild/src/components/layout/DashboardLayout.tsx`
- `frontend-rebuild/src/pages/Login.tsx`
- `docs/notes/2026-03-12-frontend-rebuild-shell-validation.md`

## Resources

- **PR:** #73
- **Related docs:** `docs/notes/2026-03-12-frontend-rebuild-shell-validation.md`

## Acceptance Criteria

- [x] Runtime prototype can intentionally run in prototype or jwt mode without source edits
- [x] Browser smoke can demonstrate at least one authenticated and one unauthenticated jwt route path
- [x] Docs and tests now reflect the runtime auth preset model instead of a test-only override story

## Work Log

### 2026-03-12 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed prototype auth provider and app bootstrap wiring
- Confirmed JWT route logic exists but runtime bootstrap remains static prototype state
- Recorded follow-up to align runtime behavior with parity claims

**Learnings:**
- The prototype already has the route contract, but not a real runtime source of auth state

### 2026-03-12 - Resolution

**By:** Codex

**Actions:**
- Reworked `AuthStateProvider` into a runtime bootstrap adapter with persisted presets and query-param overrides
- Added runtime controls to `/login` and the shell sidebar for `prototype`, `jwt anonymous`, `jwt admin`, and `jwt trainer` states
- Added `src/app/auth.test.tsx` to prove query-param bootstrap and persisted preset changes
- Updated shell validation notes so the parity claim matches what the running prototype can actually demonstrate

**Learnings:**
- For a prototype, small runtime preset controls are enough to make auth parity reviewable without dragging in the full backend auth stack
