# Rebuild Live API Blocker Log

Date: 2026-03-13

## Status snapshot

- `members`: live read path exists
- `memberships`: live read + write path exists
- `reservations`: live read + write path exists
- `access`: live read path exists, live write parity still pending

## Active blockers

### 1. Access live action parity

- Endpoint / route:
  - `/api/v1/access/entry`
  - `/api/v1/access/exit`
  - `/access`
- Baseline behavior:
  - entry/exit actions update presence and event history against the live backend
- Rebuild behavior:
  - page/query ownership exists, but write path still needs live contract wiring review
- Severity:
  - high
- Owner:
  - rebuild replacement-candidate phase 1
- Workaround:
  - use baseline frontend for access writes

## Resolved blockers in this phase

### Memberships live writes

- Status: resolved
- Evidence:
  - `useSelectedMemberMembershipsQuery` now calls live membership purchase/hold/resume/refund endpoints

### Reservations live writes

- Status: resolved
- Evidence:
  - `useSelectedMemberReservationsState` now calls live reservation create/check-in/complete/cancel/no-show endpoints
