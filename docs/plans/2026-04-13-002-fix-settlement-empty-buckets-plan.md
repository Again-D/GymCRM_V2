---
title: fix: Include empty buckets in settlement trends
type: fix
status: completed
date: 2026-04-13
origin: docs/brainstorms/2026-04-13-settlement-empty-buckets-requirements.md
---

# fix: Include empty buckets in settlement trends

## Overview

`/settlements`의 `sales-report`가 실제 집계가 있는 bucket만 내려주고 있어, 일별 추이에서 빈 날짜가 사라진다. 이번 수정은 `trendGranularity`에 따라 조회 기간 전체의 bucket을 연속적으로 materialize하고, 거래가 없는 bucket은 `0` 값으로 채워서 차트, 표, Excel export가 같은 시계열을 읽도록 만드는 것이다.

## Problem Frame

현재 `SalesSettlementReportService`는 `SalesSettlementReportRepository.findTrendRows(...)`가 반환한 그룹 결과를 그대로 `trend`로 변환한다. 이 방식은 데이터가 있는 bucket만 보여주므로 운영자가 조회 기간 전체를 끊김 없이 읽기 어렵고, 같은 `trend`를 공유하는 차트/표/export의 의미도 sparse하게 남는다. 요구사항 문서의 결정대로, 빈 bucket 보정은 소비자별이 아니라 `sales-report` 응답 수준에서 일관되게 적용되어야 한다. (see origin: `docs/brainstorms/2026-04-13-settlement-empty-buckets-requirements.md`)

## Requirements Trace

- R1. 조회 기간의 bucket은 연속적으로 표현되어야 한다.
- R2. `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` 모두에 대해 전체 bucket을 포함해야 한다.
- R3. 실제 거래가 없는 bucket은 `0` 값으로 채워 포함해야 한다.
- R4. bucket 순서는 조회 기간의 시간 순서를 유지해야 한다.
- R5. 차트, 추이 표, Excel export는 동일한 `trend` 시퀀스를 사용해야 한다.
- R6. 빈 bucket 보정은 `sales-report` 응답 수준에서 적용되어야 한다.

## Scope Boundaries

- `recent-adjustments`는 이번 수정 범위에 포함하지 않는다.
- bucket label 포맷은 유지한다. 빈 bucket 채우기는 기존 라벨 생성 규칙을 바꾸지 않는다.
- 프론트 차트 스타일, 축 설정, 레전드 표시는 변경하지 않는다.
- API 응답 계약의 필드 형태는 유지하고, 값만 0으로 보정한다.

## Context & Research

### Relevant Code and Patterns

- `backend/src/main/java/com/gymcrm/settlement/service/SalesSettlementReportService.java` already owns the report assembly, cache write, and granularity label formatting.
- `backend/src/main/java/com/gymcrm/settlement/repository/SalesSettlementReportRepository.java` already returns grouped trend rows by `bucketStartDate`; the new behavior should layer on top of that instead of duplicating report logic in the repository contract.
- `backend/src/main/java/com/gymcrm/settlement/SalesSettlementCsvExporter.java` exports the same `trend` payload into the Excel Trend sheet, so keeping `trend` normalized upstream preserves export parity.
- `backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceTest.java` already covers cache hits, timezone boundaries, and granularity label mapping, making it the natural place for focused unit coverage.
- `backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceIntegrationTest.java` already exercises real purchase/refund data across daily and non-daily granularities, which is the right place to prove the sequence is filled for an actual report.
- `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java` and `backend/src/test/java/com/gymcrm/settlement/SalesSettlementCsvExporterTest.java` already verify the public API and export surfaces that consume `trend`.

### Institutional Learnings

- No relevant `docs/solutions/` entry was found for settlement trend bucket expansion. Existing settlements tests show the team prefers service-level report normalization plus integration coverage at the API/export boundaries.

### External References

- None required. This is a repo-local reporting normalization change, and the current backend patterns are sufficient to plan it.

## Key Technical Decisions

- Normalize empty buckets in the report service before caching the result: this keeps all downstream consumers aligned and avoids per-surface padding logic.
- Keep repository SQL focused on grouped aggregates only: the repository should continue to return actual payment-derived buckets, while the service is responsible for filling the full range.
- Preserve the existing `bucketLabel` derivation: the new work changes completeness, not the human-readable label format.

## Open Questions

### Resolved During Planning

- Should empty buckets be filled for daily only, or for all granularities? Resolved: all four granularities (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`) should be filled so the report stays contiguous regardless of view.
- Should the change live in the frontend chart, the repository, or the report service? Resolved: the report service should own it so chart, table, and export remain consistent.

### Deferred to Implementation

- The exact helper shape for generating and merging the bucket sequence will be finalized while implementing the service changes.
- The most concise way to assert the zero-filled sequence in tests may depend on the final helper boundaries.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```text
sales-report request
  -> validate query and compute date range + granularity
  -> repository returns grouped trend rows for real activity only
  -> service expands the full bucket sequence for the requested range
  -> service overlays actual aggregates onto that sequence, filling gaps with 0
  -> cache and return normalized report
```

## Implementation Units

- [x] **Unit 1: Add empty-bucket expansion to the settlement report service**

**Goal:** Materialize the full bucket sequence for the requested date range and merge the real aggregates into it before the report is cached or returned.

**Requirements:** R1, R2, R3, R4, R5, R6

**Dependencies:** None

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/settlement/service/SalesSettlementReportService.java`
- Test: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceTest.java`

**Approach:**
- Keep the repository query as the source of actual trend rows, but add service-level expansion/merge logic so missing buckets become explicit zero-valued points.
- Reuse the existing granularity label logic so the new sequence preserves current labels and ordering.
- Make the merge deterministic so cache keys and repeated requests produce identical `trend` payloads for the same query.

**Patterns to follow:**
- `backend/src/main/java/com/gymcrm/settlement/service/SalesSettlementReportService.java` existing report assembly and cache flow
- `backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceTest.java` existing mock-based service coverage style

**Test scenarios:**
- Happy path: a daily report with gaps between real payment dates returns `trend` entries for every date in the range, with missing dates set to zero.
- Happy path: weekly, monthly, and yearly reports preserve the existing label format while filling missing buckets.
- Edge case: a date range with no matching trend rows returns a full zero-filled sequence rather than an empty `trend`.
- Edge case: the first and last dates in the range are included even when the range starts or ends on a bucket boundary.
- Error path: invalid `trendGranularity` still fails with the existing validation error and does not attempt sequence generation.
- Integration: cache population uses the normalized trend sequence, so a cache hit returns the same filled buckets that the original load produced.

**Verification:**
- `SalesSettlementReportService.getReport(...)` returns a contiguous `trend` sequence for all supported granularities without changing summary totals.

- [x] **Unit 2: Prove the filled sequence with real settlement data and public contract checks**

**Goal:** Lock in the full-bucket behavior with integration coverage at the API and export surfaces, using real report generation rather than only mocked service data.

**Requirements:** R1, R2, R3, R4, R5, R6

**Dependencies:** Unit 1

**Files:**
- Modify: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceIntegrationTest.java`
- Modify: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java`
- Modify: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementCsvExporterTest.java`

**Approach:**
- Add an integration scenario that seeds sparse activity over a date range and asserts the returned report includes the missing bucket dates as zero-valued points.
- Extend API-level coverage so the JSON response keeps the same report contract while now returning the expanded `trend`.
- Extend export coverage so the Trend sheet reflects the same filled bucket sequence as the API response.

**Patterns to follow:**
- `backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceIntegrationTest.java` real purchase/refund setup and assertions
- `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java` HTTP boundary assertions with `MockMvc`
- `backend/src/test/java/com/gymcrm/settlement/SalesSettlementCsvExporterTest.java` workbook assertions for the Trend sheet

**Test scenarios:**
- Happy path: a daily report with data on only some dates returns zero-valued buckets for the missing dates in the service integration test.
- Happy path: the API returns the same filled `trend` sequence in JSON, including zero-valued missing buckets.
- Happy path: the Excel Trend sheet contains the same filled bucket rows as the API report.
- Edge case: weekly/monthly/yearly reports still preserve their existing labels while including empty buckets.
- Error path: API validation for invalid `trendGranularity` remains unchanged and still rejects bad inputs.
- Integration: a report that is cached and later re-read preserves the filled sequence across the cache boundary.

**Verification:**
- The public `sales-report` contract now returns contiguous trend data in both JSON and Excel outputs, and the API/export surfaces stay aligned.

## System-Wide Impact

- **Interaction graph:** `SalesSettlementReportService` remains the normalization point for `sales-report`; the controller, CSV exporter, and frontend chart/table all consume the same normalized `trend`.
- **Error propagation:** Validation errors should behave exactly as before; only the shape of successful trend payloads changes.
- **State lifecycle risks:** Cache entries must store the expanded trend sequence so a later cache hit does not reintroduce sparse results.
- **API surface parity:** No new endpoint or payload shape is introduced, but existing consumers of `trend` now receive zero-filled gaps for all supported granularities.
- **Integration coverage:** Unit tests alone will not prove parity across JSON and Excel; the API and exporter tests must assert the same bucket completeness.
- **Unchanged invariants:** `totalGrossSales`, `totalRefundAmount`, `totalNetSales`, `paymentMethod`, `productKeyword`, and existing validation behavior remain unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Bucket expansion logic miscomputes weekly/monthly/yearly boundaries | Keep the granularity label logic as-is and cover each granularity with explicit tests over a bounded date range |
| Filled zero buckets change cache payloads and could expose inconsistencies if only part of the stack is updated | Normalize before caching and verify the API/export surfaces against the same service output |
| Overfitting the implementation to one granularity creates hidden gaps in the others | Make all four granularities first-class requirements and test each one at least once |

## Documentation / Operational Notes

- No API contract documentation change is required because the response shape stays the same; only completeness of `trend` changes.
- If the implementation reveals an especially non-obvious bucket boundary rule, capture it in a short follow-up solution note rather than broadening this plan.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-13-settlement-empty-buckets-requirements.md](docs/brainstorms/2026-04-13-settlement-empty-buckets-requirements.md)
- Related code: `backend/src/main/java/com/gymcrm/settlement/service/SalesSettlementReportService.java`
- Related code: `backend/src/main/java/com/gymcrm/settlement/repository/SalesSettlementReportRepository.java`
- Related code: `backend/src/main/java/com/gymcrm/settlement/SalesSettlementCsvExporter.java`
- Related tests: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceTest.java`
- Related tests: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementReportServiceIntegrationTest.java`
- Related tests: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementApiIntegrationTest.java`
- Related tests: `backend/src/test/java/com/gymcrm/settlement/SalesSettlementCsvExporterTest.java`
