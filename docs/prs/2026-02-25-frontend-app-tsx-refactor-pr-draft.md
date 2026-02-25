## Summary

- Refactor `frontend/src/App.tsx` by extracting tab-specific UI blocks into feature components (`members`, `memberships`, `reservations`, `products`)
- Extract layout/auth shell pieces (`TopBar`, `SidebarNav`, `ContentHeader`, auth screens) to reduce `App.tsx` responsibility to state orchestration + high-level routing/branching
- Add reusable UI primitives (`PanelHeader`, `NoticeText`, `PlaceholderCard`, `EmptyTableRow`, `InlineHelpText`) and shared format utilities

## Scope / Non-Scope

- In scope: frontend component structure refactor, JSX extraction, shared UI helper extraction, internal prop typing cleanup
- Out of scope: backend/API contract changes, business logic changes, routing framework changes, styling system replacement

## Testing

### Automated

- `npm run build` (frontend) ✅

### Manual Regression (Executed on 2026-02-25)

- [x] Login / logout / security-mode gating
- [x] Member list search + select + detail sync
- [ ] Membership operations (purchase / hold / resume / refund preview / refund submit)
- [ ] Reservation actions (`create`, `check-in`, `complete`, `cancel`, `no-show`)
- [x] Product management and DESK-role restrictions

### Manual Regression Notes

- `ROLE_CENTER_ADMIN`
  - Login/logout flow verified (`center-admin`)
  - Member selection sync verified (`회원 관리` -> sidebar selected member -> detail panel)
  - Membership purchase verified (new membership + payment history row created)
  - Reservation actions verified: `create`, `cancel`, `complete`, `check-in`
  - Reservation action-state UI guards verified:
    - checked-in row keeps `no-show` disabled with helper text
    - cancelled/completed/no-show rows show disabled actions
  - `no-show` actual state transition not re-executed in this session:
    - existing list already had a `NO_SHOW` fixture row
    - creating a fresh eligible past-slot reservation is now blocked by backend rule (`과거 슬롯은 예약할 수 없습니다`)
- `ROLE_DESK`
  - Login verified (`desk-user`)
  - Product tab restriction UI verified:
    - `신규 등록` disabled
    - product form inputs/action buttons disabled
    - restriction notices rendered (`DESK 권한은 상품 조회만 가능합니다`, `ROLE_CENTER_ADMIN` 안내)

## Post-Deploy Monitoring & Validation

- No additional operational monitoring required: frontend-only UI structure refactor with no backend/API contract changes.

## Commits

- `5f0053a` `refactor(frontend): extract app tabs into feature components`
- `72be9c5` `docs(plan): add app tsx refactor execution plan`
- `29805f2` `docs(pr): add frontend app refactor pr draft`

## Notes

- Plan document included in branch:
  - `docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md`
- Plan review follow-ups already reflected in the plan (`check-in/no-show` parity scope, nested `docs/solutions` learnings note).
