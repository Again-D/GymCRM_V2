# 2026-03-13 Frontend Rebuild Readiness Checkpoint

## Recommendation

**Recommendation: keep this branch as a long-lived experiment for now, and harvest patterns back into `main` rather than moving directly toward cutover.**

## Why

The rebuild branch has succeeded at the thing it most needed to prove:

- route-level composition is easier to explain than the baseline shell coordinator
- selected-member ownership is more explicit
- query-owned reads and explicit invalidation domains scale across multiple slices
- new slices can be added without immediately recreating `App.tsx` drift

That is a meaningful architectural win.

But the branch is still not a realistic replacement candidate yet, for three reasons.

### 1. Runtime confidence is still prototype-heavy

The running rebuild app is still driven primarily by mock data and runtime presets.

That is enough to validate structure, ownership, and browser flows, but it is not enough to claim production replacement readiness.

### 2. Breadth is strong, but depth is uneven

The branch now covers:
- shell/auth
- members
- memberships
- reservations
- access
- lockers
- products
- crm
- settlements

That is wide enough for architectural evaluation.

But it is not yet deep enough across all slices to justify a cutover migration plan.

### 3. The most valuable output may already be available

At this point, the rebuild has already produced reusable guidance:
- page-first route composition
- members-domain selected-member ownership
- explicit invalidation domains
- slice-local query/mutation separation
- runtime-testable auth preset model

Those patterns can be harvested into the baseline app even if the rebuild branch never becomes the new frontend.

## What This Means Practically

### Recommended next move

Use this branch as a reference implementation and pattern library.

Short-term priority should be:
1. keep PR `#73` reviewable and documented
2. extract the strongest patterns back into `main`
3. only continue rebuild breadth if a specific new architectural question appears

### Not recommended right now

- do not treat this branch as cutover-ready
- do not start migration planning from baseline frontend to rebuild frontend yet
- do not broaden the rebuild indefinitely without a new decision gate

## Evidence Used

- prototype checkpoint
- slice-specific hardening notes
- desktop/mobile smoke artifacts per slice
- full frontend-rebuild test suite passing
- production build passing

## Final Status

The rebuild branch is a **successful architecture experiment**.

It is not yet a replacement frontend.
