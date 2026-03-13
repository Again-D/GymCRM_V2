# Frontend Rebuild Route Subset Evaluation Plan

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 실제 full swap 대신 **controlled route subset evaluation**으로 어떻게 시험할지 정리한다.

현재 전제:
- rebuild는 replacement candidate다
- full swap은 아직 하지 않는다
- 최소 core workflow route subset만 제한적으로 평가한다

즉 이 문서는 “배포 절차”가 아니라, 내부/제한된 노출을 가정했을 때 어떤 shape로 평가하고 어떤 기준으로 중단할지 정리하는 운영 메모다.

## Candidate Route Subset

평가 대상 route:

- `/members`
- `/memberships`
- `/reservations`
- `/access`

제외 route:

- `/crm`
- `/settlements`
- `/lockers`
- `/products`

이유:
- 첫 평가에서는 minimum core workflow scope에 집중하는 편이 안전하다
- selected-member ownership, invalidation, role parity가 가장 많이 검증된 경로가 위 4개다

## Exposure Models Considered

### Option A: Internal-only alternate URL

- baseline frontend 기본 경로 유지
- rebuild는 별도 내부 URL 또는 내부 전용 진입 경로에서만 접근
- 운영자/개발자만 명시적으로 진입

Pros:
- baseline을 거의 건드리지 않는다
- rollback이 가장 단순하다
- 실제 사용 중 문제가 생겨도 baseline 영향이 작다

Cons:
- 비교가 병렬이 아니라 사용자가 직접 전환해야 한다

### Option B: Route subset opt-in flag

- baseline frontend 유지
- 특정 내부 사용자만 route subset을 rebuild로 보게 함
- 나머지는 baseline 유지

Pros:
- 가장 현실적인 controlled evaluation
- 동일 backend/session에서 route 단위 비교가 가능하다

Cons:
- flag wiring / exposure control이 필요하다

### Option C: Route subset hard switch

- 특정 route 전체를 rebuild로 돌림
- 내부 사용자도 별도 분기 없이 동일 route 사용

Pros:
- 실제 cutover에 가장 가깝다

Cons:
- 현재 단계에서는 리스크가 크다
- rollback pressure가 커진다

## Recommended Evaluation Shape

현재 추천:

`Option A`를 기본으로 두고, 가능하면 이후 `Option B`로 확장한다.

즉 첫 단계는:
- baseline 유지
- rebuild는 내부용 alternate entry로만 노출
- route subset 4개를 운영자/개발자 기준으로 반복 확인

이 방식이 맞는 이유:
- 아직 full cutover-ready는 아니기 때문
- route subset 자체보다 rollback 단순성이 더 중요하기 때문

## Evaluation Owners

최소 역할:

- implementation owner
  - rebuild 동작/버그 수정 책임
- reviewer
  - parity 차이와 blocker severity 검토
- exposure owner
  - 어떤 사용자에게 어떤 방식으로 rebuild를 열지 결정
- rollback decision owner
  - 즉시 baseline-only로 되돌릴지 판단

현재는 역할만 고정하고, 실명은 실제 노출 직전에 채운다.

## Evaluation Checklist

### Entry / Routing

- [ ] baseline 기본 진입 경로 유지
- [ ] rebuild alternate entry 경로가 명확함
- [ ] route subset 4개만 평가 대상으로 제한됨

### Auth / Session

- [ ] logged-out direct entry 차단
- [ ] login / logout / refresh 유지
- [ ] role matrix가 baseline과 같은 수준으로 설명됨

### Workflow

- [ ] members workflow usable
- [ ] memberships workflow usable
- [ ] reservations workflow usable
- [ ] access workflow usable

### Safety

- [ ] selected-member stale state 없음
- [ ] mutation 후 cross-section refresh mismatch 없음
- [ ] unsupported role surface가 뒤늦게 403으로만 드러나지 않음

### Rollback

- [ ] baseline-only fallback 절차가 명확함
- [ ] blocker 기록 위치가 명확함
- [ ] retry 전 확인할 evidence가 명확함

## Immediate Stop Conditions

아래 중 하나라도 발생하면 route subset evaluation을 중단하고 baseline-only 상태로 돌아간다.

1. auth regression
2. role restriction regression
3. core workflow blocker
4. selected-member corruption
5. mutation 이후 stale summary / stale target / stale list 노출

## Evidence To Attach

- updated blocker log
- updated final candidate checkpoint
- updated migration / rollback note
- route subset screenshots/logs
- known differences summary

## Current Recommendation

현재 단계에서의 권고:

`Prepare controlled route subset evaluation under internal-only alternate entry`

즉:
- 바로 full swap을 논의하지 않고
- baseline을 유지한 채
- 내부 전용 alternate entry에서 route subset 4개를 평가하는 쪽이 가장 안전하다
