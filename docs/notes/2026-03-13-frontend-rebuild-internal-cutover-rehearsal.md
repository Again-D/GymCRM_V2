# Frontend Rebuild Internal Cutover Rehearsal

Date: 2026-03-13

## Purpose

실제 staging 환경이 없는 현재 조건에서, rebuild frontend를 교체 후보로 계속 평가하기 위해 필요한 **내부 cutover rehearsal** 기준을 정리한다.

이 문서는 실제 외부 노출이나 운영 전환이 아니라, 다음 질문에 답하기 위한 내부 리허설 문서다.

- 제한된 경로만 rebuild로 열어도 운영 판단이 가능한가
- 문제가 생기면 baseline으로 즉시 되돌리는 판단 기준이 충분한가
- local staging-profile smoke만으로 놓칠 수 있는 운영 절차 공백이 있는가

## Scope

이 rehearsal은 아래 범위만 다룬다.

- route subset exposure 가정
- role별 접근 범위 점검
- rollback trigger 확인
- blocker 기록 흐름 점검

다루지 않는 것:

- 실제 외부 사용자 노출
- 실제 배포 스위치 변경
- infra-specific deploy rollback 절차

## Candidate Route Subset

첫 rehearsal 대상 route:

- `/members`
- `/memberships`
- `/reservations`
- `/access`

이 4개는 replacement candidate plan의 최소 core workflow 범위와 같다.

## Rehearsal Questions

### 1. Exposure Shape

- baseline frontend는 그대로 유지되는가
- rebuild는 별도 진입 경로에서만 접근하는가
- 운영자/개발자에게만 명시적으로 노출하는 시나리오가 설명 가능한가

### 2. Auth / Session

- logged-out 상태에서 protected route 진입이 baseline처럼 차단되는가
- admin / desk / trainer role matrix가 local staging-profile smoke 기준으로 설명 가능한가
- logout 이후 protected state가 남지 않는가

### 3. Workflow Safety

- selected-member handoff가 route 간 전환에서 안정적인가
- mutation 후 summary / target / list state가 stale하지 않은가
- unsupported role surface가 잘못 열린 뒤 403으로 뒤늦게 막히는 경로가 없는가

### 4. Rollback Decision

- 어떤 증상이 나오면 rebuild exposure를 즉시 중단할지 명확한가
- blocker owner / severity / evidence 경로를 바로 기록할 수 있는가
- baseline-only fallback을 팀이 바로 이해할 수 있는가

## Rehearsal Checklist

- [x] route subset 4개가 local staging-profile smoke 기준으로 pass 또는 documented acceptable difference 상태다
- [x] auth/session parity note가 최신 상태다
- [x] role matrix evidence가 최신 상태다
- [x] blocker log가 최신 상태다
- [x] rollback trigger가 migration/rollback baseline과 일치한다
- [x] final checkpoint draft가 현재 판단과 일치한다

## Output To Update

rehearsal 후 아래 문서를 같이 업데이트한다.

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-route-subset-cutover-decision.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-final-candidate-checkpoint-draft.md`

## Rehearsal Evidence

### Exposure Shape

- baseline frontend는 기본 진입 경로로 유지하는 전제를 그대로 유지했다
- rebuild frontend는 별도 진입 경로/내부 후보 프로젝트로만 취급했다
- local staging-profile smoke는 rebuild를 backend-allowed dev origin(`5173`)에서 단독 평가하는 방식으로 수행했고, baseline은 parity diff와 기존 local-live evidence로 비교했다

### Auth / Session

- logged-out direct entry to `/members`가 `/login`으로 정리되는 것을 local staging-profile smoke에서 다시 확인했다
- admin / desk / trainer role matrix가 local staging-profile smoke와 live auth/session note에 모두 기록돼 있다
- logout 이후 protected state가 남지 않는 경계도 local live + local staging-profile evidence로 확인됐다

### Workflow Safety

- `/members`, `/memberships`, `/reservations`, `/access` 4개 route가 local staging-profile smoke에서 pass 또는 documented acceptable difference 상태로 정리돼 있다
- selected-member handoff, mutation 후 refresh, unsupported role surface, stale member-row reset이 각각 관련 note와 tests로 고정돼 있다

### Rollback Decision

- rollback trigger는 auth regression, role regression, core workflow blocker, selected-member corruption으로 고정돼 있다
- blocker owner / severity / workaround / evidence path를 가진 blocker log가 최신 상태다
- baseline-only fallback recommendation이 migration / rollback baseline 문서와 일치한다

## Current Recommendation

현재는 이 rehearsal을 **실행 완료 상태**로 본다.

결론:

- local staging-profile smoke
- auth/session parity evidence
- role matrix
- core workflow parity diff
- rollback baseline

을 함께 보면, rebuild는 아직 full swap 대상은 아니지만 **controlled route subset evaluation**으로 넘어갈 수 있는 replacement candidate 상태다.

현재 recommendation은 다음과 같다.

`Proceed to controlled route subset evaluation`
