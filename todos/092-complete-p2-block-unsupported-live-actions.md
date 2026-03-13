---
status: complete
priority: p2
issue_id: "092"
tags: [code-review, frontend, authorization, ui, live-mode]
dependencies: []
---

# Block unsupported live actions in read-only or unsupported workspaces

## Problem Statement

Several frontend workspaces correctly render "unsupported role" messaging, but still leave interactive controls that can call live APIs. That means a trainer or other unsupported user can trigger requests through secondary paths like `조회` or `초기화`, which produces avoidable 403/error noise and contradicts the page-level access messaging.

## Findings

- `frontend/src/pages/products/ProductsPage.tsx:125` renders a live products form for all roles, and `onSubmit` at `frontend/src/pages/products/ProductsPage.tsx:127` still calls `loadProducts(productFilters)` even when `canReadLiveProducts` is false.
- `frontend/src/pages/products/ProductsPage.tsx:170` also leaves the `초기화` button active and it directly calls `loadProducts(nextFilters)` at `frontend/src/pages/products/ProductsPage.tsx:177`.
- `frontend/src/pages/crm/CrmPage.tsx:182` leaves the CRM `초기화` button active even when the page already states the role is unsupported; clicking it still calls `reloadHistory(nextFilters)` at `frontend/src/pages/crm/CrmPage.tsx:189`.
- Existing page tests only verify that the unsupported note is shown; they do not verify that no live request can be triggered from the remaining controls.

## Proposed Solutions

### Option 1: Disable unsupported controls at the page level

**Approach:** Add `disabled={!isLiveRoleSupported}` or `disabled={!canReadLiveProducts}` to all submit/reset controls and return early from handlers when the role is unsupported.

**Pros:**
- Smallest and clearest change.
- Matches the messaging already shown to users.

**Cons:**
- Requires auditing each page for secondary action paths.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Centralize role guards inside query/reload helpers

**Approach:** Make page-level `reloadHistory`, `loadProducts`, or equivalent wrapper helpers short-circuit when live access is unsupported.

**Pros:**
- Prevents mistakes if a button forgets its `disabled` prop.
- Keeps authorization behavior close to the effect/action orchestration.

**Cons:**
- Slightly less visible than button-level guards.
- Still worth keeping UI disabled for clarity.

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `frontend/src/pages/products/ProductsPage.tsx`
- `frontend/src/pages/crm/CrmPage.tsx`
- Related tests in `frontend/src/pages/products/ProductsPage.test.tsx` and `frontend/src/pages/crm/CrmPage.test.tsx`

**Related components:**
- Role-gated live product read surface
- Role-gated CRM history surface

**Database changes (if any):**
- Migration needed? No

## Resources

- Frontend review on 2026-03-13
- Test command: `cd frontend && npm test`

## Acceptance Criteria

- [ ] Unsupported roles cannot trigger live requests from products or CRM pages via visible controls
- [ ] Read-only/unsupported messaging matches actual control behavior
- [ ] Regression tests verify that unsupported-role actions do not call `fetch`

## Work Log

### 2026-03-13 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed live role gating in products and CRM pages
- Traced submit/reset button paths that still call query loaders while the page says access is unsupported
- Confirmed current tests do not cover these bypass paths

**Learnings:**
- Primary actions were mostly disabled, but secondary actions like reset remained open
- UI messaging and actual action availability can drift independently unless both are tested

### 2026-03-13 - Resolution

**By:** Codex

**Actions:**
- Guarded products submit/reset handlers and disabled those controls when live read access is unsupported
- Guarded CRM reset/reload paths and disabled unsupported live controls
- Added page-level regression tests that verify trainer sessions cannot trigger live `fetch` calls from those visible controls
- Re-ran `cd frontend && npm test`

**Learnings:**
- Unsupported-role messaging should always be paired with disabled controls and a handler-level guard
- A simple no-fetch regression test catches UI/auth drift before it reaches runtime
