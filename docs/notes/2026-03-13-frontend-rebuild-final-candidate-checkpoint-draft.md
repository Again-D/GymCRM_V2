# Frontend Rebuild Final Candidate Checkpoint Draft

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 replacement candidate로 평가하기 위한 **pre-cutover checkpoint draft**다.

local staging-profile smoke evidence와 internal cutover rehearsal evidence는 이제 확보됐다. 이 문서는 full cutover go/no-go 문서는 아니지만, rebuild를 controlled route subset evaluation으로 올릴 수 있는지 판단하는 현재 checkpoint다.

## Current Verdict

`Proceed to controlled route subset evaluation`

즉 지금 rebuild는:
- architecture experiment는 이미 성공했고
- local live parity와 local staging-profile smoke도 상당 수준 확보했고
- internal cutover rehearsal 기준에서도 운영 판단이 가능한 수준까지 올라왔다
- 다만 full swap이나 merge 대상은 아니며, 다음 단계는 제한된 route subset evaluation이다

## What Is Already Strong

### 1. Architecture

- shell/page-first route structure가 안정적으로 유지됨
- `selectedMember` canonical ownership이 members domain으로 고정됨
- explicit invalidation contract가 주요 query domain에 들어감
- page-owned query/mutation separation이 여러 slice에서 일관되게 적용됨

### 2. Breadth

다음 slice들이 rebuild branch에 실제 구현되어 있다.

- members
- memberships
- reservations
- access
- lockers
- products
- crm
- settlements

### 3. Local Live Confidence

local live backend 기준으로 다음이 증명돼 있다.

- auth bootstrap / login / logout / protected route redirect
- admin / desk / trainer role matrix
- memberships live writes
- reservations live writes
- access live reads/writes
- core workflow parity diff 작성

## What Still Blocks Cutover Evaluation

### 1. Migration and Rollback Are Still Controlled-Evaluation Baselines

현재 migration/rollback은 controlled route subset evaluation까지는 설명 가능하지만, full cutover execution playbook은 아니다.

즉 지금 문서는:
- 제한된 경로 평가까지는 충분함
- full swap 전환을 결정하기엔 아직 이르다

## Core Workflow Readiness Snapshot

| Workflow | Current local judgement | Cutover judgement |
|---|---|---|
| 회원관리 | baseline과 의미상 동일 | controlled route subset evaluation 가능 |
| 회원권 업무 | baseline과 의미상 동일 | controlled route subset evaluation 가능 |
| 예약 관리 | baseline과 의미상 동일 | controlled route subset evaluation 가능 |
| 출입 관리 | 차이가 있지만 허용 가능 | controlled route subset evaluation 가능 |

## Recommended Next Decision Path

1. controlled route subset evaluation의 노출 방식과 owner를 결정
2. blocker log를 evaluation 기준으로 계속 갱신
3. migration / rollback baseline에 evaluation 결과 반영
4. 그 다음에야 full cutover evaluation 여부 판단

## What Should Not Happen Yet

- draft PR `#73`를 ready/merge 대상으로 취급
- full swap 전환 논의
- internal rehearsal 없이 cutover recommendation 작성
- full swap을 기본값으로 가정

## Evidence References

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-auth-session-flow.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-core-workflow-parity-diff.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-smoke-checklist.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-smoke-results.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-internal-cutover-rehearsal.md`
