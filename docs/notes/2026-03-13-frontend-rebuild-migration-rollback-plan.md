# Frontend Rebuild Migration and Rollback Plan

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 replacement candidate로 평가할 때 필요한 운영 전환/되돌리기 초안을 남긴다.

현재 결론은 즉시 cutover가 아니라:
- local staging-profile smoke evidence를 먼저 확보하고
- internal cutover rehearsal 결과를 만든 뒤
- 그 결과를 바탕으로 controlled cutover evaluation을 판단하는 것

즉 이 문서는 **ready-to-execute cutover playbook**이 아니라, local staging-profile 결과와 rehearsal 결과를 받아 실제 전환 판단으로 이어질 수 있게 하는 migration/rollback baseline이다.

## Recommended Cutover Unit

기본 추천은 `full swap`이 아니다.

우선순위:
1. internal-only exposure
2. route subset exposure
3. full swap

현재 rebuild의 성격과 evidence 수준을 보면, 가장 현실적인 첫 전환 단위는 아래 둘 중 하나다.

- internal-only exposure:
  - 운영자/개발자에게만 rebuild URL을 열어 실제 세션과 API를 관찰
- route subset exposure:
  - `/members`, `/memberships`, `/reservations`, `/access` 중 제한된 route만 새 프런트로 연결

## Recommended Initial Rollout Shape

가장 보수적인 baseline:

- baseline frontend 유지
- rebuild frontend는 별도 진입 경로 유지
- role-limited 또는 staff-limited exposure
- traffic split 없이 명시적 opt-in

이 방식의 장점:
- 문제 생겨도 baseline 운영 흐름을 즉시 보존할 수 있음
- auth/session, cookie, selected-member handoff, mutation invalidation 차이를 실제 환경에서 조용히 관찰 가능

## Preconditions Before Any Controlled Cutover

- [ ] local staging-profile smoke checklist 완료
- [ ] core workflow 4개에 대한 local staging-profile evidence 확보
- [ ] auth/session parity가 local staging-profile에서도 재현됨
- [ ] role parity가 local staging-profile에서도 재현됨
- [ ] active blocker 목록이 최신 상태임
- [ ] internal cutover rehearsal note 작성

참조:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-smoke-checklist.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-internal-cutover-rehearsal.md`

## Proposed Migration Path

### Stage 0: Continue as Candidate Only

- draft PR `#73` 유지
- rebuild는 replacement candidate로만 다룸
- local staging-profile smoke, internal rehearsal, blocker reduction만 수행

### Stage 1: Internal Exposure

- 제한된 내부 사용자에게 rebuild URL 공유
- baseline과 parallel 운영
- evidence 수집 대상:
  - auth bootstrap
  - role별 route behavior
  - selected-member handoff
  - memberships/reservations/access mutation refresh

### Stage 2: Route Subset Trial

가능하면 아래 route subset만 제한적으로 후보로 본다.

- `/members`
- `/memberships`
- `/reservations`
- `/access`

이 4개는 현재 replacement candidate minimum workflow scope와 동일하다.

### Stage 3: Full Cutover Evaluation

다음이 모두 충족될 때만 검토한다.

- local staging-profile smoke pass
- internal exposure에서 blocker가 관리 가능 수준
- rollback trigger와 procedure 확정
- route subset trial evidence가 충분함

## Rollback Triggers

다음 중 하나라도 발생하면 rebuild exposure를 중단하고 baseline으로 되돌린다.

1. auth regression
- 로그인/로그아웃/refresh/protected route가 baseline과 다르게 깨짐

2. role restriction regression
- trainer/desk/admin 권한 차단 또는 허용이 baseline보다 넓거나 좁아짐

3. core workflow blocker
- 회원관리
- 회원권 업무
- 예약 관리
- 출입 관리
중 하나가 운영상 막힘

4. selected-member context corruption
- 잘못된 회원이 유지되거나
- auth 전이 후 stale member가 남거나
- cross-section mutation 후 stale summary가 남음

5. local staging-profile or rehearsal-only unexpected error
- local live에서는 보이지 않았지만 staging-profile security/env 차이나 internal rehearsal 과정에서만 재현되는 blocker

## Rollback Procedure Baseline

가장 단순한 baseline 절차:

1. rebuild exposure 중단
2. baseline frontend 진입 경로만 유지
3. active blocker 기록
4. affected screenshots / logs / role / route 기록
5. retry 전 blocker severity와 owner 재분류

현재 단계에서는 “몇 분 안에 revert deploy” 같은 infra-specific 절차까지는 정하지 않는다.
그건 실제 배포 구조가 정해질 때 local staging-profile evidence와 internal rehearsal 결과와 함께 확정한다.

## Decision Owners

최소한 아래 역할이 있어야 한다.

- implementation owner
- reviewer / approver
- rollback decision owner

현재 문서 단계에서는 실명 대신 역할만 고정하고, 실제 cutover 직전에 owner를 채운다.

## Evidence Required Before Recommending Cutover

- local staging-profile smoke note
- local staging-profile smoke results note
- updated blocker log
- role matrix evidence
- core workflow parity diff
- migration / rollback decision note
- internal cutover rehearsal note

추가 참조:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-smoke-results.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-route-subset-cutover-decision.md`

## Current Recommendation

현재 시점 권고:

- replacement candidate로 계속 유지
- local staging-profile smoke와 internal rehearsal 이전에는 cutover 논의를 진행하지 않음
- migration/rollback은 이 문서를 baseline으로 두고, local smoke / rehearsal 결과가 생긴 뒤 구체화

## Next Action

바로 다음 액션은 이것이다.

1. local staging-profile smoke checklist 실행
2. blocker log 갱신
3. internal cutover rehearsal note 작성
4. 이 migration/rollback baseline을 local smoke / rehearsal evidence에 맞춰 확정본으로 승격
