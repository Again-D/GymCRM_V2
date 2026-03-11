# 2026-03-11 Shell Routing Validation Log

## Automated Checks

- `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build`
  - Passed
- `cd /Users/abc/projects/GymCRM_V2/frontend && npm test -- --run src/app/routes.test.ts`
  - Passed

## Browser Checks

### Environment
- Frontend dev server: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:8080/api/v1/health`
- Observed security mode: `jwt`
- Additional prototype frontend: `http://127.0.0.1:5174`
- Additional prototype backend: `http://127.0.0.1:8082/api/v1/health`

### Verified
- Direct open of `/members` redirected to `/login` when unauthenticated in JWT mode.
- Direct navigation to an unknown path from the app shell resolved to `/login` under the same unauthenticated JWT session, which is consistent with `unknown -> /dashboard -> auth gate -> /login`.
- Shell route metadata separation was validated by test: shell navigation routes exclude `/members/:memberId` and `/products/new`.
- Authenticated JWT login via browser form succeeded after using fresh refs and `Enter` submit.
- Authenticated JWT navigation preserved section routes:
  - `/dashboard -> /members -> /memberships`
  - browser `back` returned to `/members`
  - browser `forward` returned to `/memberships`
- Authenticated JWT `reload` on `/memberships` kept the URL at `/memberships`.
- `selectedMember` stayed intact across section navigation (`/members -> /memberships -> back`) and reset on full reload, which matches the shell-only contract.
- Prototype no-auth mode on `http://127.0.0.1:5174` allowed direct entry to `/members`, `/reservations`, and `/access`.
- Prototype no-auth mode on `http://127.0.0.1:5174` allowed direct entry to every shell section:
  - `/dashboard`
  - `/members`
  - `/memberships`
  - `/reservations`
  - `/access`
  - `/lockers`
  - `/products`
  - `/crm`
  - `/settlements`
- Prototype browser `back/forward` worked between `/reservations` and `/access`.
- Prototype `reload` on `/access` kept the URL at `/access`.

### Not Fully Verified In Browser
- Auth bootstrap flicker/flash redirect timing was not measured beyond normal visual observation.

## Notes
- Earlier login failures were caused by stale agent-browser refs reusing the wrong input mapping. Reopening the session and submitting with fresh refs plus `Enter` fixed the browser login flow.
- Prototype no-auth mode requires `SPRING_PROFILES_ACTIVE=dev` in addition to `APP_SECURITY_MODE=prototype` and `APP_PROTOTYPE_NO_AUTH_ENABLED=true`; otherwise `PrototypeModeGuard` aborts startup.
