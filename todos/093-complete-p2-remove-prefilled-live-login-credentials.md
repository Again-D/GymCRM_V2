---
status: complete
priority: p2
issue_id: "093"
tags: [code-review, frontend, security, authentication, login]
dependencies: []
---

# Remove prefilled live login credentials

## Problem Statement

The live login screen ships with hard-coded default credentials already filled into the form. This is convenient for local smoke tests, but it leaks a known username/password pair into the browser UI whenever `isMockMode` is false and increases the risk of accidental reuse outside the intended local development flow.

## Findings

- `frontend/src/pages/Login.tsx:7` initializes `loginId` with `center-admin`.
- `frontend/src/pages/Login.tsx:8` initializes `password` with `dev-admin-1234!`.
- These defaults are used in the non-mock branch at `frontend/src/pages/Login.tsx:28`, so the live JWT form is rendered with credentials already populated.
- The surrounding text says the page uses the "실제 JWT 로그인 경로", which makes the prefilled secret more problematic than a mock-only preset.

## Proposed Solutions

### Option 1: Start the live login form blank

**Approach:** Initialize both fields to empty strings and leave any dev convenience guidance as plain text or placeholder text.

**Pros:**
- Safest default.
- Matches typical login UX and avoids exposing a password in the DOM.

**Cons:**
- Slightly slower for local manual verification.

**Effort:** < 30 minutes

**Risk:** Low

---

### Option 2: Gate dev defaults behind explicit mock/dev-only flags

**Approach:** Only prefill credentials when a dedicated local-only environment flag is enabled, and keep the default experience blank.

**Pros:**
- Preserves convenience for local validation when explicitly requested.
- Reduces accidental exposure in other environments.

**Cons:**
- Adds another flag to document and maintain.

**Effort:** 30-60 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `frontend/src/pages/Login.tsx`
- Optional tests in `frontend/src/App.routing.test.tsx` or a dedicated login test

**Related components:**
- JWT live login flow
- Local smoke-test documentation

**Database changes (if any):**
- Migration needed? No

## Resources

- Frontend review on 2026-03-13
- Auth UI path: `frontend/src/Login.tsx`

## Acceptance Criteria

- [ ] Live login inputs are blank by default
- [ ] No password literal is embedded in the rendered live login form by default
- [ ] If local convenience remains, it is explicitly gated to local-only behavior and documented

## Work Log

### 2026-03-13 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the live login screen initialization
- Confirmed the non-mock form renders with a default username and password
- Assessed the security and UX implications for environments beyond local development

**Learnings:**
- Development convenience values can silently become part of the live UI if they are not gated
- Mock-mode presets already provide a safer local shortcut for most frontend validation

### 2026-03-13 - Resolution

**By:** Codex

**Actions:**
- Removed the hard-coded live login defaults so the JWT login form now starts blank
- Added `frontend/src/pages/Login.test.tsx` to lock the blank-input behavior in place
- Re-ran `cd frontend && npm test`

**Learnings:**
- Live auth surfaces should default to the safest possible UI state, even for local testing
- Mock-mode runtime presets already cover most convenience needs without exposing credentials in the form
