# Frontend Rebuild Route Subset Cutover Decision Draft

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 full swap 대신 `route subset exposure`로 시험할 때의 판단 기준을 정리한다.

현재 단계에서의 기본 방향은:
- full swap은 하지 않음
- route subset exposure가 첫 현실적 cutover candidate임
- 단, 실제 staging이 없으므로 판단 근거는 `local staging-profile smoke + internal cutover rehearsal` 조합을 사용한다

## Candidate Routes

우선 후보:
- `/members`
- `/memberships`
- `/reservations`
- `/access`

이 4개는 replacement candidate plan의 core workflow minimum scope와 같다.

## Why These Routes

- 이미 local live parity evidence가 가장 많이 축적된 영역이다
- selected-member ownership / invalidation / route behavior가 가장 잘 정리된 영역이다
- 운영 의미가 명확하고 baseline과 diff를 비교하기 쉽다

## Preconditions

- [x] local staging-profile smoke results note 작성
- [x] local smoke blocker가 high severity 없이 정리됨
- [x] auth/session parity가 local staging-profile에서도 유지됨
- [x] role restrictions가 baseline과 같은 수준으로 설명 가능함
- [x] rollback trigger/owner가 채워짐
- [x] internal cutover rehearsal note 작성

## Non-Candidate Routes For First Exposure

초기 route subset에는 다음을 포함하지 않는다.

- `/crm`
- `/settlements`
- `/lockers`
- `/products`

이유:
- operational breadth는 충분히 설명 가능하지만, 첫 staged evaluation에서는 minimum core workflow scope에 집중하는 편이 안전하다.

## Decision Matrix

| Condition | Recommendation |
|---|---|
| local staging-profile smoke mostly pass, blockers are low/medium, rollback is clear | route subset evaluation 가능 |
| auth/session or role parity blocker remains | route subset evaluation 보류 |
| selected-member or mutation refresh mismatch remains | route subset evaluation 보류 |
| unexpected local staging-profile or rehearsal blocker remains unresolved | replacement candidate 유지, blocker reduction 계속 |

## Current Recommendation

현재 권고:
- local staging-profile evidence는 확보됨
- internal cutover rehearsal evidence도 문서화됨
- active blocker는 low-severity local execution constraint 1건만 남아 있음

따라서 현재 판단은:

`Proceed to controlled route subset evaluation`

단, 이 권고는 아래 전제를 유지한다.
- full swap이 아니라 route subset 평가
- baseline frontend 기본 진입 경로 유지
- rebuild는 내부/제한된 exposure 후보로만 취급

## Evidence To Attach Before Deciding

- local staging-profile smoke screenshots
- local staging-profile smoke results note
- updated blocker log
- migration / rollback plan
- final candidate checkpoint draft update
- internal cutover rehearsal note
