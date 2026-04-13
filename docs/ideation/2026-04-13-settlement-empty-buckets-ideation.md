---
date: 2026-04-13
topic: settlement-empty-buckets
focus: include empty date buckets in settlements sales trend
---

# Ideation: Settlement Empty Buckets

## Codebase Context
- `SalesSettlementReportService` builds `trend` by mapping the grouped rows returned from `SalesSettlementReportRepository.findTrendRows(...)`.
- `findTrendRows(...)` currently groups only the buckets that actually exist in `payments`, so missing dates are not materialized.
- The frontend chart, trend table, and Excel export all consume the same `settlementReport.trend` array, so changing the shape at the backend would keep every surface aligned.
- The report result is cached, so any change to bucket generation should happen before cache storage to avoid mixing sparse and expanded representations.
- The current tests already exercise trend aggregation by granularity, which gives a natural place to lock in empty-bucket behavior.

## Ranked Ideas

### 1. Expand buckets in the backend report service
**Description:** Generate the full date sequence for the requested granularity between `startDate` and `endDate`, then left-join the real aggregates into that sequence so missing buckets come back with zero gross/refund/net/transaction values.
**Rationale:** This is the cleanest fix because the chart, trend table, and export all share the same source of truth. It also keeps the “bucket” meaning consistent for every consumer.
**Downsides:** Adds a little more service-layer logic and needs careful tests for daily/weekly/monthly/yearly boundaries.
**Confidence:** 96%
**Complexity:** Medium
**Status:** Unexplored

### 2. Push empty-bucket generation into the repository query
**Description:** Use database-native date generation or a calendar CTE so the SQL itself emits every bucket, even when no payments exist in that period.
**Rationale:** Keeps the service thinner and makes the bucket expansion happen as close as possible to the aggregate query.
**Downsides:** More SQL-specific, harder to read, and more likely to become Postgres-only if the implementation leans on `generate_series`.
**Confidence:** 82%
**Complexity:** Medium-High
**Status:** Unexplored

### 3. Add a presentation-only normalizer for the chart
**Description:** Leave `sales-report` sparse, but add a frontend helper that pads missing dates for the chart surface only.
**Rationale:** Fastest way to make the chart visually continuous without touching backend aggregation.
**Downsides:** The chart would disagree with the table and export, which makes the same bucket mean two different things on the same screen.
**Confidence:** 68%
**Complexity:** Low
**Status:** Unexplored

### 4. Add an explicit `includeEmptyBuckets` contract switch
**Description:** Introduce a report query option that controls whether the API returns sparse or complete trend data, so the empty-bucket behavior can be rolled out deliberately.
**Rationale:** Useful if we want a migration path or need to preserve the current sparse contract for one caller while changing another.
**Downsides:** More API surface, more branching, and more room for the same report to be interpreted differently across consumers.
**Confidence:** 72%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Keep the backend sparse and only annotate missing dates in the chart tooltip | The user still cannot scan the timeline itself, so the blank gap problem remains |
| 2 | Create a separate endpoint just for the chart | Duplicates the same aggregation logic and makes chart/table/export drift more likely |
| 3 | Fill empty buckets only in the frontend table | Makes the chart and table disagree about the same report period |

## Session Log
- 2026-04-13: Initial ideation - 4 candidate directions considered, 4 survivors kept
