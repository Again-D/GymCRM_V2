---
title: PII key rotation rollout validation
status: pending
date: 2026-05-06
origin:
  - docs/plans/2026-05-06-001-feat-pii-key-rotation-lazy-batch-plan.md
  - docs/ops/pii-key-rotation-runbook.md
---

# PII Key Rotation Rollout Validation

This note tracks the evidence and healthy signals for the PII key rotation rollout.

## Scope

- Version-aware PII decryption
- Lazy upgrade path in member read/write flows
- Batch convergence scheduler for stale rows
- Plaintext persistence for search/uniqueness stability
- Audit isolation for rotation tasks

## Validation Queries

### Q1: Row Count by PII Key Version
Use this to track convergence progress.

```sql
SELECT
    pii_key_version,
    COUNT(*) AS row_count
FROM members
WHERE is_deleted = FALSE
GROUP BY pii_key_version
ORDER BY pii_key_version ASC;
```

### Q2: Stale Rows vs Active Version
Identify rows that still need rotation.

```sql
-- Replace :activeVersion with app.security.pii.key-version
SELECT COUNT(*) AS stale_row_count
FROM members
WHERE pii_key_version IS NULL OR pii_key_version < :activeVersion;
```

### Q3: Batch Job Evidence
Inspect recent scheduler run summaries.

```sql
SELECT
    audit_retention_job_run_id,
    job_name,
    started_at,
    completed_at,
    status,
    created_by,
    details_json
FROM audit_retention_job_runs
WHERE job_name = 'member_pii_rotation_batch'
ORDER BY completed_at DESC, audit_retention_job_run_id DESC
LIMIT 10;
```

### Q4: Member-Level Audit Isolation Check
Rotation itself should not create member-level `PII_READ` noise.

```sql
SELECT audit_log_id, event_type, resource_type, resource_id, event_at, attributes_json
FROM audit_logs
WHERE resource_type = 'MEMBER'
  AND resource_id = :memberId::text
ORDER BY audit_log_id DESC
LIMIT 20;
```

## Log Validation Patterns

### Scheduler Start/Completion
Search for these patterns in the application logs:

- **Start**: `Starting member PII rotation batch: candidates=.*, activeKeyVersion=.*`
- **Completion**: `Completed member PII rotation batch: totalCandidates=.*, upgraded=.*, skipped=.*, failed=.*, activeKeyVersion=.*, status=.*`
- **Skip**: `Skipping member PII rotation batch: feature flag disabled`

### Error Monitoring
Check for individual row failures:

- `Failed to rotate member PII in batch. memberId=.*`

## Expected Healthy Signals

- **Convergence**: Q1 shows row counts shifting from older versions to the active version over time.
- **Search Stable**: Keyword search for a member by phone (e.g., `GET /api/v1/members?keyword=01012345678`) returns the same member record before and after their row is rotated.
- **Read Stable**: Member detail access (e.g., `GET /api/v1/members/{id}`) works for rows on both the old and new key versions.
- **Batch Evidence Present**: Q3 shows recent rows for `member_pii_rotation_batch`, and `details_json` includes `activeKeyVersion`, `totalCandidates`, `upgradedCount`, `skippedCount`, and `failedCount`.
- **Audit Neutrality**: Q4 shows no member-level `PII_READ` entries created solely by scheduler or lazy-rotation work. User-triggered member detail reads may still emit the existing `PII_READ` audit event.

## Validation Status

| Check | Expected | Result | Date |
|---|---|---|---|
| Lazy Upgrade Smoke | Detail read upgrades version | | |
| Batch Job Success | evidence row exists + acceptable `status`/`failedCount` | | |
| Search Regression | Same result count | | |
| Stale Row Convergence | Q2 count reaches 0 | | |

## Operational Notes

- Plaintext phone remains the search/uniqueness source of truth.
- Do not sign off until Q2 returns zero and old keys remain available through the validation buffer.
- Scheduler actor identity is verified through `MemberPiiRotationSchedulerActorGuard`.
- Current scheduler evidence is stored in `audit_retention_job_runs.details_json`; use the persisted JSON plus log summaries for go/no-go decisions.
