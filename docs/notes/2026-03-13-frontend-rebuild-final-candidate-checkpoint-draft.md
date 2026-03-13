# Frontend Rebuild Final Candidate Checkpoint Draft

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 replacement candidate로 평가하기 위한 **pre-cutover checkpoint draft**다.

아직 local staging-profile smoke evidence와 internal cutover rehearsal evidence가 없으므로, 최종 go/no-go 문서가 아니라 현재까지의 local live evidence를 한 번 정리하고 다음 의사결정이 무엇인지 명확히 하기 위한 중간 산출물이다.

## Current Verdict

`Remain replacement candidate, continue blocker reduction`

즉 지금 rebuild는:
- architecture experiment는 이미 성공했고
- local live parity도 상당 수준 확보했지만
- controlled cutover evaluation으로 넘어가기 전에 local staging-profile evidence와 internal rehearsal evidence가 필요하다

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

### 1. Local Staging-Profile Smoke Evidence Gap

현재 가장 큰 active blocker다.

아직 없는 것:
- local staging-profile auth/session evidence
- local staging-profile role matrix evidence
- local staging-profile core workflow 4개 smoke evidence
- staging profile에서만 드러나는 env/security 차이 확인
- 실행 URL/계정/세션 입력 fill-in 완료

### 2. Migration and Rollback Are Still Baseline Documents

현재 migration/rollback은 baseline 초안은 있으나, local staging-profile 결과와 internal cutover rehearsal 결과를 반영한 execution-ready 상태는 아니다.

즉 지금 문서는:
- 방향은 설명 가능
- 실제 전환 rehearsal을 하기엔 아직 이르다

## Core Workflow Readiness Snapshot

| Workflow | Current local judgement | Cutover judgement |
|---|---|---|
| 회원관리 | baseline과 의미상 동일 | local staging-profile evidence 필요 |
| 회원권 업무 | baseline과 의미상 동일 | local staging-profile evidence 필요 |
| 예약 관리 | baseline과 의미상 동일 | local staging-profile evidence 필요 |
| 출입 관리 | 차이가 있지만 허용 가능 | local staging-profile evidence 필요 |

## Recommended Next Decision Path

1. local staging-profile smoke checklist 실행
2. blocker log 갱신
3. migration / rollback baseline에 local smoke와 rehearsal 결과 반영
4. 그 다음에야 controlled cutover evaluation 여부 판단

## What Should Not Happen Yet

- draft PR `#73`를 ready/merge 대상으로 취급
- full swap 전환 논의
- local staging-profile evidence와 internal rehearsal 없이 cutover recommendation 작성

## Evidence References

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-auth-session-flow.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-core-workflow-parity-diff.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-smoke-checklist.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-internal-cutover-rehearsal.md`
