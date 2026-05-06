# PII Key Rotation Runbook

This runbook documents the staged rollout and rollback path for member PII key rotation using the mixed lazy + batch strategy. The current milestone keeps plaintext `phone` as the search and uniqueness source of truth while converging encrypted data to the active `pii_key_version`.

## 0) Prerequisites

- Add the new versioned key material to `app.security.pii.keys` before promoting a new active version.
- Keep old key material available until stale-version row count reaches zero and the validation note is signed off.
- Treat plaintext `phone` and `birth_date` persistence as an invariant in this milestone. Rotation must not remove or null these fields for healthy rows.

## 1) Configuration Surface

The rollout is controlled by the following application properties:

| Property | Default | Description |
|---|---|---|
| `app.security.pii.rotation-enabled` | `false` | Enables version-aware decrypt and lazy upgrade during normal member flows. |
| `app.security.pii.key-version` | `1` | Active key version used for new writes and successful upgrades. |
| `app.security.pii.keys` | `{}` | Version-to-key map for mixed-version decrypt support. |
| `app.security.pii.rotation-batch.enabled` | `false` | Enables the background batch convergence scheduler. |
| `app.security.pii.rotation-batch.cron` | `0 */5 * * * *` | Batch scheduler frequency. |
| `app.security.pii.rotation-batch.batch-size` | `100` | Max stale rows per batch run. |
| `app.security.pii.rotation-batch.stale-updated-before` | `PT5M` | Recently updated row exclusion buffer. |

## 2) Rollout Order

고정 순서:

1. **Phase A: Key Provisioning**
   - Add the new key to `app.security.pii.keys`.
   - Keep `app.security.pii.key-version` on the current stable version.
   - Confirm both old and new key versions are present in the deployed environment.
2. **Phase B: Enable Lazy Rotation**
   - Advance `app.security.pii.key-version` to the new version.
   - Set `app.security.pii.rotation-enabled=true`.
   - Keep `app.security.pii.rotation-batch.enabled=false` initially.
   - Verify member detail reads and writes on mixed-version rows before enabling the scheduler.
3. **Phase C: Enable Batch Convergence**
   - Set `app.security.pii.rotation-batch.enabled=true`.
   - Start with conservative `batch-size` and the default stale-update buffer.
   - Monitor log summaries and `audit_retention_job_runs` evidence until stale rows converge to zero.

이 순서를 유지하는 이유:

- Lazy rotation proves mixed-version reads first, reducing the blast radius before background churn begins.
- Batch convergence is operationally useful only after version-aware decrypt has been verified on live reads.
- Old keys must remain available throughout the convergence window because stale ciphertext may still exist until Q2 reaches zero.

## 3) Rollout And Rollback Rules

### Phase A: Key Provisioning

- Enable:
  - add new entry to `app.security.pii.keys`
- Healthy signals:
  - application starts without key-binding errors
  - no config validation errors referencing the active version
- Failure signals:
  - boot failure after adding key map entries
  - active version configured without a corresponding key
- Rollback action:
  - restore previous environment/config and redeploy

### Phase B: Lazy Rotation

- Enable:
  - `app.security.pii.rotation-enabled=true`
  - `app.security.pii.key-version=<newVersion>`
  - keep `app.security.pii.rotation-batch.enabled=false`
- Healthy signals:
  - member detail reads succeed for stale-version rows
  - member create/update persists the active `pii_key_version`
  - `/api/v1/members` phone search behavior remains unchanged
  - rotation work does not create member-level `PII_READ` noise on its own
- Failure signals:
  - decrypt/key-version errors on member detail reads
  - phone search mismatch after lazy upgrade
  - unexpected member-level audit noise from system-internal rotation
- Rollback trigger:
  - any sustained member-detail decrypt failure during rollout window
  - any search regression tied to rotation enablement
- Rollback action:
  - `app.security.pii.rotation-enabled=false`
  - if needed, revert `app.security.pii.key-version` to the previous stable version

### Phase C: Batch Convergence

- Enable:
  - `app.security.pii.rotation-batch.enabled=true`
- Healthy signals:
  - application logs include `Completed member PII rotation batch` with expected counters
  - `audit_retention_job_runs` contains rows for `member_pii_rotation_batch`
  - stale-version row count trends down across validation windows
- Failure signals:
  - repeated non-zero `failed` counts or repeated `PARTIAL`/`FAILED` job runs
  - stale row counts stop decreasing while the scheduler is enabled
  - DB pressure or lock contention grows during the batch window
- Rollback trigger:
  - repeated row-level failures above the staging baseline
  - operational degradation tied to batch runs
- Rollback action:
  - `app.security.pii.rotation-batch.enabled=false`
  - keep `app.security.pii.rotation-enabled=true` only if lazy path remains healthy

## 4) Validation Window And Owner

| Control area | Validation window | Primary owner | Healthy signal | Failure signal |
|---|---|---|---|---|
| Lazy read stability | enable 직후 + same-day smoke | backend owner | mixed-version detail reads succeed | decrypt/key-version error on member detail |
| Search stability | first validation window after lazy enable | backend owner | same phone-search results before/after rotation | result mismatch or latency regression |
| Batch convergence | first 30 minutes after batch enable + daily follow-up | backend owner | stale count decreases, job runs `SUCCESS` or acceptable `PARTIAL` only | failed row counts repeat or stale count stalls |

현재 문서에서는 owner를 역할 기준 `backend owner`로 둔다. 실제 배포 시점에는 PR의 `Post-Deploy Monitoring & Validation` 섹션 또는 validation note에 담당자 이름을 채운다.

## 5) Required Evidence

- Execute and attach the queries/log checks from `docs/notes/2026-05-06-pii-key-rotation-validation.md`.
- Capture at least:
  - row counts by `pii_key_version`
  - stale row count vs active version
  - recent `audit_retention_job_runs` evidence for `member_pii_rotation_batch`
  - member detail and phone search smoke results

## 6) Sign-Off Rule

- Do not remove old key material until:
  - stale row count is zero,
  - recent batch evidence is stable,
  - member detail and search smoke remain healthy,
  - and the validation note is signed off.
