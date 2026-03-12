# 2026-03-13 Frontend Rebuild CRM Hardening

## Scope

Implemented the rebuild `crm` parity slice in the isolated `frontend-rebuild` app and replaced the shell placeholder with a real queue/history page.

## What changed

- Replaced the `/crm` placeholder with a real `CrmPage`
- Added CRM-specific query ownership:
  - `frontend-rebuild/src/pages/crm/modules/useCrmHistoryQuery.ts`
- Added CRM-local action state:
  - `frontend-rebuild/src/pages/crm/modules/useCrmPrototypeState.ts`
- Added CRM mock history and trigger/process actions:
  - `frontend-rebuild/src/api/mockData.ts`
- Added explicit CRM invalidation domains:
  - `frontend-rebuild/src/api/queryInvalidation.ts`

## Architectural outcome

- `/crm` remains usable without selected-member context
- history rows are query-owned
- filters, trigger/process action state, and feedback stay page-local
- trigger/process actions invalidate explicit CRM domains instead of silently patching local history rows

## Validation

- `npm test -- --run src/api/mockData.test.ts src/api/queryInvalidation.test.ts src/pages/crm/modules/useCrmHistoryQuery.test.tsx src/pages/crm/modules/useCrmPrototypeState.test.tsx src/App.routing.test.tsx`
- `npm run build`

## Browser Evidence

- Desktop smoke:
  - `docs/testing/artifacts/rebuild-prototype-crm-desktop-smoke.png`
- Mobile smoke:
  - `docs/testing/artifacts/rebuild-prototype-crm-mobile-smoke.png`

## Remaining work

- No blocking gaps remain for the rebuild `crm` slice itself.
- The next breadth expansion should move to `settlements` or a final parity-hardening checkpoint.
