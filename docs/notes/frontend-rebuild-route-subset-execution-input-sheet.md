# Frontend Rebuild Route Subset Evaluation Execution Input Sheet

Date: 2026-03-13

## Purpose

이 문서는 `controlled route subset evaluation`을 실제로 시작하기 전에 반드시 채워야 하는 실행 입력값 시트다.

이 시트는 아래 문서들과 함께 사용한다.

- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-rebuild-route-subset-evaluation-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-execution-procedure.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-final-checklist.md`

## Evaluation Scope

이번 평가 범위:

- `/members`
- `/memberships`
- `/reservations`
- `/access`

평가 목적:
- full swap이 아니라 `internal-only route subset evaluation`
- baseline 유지 + rebuild 별도 노출 + rollback 가능성 확인

## 1. URL Contract

### Baseline URL
- Value: `http://127.0.0.1:5173`
- Owner: local evaluator
- Notes: baseline Vite dev server local rehearsal URL

### Rebuild Internal-Only URL
- Value: `http://127.0.0.1:5175`
- Owner: local evaluator
- Notes: rebuild Vite dev server local alternate-entry URL

### URL Exposure Rule
- Who can access rebuild URL?
  - local evaluator only
- How is access restricted?
  - local machine loopback URL only
- Is baseline URL guaranteed to remain default?
  - yes

## 2. Exposure and Rollback Owners

### Exposure Owner
- Name / team:
  - abc
- Responsibility:
  - baseline/rebuild URL 분리 유지

### Rollback Decision Owner
- Name / team:
  - abc
- Responsibility:
  - rebuild URL 평가 중단 및 baseline-only 복귀 판단

### Reviewer / Approver
- Name / team:
  - abc
- Responsibility:
  - 결과 문서 정리 및 blocker 분류

### Evidence Recorder
- Name / team:
  - abc
- Responsibility:
  - screenshot / note / decision 기록

## 3. Role Accounts For Evaluation

### Admin
- Login ID:
  - N/A
- Password delivery method:
  - N/A
- Notes:
  - 이번 실행은 backend health가 `prototypeNoAuth=true`로 떠서 role smoke 대신 local rehearsal로 수행

### Desk
- Login ID:
  - N/A
- Password delivery method:
  - N/A
- Notes:
  - local rehearsal only

### Trainer
- Login ID:
  - N/A
- Password delivery method:
  - N/A
- Notes:
  - local rehearsal only

## 4. Evaluation Window

- Planned start:
  - 2026-03-13 local rehearsal
- Planned end:
  - same-session completion
- Local timezone:
  - Asia/Seoul
- Who will actively observe the session?
  - abc
- What is the stop/abort communication path?
  - stop rebuild Vite server and continue baseline-only

## 5. Route Checklist Assignment

### `/members`
- Primary checker:
  - local evaluator
- Secondary reviewer:
  - self-review
- Evidence path:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-baseline-members-local.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-rebuild-members-local.png`

### `/memberships`
- Primary checker:
  - local evaluator
- Secondary reviewer:
  - self-review
- Evidence path:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-baseline-memberships-local.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-rebuild-memberships-local.png`

### `/reservations`
- Primary checker:
  - local evaluator
- Secondary reviewer:
  - self-review
- Evidence path:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-baseline-reservations-local.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-rebuild-reservations-local.png`

### `/access`
- Primary checker:
  - local evaluator
- Secondary reviewer:
  - self-review
- Evidence path:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-baseline-access-local.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-rebuild-access-local.png`

## 6. Required Preconditions

- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md` reviewed
- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md` reviewed
- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md` reviewed
- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md` reviewed
- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-final-checklist.md` reviewed
- [ ] High severity blocker 없음 확인
- [ ] Rebuild URL 차단만으로 baseline-only 복귀 가능 확인

## 7. Rollback Trigger Summary

즉시 rollback 판단 대상으로 보는 것:

- auth/session regression
- role restriction regression
- selected-member corruption
- mutation 후 stale cross-section state
- trainer unsupported contract failure (`/access`)
- rebuild URL 차단 불가

### Immediate rollback action
- Rebuild URL exposure off by:
  - stop local rebuild server on `127.0.0.1:5175`
- Confirm baseline-only recovery by:
  - reopen baseline URL `http://127.0.0.1:5173`
- Log owner:
  - abc

## 8. Evidence Output Paths

### Screenshots
- Directory:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts`
- Naming convention:
  - `route-subset-{baseline|rebuild}-{route}-local.png`

### Notes
- Blocker log update owner:
  - abc
- Migration / rollback note update owner:
  - abc
- Candidate checkpoint update owner:
  - abc
- Route subset decision update owner:
  - abc

## 9. Final Go / No-Go Prompt

평가 시작 직전 이 세 질문에 답한다.

- Can we expose the rebuild URL without affecting the baseline default entry?
- Can we rollback to baseline-only by disabling rebuild URL exposure alone?
- Are role, auth/session, and core workflow checks staffed and ready?

## Result

- Decision before evaluation:
  - `Proceed`
- Reason:
  - baseline/rebuild local alternate entry가 분리돼 있고 4개 route baseline/rebuild screenshot 비교가 가능함
- Follow-up if paused:
  - N/A
