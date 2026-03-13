# Rebuild Live Reservations Flow

Date: 2026-03-13

## What changed

- `ReservationsPage` now uses live backend writes for reservation create and status actions.
- The rebuild prototype supports the following live endpoints:
  - `POST /api/v1/reservations`
  - `POST /api/v1/reservations/{reservationId}/check-in`
  - `POST /api/v1/reservations/{reservationId}/complete`
  - `POST /api/v1/reservations/{reservationId}/cancel`
  - `POST /api/v1/reservations/{reservationId}/no-show`

## Important implementation choices

- The page still owns form/message state.
- The reservations module now owns the write contract and mock/live split.
- After create or status mutation, the page explicitly re-reads:
  - selected member reservations
  - selected member memberships
  - reservation targets

This keeps the current page coherent while preserving the rebuild rule that stale cross-section data should be made explicit.

## Current parity status

- `memberships` live write parity: done
- `reservations` live write parity: done
- `access` live write parity: still pending

## Notes

- The rebuild still uses conservative post-mutation re-read behavior instead of optimistic cross-query patching.
- This is intentional for the replacement-candidate stage because correctness and blocker discovery matter more than micro-optimizing request volume.
