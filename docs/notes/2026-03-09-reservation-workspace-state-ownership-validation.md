---
title: "Reservation workspace state ownership validation"
date: 2026-03-09
type: note
---

# Reservation workspace state ownership validation

## Render Hotspot Record

Equivalent to a focused profiler pass, the render-surface audit for the direct-entry reservation flow identified one high-churn boundary:

- `App.tsx` owned all reservation workspace state (`reservationSchedules`, `reservationRowsByMemberId`, create form, loading flags, panel feedback).
- `selectedMemberId` changes and reservation mutations both re-entered that top-level state bundle.
- The direct-entry picker flow therefore reset and re-bound reservation UI through `App.tsx` even though the reset policy is reservation-workspace-local.

This made `reservations` the safest first extraction target because its reset policy is explicit:

- member change should clear create form
- member change should clear reservation feedback message/error
- logout/protected reset should clear schedules and cached rows

## State Ownership Change

The reservation workspace state moved to:

- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/useReservationWorkspaceState.ts`

Ownership after the change:

- `App.tsx` keeps cross-workspace shared state:
  - `selectedMemberId`
  - `selectedMember`
  - member detail loading flow
- reservation hook owns workspace-local state:
  - reservation schedules
  - reservation rows by member
  - reservation create form
  - reservation loading/submitting flags
  - reservation panel message/error
  - reservation reset helper

The hook also binds the member-switch reset policy to `selectedMemberId`, which keeps reservation-specific reset logic close to the workspace that uses it.

## Validation

Validation performed on 2026-03-09:

- `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build`
  - result: success
- reservation workspace reset path reviewed after extraction:
  - `selectedMemberId` change clears create form and feedback state in the hook
  - logout/protected reset still clears schedules, rows, and form state through `resetReservationWorkspace()`
- query lifecycle decision remains documented separately:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`

## Follow-up

If another state bundle is extracted next, the most natural candidates are:

- membership purchase/message/loading state
- access workspace query/result state
