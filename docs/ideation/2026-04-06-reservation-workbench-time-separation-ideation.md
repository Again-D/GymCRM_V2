---
date: 2026-04-06
topic: reservation-workbench-time-separation
focus: reservation workbench schedule info vs reservation creation time
---

# Ideation: Reservation Workbench Time Separation

## Codebase Context
- The reservation workbench table currently renders `reservation.reservedAt` under the `일정 정보` column in `frontend/src/pages/reservations/ReservationsPage.tsx`.
- The current UI does not distinguish between the booked schedule time and the time the reservation record was created.
- Schedule context already exists in `ReservationScheduleSummary` with `scheduleType`, `trainerName`, `slotTitle`, `startAt`, and `endAt` in `frontend/src/pages/members/modules/types.ts`.
- The reservation row type currently exposes `reservedAt`, status timestamps, and check-in/completion timestamps, but does not expose `createdAt` in `frontend/src/pages/members/modules/types.ts`.
- This means the user-facing improvement is straightforward at the UI level, but complete separation of schedule info and creation time likely requires an API contract extension or UI-level joining strategy.

## Ranked Ideas

### 1. Separate schedule info from reservation creation time
**Description:** Keep the main row focused on the actual reservation schedule, then render the reservation creation timestamp as secondary metadata below it. The schedule line would show what the member is attending; the secondary line would show when the booking was made.
**Rationale:** This directly addresses the confusion in the current workbench with minimal UI disruption. It preserves the existing table structure while making the two timestamps semantically distinct.
**Downsides:** Requires a reliable `createdAt` field on the reservation row or a backend/API extension before the UI can fully support the second line.
**Confidence:** 95%
**Complexity:** Medium
**Status:** Explored

### 2. Turn the schedule column into a compact reservation timeline block
**Description:** Redesign the workbench cell so it shows schedule info first, then creation time, and optionally later status timestamps like checked-in or completed times as stacked metadata.
**Rationale:** Gives operators a more complete audit-style view in the same surface and reduces the need to infer reservation history from status only.
**Downsides:** Denser UI may reduce scanability, especially on smaller screens.
**Confidence:** 88%
**Complexity:** Medium
**Status:** Unexplored

### 3. Make timestamps status-aware
**Description:** Show schedule info and creation time for every row, then append the most relevant operational timestamp for the current state, such as completion or cancellation time.
**Rationale:** Helps the workbench serve both scheduling and operational follow-up use cases.
**Downsides:** Broader scope than the current problem and raises prioritization questions about which timestamp gets emphasis.
**Confidence:** 80%
**Complexity:** Medium-High
**Status:** Unexplored

### 4. Enrich reservation rows with display-ready schedule metadata
**Description:** Extend the reservation payload to include display-ready schedule labels and `createdAt` so the workbench does not have to reconstruct context by joining multiple sources.
**Rationale:** Simplifies the frontend and creates a better long-term data shape for other reservation views.
**Downsides:** Requires backend and API contract changes, so it is the heaviest option.
**Confidence:** 84%
**Complexity:** High
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Add only a tooltip for the current timestamp | Does not resolve the core semantic confusion in the main table view |
| 2 | Move creation time into a separate modal/detail view | Adds interaction cost for information operators likely need at a glance |
| 3 | Rename the label from schedule info to confirmed time | Re-labeling alone would still fail to show the actual reservation schedule context |

## Session Log
- 2026-04-06: Initial ideation - 7 candidate directions considered, 4 survivors kept
- 2026-04-06: Selected idea 1 for brainstorming
