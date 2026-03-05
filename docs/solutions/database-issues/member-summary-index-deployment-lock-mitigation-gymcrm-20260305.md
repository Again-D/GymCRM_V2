---
module: Gym CRM Member
date: 2026-03-05
problem_type: database_issue
component: database
symptoms:
  - "Index build on member_memberships can increase write lock wait during deploy"
  - "members list API latency may spike while index is being created"
root_cause: missing_workflow_step
resolution_type: process_update
severity: high
tags: [member-summary, index, migration, flyway, deployment, lock]
---

# Deployment Checklist: Member Summary Index Lock Mitigation

## Context

- Target migration: `backend/src/main/resources/db/migration/V13__add_member_summary_lookup_index.sql`
- New index:
  - `idx_member_memberships_center_member_status_end_date`
  - `(center_id, member_id, membership_status, end_date, membership_id)`
  - `WHERE is_deleted = FALSE`

Because `V13` is already merged and migration files should remain immutable, lock risk is controlled with **pre-deploy concurrent index creation** and Go/No-Go verification.

## Invariants

- [ ] `/api/v1/members` success rate remains stable during deploy window
- [ ] `member_memberships` write traffic does not show sustained lock-wait growth
- [ ] Final index exists with expected definition

## Pre-Deploy (Required)

Run on production DB before application rollout:

```sql
-- 1) Baseline members API related write/load signal
SELECT now() AS captured_at;

-- 2) Check index already exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'member_memberships'
  AND indexname = 'idx_member_memberships_center_member_status_end_date';
```

If index does not exist, create it with minimal locking:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_member_memberships_center_member_status_end_date
ON member_memberships (center_id, member_id, membership_status, end_date, membership_id)
WHERE is_deleted = FALSE;
```

Go/No-Go:
- Stop deploy if concurrent index creation fails.
- Stop deploy if lock waits remain elevated for more than 5 minutes.

## Deploy Steps

1. [ ] Run pre-deploy concurrent index creation (if needed)
2. [ ] Deploy application including PR #35 commit
3. [ ] Verify Flyway migration step for `V13` completed successfully

## Post-Deploy Verification (Within 5 Minutes)

```sql
-- Verify index definition
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'member_memberships'
  AND indexname = 'idx_member_memberships_center_member_status_end_date';
```

Application checks:

- [ ] `/api/v1/members` error logs: no new migration/query errors
- [ ] `/api/v1/members` p95 latency: no sustained regression

## Rollback Plan

- Code rollback: redeploy previous application commit.
- Data rollback: index can remain (read optimization only); no data transformation involved.
- Emergency option:

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_member_memberships_center_member_status_end_date;
```

## Notes

- Do not edit already-applied migration versions in-place to avoid Flyway checksum mismatch.
- This checklist is the operational mitigation path for the lock-risk finding documented in todo `053`.
