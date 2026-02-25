# [P1] Phase 7 plan leaves membershipId selection policy as recommendation only

## Problem
The plan recommends `membershipId` required at reservation creation, but keeps it in a "Policy Fixes (recommended)" section rather than the canonical rules / API contract / acceptance criteria. This can cause implementation drift (auto-select vs required selection) and affect schema/API/UI design.

## Suggested fix
- Add `membershipId required` policy to `Phase 7 Canonical Rules`
- Reflect it in API request shape and acceptance criteria
- Clarify whether DURATION reservations must also provide `membershipId` (recommended: yes, explicit membership linkage)
