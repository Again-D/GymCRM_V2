# Rebuild Live API Blocker Log

Date: 2026-03-13

## Status snapshot

- `members`: live read path exists
- `memberships`: live read + write path exists
- `reservations`: live read + write path exists
- `access`: live read + write path exists
- `auth/session`: live bootstrap + login/logout parity evidence in progress

## Active blockers

### 1. Auth / session parity evidence gap

- Endpoint / route:
  - `/api/v1/auth/login`
  - `/api/v1/auth/logout`
  - `/api/v1/auth/refresh`
  - protected shell routes
- Baseline behavior:
  - live 로그인/로그아웃/세션 복구와 protected route bootstrap이 운영 프런트에서 실제 세션 기준으로 동작
- Rebuild behavior:
  - foundation과 focused tests는 갖췄지만, live browser evidence와 role matrix evidence가 아직 phase artifact로 완전히 정리되지는 않음
- Severity:
  - high
- Owner:
  - rebuild replacement-candidate phase 2
- Workaround:
  - baseline frontend로 live auth/session smoke 수행

## Resolved blockers in this phase

### Memberships live writes

- Status: resolved
- Evidence:
  - `useSelectedMemberMembershipsQuery` now calls live membership purchase/hold/resume/refund endpoints

### Reservations live writes

- Status: resolved
- Evidence:
  - `useSelectedMemberReservationsState` now calls live reservation create/check-in/complete/cancel/no-show endpoints

### Access live reads / writes

- Status: resolved
- Evidence:
  - `useAccessQueries` reads live `/api/v1/access/presence` and `/api/v1/access/events`
  - `useAccessPrototypeState` writes live `/api/v1/access/entry` and `/api/v1/access/exit`
  - `/access` surface now matches baseline global workflow and hides unsupported live trainer access
