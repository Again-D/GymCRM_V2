# [P1] Phase 7 plan does not fix schedule capacity/current_count lifecycle semantics

## Problem
The plan introduces `trainer_schedules.current_count` and capacity checks, but does not define which reservation statuses contribute to `current_count`, when it increments/decrements, and how cancel/complete transitions affect it. Without this, concurrency strategy and data integrity checks can diverge during implementation.

## Suggested fix
- Define counted statuses explicitly (e.g. CONFIRMED only)
- Define transitions affecting count (`create +1`, `cancel -1`, `complete 0 if completed removes from capacity counting via separate active-count query` or `complete keeps count and capacity checks only for future slots`)
- Align DB/query strategy and integration tests to the chosen rule
