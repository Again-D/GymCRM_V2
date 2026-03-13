# Frontend Rebuild Route Subset Cutover Decision

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 full swap 대신 `route subset exposure`로 시험할 때의 현재 판단 기준을 남긴 durable mirror 문서다.

이 문서는 worktree branch `codex/refactor-frontend-rebuild-v1`에서 축적된 local live parity, local staging-profile smoke, internal cutover rehearsal evidence를 main repo 기준 참고 문서로 옮긴 것이다.

## Current Decision

현재 권고:

`Proceed to controlled route subset evaluation`

단, 이 판단은 아래 전제를 유지한다.

- full swap은 아직 하지 않는다
- baseline frontend 기본 진입 경로는 유지한다
- rebuild frontend는 별도 internal-only URL에서만 노출한다
- 평가 대상 route는 아래 4개로 제한한다
  - `/members`
  - `/memberships`
  - `/reservations`
  - `/access`

## Why These Routes

- rebuild에서 local live parity evidence가 가장 많이 쌓인 영역이다
- `selectedMember` ownership, invalidation, auth/session, role boundary가 가장 잘 정리된 core workflow 묶음이다
- baseline과 의미 차이를 비교하기 쉽고, rollback 시 영향 범위도 비교적 제한적이다

## Preconditions

- [x] local staging-profile smoke results가 문서화됨
- [x] auth/session parity evidence가 local live + local staging-profile 기준으로 확보됨
- [x] role matrix evidence가 admin / desk / trainer 기준으로 확보됨
- [x] core workflow parity diff가 작성됨
- [x] migration / rollback baseline이 작성됨
- [x] internal cutover rehearsal note가 작성됨
- [x] final candidate checkpoint가 controlled route subset evaluation 가능 상태로 정리됨

## Non-Candidate Routes For First Exposure

초기 route subset에는 아래 route를 포함하지 않는다.

- `/crm`
- `/settlements`
- `/lockers`
- `/products`

이유:

- rebuild에는 구현돼 있지만, 첫 제한 노출은 minimum core workflow에 집중하는 편이 안전하다
- 초기 평가 범위를 넓히면 acceptable difference와 true blocker가 섞이기 쉽다

## Decision Matrix

| Condition | Recommendation |
|---|---|
| local live + local staging-profile evidence가 충분하고 blocker가 low severity 위주 | route subset evaluation 진행 |
| auth/session regression 또는 role regression 남음 | route subset evaluation 보류 |
| selected-member corruption 또는 mutation 후 stale state 남음 | route subset evaluation 보류 |
| rollback owner / exposure owner / URL contract 미정 | route subset evaluation 보류 |

## Current Recommendation Scope

지금 가능한 건:

- replacement candidate 유지
- internal-only alternate entry 방식의 controlled route subset evaluation 진행

지금 아직 하지 않는 건:

- full swap
- baseline URL 교체
- 모든 role/route를 한 번에 rebuild로 전환

## Evidence References

- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-rebuild-route-subset-evaluation-plan.md`
