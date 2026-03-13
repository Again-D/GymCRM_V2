# Frontend Rebuild Final Candidate Checkpoint

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 replacement candidate로 평가하기 위한 현재 checkpoint의 durable mirror다.

이 checkpoint는 full cutover go/no-go가 아니라, rebuild를 controlled route subset evaluation까지 올릴 수 있는지 판단하는 문서다.

## Current Verdict

`Proceed to controlled route subset evaluation`

즉 현재 rebuild는:

- architecture experiment를 넘어섰고
- local live parity와 local staging-profile smoke 근거를 충분히 쌓았고
- internal cutover rehearsal까지 문서화됐으며
- full swap은 아니지만, 제한된 route subset 평가를 시작할 수 있는 상태다

## What Is Already Strong

### Architecture

- shell/page-first route 구조가 안정적이다
- `selectedMember` canonical ownership이 members domain으로 정리됐다
- explicit invalidation contract가 주요 query domain에 들어갔다
- page-owned query / mutation separation이 여러 slice에서 반복 가능함이 검증됐다

### Breadth

rebuild branch에는 다음 slice가 실제로 존재한다.

- members
- memberships
- reservations
- access
- lockers
- products
- crm
- settlements

### Local Confidence

local live / local staging-profile 기준으로 다음이 증명돼 있다.

- auth bootstrap / login / logout / protected route redirect
- admin / desk / trainer role matrix
- memberships live writes
- reservations live writes
- access live reads / writes
- core workflow parity diff

## What Still Blocks Full Swap

현재 migration / rollback은 controlled route subset evaluation까지는 설명 가능하지만, full swap execution playbook은 아니다.

즉 지금은:

- route subset evaluation: 가능
- full swap: 아직 아님

## Core Workflow Readiness Snapshot

| Workflow | Current judgement | Current recommendation |
|---|---|---|
| 회원관리 | baseline과 의미상 동일 | controlled route subset evaluation 가능 |
| 회원권 업무 | baseline과 의미상 동일 | controlled route subset evaluation 가능 |
| 예약 관리 | baseline과 의미상 동일 | controlled route subset evaluation 가능 |
| 출입 관리 | 허용 가능한 차이 포함 | controlled route subset evaluation 가능 |

## What Should Not Happen Yet

- draft PR `#73`를 merge/cutover 대상으로 취급
- baseline URL을 rebuild로 교체
- full swap을 기본 가정으로 삼음
- rollback owner 없이 제한 노출을 시작함

## Next Decision Path

1. internal-only URL 기반 route subset evaluation 노출 계약 확정
2. blocker log를 그 기준으로 계속 갱신
3. migration / rollback baseline에 평가 결과 반영
4. 그 다음에야 full swap 여부를 다시 판단

## Evidence References

- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-rebuild-route-subset-evaluation-plan.md`
