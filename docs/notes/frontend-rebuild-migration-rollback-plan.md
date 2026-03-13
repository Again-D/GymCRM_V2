# Frontend Rebuild Migration and Rollback Plan

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 replacement candidate로 평가할 때 필요한 migration / rollback baseline의 durable mirror다.

현재 결론은 즉시 cutover가 아니라:

- full swap은 하지 않음
- baseline frontend는 그대로 유지
- rebuild frontend는 별도 internal-only URL에서만 제한적으로 평가

즉 이 문서는 ready-to-execute full cutover playbook이 아니라, controlled route subset evaluation을 안전하게 시작하기 위한 baseline이다.

## Recommended Cutover Unit

우선순위:

1. internal-only exposure
2. route subset exposure
3. full swap

현재 단계의 추천은 `2. route subset exposure`까지다.

평가 대상 route:

- `/members`
- `/memberships`
- `/reservations`
- `/access`

## Recommended Exposure Shape

- baseline frontend 기본 URL 유지
- rebuild frontend는 별도 internal-only URL에서만 노출
- traffic split은 하지 않음
- opt-in 또는 내부 사용자 중심으로만 평가

이 방식의 장점:

- baseline-only 상태로 되돌리는 절차가 단순하다
- baseline URL 교체 없이 rebuild 노출만 중단하면 된다
- auth/session, selected-member, mutation invalidation 차이를 실제 세션에서 조용히 관찰할 수 있다

## Preconditions Before Controlled Evaluation

- [x] local staging-profile smoke checklist 완료
- [x] core workflow 4개에 대한 local smoke evidence 확보
- [x] auth/session parity evidence 확보
- [x] role parity evidence 확보
- [x] blocker log 최신화
- [x] internal cutover rehearsal note 작성

## Rollback Triggers

다음 중 하나라도 발생하면 rebuild exposure를 중단하고 baseline-only 상태로 되돌린다.

1. auth regression
- 로그인 / 로그아웃 / refresh / protected route behavior가 baseline보다 나빠짐

2. role restriction regression
- admin / desk / trainer 허용 범위가 baseline과 어긋남

3. core workflow blocker
- 회원관리
- 회원권 업무
- 예약 관리
- 출입 관리
중 하나가 운영상 막힘

4. selected-member context corruption
- 잘못된 회원이 남음
- auth 전이 뒤 stale selected member가 남음
- mutation 뒤 cross-section stale state가 남음

5. exposure contract failure
- internal-only URL 노출 제어가 설명한 방식으로 동작하지 않음
- baseline URL과 rebuild URL의 역할이 섞임

## Rollback Procedure Baseline

1. rebuild internal-only URL 노출 중단
2. baseline frontend 기본 URL만 유지
3. active blocker를 기록
4. 영향을 받은 route / role / screenshot / log를 기록
5. blocker severity와 owner를 다시 분류

현재 단계에서는 infra-specific rollback script까지는 고정하지 않는다.  
그건 실제 controlled evaluation 준비 시 owner와 함께 구체화한다.

## Decision Owners

실명 대신 역할만 먼저 고정한다.

- implementation owner
- reviewer / approver
- exposure owner
- rollback decision owner

## Current Recommendation

현재 권고:

- replacement candidate 유지
- full swap은 하지 않음
- controlled route subset evaluation까지는 진행 가능

## Evidence References

- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-rebuild-route-subset-evaluation-plan.md`
