# Frontend Rebuild Route Subset Evaluation Execution Procedure

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 `controlled route subset evaluation`으로 실제 시험할 때 따를 운영 절차를 정리한다.

범위는 full swap이 아니라 아래 4개 route의 제한 평가다.

- `/members`
- `/memberships`
- `/reservations`
- `/access`

기본 원칙:
- baseline frontend 기본 URL은 유지한다
- rebuild frontend는 별도 internal-only URL에서만 연다
- baseline이 기본값이고, rebuild는 opt-in evaluation 대상이다
- 문제가 생기면 rebuild URL만 닫고 baseline-only로 즉시 복귀한다

## Preconditions

다음 문서가 최신 상태여야 한다.

- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-rebuild-route-subset-evaluation-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-execution-input-sheet.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-local-rehearsal.md`

다음 조건이 충족되어야 한다.

- high severity active blocker가 없다
- rollback owner가 정해져 있다
- rebuild internal-only URL과 baseline URL이 구분돼 있다
- 평가 대상 role이 명확하다
- evidence 저장 위치가 합의돼 있다

## Roles

최소 역할:

- implementation owner
- reviewer / approver
- exposure owner
- rollback decision owner
- evidence recorder

실명은 실행 직전에 채운다.

## Exposure Contract

- baseline URL: 기존 운영 프런트 기본 진입 주소
- rebuild URL: 내부용 alternate entry 주소
- rebuild URL은 내부 사용자만 접근 가능해야 한다
- baseline URL에서 자동 리다이렉트하지 않는다
- route subset 평가는 rebuild URL에서만 수행한다

## Evaluation Order

다음 순서로 평가한다.

1. auth/session smoke
2. admin route subset smoke
3. desk route subset smoke
4. trainer route subset smoke
5. mobile viewport smoke
6. blocker triage and decision update

## Auth / Session Smoke

### Logged-out
- rebuild URL 진입
- protected route direct entry가 `/login`으로 정리되는지 확인
- login 화면이 baseline보다 거칠게 흔들리거나 잘못된 route를 먼저 노출하지 않는지 확인

### Logged-in
- admin으로 로그인
- `/members` direct entry
- page refresh
- logout
- logout 후 `/members` 재진입 시 `/login`으로 돌아가는지 확인

기록할 것:
- screenshot
- role
- route
- observed redirect behavior
- unexpected flash 여부

## Route Subset Workflow Smoke

### `/members`
- 목록 렌더
- 필터 적용
- 페이지네이션 동작
- member row 선택
- 잘못된 member context가 남지 않는지 확인

### `/memberships`
- selected member handoff
- 회원권 목록 렌더
- 구매 form 진입
- hold / resume / refund surface 확인
- mutation 후 summary stale state가 남지 않는지 확인

### `/reservations`
- selected member handoff
- reservation target list
- reservation create
- check-in / complete / cancel / no-show surface
- mutation 후 memberships / reservations / targets 동기화 확인

### `/access`
- selected member 없이도 페이지 진입 가능해야 함
- current presence / recent events / member search surface 확인
- desk/admin에서 entry/exit 동작 확인
- trainer는 unsupported surface가 명확히 보여야 하며 stale rows가 남지 않아야 함

## Role Matrix

### Admin
- `/members`
- `/memberships`
- `/reservations`
- `/access`
- 모두 접근 가능해야 한다

### Desk
- `/members`
- `/memberships`
- `/reservations`
- `/access`
- baseline과 동일한 제한이어야 한다

### Trainer
- `/members`
- `/memberships`
- `/reservations`
- `/access`
- `/access`는 unsupported contract가 baseline과 일치해야 한다
- 권한 밖 member-context가 남으면 blocker다

## Mobile Smoke

최소 viewport:
- iPhone 14 Pro Max (`430 x 932`)

확인 대상:
- `/members`
- `/memberships`
- `/reservations`
- `/access`

확인 기준:
- 주요 CTA가 잘리지 않는다
- pagination / list / filters가 터치 가능한 형태로 남아 있다
- selected-member summary가 화면을 과하게 밀지 않는다

## Acceptable Differences

다음은 허용 가능 차이로 본다.

- baseline과 시각 밀도 차이
- copy tone의 경미한 차이
- 내부용 rebuild URL 노출 형태 차이
- full-swap 미지원 상태에서의 제약 안내 문구

## True Blockers

다음은 즉시 blocker로 기록한다.

- auth/session regression
- role restriction regression
- selected-member corruption
- mutation 후 cross-section stale state
- trainer unsupported contract 실패
- rollback owner 부재 또는 rebuild URL 차단 불가
- baseline-only 복귀 절차가 실제로 설명 불가

## Evidence Checklist

각 평가마다 남길 것:
- route
- role
- action
- screenshot path
- pass/fail
- acceptable difference / blocker 여부
- owner
- next action

## Rollback Procedure During Evaluation

문제 발견 시:
1. rebuild URL 평가 중단
2. baseline-only 상태 유지 확인
3. blocker를 `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`에 기록
4. migration / rollback note 업데이트
5. final candidate checkpoint 판단 갱신

## Output Documents To Update

평가 후 반드시 갱신할 문서:
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`

## Exit Criteria

다음 셋 중 하나로 종료한다.

- `Proceed`: route subset evaluation을 계속 유지 가능
- `Pause`: blocker를 먼저 줄이고 다시 평가
- `Rollback to baseline-only`: rebuild 평가 노출 중단
