# Frontend Rebuild Internal URL Exposure Options

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend를 `controlled route subset evaluation` 단계에서 실제로 어떤 방식으로 internal-only URL에 노출할지 비교하기 위한 문서다.

현재 전제:

- baseline frontend 기본 URL은 유지한다
- rebuild frontend는 full swap이 아니라 제한된 route subset 평가 대상으로만 노출한다
- rollback은 rebuild 노출 중단만으로 baseline-only 상태로 복귀할 수 있어야 한다

## Evaluation Criteria

비교 기준은 아래 다섯 가지다.

1. baseline 유지가 쉬운가
2. rollback이 빠르고 단순한가
3. 운영자가 설명하고 관리하기 쉬운가
4. rebuild를 internal-only로 제한하기 쉬운가
5. 현재 GymCRM 운영 방식에 맞는가

## Option A: Separate Internal-Only URL

예시:

- baseline: `https://app.example.com`
- rebuild: `https://rebuild-internal.example.com`

### 장점

- baseline과 rebuild가 완전히 분리된다
- rollback이 가장 단순하다
  - rebuild URL만 차단하거나 비활성화하면 끝난다
- baseline URL은 건드리지 않으므로 사용자 영향이 가장 작다
- 문서화와 책임 분리가 쉽다
- 내부 평가 참여자만 rebuild URL을 쓰게 만들기 쉽다

### 단점

- 별도 도메인 또는 서브도메인, ingress, 배포 설정이 필요하다
- 쿠키 / CORS / auth origin 설정을 한 번 더 맞춰야 할 수 있다
- 인프라 접근 권한이 없으면 실행이 늦어질 수 있다

### 현재 프로젝트 적합성

가장 적합하다.

이유:

- 현재 문서와 rollback 시나리오가 전부 이 방식을 기준으로 정리돼 있다
- baseline 유지와 rebuild alternate entry를 가장 명확히 분리할 수 있다
- full swap 전 단계 평가 방식으로 가장 보수적이고 안전하다

## Option B: Same Origin, Internal Route Prefix

예시:

- baseline: `https://app.example.com`
- rebuild internal entry: `https://app.example.com/rebuild/...`

### 장점

- 별도 도메인 없이 구성할 수 있다
- 쿠키 / origin 문제는 상대적으로 단순할 수 있다
- 인프라 변경이 적을 수 있다

### 단점

- baseline과 rebuild가 같은 origin에 섞인다
- 잘못된 링크/redirect/route 충돌이 나면 baseline 사용자에게 영향이 갈 수 있다
- rollback이 URL 차단만으로 끝나지 않을 수 있다
- shell routing과 entry point 충돌을 더 조심해야 한다

### 현재 프로젝트 적합성

차선책이다.

가능은 하지만, 지금 우리가 정리한 `baseline 유지 + rebuild 별도 alternate entry` 원칙보다 안전성이 떨어진다.

## Option C: Feature Flag Switch on Main URL

예시:

- 같은 URL에서 특정 사용자/조건만 rebuild를 보게 함

### 장점

- 사용자 그룹별 제한 노출이 가능하다
- 점진 노출 전략에 익숙한 팀이라면 운영 편의가 있을 수 있다

### 단점

- baseline과 rebuild가 같은 entry에서 갈라진다
- auth/session, selected-member, role 문제 발생 시 디버깅이 더 어렵다
- rollback이 단순 URL 차단이 아니라 flag 되돌리기가 된다
- 현재 프로젝트에서는 feature flag 운영 기반이 아직 약하다

### 현재 프로젝트 적합성

지금 단계에서는 비추천.

이 방식은 replacement candidate의 “조심스러운 alternate entry 평가”보다 훨씬 복잡하다.

## Option D: Local-Only Evaluation Continuation

예시:

- `127.0.0.1:5173` baseline
- `127.0.0.1:5175` rebuild

### 장점

- 바로 실행 가능하다
- 로컬에서 비교와 증빙 확보가 쉽다
- 현재까지 실제로 사용한 방식이다

### 단점

- 실제 internal-only exposure가 아니다
- 운영/배포 조건을 검증하지 못한다
- replacement candidate를 더 전진시키는 마지막 단계로는 부족하다

### 현재 프로젝트 적합성

준비 단계까지는 적합하지만, 다음 단계의 최종 해법은 아니다.

## Recommendation

현재 프로젝트 기준 추천 순위:

1. **Separate Internal-Only URL**
2. **Same Origin + Internal Route Prefix**
3. **Feature Flag Switch**
4. **Local-Only Evaluation** (이미 완료된 사전 리허설 용도)

## Recommended Decision

현재는 아래 방식으로 가는 것이 가장 안전하다.

- baseline URL 유지
- rebuild는 별도 internal-only URL에서만 노출
- 평가 범위는 `/members`, `/memberships`, `/reservations`, `/access`만 제한
- rollback은 rebuild URL 차단만으로 수행

## What Needs To Be Decided Next

실행 직전에 필요한 최종 입력은 이것이다.

1. 실제 baseline URL
2. 실제 rebuild internal-only URL
3. exposure owner
4. rollback decision owner
5. rebuild URL을 차단하는 실제 운영 방법

## Related References

- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-rebuild-route-subset-evaluation-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-execution-procedure.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-safe-cutover-checklist-and-rollback.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`
