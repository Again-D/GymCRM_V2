# Frontend Rebuild Route Subset Evaluation Final Checklist

Date: 2026-03-13

## Purpose

이 문서는 frontend rebuild의 `controlled route subset evaluation`을 실제로 시작하기 직전에 확인할 최종 체크리스트다.

이 체크리스트는 아래 route subset에만 적용한다.

- `/members`
- `/memberships`
- `/reservations`
- `/access`

이 문서는 full swap 체크리스트가 아니다. baseline frontend를 유지한 채, rebuild를 별도 internal-only URL로 제한 노출하는 평가 단계에만 사용한다.

## Canonical References

평가 전 아래 문서가 최신이어야 한다.

- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-rebuild-route-subset-evaluation-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-execution-procedure.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md`

## 1. Exposure Contract

- [ ] baseline 기본 URL이 유지된다
- [ ] rebuild는 별도 internal-only URL로만 노출된다
- [ ] baseline URL에서 rebuild로 자동 전환되지 않는다
- [ ] exposure owner가 정해져 있다
- [ ] rollback decision owner가 정해져 있다
- [ ] evidence recorder가 정해져 있다

## 2. Active Blockers

- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`가 최신이다
- [ ] high severity active blocker가 없다
- [ ] low severity blocker는 평가 중 허용 가능한 것으로 분류돼 있다
- [ ] acceptable difference와 true blocker가 구분돼 있다

## 3. Auth / Session Parity

- [ ] logged-out direct entry가 `/login`으로 정리된다
- [ ] login / logout / refresh 흐름이 baseline보다 나빠지지 않는다
- [ ] auth 전이 뒤 stale `selectedMember`가 남지 않는다
- [ ] admin / desk / trainer role matrix 증거가 있다

## 4. Core Workflow Parity

### Members
- [ ] 목록 렌더 / 필터 / pagination / member select가 baseline 의미와 맞다

### Memberships
- [ ] selected-member handoff가 맞다
- [ ] purchase / hold / resume / refund 흐름이 설명 가능하다
- [ ] mutation 후 stale summary가 남지 않는다

### Reservations
- [ ] selected-member handoff가 맞다
- [ ] target list / reservation list / action surface가 동작한다
- [ ] mutation 후 targets / memberships / reservations가 동기화된다

### Access
- [ ] selected member 없이도 글로벌 operational page로 열린다
- [ ] desk/admin read-write surface가 맞다
- [ ] trainer unsupported contract가 명확하다
- [ ] unsupported role 전환 시 stale member rows가 남지 않는다

## 5. Mobile / Desktop Evidence

- [ ] desktop screenshot evidence가 있다
- [ ] mobile screenshot evidence가 있다
- [ ] iPhone 14 Pro Max viewport 기준 잘림 문제가 없다
- [ ] pagination / filters / CTA가 usable하다

## 6. Rollback Readiness

- [ ] rollback은 rebuild URL 차단만으로 설명 가능하다
- [ ] baseline-only 상태 복귀 절차가 한 문장으로 설명 가능하다
- [ ] rollback trigger가 문서에 반영돼 있다
- [ ] rollback 후 업데이트할 문서가 정해져 있다

## 7. Evaluation Output

평가가 끝나면 아래 문서를 업데이트한다.

- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`
- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md`
- [ ] `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`

## Final Go / No-Go Prompt

마지막으로 아래 질문에 답할 수 있어야 한다.

- [ ] 이 평가를 지금 시작해도 baseline 운영이 흔들리지 않는가?
- [ ] blocker가 생겼을 때 rebuild 노출만 끄고 즉시 baseline-only로 돌아갈 수 있는가?
- [ ] 현재 상태를 `Proceed`, `Pause`, `Rollback to baseline-only` 중 하나로 즉시 분류할 수 있는가?
