# Frontend Safe Cutover Checklist and Rollback Scenario

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 baseline frontend와 함께 안전하게 시험하거나 전환할 때 필요한 최소 체크리스트와 rollback 시나리오를 한 장으로 정리한다.

현재 기준은 full swap이 아니라, `controlled route subset evaluation`을 위한 안전 기준이다.

## Safe Cutover Checklist

### 1. Baseline 유지

- [ ] 기존 baseline frontend를 삭제하지 않는다
- [ ] baseline 기본 URL은 그대로 유지한다
- [ ] rebuild가 baseline을 덮어쓰지 않는다
- [ ] baseline-only 상태로 즉시 돌아갈 경로가 살아 있다

### 2. Alternate Entry 분리

- [ ] rebuild는 별도 URL 또는 별도 entry에서만 연다
- [ ] baseline URL에서 자동으로 rebuild로 보내지 않는다
- [ ] 처음에는 internal-only 접근만 허용한다
- [ ] baseline과 rebuild를 동시에 유지한다

### 3. Owner 지정

- [x] exposure owner가 정해져 있다
- [x] rollback decision owner가 정해져 있다
- [x] evidence 기록 owner가 정해져 있다
- [x] 중단 판단을 누가 하는지 명확하다

현재 local evaluation 기준 owner:

- exposure owner: `abc`
- rollback decision owner: `abc`
- evidence recorder: `abc`

### 4. 평가 범위 제한

- [x] 전체 전환이 아니라 route subset만 연다
- [x] 초기 범위가 문서로 고정돼 있다
- [x] 최소 범위는 `/members`, `/memberships`, `/reservations`, `/access`다

### 5. Rollback을 “복원”이 아니라 “차단”으로 설계

- [x] rollback은 rebuild URL 차단만으로 가능해야 한다
- [x] baseline-only 복귀 절차가 한 문장으로 설명 가능하다
- [x] rollback에 코드 복원이 필요하지 않다
- [x] rollback 후 baseline 확인 경로가 정해져 있다

### 6. Parity 확인

- [x] auth/session parity evidence가 있다
- [x] role parity evidence가 있다
- [x] core workflow parity evidence가 있다
- [x] mutation 후 stale state blocker 기준이 있다
- [x] selected-member corruption blocker 기준이 있다

### 7. Evidence 확보

- [x] baseline/rebuild 비교 스크린샷이 있다
- [x] blocker log가 최신이다
- [x] migration / rollback 문서가 최신이다
- [x] final candidate checkpoint가 최신이다
- [x] route subset decision 문서가 최신이다

### 8. Stop 조건 명확화

- [x] auth/session regression이면 즉시 중단
- [x] role restriction regression이면 즉시 중단
- [x] selected-member corruption이면 즉시 중단
- [x] stale cross-section state면 즉시 중단
- [x] rebuild URL 차단이 바로 안 되면 즉시 중단

## Local Route Subset Evaluation Values

- baseline URL: `http://127.0.0.1:5173`
- rebuild alternate-entry URL: `http://127.0.0.1:5175`
- rollback owner: `abc`
- exposure owner: `abc`

## Rollback Scenario

### Trigger

다음 중 하나가 보이면 rollback 판단:

- auth/session regression
- role restriction regression
- `selectedMember` corruption
- mutation 후 stale cross-section state
- unsupported contract 위반
- rebuild URL 차단 불가

### Action

1. rebuild URL 노출을 즉시 중단한다
2. baseline URL만 계속 사용한다
3. baseline 주요 route를 다시 확인한다
   - `/members`
   - `/memberships`
   - `/reservations`
   - `/access`
4. blocker를 기록한다
5. rebuild 평가는 일시 중단한다

### Recovery Definition

rollback의 성공 기준은 “코드를 예전으로 되돌린다”가 아니다.

성공 기준:

- 사용자가 rebuild를 더 이상 보지 않는다
- baseline 기본 경로가 정상 동작한다
- 추가 코드 복원 없이 운영을 계속할 수 있다

## Current Recommendation

현재 기준 추천:

- `controlled route subset evaluation`: 진행 가능
- `full swap`: 아직 보류

## Related References

- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-rebuild-route-subset-evaluation-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-final-checklist.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-execution-input-sheet.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-local-rehearsal.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
