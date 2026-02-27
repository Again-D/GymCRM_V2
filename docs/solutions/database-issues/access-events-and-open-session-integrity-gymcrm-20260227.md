---
title: "Access events/open session integrity validation (Phase 9)"
date: 2026-02-27
system: gymcrm-v2
category: database-issues
tags: [access-events, open-session, validation, phase9]
---

## Summary

Phase 9 출입 기능(`access_events`, `member_access_sessions`) 반영 후 운영 기준 정합성 쿼리로 핵심 불변식을 검증했다.

## Validation Queries

### 1) New tables exist

```sql
SELECT to_regclass('public.access_events') AS access_events_table,
       to_regclass('public.member_access_sessions') AS member_access_sessions_table;
```

Expected: 두 테이블 모두 null이 아니어야 함.

Result:
- `access_events`
- `member_access_sessions`

### 2) Single open session invariant

```sql
SELECT COUNT(*) AS open_session_duplicates
FROM (
  SELECT center_id, member_id
  FROM member_access_sessions
  WHERE exited_at IS NULL
  GROUP BY center_id, member_id
  HAVING COUNT(*) > 1
) t;
```

Expected: `0`

Result:
- `open_session_duplicates = 0`

### 3) ENTRY_DENIED deny reason invariant

```sql
SELECT COUNT(*) AS denied_without_reason
FROM access_events
WHERE event_type = 'ENTRY_DENIED'
  AND deny_reason IS NULL;
```

Expected: `0`

Result:
- `denied_without_reason = 0`

### 4) Session exit pairing invariant

```sql
SELECT COUNT(*) AS exit_pair_mismatch
FROM member_access_sessions
WHERE (exit_event_id IS NULL AND exited_at IS NOT NULL)
   OR (exit_event_id IS NOT NULL AND exited_at IS NULL)
   OR (exited_at IS NOT NULL AND exited_at < entry_at);
```

Expected: `0`

Result:
- `exit_pair_mismatch = 0`

## Operational Monitoring Notes

- 로그 검색 키워드
  - `"/api/v1/access/entry"`
  - `"/api/v1/access/exit"`
  - `"ENTRY_DENIED"`
- 조기 이상 신호
  - `ENTRY_DENIED` 급증
  - `open_session_duplicates > 0`
  - `exit_pair_mismatch > 0`
- 롤백/완화 트리거
  - 출입 처리 API에서 `CONFLICT`/`INTERNAL_ERROR`가 짧은 시간 급증하면 배포 롤백 또는 feature disable 검토
