# Frontend Rebuild Live API Blocker Log

Date: 2026-03-13

## Status Snapshot

- `members`: live read path exists
- `memberships`: live read + write path exists
- `reservations`: live read + write path exists
- `access`: live read + write path exists
- `auth/session`: live bootstrap + login/logout + role matrix evidence exists

## Active Blockers

### 1. Local smoke execution still depends on the backend-allowed dev origin

- Surface:
  - local browser auth/session parity
- Current behavior:
  - rebuild login works at `127.0.0.1:5173`
  - the same browser flow at `127.0.0.1:5176` hits backend CORS and returns `403 Invalid CORS request`
- Severity:
  - low
- Owner:
  - local replacement-candidate execution environment
- Workaround:
  - run the rebuild app on `127.0.0.1:5173` during local staging-profile smoke
  - use parity diff notes instead of simultaneous side-by-side browser execution

## Resolved Blockers

### Memberships live writes

- Status: resolved
- Evidence:
  - live membership purchase / hold / resume / refund flows are wired in the rebuild app

### Reservations live writes

- Status: resolved
- Evidence:
  - live reservation create / check-in / complete / cancel / no-show flows are wired in the rebuild app

### Access live reads / writes

- Status: resolved
- Evidence:
  - live `/api/v1/access/presence`, `/api/v1/access/events`, `/api/v1/access/entry`, `/api/v1/access/exit` usage exists
  - `/access` now follows baseline global workflow and hides unsupported live trainer access

### Auth / session parity evidence

- Status: resolved for local live parity
- Evidence:
  - live bootstrap / login / logout / protected route behavior documented and tested

### Local staging-profile auth / workflow evidence gap

- Status: resolved
- Evidence:
  - core workflow 4개와 role matrix smoke가 local staging-profile 환경에서 기록됨

### Final candidate checkpoint / internal rehearsal

- Status: resolved for controlled route subset evaluation
- Evidence:
  - internal rehearsal and candidate checkpoint both recommend proceeding to controlled route subset evaluation

## Current Interpretation

현재 남아 있는 blocker는 full swap blocker라기보다, controlled route subset evaluation을 수행할 때 감안해야 하는 **local execution constraint**입니다.

즉 현재 판단은:

- replacement candidate: 유지
- controlled route subset evaluation: 진행 가능
- full swap: 아직 보류

## Related Durable References

- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`
