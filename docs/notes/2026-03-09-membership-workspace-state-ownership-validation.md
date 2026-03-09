---
title: "Membership workspace state ownership validation"
date: 2026-03-09
type: note
---

# Membership workspace state ownership validation

## Why memberships was the next extraction target

After the reservation workspace split, the next highest-churn local bundle in `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx` was the membership workspace UI state:

- purchase form
- purchase submitting/message/error state
- membership action draft state
- per-membership action message/error state
- refund preview cache/loading state

These states are not app-wide. They are reset whenever the selected member changes, and they are only consumed by the membership workspace.

## State ownership change

The membership workspace local state moved to:

- `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/useMembershipWorkspaceState.ts`

`App.tsx` still keeps:

- selected member identity and detail
- session-level created membership/payment caches
- product detail fetch used for purchase preview composition

The new hook now owns:

- purchase form lifecycle
- membership action draft lifecycle
- refund preview/message/error lifecycle
- explicit workspace reset helper for protected UI reset

## Reset policy validated

The split preserves the intended reset boundary:

- member change clears membership purchase form
- member change clears purchase feedback and action feedback
- member change clears draft/refund preview state
- protected UI reset clears the whole membership workspace state through `resetMembershipWorkspace()`

## Validation

Validation performed on 2026-03-09:

- `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build`
  - result: success

## Follow-up

The next likely extraction candidate is the access workspace because it still keeps query, loading, event, and presence state in `App.tsx`.
