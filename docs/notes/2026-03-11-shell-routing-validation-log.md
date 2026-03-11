# 2026-03-11 Shell Routing Validation Log

## Automated Checks

- `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build`
  - Passed
- `cd /Users/abc/projects/GymCRM_V2/frontend && npm test -- --run src/app/routes.test.ts`
  - Passed

## Browser Checks

### Environment
- Frontend dev server: `http://127.0.0.1:4176`
- Backend health: `http://127.0.0.1:8080/api/v1/health`
- Observed security mode: `jwt`
- Observed prototype mode: unavailable in this local backend session

### Verified
- Direct open of `/members` redirected to `/login` when unauthenticated in JWT mode.
- Direct navigation to an unknown path from the app shell resolved to `/login` under the same unauthenticated JWT session, which is consistent with `unknown -> /dashboard -> auth gate -> /login`.
- Shell route metadata separation was validated by test: shell navigation routes exclude `/members/:memberId` and `/products/new`.

### Not Fully Verified In Browser
- Prototype mode direct-entry behavior
- Authenticated JWT route transitions after successful login
- Browser back/forward with authenticated shell sections

## Notes
- The current local backend session was already running in JWT mode, so prototype-specific browser checks require a separate prototype-mode backend instance.
- Login submit in the current local environment returned `403`, so authenticated browser navigation was not completed in this pass.
