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
- Value:
- Owner:
- Notes:

### Rebuild Internal-Only URL
- Value:
- Owner:
- Notes:

### URL Exposure Rule
- Who can access rebuild URL?
- How is access restricted?
- Is baseline URL guaranteed to remain default?

## 2. Exposure and Rollback Owners

### Exposure Owner
- Name / team:
- Responsibility:

### Rollback Decision Owner
- Name / team:
- Responsibility:

### Reviewer / Approver
- Name / team:
- Responsibility:

### Evidence Recorder
- Name / team:
- Responsibility:

## 3. Role Accounts For Evaluation

### Admin
- Login ID:
- Password delivery method:
- Notes:

### Desk
- Login ID:
- Password delivery method:
- Notes:

### Trainer
- Login ID:
- Password delivery method:
- Notes:

## 4. Evaluation Window

- Planned start:
- Planned end:
- Local timezone:
- Who will actively observe the session?
- What is the stop/abort communication path?

## 5. Route Checklist Assignment

### `/members`
- Primary checker:
- Secondary reviewer:
- Evidence path:

### `/memberships`
- Primary checker:
- Secondary reviewer:
- Evidence path:

### `/reservations`
- Primary checker:
- Secondary reviewer:
- Evidence path:

### `/access`
- Primary checker:
- Secondary reviewer:
- Evidence path:

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
- Confirm baseline-only recovery by:
- Log owner:

## 8. Evidence Output Paths

### Screenshots
- Directory:
- Naming convention:

### Notes
- Blocker log update owner:
- Migration / rollback note update owner:
- Candidate checkpoint update owner:
- Route subset decision update owner:

## 9. Final Go / No-Go Prompt

평가 시작 직전 이 세 질문에 답한다.

- Can we expose the rebuild URL without affecting the baseline default entry?
- Can we rollback to baseline-only by disabling rebuild URL exposure alone?
- Are role, auth/session, and core workflow checks staffed and ready?

## Result

- Decision before evaluation:
  - `Proceed`
  - `Pause`
- Reason:
- Follow-up if paused:
