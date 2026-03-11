# Trainer-Scoped Reservation Validation

Date: 2026-03-11
Branch: `codex/feat-trainer-scoped-reservation-management`

## Backend validation

- `./gradlew test --tests com.gymcrm.reservation.ReservationApiIntegrationTest --tests com.gymcrm.auth.AuthControllerIntegrationTest --tests com.gymcrm.member.MemberSummaryApiIntegrationTest`
  - passed
- `./gradlew test --tests com.gymcrm.reservation.ReservationServiceIntegrationTest`
  - existing policy coverage confirmed:
    - duplicate confirmed reservation blocked
    - cancel decrements schedule count
    - complete blocks double deduction
    - check-in repeat blocked
    - no-show blocked before schedule end
    - no-show blocked after check-in

## Prototype smoke

- Backend: `http://127.0.0.1:8080/api/v1/health`
  - `securityMode=prototype`
  - `prototypeNoAuth=true`
- Frontend: `http://127.0.0.1:4173`
- `agent-browser` checks:
  - dashboard render
  - reservation sidebar navigation
  - reservation target list render
  - reservation target selection
  - reservation detail shell and modal entry surface render
- Artifacts:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/trainer-reservation-prototype-smoke.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/trainer-reservation-prototype-detail-smoke.png`

## JWT smoke

- Backend: `http://127.0.0.1:8082/api/v1/health`
  - `securityMode=jwt`
  - `prototypeNoAuth=false`
- Frontend: `http://127.0.0.1:4175`
- `agent-browser` checks:
  - login screen render
  - trainer credential fields visible
- Artifact:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/trainer-reservation-jwt-smoke.png`

## JWT session cycle fallback

Because `agent-browser` did not advance the controlled login form in this environment, the auth path was validated with direct API calls against `http://127.0.0.1:8082`:

- `POST /api/v1/auth/login` with `trainer-user / trainer-user-1234!` -> `200`
- `POST /api/v1/auth/refresh` with cookie jar -> `200`
- `POST /api/v1/auth/logout` -> `200`
- `POST /api/v1/auth/refresh` after logout -> `401 TOKEN_INVALID`

## Scope confirmation

- Trainer-scoped reservation targets only included memberships with `assigned_trainer_id = currentUserId`
- Reservation list for unassigned member returned empty for trainer actor
- Reservation create for non-assigned membership returned `403 ACCESS_DENIED`
