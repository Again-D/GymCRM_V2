---
status: complete
priority: p2
issue_id: "097"
tags: [code-review, frontend, accessibility, modal, quality]
dependencies: []
---

# Fix modal accessibility contract before rollout

The new shared `Modal` component does not yet meet the accessibility contract promised by the redesign plan. Most critically, the backdrop wrapper is marked `aria-hidden="true"` while it contains the dialog node, which can hide the modal from assistive technology entirely. The component also lacks focus trapping and focus restoration, so keyboard users can tab into the background and lose their place after close.

## Findings

- [`frontend/src/shared/ui/Modal.tsx:41`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx#L41) sets `aria-hidden="true"` on the backdrop wrapper that contains the dialog subtree.
- [`frontend/src/shared/ui/Modal.tsx:47`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx#L47) hardcodes `aria-labelledby="modal-title"` for every instance instead of generating a unique ID.
- [`frontend/src/shared/ui/Modal.tsx:16`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx#L16) only focuses the dialog container; it does not trap focus within the modal or return focus to the trigger on close.
- The new modal is already used by multiple workspace screens:
  - [`frontend/src/pages/memberships/MembershipsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/memberships/MembershipsPage.tsx)
  - [`frontend/src/pages/reservations/ReservationsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx)
  - [`frontend/src/pages/products/ProductsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx)
  - [`frontend/src/pages/lockers/LockersPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx)
- The redesign plan itself calls out focus trap, `aria-modal`, ESC close, and scroll lock as phase-0 foundation rules, so this is a known gap against the branch's own contract.

## Proposed Solutions

### Option 1: Harden the current shared Modal component

**Approach:** Remove the invalid `aria-hidden`, generate unique title/description IDs, implement focus trap + focus return, and add tests around keyboard behavior.

**Pros:**
- Smallest change from the current branch direction.
- Fixes all current consumers at once.

**Cons:**
- Requires careful DOM event handling and test coverage.
- A homegrown modal still needs ongoing maintenance.

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 2: Wrap a battle-tested dialog primitive

**Approach:** Adopt an accessibility-focused dialog primitive and theme it to the redesign.

**Pros:**
- Stronger a11y defaults out of the box.
- Reduces custom focus-management bugs.

**Cons:**
- Adds a dependency and integration work.
- May be heavier than needed for the current stack.

**Effort:** 4-8 hours

**Risk:** Medium

---

### Option 3: Keep the component for now but block rollout until browser accessibility checks pass

**Approach:** Treat modal rollout as incomplete and gate phase 1 screens behind a hardened modal acceptance checklist before further expansion.

**Pros:**
- Protects phase 2 from spreading a flawed modal pattern.
- Forces browser validation early.

**Cons:**
- Still requires implementation work from Option 1 or 2.
- Slows visible UI rollout.

**Effort:** 1-2 hours for gating, plus fix time

**Risk:** Low

## Recommended Action

Harden the shared `Modal` component before further rollout. The chosen fix removes the invalid `aria-hidden`, assigns unique label IDs, traps focus inside the modal, restores focus to the triggering control on close, and backs the behavior with focused tests so all current consumers inherit the corrected contract.

## Technical Details

**Affected files:**
- [frontend/src/shared/ui/Modal.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx)
- [frontend/src/shared/ui/Modal.module.css](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.module.css)
- [frontend/src/pages/memberships/MembershipsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/memberships/MembershipsPage.tsx)
- [frontend/src/pages/reservations/ReservationsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx)
- [frontend/src/pages/products/ProductsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx)
- [frontend/src/pages/lockers/LockersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx)

**Related components:**
- All modal-triggering workspace actions

**Database changes (if any):**
- No

## Resources

- **Branch:** `feat/frontend-field-ops-redesign-phase0`
- **Documentation:** [WAI-ARIA Authoring Practices: Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- **Documentation:** [MDN `dialog` accessibility guidance](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role)

## Acceptance Criteria

- [ ] The dialog subtree is exposed correctly to assistive technology and not hidden by ancestor ARIA flags.
- [ ] Each modal instance has a unique accessible name/label relationship.
- [ ] Keyboard focus is trapped inside the modal while open.
- [ ] Closing the modal restores focus to the triggering control.
- [ ] ESC close, backdrop close policy, and scroll lock are covered by tests or browser validation.
- [ ] Existing frontend tests and build still pass.

## Work Log

### 2026-03-16 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the new shared `Modal` foundation introduced in the redesign branch.
- Traced modal usage across memberships, reservations, products, and lockers.
- Compared implementation against the redesign plan's phase-0 modal contract.

**Learnings:**
- The current component is visually reusable, but its accessibility contract is not yet safe enough to serve as the branch-wide foundation.
- Because multiple pages already depend on it, fixing the shared component now is much cheaper than papering over issues page-by-page later.

### 2026-03-16 - Completed

**By:** Codex

**Actions:**
- Reworked [`frontend/src/shared/ui/Modal.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx) to remove the invalid hidden wrapper, generate unique dialog labels, trap focus, preserve body scroll state, and restore trigger focus on close.
- Added coverage in [`frontend/src/shared/ui/Modal.test.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.test.tsx) for accessible dialog exposure and keyboard focus behavior.
- Verified existing modal consumers continued to build and test successfully with the shared fix.
- Verified with `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` and `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build`.

**Learnings:**
- Shared modal primitives are worth hardening early because a single accessibility flaw multiplies across every redesigned workspace.
- Focus restoration is easiest to keep reliable when the modal itself owns the before-open focused element rather than asking pages to remember it.

## Notes

- This should be handled before phase 1 UI rollout is considered complete.
