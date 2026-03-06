# Audit Log Retention Checklist

Date: 2026-03-06  
Status: active

## Scope
- NFR-015 감사로그 1년 보존 검증
- 감사로그 조회/보존 배치 실행 기록 운영 절차 표준화

## API
- 감사로그 조회: `GET /api/v1/audit-logs`
- 보존 배치 실행기록 조회: `GET /api/v1/audit-logs/retention-runs`
- 보존 배치 실행기록 저장: `POST /api/v1/audit-logs/retention-runs`

## Required Queries
```sql
SELECT
  MIN(created_at) AS oldest_log_at,
  MAX(created_at) AS newest_log_at,
  EXTRACT(DAY FROM (MAX(created_at) - MIN(created_at))) AS retained_days
FROM audit_logs;
```

```sql
SELECT event_type, COUNT(*) AS cnt
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND event_type IN ('PII_READ', 'MEMBERSHIP_REFUND', 'ACCOUNT_ROLE_CHANGE')
GROUP BY event_type
ORDER BY event_type;
```

```sql
SELECT job_name, status, completed_at
FROM audit_retention_job_runs
WHERE job_name = 'audit_log_retention'
ORDER BY completed_at DESC
LIMIT 10;
```

## Log Patterns
- `audit_log_ingest_failed`
- `audit_retention_job_failed`
- `audit_event_missing_detected`

## Go/No-Go
- `retained_days >= 365`
- 최근 24시간 민감 이벤트 타입 로그 적재 누락 없음
- retention 배치 최근 실행 상태가 `SUCCESS` 또는 승인된 `PARTIAL`
