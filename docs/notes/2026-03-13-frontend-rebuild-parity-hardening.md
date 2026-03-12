# 2026-03-13 Frontend Rebuild Parity Hardening

## Summary

This pass did not add a new user-facing slice. It validated that the rebuilt prototype still behaves coherently **across** the slices that are already present:

- shell/auth routing
- members
- memberships
- reservations
- access
- lockers
- products
- crm
- settlements

The point of this pass was to confirm that the branch has not drifted back into coordinator-heavy behavior as breadth increased.

## Validation Completed

### Full Frontend Rebuild Test Suite

Executed:

- `npm test -- --run`
- `npm run build`

Result:
- `22` test files passed
- `50` tests passed
- production build completed successfully

## Cross-Slice Parity Checks

### Selected Member Ownership

Still fixed in the members-domain support module/store.

Consumers continue to read that source rather than recreating it:
- memberships
- reservations
- access prefill/highlight paths
- lockers prefill/highlight paths

### Shared Invalidation Domains

The rebuilt app still uses explicit invalidation domains instead of bundled reload behavior.

Confirmed domains in active use:
- `members`
- `products`
- `reservationTargets`
- `settlementReport`
- `crmHistory`
- `crmQueue`
- `accessPresence`
- `accessEvents`
- `lockerSlots`
- `lockerAssignments`

### Cross-Slice Refresh Behavior

The most important cross-slice refresh paths remain covered:
- product mutations refresh shared product consumers such as memberships
- membership mutations propagate into member summaries and reservation targets
- access/locker/crm actions invalidate their own explicit read domains
- settlement report is isolated as a query-owned reporting read and does not leak ownership upward

### Shell/Auth Contract

The rebuild still preserves:
- shell-only routing
- runtime auth presets for prototype/JWT states
- route fallback behavior
- auth bootstrap screen before route redirects

## Known Limits That Still Matter

These are not regressions, but they do matter for the final recommendation:

- runtime auth parity is exercisable, but still preset/mock-driven rather than backend-auth integrated
- rebuild evidence is strongest for structure and interaction ownership, not for production-ready API integration
- some operational breadth is still shallower than the baseline implementation detail in `main`

## Conclusion

The branch now has enough slice coverage that remaining questions are no longer about whether the rebuild architecture can work.

The remaining question is whether it should:
- continue toward cutover-readiness, or
- remain an experimental branch whose patterns are harvested back into `main`
