---
title: feat: Consolidate settlements KPI and reporting surfaces
type: feat
status: completed
date: 2026-04-27
origin: docs/brainstorms/2026-04-03-settlements-analytics-and-trainer-payroll-requirements.md
---

# feat: Consolidate settlements KPI and reporting surfaces

## Overview

This is a lightweight presentation pass over the existing `/settlements` sales analytics surface. The current page already fetches the right data and renders the right sections; the remaining work is to make KPI, trend/reporting, recent refund evidence, and export wording read as one coherent operational summary without changing data models or API contracts.

## Problem Frame

`frontend/src/pages/settlements/SettlementsPage.tsx` already shows summary cards, a trend section, a report table, an export action, and a recent adjustment list. However, the current hierarchy still lets KPI and reporting copy overlap. Operators should be able to land on `매출 분석`, read the top summary quickly, then move into trend, refund, and export evidence without the page repeating the same idea in multiple places.

The planning goal is not to build a new analytics system. It is to tighten the surface so the existing data reads as:

1. KPI summary
2. time-based reporting
3. recent refund evidence
4. export/share action

## Requirements Trace

- R28. `매출 분석` 탭 KPI는 현재 상태를 읽는 요약에 집중해야 한다.
- R29. Phase 2 must stay inside `/settlements` and must not add a new entry point or tab.
- R30. KPI, trend, refund, and export copy must not overlap in role.
- R31. The output should be surface organization and wording, not a new data model or export format.

## Scope Boundaries

- No backend changes.
- No new API routes, DTOs, or response fields.
- No new tab, route, or navigation surface.
- No export format change.
- No change to trainer payroll workflow beyond any shared tab copy.
- No new analytics metrics or additional aggregations.

## Context & Research

### Relevant Code and Patterns

- `frontend/src/pages/settlements/SettlementsPage.tsx` owns the sales analytics shell, KPI cards, trend reporting, export CTA, and recent adjustment table.
- `frontend/src/pages/settlements/modules/settlementTabs.ts` owns the tab metadata and summary copy for `매출 분석` and `트레이너 정산`.
- `frontend/src/pages/settlements/modules/useSalesDashboardQuery.ts` fetches the KPI payload from `/api/v1/settlements/sales-dashboard`.
- `frontend/src/pages/settlements/modules/useSettlementReportQuery.ts` fetches the trend/report payload from `/api/v1/settlements/sales-report`.
- `frontend/src/pages/settlements/modules/useSettlementRecentAdjustmentsQuery.ts` fetches the recent adjustment list from `/api/v1/settlements/sales-report/recent-adjustments`.
- `frontend/src/pages/settlements/SettlementsPage.test.tsx` already covers the sales analytics path, the chart rendering path, and the download/role split behavior.
- `docs/04_API_설계서.md` already documents the sales dashboard, report, recent-adjustments, and export endpoints, so no contract delta is expected.

### Institutional Learnings

- `docs/brainstorms/2026-04-03-settlements-analytics-and-trainer-payroll-requirements.md` already defines Phase 2 as a consolidation pass, not a new capability.
- The current implementation is close enough that the main risk is confusing the operator with overlapping language, not incorrect data retrieval.

### External References

- None. Local repo patterns and the current API contract are sufficient for this work.

## Key Technical Decisions

- Keep the work in the existing settlements page and adjacent tab metadata rather than splitting `/settlements` into new routes or nested page shells.
- Treat the top KPI row as the operational summary and the lower sections as supporting evidence.
- Keep recent refund evidence minimal and operator-facing. Use only the fields that help explain the recent change; do not surface memo or approval metadata in this pass.
- Preserve the existing export endpoint and filename behavior. Only the user-facing label and placement should change.
- Prefer small in-file presentation helpers over introducing a new page-level component tree for a copy/layout pass.

## Implementation Units

- [x] **Unit 1: Reframe the settlements tab shell and KPI hierarchy**

**Goal:** Make the top of `매출 분석` read as a concise operational summary instead of another report section.

**Requirements:** R28-R31

**Dependencies:** None

**Files:**
- Modify: `frontend/src/pages/settlements/SettlementsPage.tsx`
- Modify: `frontend/src/pages/settlements/modules/settlementTabs.ts`
- Test: `frontend/src/pages/settlements/SettlementsPage.test.tsx`

**Approach:**
- Tighten the `매출 분석` tab description so it describes the surface as an operational summary plus supporting evidence.
- Rename or rephrase the top KPI card labels and helper text so they clearly answer "what is the current status?" without repeating the trend/report language below.
- Keep the existing five KPI cards and current data source, but make the copy read as a summary layer rather than a second report.

**Patterns to follow:**
- Existing `Tabs` metadata in `frontend/src/pages/settlements/modules/settlementTabs.ts`
- Existing KPI row composition inside `frontend/src/pages/settlements/SettlementsPage.tsx`

**Test scenarios:**
- Manager view renders the updated sales analytics copy with the KPI row still present.
- The top KPI cards remain bound to the existing dashboard data and still show current values.
- The `매출 분석` tab description still matches the current `/settlements` navigation structure.

**Verification:**
- The top of the page reads like an operating summary, not a duplicate of the lower report cards.

- [x] **Unit 2: Tighten reporting, refund, and export wording**

**Goal:** Make the lower part of the sales analytics tab read as supporting evidence and export, not more KPI.

**Requirements:** R29-R31

**Dependencies:** Unit 1

**Files:**
- Modify: `frontend/src/pages/settlements/SettlementsPage.tsx`
- Test: `frontend/src/pages/settlements/SettlementsPage.test.tsx`

**Approach:**
- Reword the trend/report card title and helper copy so it is obvious that this section explains movement over time.
- Keep the recent adjustment table compact and operator-oriented; use the current minimal fields that explain the adjustment without adding detail noise.
- Update the export CTA copy so it reads as an operational report download action, while keeping the existing Excel download route and file naming behavior.
- Keep empty and loading states aligned with the new reporting language so they do not sound like a second KPI surface.

**Patterns to follow:**
- Existing `SettlementSalesTrendChart` and report table composition in `frontend/src/pages/settlements/SettlementsPage.tsx`
- Existing recent adjustment table and empty state handling in `frontend/src/pages/settlements/SettlementsPage.tsx`

**Test scenarios:**
- Manager view still renders the trend chart, trend table, and recent adjustment table after copy changes.
- The export button still triggers the existing Excel download path.
- Recent adjustment empty and loading states remain readable and continue to represent the refund evidence surface.

**Verification:**
- The lower half of the page feels like evidence plus export, not another competing KPI block.

- [x] **Unit 3: Lock the new surface hierarchy in tests**

**Goal:** Update the settlements page tests so the new wording and section boundaries do not drift back.

**Requirements:** R28-R31

**Dependencies:** Units 1-2

**Files:**
- Modify: `frontend/src/pages/settlements/SettlementsPage.test.tsx`

**Approach:**
- Refresh assertions for the updated tab description, KPI section copy, reporting section copy, and export CTA wording.
- Keep the existing functional coverage for chart rendering, trainer role separation, and navigation behavior.
- Add assertions that protect against accidental overlap between the summary, reporting, and refund surfaces.

**Patterns to follow:**
- Existing `SettlementsPage.test.tsx` manager/trainer role split and sales chart assertions

**Test scenarios:**
- Manager view shows the revised sales analytics hierarchy and still exposes the export action.
- Trainer view remains unchanged in behavior and does not inherit manager-only reporting actions.
- The chart, table, and recent adjustments sections still render when the page is switched between tabs.

**Verification:**
- The tests describe the intended hierarchy clearly enough that a future copy tweak cannot blur the product boundary again.

## System-Wide Impact

- **Interaction graph:** This change only reshapes the existing frontend presentation. The same query hooks continue to supply KPI, trend, and recent adjustment data.
- **Error propagation:** Existing query errors still surface through the same page-level alerts; this plan does not change error handling.
- **State lifecycle risks:** Because this is a wording/layout pass, the main risk is overfitting copy and accidentally making the page feel more fragmented. Keeping the surface within the current page avoids that.
- **API surface parity:** No backend contract changes are expected, and `docs/04_API_설계서.md` should remain valid as-is.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Copy changes make the page feel too verbose | Keep the KPI row short and move explanation into section helper text only |
| Recent refund surface starts competing with the KPI row | Keep that table minimal and position it as evidence, not summary |
| Export CTA becomes inconsistent with the existing download path | Preserve the current `apiDownload` behavior and only change the label/copy |
| Tab metadata drifts away from the page hierarchy | Update `settlementTabs.ts` together with the page copy and test assertions |

## Documentation / Operational Notes

- No API doc update is expected for this pass.
- If any later work changes the sales dashboard or report response shape, `docs/04_API_설계서.md` should be revisited separately.

## Sources & References

- Origin document: `docs/brainstorms/2026-04-03-settlements-analytics-and-trainer-payroll-requirements.md`
- Related implementation: `frontend/src/pages/settlements/SettlementsPage.tsx`
- Related implementation: `frontend/src/pages/settlements/modules/settlementTabs.ts`
- Related implementation: `frontend/src/pages/settlements/modules/useSalesDashboardQuery.ts`
- Related implementation: `frontend/src/pages/settlements/modules/useSettlementReportQuery.ts`
- Related implementation: `frontend/src/pages/settlements/modules/useSettlementRecentAdjustmentsQuery.ts`
- Related contract: `docs/04_API_설계서.md`
