# Phase 3 Refund API/UI Validation Log (P3-8)

- Date: 2026-02-23
- Environment:
  - Backend: `SPRING_PROFILES_ACTIVE=dev`, `./gradlew bootRun` (`:8080`)
  - Frontend: `npm run dev -- --host 127.0.0.1 --port 5173` (`:5173`)
  - DB: Docker Postgres `gymcrm-postgres` (`localhost:5433`)
- Validation method: `agent-browser` headless UI automation

## Scenario

1. Open admin portal and select member `#34 (P3환불테스트회원-76abebd1)`.
2. In member detail, select product `#34 · P3환불기간제-1e0a549c (DURATION) · ₩100,000`.
3. Confirm purchase preview is shown and execute purchase.
4. Verify session membership row and purchase payment row are added immediately.
5. Click `환불 미리보기`.
6. Verify refund preview values render in the membership action cell.
7. Click `환불 확정`.
8. Verify membership status becomes `REFUNDED`, refund action is blocked with message, and refund payment row is added immediately.

## Observed Results

- Purchase succeeded and added:
  - session membership row with `membershipId=33`
  - payment history row `PURCHASE / COMPLETED / CASH / ₩100,000`
- Refund preview rendered (same UI row):
  - `originalAmount=₩100,000`
  - `usedAmount=₩3,333`
  - `penaltyAmount=₩10,000`
  - `refundAmount=₩86,667`
- Refund confirm succeeded:
  - membership status updated to `REFUNDED` immediately
  - UI displayed non-refundable status message: `환불 불가 상태입니다. 현재 상태: REFUNDED`
  - payment history immediately prepended refund row:
    - `REFUND / COMPLETED / CASH / ₩86,667`

## P3-8 Completion Criteria Check

- `POST .../refund` API wired to UI: PASS
- Refund preview/confirm UI: PASS
- Non-refundable status message handling: PASS
- Duplicate submit prevention:
  - buttons disabled during in-flight (`isSubmitting` / `isRefundPreviewLoading`) path confirmed in code and runtime labels (`계산 중...`, `처리 중...`)
- Member detail reflects refund status + payment history immediately: PASS

## Follow-up Regression Validation (2026-02-24) - HOLDING Refund UI Guard

- Context:
  - Review-driven backend policy change applied: refund allowed only for `ACTIVE` memberships
  - UI bug found during manual/browser verification:
    - `HOLDING` state still rendered refund form/buttons because `canRefund` condition allowed `HOLDING`
  - UI fix applied:
    - `canRefund = membership.membershipStatus === "ACTIVE"`
    - `HOLDING` now shows guidance message instead of refund controls

### Scenario

1. Open admin portal and select member `#63 (P3환불테스트회원-3e74ef1c)`.
2. Purchase holdable duration product `#59 · P3홀딩기간제-47c7614a`.
3. Execute `홀딩` on the newly created session membership row.
4. Verify `HOLDING` state row UI does not render refund actions.
5. Verify UI renders guidance message for refund policy.

### Observed Results

- Session membership row created and transitioned to `HOLDING`.
- In `HOLDING` row action area:
  - `홀딩 해제` button only (refund buttons hidden)
  - guidance message shown:
    - `홀딩 상태 회원권은 먼저 해제 후 환불해주세요.`
- This matches backend refund eligibility policy (`ACTIVE` only).

### Artifacts

- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/holding-refund-message-validation.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/holding-refund-message-validation-after-hold.png`
