# Rebuild Live API Blocker Log

Date: 2026-03-13

## Status snapshot

- `members`: live read path exists
- `memberships`: live read + write path exists
- `reservations`: live read + write path exists
- `access`: live read + write path exists
- `auth/session`: live bootstrap + login/logout + role matrix evidence exists

## Active blockers

### 1. Final candidate checkpoint is still provisional

- Endpoint / route:
  - replacement candidate overall decision
- Baseline behavior:
  - controlled cutover discussion should be grounded in local staging-profile evidence, internal rehearsal evidence, and executable rollback criteria
- Rebuild behavior:
  - local staging-profile smoke evidence now exists, but the final candidate judgement is still pre-internal-rehearsal and pre-executable rollback confirmation
- Severity:
  - medium
- Owner:
  - rebuild replacement-candidate final checkpoint
- Workaround:
  - keep draft verdict in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-final-candidate-checkpoint-draft.md`
  - maintain rehearsal baseline in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-internal-cutover-rehearsal.md`

### 2. Local smoke execution still depends on the backend-allowed dev origin

- Endpoint / route:
  - local browser auth/session parity
- Baseline behavior:
  - the authenticated local smoke should run through the same dev-origin assumptions the backend already allows
- Rebuild behavior:
  - rebuild login works at `127.0.0.1:5173`, but the same browser flow at `127.0.0.1:5176` trips backend CORS and returns `403 Invalid CORS request`
- Severity:
  - low
- Owner:
  - local replacement-candidate execution environment
- Workaround:
  - run the rebuild app on `127.0.0.1:5173` during local staging-profile smoke
  - use parity diff notes instead of simultaneous side-by-side browser execution

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

### Local staging-profile auth / workflow evidence gap

- Status: resolved
- Evidence:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-smoke-results.md`
  - logged-out, admin, desk, trainer role matrix and core workflow 4개 smoke가 local staging-profile 환경에서 기록됨
