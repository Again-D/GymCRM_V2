# Rebuild Live API Blocker Log

Date: 2026-03-13

## Status snapshot

- `members`: live read path exists
- `memberships`: live read + write path exists
- `reservations`: live read + write path exists
- `access`: live read + write path exists
- `auth/session`: live bootstrap + login/logout + role matrix evidence exists

## Active blockers

### 1. Staging auth / workflow evidence gap

- Endpoint / route:
  - staging protected shell routes
  - staging login/logout/refresh flow
  - staging role-restricted workflows
- Baseline behavior:
  - staging에서 role/session/cookie/proxy 차이까지 포함한 실제 운영 유사 흐름이 재현돼야 함
- Rebuild behavior:
  - local live parity는 확보했지만, staging smoke evidence는 아직 없음
- Severity:
  - high
- Owner:
  - rebuild replacement-candidate phase 4
- Workaround:
  - local live evidence와 baseline staging smoke를 함께 참고

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

### Auth / session parity evidence

- Status: resolved for local live parity
- Evidence:
  - live bootstrap/login/logout tests in `frontend-rebuild/src/app/auth.test.tsx`
  - browser role matrix and protected route evidence in `docs/notes/2026-03-13-frontend-rebuild-live-auth-session-flow.md`
