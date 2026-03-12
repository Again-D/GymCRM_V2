---
status: complete
priority: p2
issue_id: "087"
tags: [code-review, frontend, rebuild, products, architecture]
dependencies: []
---

# Pin shared product data contract before products rebuild slice

## Problem Statement
The rebuild roadmap promotes `products` as the next slice, but it did not define whether product data remains a shared canonical dataset for memberships and reservations or becomes page-local to `/products`. That ambiguity risked recreating duplicate stores or stale cross-section product state during the next slice.

## Findings
- The roadmap identified `products` as the next CRUD/admin slice, but its scope originally stopped at list/create/edit and invalidation local to product reads.
- In the current app and rebuild direction, products are also consumed outside `/products`, especially by memberships purchase flows and reservation-related semantics.

## Proposed Solutions
1. Explicitly keep product data as a shared canonical query/domain while `/products` owns CRUD forms and local action state.
2. Define which other slices consume product-derived state and which invalidation domains product mutations must touch.

## Recommended Action

Updated the roadmap to keep product data as a shared canonical domain for cross-slice consumers, while `/products` only owns page-local CRUD form state and feedback.

## Technical Details
- Plan: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-breadth-expansion-roadmap-plan.md`

## Acceptance Criteria
- [x] The roadmap says whether product data is shared or page-local in the rebuild
- [x] The roadmap lists which slices consume product data and what product mutations invalidate

## Work Log
- 2026-03-12: Created during roadmap review.
- 2026-03-12: Updated roadmap to fix product ownership boundary before the products slice begins.

## Resources
- Draft PR: https://github.com/Again-D/GymCRM_V2/pull/73
