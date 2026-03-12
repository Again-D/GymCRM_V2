# 2026-03-12 Frontend Rebuild Products Hardening

## Scope

Implemented the rebuild `products` parity slice in the isolated `frontend-rebuild` app and connected it back to the shared product domain consumed by `memberships`.

## What changed

- Replaced the `/products` placeholder with a real `ProductsPage`
- Added a shared canonical product query:
  - `frontend-rebuild/src/pages/products/modules/useProductsQuery.ts`
- Added page-local CRUD/action state:
  - `frontend-rebuild/src/pages/products/modules/useProductPrototypeState.ts`
- Extended mock data and invalidation:
  - `frontend-rebuild/src/api/mockData.ts`
  - `frontend-rebuild/src/api/queryInvalidation.ts`
- Switched `memberships` purchase flow from hardcoded product fixtures to the shared product domain:
  - `frontend-rebuild/src/pages/memberships/MembershipsPage.tsx`
  - `frontend-rebuild/src/pages/memberships/modules/useMembershipPrototypeState.ts`

## Architectural outcome

- `products` data remains shared and canonical
- `/products` owns only list filters, CRUD form state, and feedback
- `memberships` now re-reads product changes through the shared domain instead of relying on page-local constants

## Validation

- `npm test -- --run src/pages/products/modules/useProductsQuery.test.tsx src/pages/products/modules/useProductPrototypeState.test.tsx src/pages/memberships/modules/useMembershipPrototypeState.test.tsx src/api/mockData.test.ts src/App.routing.test.tsx`
- `npm run build`

## Browser Evidence

- Desktop smoke for `/products` captured:
  - `docs/testing/artifacts/rebuild-prototype-products-desktop-smoke.png`
- Mobile smoke for `/products` captured:
  - `docs/testing/artifacts/rebuild-prototype-products-mobile-smoke.png`
- Non-`/products` consumer smoke captured from `/memberships`:
  - `docs/testing/artifacts/rebuild-prototype-products-memberships-consumer-smoke.png`
  - `docs/testing/artifacts/rebuild-prototype-products-memberships-search-smoke.png`

## Remaining work

- No blocking gaps remain for the `products` slice inside the rebuild prototype.
- The next follow-up is breadth expansion to the next planned slice, not additional hardening inside `/products`.
