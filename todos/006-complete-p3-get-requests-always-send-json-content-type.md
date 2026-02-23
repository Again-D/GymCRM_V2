---
status: complete
priority: p3
issue_id: "006"
tags: [code-review, frontend, performance, network]
dependencies: []
---

# GET Requests Always Send JSON Content-Type

The shared API client attaches `Content-Type: application/json` to all requests, including `GET` requests.

## Problem Statement

Adding `Content-Type: application/json` to `GET` requests is unnecessary and makes cross-origin development requests non-simple, which can trigger extra CORS preflight requests. The app currently works because backend CORS is configured, but this increases network chatter and tightens coupling between frontend and backend dev setup.

## Findings

- `request()` unconditionally sets `"Content-Type": "application/json"` in default headers.
- `apiGet()` delegates to `request()` without overriding headers, so all list/detail GETs include that header.
- Affected location:
  - `frontend/src/shared/api/client.ts:33`

## Proposed Solutions

### Option 1: Set `Content-Type` only when a JSON body is present (Recommended)

**Approach:** Build headers conditionally in `request()` (or in `apiPost/apiPatch`) and omit `Content-Type` for GET requests.

**Pros:**
- Reduces unnecessary preflights in cross-origin dev mode
- More correct HTTP semantics
- Minimal code change

**Cons:**
- Slight header-building logic increase

**Effort:** 15-30 minutes

**Risk:** Low

---

### Option 2: Move content-type responsibility into method-specific helpers

**Approach:** `apiPost/apiPatch` set JSON headers; `apiGet` leaves headers empty.

**Pros:**
- Clear method-level behavior
- Easy to extend for `multipart/form-data`

**Cons:**
- Slight duplication across helpers

**Effort:** 20-40 minutes

**Risk:** Low

## Recommended Action
Completed by building request headers conditionally: `Content-Type: application/json` is now added only when a request body is present and no content-type is already specified.

## Technical Details

**Affected files:**
- `frontend/src/shared/api/client.ts`

**Related components:**
- Member/product list/detail requests (`GET /api/v1/members`, `GET /api/v1/products`)
- CORS behavior during local frontend-to-backend development

**Database changes (if any):**
- No

## Resources

- **Review context:** Local code review after CORS fix for P2-6 UI validation

## Acceptance Criteria

- [x] `apiGet()` requests no longer send `Content-Type: application/json` by default
- [x] `apiPost()` / `apiPatch()` continue sending JSON body and correct content-type
- [x] Member/product UI list/detail/create/update flows still work after header change

## Work Log

### 2026-02-23 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed shared frontend API client after CORS-related UI validation
- Identified unconditional JSON content-type header on all methods
- Documented low-risk remediation options

**Learnings:**
- Cross-origin dev setups are more sensitive to unnecessary headers because they expand preflight requirements

### 2026-02-23 - Fix Implemented

**By:** Codex

**Actions:**
- Updated `frontend/src/shared/api/client.ts` to build `Headers` from `init.headers`
- Added conditional `Content-Type` assignment only when `init.body` exists
- Preserved caller-provided content-type precedence
- Ran `npm run build` in `frontend/` successfully

**Learnings:**
- Using `Headers` normalizes header merging logic and avoids accidental method-wide defaults on `GET` requests

## Notes

- Low-severity optimization/correctness improvement; current functionality is not blocked.
