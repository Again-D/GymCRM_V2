# Security Phase NFR-015 Validation Snapshot (2026-03-06)

## Source
- Related implementation PR: [#54](https://github.com/Again-D/GymCRM_V2/pull/54)
- Data source: `audit_logs`, `audit_retention_job_runs` (dev DB)
- Query execution environment: `gymcrm-postgres` container (`postgres:16`)

## Executed Queries & Results

### Q1. Retention span
```sql
SELECT MIN(created_at), MAX(created_at), EXTRACT(DAY FROM (MAX(created_at)-MIN(created_at)))
FROM audit_logs;
```

Result:
- `oldest_log_at`: `2026-03-06 08:43:51.409099+00`
- `newest_log_at`: `2026-03-06 08:43:51.409099+00`
- `retained_days`: `0`

Note:
- dev 환경 신규 데이터 기준으로 보존 기간은 아직 축적되지 않음.
- production gate는 `retained_days >= 365`를 기준으로 판단.

### Q2. Sensitive event ingestion (last 24h)
```sql
SELECT event_type, COUNT(*)
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY event_type;
```

Result:
- `PII_READ`: `1`

### Q3. Retention job runs
```sql
SELECT job_name, status, completed_at
FROM audit_retention_job_runs
WHERE job_name='audit_log_retention'
ORDER BY completed_at DESC
LIMIT 10;
```

Result:
- `audit_log_retention | SUCCESS | 2026-03-06 08:43:51.557844+00`
