# P2 - Phase11-B settlement report (SAL) foundation

## Scope
- Add sales settlement report API (period/product/payment method/net sales).
- Connect frontend settlement tab and basic report UI.

## Checklist
- [x] Add backend settlement report repository/service/controller
- [x] Add integration test for gross/refund/net aggregation and filters
- [x] Add frontend settlements tab and report panels
- [x] Run backend/frontend validation tests
- [x] Sync plan checkbox for SAL completion

## Notes
- Uses `payments` + `member_memberships.product_name_snapshot` to compute net sales.
