---
title: feat: Add trainer settlement rate entry surfaces
type: feat
status: completed
date: 2026-04-10
origin: docs/brainstorms/2026-04-10-trainer-settlement-rate-entry-requirements.md
---

# feat: Add trainer settlement rate entry surfaces

## Overview

트레이너별 PT/GX 정산 단가를 운영자가 실제로 관리하고 확인할 수 있도록 프론트 화면을 완성한다. 입력 source-of-truth는 `trainers` 관리 화면으로 고정하고, `/settlements`는 저장 단가를 읽기 전용으로 노출하면서 미설정 단가 경고를 `트레이너 관리` 이동 액션까지 포함한 운영 흐름으로 마감한다.

## Problem Frame

현재 백엔드는 트레이너별 `ptSessionUnitPrice`, `gxSessionUnitPrice`를 저장하고 정산 계산에도 사용하지만, 프론트는 그 값을 설정하거나 읽을 수 있는 UX가 빠져 있다. 그 결과 정산 preview에서 단가 warning이 발생해도 운영자가 원인을 바로 수정할 수 없고, 단가 기준값이 트레이너 프로필인지 정산 작업 공간인지도 화면상 드러나지 않는다. 이번 계획은 origin 문서의 R1-R13을 기준으로, 단가 입력 책임을 `trainers`에 두고 `settlements`는 결과 확인에 집중하도록 프론트 계약과 화면을 정렬한다. (see origin: `docs/brainstorms/2026-04-10-trainer-settlement-rate-entry-requirements.md`)

## Requirements Trace

- R1-R3. 단가 입력/수정은 `frontend/src/pages/trainers/TrainersPage.tsx`에서만 수행되고, 정산 화면은 읽기 전용으로 유지된다.
- R4-R9. 트레이너 상세/수정 경험과 정산 preview/workspace가 모두 저장 단가를 읽을 수 있어야 하며, 운영자 표는 `PT 단가`, `GX 단가`를 별도 컬럼으로 노출한다.
- R10-R13. 단가 미설정 저장은 허용하되, 정산 화면은 `트레이너 관리에서 설정하세요` 경고와 이동 액션을 제공해야 한다.

## Scope Boundaries

- 백엔드 정산 계산 규칙, 단가 저장 스키마, canonical settlement workflow 자체는 변경하지 않는다.
- 정산 화면에서 단가 인라인 수정, 일회성 override, 기간별 임시 단가 입력은 추가하지 않는다.
- 트레이너 리스트 테이블에 단가 컬럼을 기본 노출하지 않는다.
- `트레이너 관리로 이동`은 우선 리스트 화면 이동까지를 목표로 하고, 특정 트레이너 수정 모달 자동 오픈은 후속 판단으로 둔다.

## Context & Research

### Relevant Code and Patterns

- `frontend/src/pages/trainers/TrainersPage.tsx` already owns trainer create/edit/detail flows, panel messaging, and mock/live branching for trainer management.
- `frontend/src/pages/trainers/modules/types.ts` currently omits `ptSessionUnitPrice` and `gxSessionUnitPrice`, so type expansion is required before the UI can consume the backend contract.
- `backend/src/main/java/com/gymcrm/trainer/controller/TrainerController.java` already accepts `ptSessionUnitPrice` and `gxSessionUnitPrice` for create/update and returns them in admin detail responses.
- `frontend/src/pages/settlements/SettlementsPage.tsx` already differentiates manager preview/workspace and trainer mini-view, making it the right place to add read-only rate display and warning CTA.
- `frontend/src/pages/settlements/modules/types.ts` already carries `ptRatePerSession`, `gxRatePerSession`, and per-row warning fields in preview/workspace types.

### Institutional Learnings

- `docs/brainstorms/2026-04-03-settlements-analytics-and-trainer-payroll-requirements.md` already established that trainer stored rates are the source-of-truth for settlement calculation, so this plan should expose existing values rather than introducing alternate rate entry paths.

### External References

- None. Local repo patterns and the existing backend contract are sufficient for this work.

## Key Technical Decisions

- Expand trainer admin types instead of adding a separate rate-only query: the existing trainer detail/create/update contract already carries the needed fields, so the frontend should align to that contract rather than inventing a parallel settings surface.
- Keep the trainer list lightweight and push rate visibility into detail/modal surfaces: this preserves the current management table density while still making rates discoverable where operators make changes.
- Surface settlement rates from existing preview/workspace payloads: the settlement screen already receives per-row rates and warning metadata, so the work is primarily presentational plus CTA wiring.
- Use navigation-based remediation for missing rates: the first implementation should take operators to `trainers` rather than coupling settlement warnings to cross-page modal orchestration.

## Open Questions

### Resolved During Planning

- Trainer detail presentation should use the existing detail panel rather than a new dedicated settings page, because the repo already treats that panel as the place for richer trainer metadata.
- `트레이너 관리로 이동` should use route-level navigation to the trainer management screen first; auto-opening a specific trainer modal is intentionally deferred because it adds routing/state coupling across pages.

### Deferred to Implementation

- The exact visual treatment for rates in the trainer detail panel can be a simple `Descriptions` row or a compact summary card; the implementer should choose the lighter option that fits the existing layout without expanding modal complexity.
- The settlement warning CTA can navigate via router or existing page shell navigation depending on current page architecture; the plan does not force one exact navigation helper name.

## Implementation Units

- [x] **Unit 1: Align trainer frontend types and form payloads with stored rate fields**

**Goal:** Make the trainer management frontend capable of reading and writing PT/GX settlement rates through the existing trainer API contract.

**Requirements:** R1-R4, R9-R10

**Dependencies:** None

**Files:**
- Modify: `frontend/src/pages/trainers/modules/types.ts`
- Modify: `frontend/src/pages/trainers/TrainersPage.tsx`
- Modify: `frontend/src/api/mockData.ts`
- Test: `frontend/src/api/mockData.test.ts`
- Test: `frontend/src/pages/trainers/TrainersPage.test.tsx`

**Approach:**
- Extend `TrainerDetail` and `TrainerFormState` to include `ptSessionUnitPrice` and `gxSessionUnitPrice`.
- Ensure `createEmptyTrainerForm` and `createTrainerFormFromDetail` initialize rates consistently for create/edit flows.
- Update create/edit submit payloads in `TrainersPage.tsx` so mock/live requests send the two new fields without changing the surrounding permission or feedback logic.
- Mirror the same fields in mock trainer creation/update/detail helpers so test and mock mode behavior stays aligned with the backend contract.

**Patterns to follow:**
- `frontend/src/pages/trainers/TrainersPage.tsx` existing create/edit form branching and `isMockApiMode()` handling
- `frontend/src/api/mockData.ts` trainer CRUD helpers and returned `TrainerDetail` shape

**Test scenarios:**
- Happy path: creating a trainer with both rates sends `ptSessionUnitPrice` and `gxSessionUnitPrice` in the request payload and shows the success message.
- Happy path: editing a trainer with existing rates loads those values into the form and preserves them on submit when unchanged.
- Edge case: leaving one or both rate fields blank still allows submit and sends `null`/empty-equivalent payload consistent with the chosen frontend normalization.
- Integration: mock mode create/update returns detail data that rehydrates the trainer form and detail panel with the saved rates.

**Verification:**
- The trainer create/edit modal can submit with or without rates, and the payload/returned detail stays consistent in both mock and live branches.

- [x] **Unit 2: Expose stored rates in trainer detail and edit surfaces**

**Goal:** Make trainers the obvious source-of-truth screen for settlement rates.

**Requirements:** R1-R4, R9

**Dependencies:** Unit 1

**Files:**
- Modify: `frontend/src/pages/trainers/TrainersPage.tsx`
- Modify: `frontend/src/pages/trainers/TrainersPage.module.css`
- Test: `frontend/src/pages/trainers/TrainersPage.test.tsx`

**Approach:**
- Add `PT 회당 단가` and `GX 회당 단가` input controls to the trainer create/edit modal near other profile-level fields.
- Add read-only rate display to the trainer detail panel using the current `Descriptions`/summary composition rather than a new table or page section.
- Keep the list table unchanged to avoid crowding the management overview.

**Patterns to follow:**
- Existing `Descriptions` usage in `frontend/src/pages/trainers/TrainersPage.tsx`
- Existing modal field grouping in the trainer create/edit form

**Test scenarios:**
- Happy path: trainer detail panel shows both stored rates when present.
- Edge case: trainer detail panel renders an explicit empty-state label such as `미설정` when either rate is missing.
- Happy path: edit modal displays current saved rates and allows changing one rate without affecting the other.
- Error path: client-side validation for required login/name/password continues to behave the same after adding rate inputs.

**Verification:**
- An operator can open trainer detail, confirm current rates, open edit, and change rates without any new layout regressions in the list view.

- [x] **Unit 3: Add read-only rate visibility to settlement manager preview and trainer mini-view**

**Goal:** Let operators and trainers see which stored rates were applied to the current settlement preview.

**Requirements:** R5-R8

**Dependencies:** None

**Files:**
- Modify: `frontend/src/pages/settlements/SettlementsPage.tsx`
- Modify: `frontend/src/pages/settlements/modules/types.ts`
- Modify: `frontend/src/api/mockData.ts`
- Test: `frontend/src/pages/settlements/SettlementsPage.test.tsx`
- Test: `frontend/src/api/mockData.test.ts`

**Approach:**
- Expand the manager preview table columns to include independent `PT 단가` and `GX 단가` read-only columns using the existing `ptRatePerSession` and `gxRatePerSession` fields.
- Keep the trainer mini-view compact by surfacing rate information in the summary area or helper text rather than adding more table columns.
- Ensure mock preview data keeps representative rate values and missing-rate cases so the UI states remain testable.

**Patterns to follow:**
- Existing `trainerSettlementPreviewColumns` definition in `frontend/src/pages/settlements/SettlementsPage.tsx`
- Existing summary-card composition used in the trainer mini-view

**Test scenarios:**
- Happy path: manager preview renders PT/GX rate columns for a trainer row with stored rates.
- Edge case: manager preview shows a clear `미설정` state for null PT or GX rates instead of formatting them as zero.
- Happy path: trainer mini-view shows the applied stored rate values in its compact summary.
- Integration: mock preview responses containing rates and null warnings render correctly in both manager and trainer modes.

**Verification:**
- Operators can compare per-trainer PT/GX rates directly in the settlement table, and trainers can confirm which stored rates were used in their own preview.

- [x] **Unit 4: Add missing-rate remediation messaging and trainer-management navigation**

**Goal:** Turn settlement rate warnings into an actionable recovery path rather than a dead-end alert.

**Requirements:** R10-R13

**Dependencies:** Unit 3

**Files:**
- Modify: `frontend/src/pages/settlements/SettlementsPage.tsx`
- Modify: `frontend/src/pages/settlements/SettlementsPage.test.tsx`
- Test: `frontend/src/pages/settlements/SettlementsPage.test.tsx`

**Approach:**
- Replace the current generic missing-rate warning with copy that explicitly says rates should be configured in trainer management.
- Add a `트레이너 관리로 이동` action near the warning, using page-level route navigation to send the operator to the `trainers` screen without attempting to pre-open a specific detail or edit modal.
- Keep the warning read-only for trainer self-view; the navigation action belongs only in the operator-facing settlement workspace.

**Patterns to follow:**
- Existing `Alert`-based feedback blocks in `frontend/src/pages/settlements/SettlementsPage.tsx`
- Existing role split between `SettlementsManagerView` and `TrainerSettlementsMiniView`

**Test scenarios:**
- Happy path: when preview summary reports `hasRateWarnings`, the manager view shows the updated warning copy plus a `트레이너 관리로 이동` action.
- Edge case: the warning action is not rendered in trainer mini-view.
- Integration: clicking the CTA triggers the expected navigation behavior for the trainer management route.

**Verification:**
- A missing-rate preview now points the operator to the exact remediation surface instead of leaving them to infer the next step.

## System-Wide Impact

- **Interaction graph:** Trainer CRUD screens become the only writable rate surface; settlement preview/workspace becomes the read-only consumer of those stored values.
- **Error propagation:** Missing-rate states continue to originate from settlement preview data, but the frontend now translates them into explicit remediation messaging rather than a generic warning.
- **State lifecycle risks:** Expanding `TrainerDetail`/form types changes mock/live payload assumptions, so both create/edit hydration and settlement preview rendering must stay aligned to avoid stale UI state.
- **API surface parity:** The frontend trainer contract must match the already-shipped backend detail/create/update payloads carrying `ptSessionUnitPrice` and `gxSessionUnitPrice`.
- **Integration coverage:** Cross-screen behavior matters: trainer edits must persist rates that later appear in settlement preview, even if the tests validate this through aligned mocks rather than end-to-end browser automation.
- **Unchanged invariants:** Settlement calculation ownership stays in the backend; this plan only changes where operators can manage and inspect rates.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Frontend trainer types drift from backend detail payloads | Update shared frontend types and cover create/edit/detail tests in the same change set |
| Settlement rate display adds clutter to the preview table | Limit new columns to PT/GX rate only and keep trainer mini-view compact |
| Warning CTA creates awkward cross-page coupling | Scope the first version to route-level navigation to `trainers`, not modal orchestration |
| Mock mode diverges from live behavior | Update `frontend/src/api/mockData.ts` and its tests alongside UI changes |

## Documentation / Operational Notes

- If this ships, `docs/04_API_설계서.md` does not need a contract change for backend payload shape, but any frontend UX guidance or internal runbook that tells operators how to remediate settlement warnings should point to trainer management as the source-of-truth.

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-10-trainer-settlement-rate-entry-requirements.md`
- Related UI: `frontend/src/pages/trainers/TrainersPage.tsx`
- Related UI: `frontend/src/pages/settlements/SettlementsPage.tsx`
- Related contract: `backend/src/main/java/com/gymcrm/trainer/controller/TrainerController.java`
- Related contract: `backend/src/main/java/com/gymcrm/trainer/dto/response/TrainerAdminDetailResponse.java`
