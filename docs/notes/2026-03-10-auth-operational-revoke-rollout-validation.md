---
title: Auth operational revoke rollout validation
status: completed
date: 2026-03-10
origin:
  - docs/plans/2026-03-10-feat-auth-revoke-operational-event-connection-plan.md
  - docs/notes/2026-03-10-redis-runtime-rollout-validation.md
---

# Auth Operational Revoke Rollout Validation

## Scope

- forced revoke admin endpoint
- role downgrade revoke connection
- user deactivation revoke connection
- JWT filter revoke-after enforcement
- refresh token revoke alignment

## Canonical / Runtime Sources

- canonical revoke marker: PostgreSQL `users.access_revoked_after`
- runtime mirror: Redis `auth:revoke-after:user:{userId}`
- refresh token canonical: PostgreSQL `auth_refresh_tokens`

## Validation Queries

```sql
SELECT user_id, login_id, role_code, user_status, access_revoked_after
FROM users
WHERE user_id = :userId;
```

```sql
SELECT refresh_token_id, user_id, revoke_reason, revoked_at
FROM auth_refresh_tokens
WHERE user_id = :userId
ORDER BY refresh_token_id DESC;
```

```sql
SELECT audit_log_id, event_type, resource_type, resource_id, event_at, attributes_json
FROM audit_logs
WHERE resource_type = 'USER'
  AND resource_id = :userId::text
ORDER BY audit_log_id DESC
LIMIT 20;
```

## Expected Healthy Signals

- forced revoke after admin action:
  - `users.access_revoked_after` is non-null and updated to current timestamp window
  - active refresh tokens are revoked with reason `FORCED_REVOKE`
  - old access token requests fail with `401 TOKEN_REVOKED`
- role downgrade after admin action:
  - `users.role_code` reflects new role
  - `users.access_revoked_after` advances
  - active refresh tokens are revoked with reason `ROLE_CHANGED`
  - old access token requests fail with `401 TOKEN_REVOKED`
- user deactivation after admin action:
  - `users.user_status = INACTIVE`
  - `users.access_revoked_after` advances
  - active refresh tokens are revoked with reason `STATUS_CHANGED`
  - old access token requests fail with `401 TOKEN_REVOKED`
- audit events exist:
  - `ACCOUNT_ACCESS_REVOKE`
  - `ACCOUNT_ROLE_CHANGE`
  - `ACCOUNT_STATUS_CHANGE`

## Failure Signals / Rollback Trigger

- admin mutation succeeds but `access_revoked_after` remains null
- old access token still reaches protected endpoints after forced revoke / role change / deactivation
- refresh token can still rotate after role change / deactivation
- expected audit event row is missing

Immediate mitigation:
- disable admin mutation usage for the affected path
- if needed, temporarily revert to previous auth behavior by rolling back the deployment containing this feature
- verify PostgreSQL write path first, then Redis mirror health

## Targeted Test Commands

```bash
cd backend
./gradlew test --tests com.gymcrm.auth.AuthOperationalAccessRevokeIntegrationTest \
  --tests com.gymcrm.auth.AuthAccessRevokeAfterIntegrationTest \
  --tests com.gymcrm.auth.AuthControllerIntegrationTest \
  --tests com.gymcrm.auth.AuthAccessDenylistIntegrationTest \
  --tests com.gymcrm.auth.RbacAuthorizationIntegrationTest \
  --tests com.gymcrm.audit.AuditLogApiIntegrationTest
```

```bash
cd backend && ./gradlew test
```

## Notes

- Redis read miss degrades to PostgreSQL canonical fallback.
- refresh token canonical source remains PostgreSQL.
- denylist and revoke-after are both enforced; either path can produce `401 TOKEN_REVOKED`.
