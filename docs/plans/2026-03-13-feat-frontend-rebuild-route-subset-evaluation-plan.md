---
title: feat: frontend rebuild route subset evaluation
type: feat
status: active
date: 2026-03-13
origin: docs/brainstorms/2026-03-13-frontend-replacement-project-brainstorm.md
---

# feat: frontend rebuild route subset evaluation

## Overview

rebuild frontend를 즉시 full swap 하지 않고, `/members`, `/memberships`, `/reservations`, `/access` 4개 route만 제한적으로 평가하는 `controlled route subset evaluation` 계획이다.

이 플랜은 rebuild를 `replacement candidate`로 승격한 상위 계획을 실행 가능한 노출 단위로 구체화한다. 목적은 “새 프런트를 더 크게 만든다”가 아니라, **baseline을 유지한 채 제한된 범위에서 교체 후보로 운영 판단이 가능한지 검증하는 것**이다.

이 플랜은 다음 상위 결정들을 그대로 따른다.
- rebuild는 replacement candidate project로 본다
- full swap은 아직 하지 않는다
- 최소 core workflow scope만 먼저 평가한다
- 실제 staging이 없으므로 `local staging-profile smoke + internal cutover rehearsal` 조합을 근거로 사용한다

(see brainstorm: `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-replacement-project-brainstorm.md`)

## Problem Statement / Motivation

현재 rebuild branch는 구조 실험 단계를 넘어, local live parity / auth parity / role matrix / core workflow parity까지 상당 부분 확보했다. 하지만 아직 운영 프런트를 바로 교체하기엔 마지막 안전장치가 부족하다.

부족한 안전장치는 기능 구현 자체보다 **운영 통제 장치**에 가깝다.
- 누구에게 rebuild를 노출할지
- 어떤 route만 rebuild로 열지
- 문제가 생기면 baseline-only로 어떻게 즉시 되돌릴지
- 어떤 증상을 blocker로 보고 중단할지

즉 현재 필요한 것은 새 기능 추가가 아니라, `controlled route subset evaluation`을 실제로 수행 가능한 운영 단위로 정의하는 일이다.

## Proposed Solution

`controlled route subset evaluation`을 별도 단계로 명시하고, rebuild는 다음 형태로만 평가한다.

- baseline frontend 기본 진입 경로 유지
- rebuild frontend는 **별도 internal-only URL**(baseline과 다른 진입 주소)에서만 노출
- 평가 대상 route는 아래 4개로 제한
  - `/members`
  - `/memberships`
  - `/reservations`
  - `/access`
- 나머지 route (`/crm`, `/settlements`, `/lockers`, `/products`)는 첫 노출 범위에서 제외
- 문제 발생 시 baseline-only 상태로 즉시 복귀

이 접근은 full swap보다 훨씬 보수적이지만, replacement candidate를 실제 운영 판단에 올릴 수 있는 가장 현실적인 첫 단계다.

## Technical Considerations

- **노출 방식**: 첫 단계의 `internal-only alternate entry`는 **별도 internal-only URL**로 고정한다. feature flag, role gate, route prefix는 이번 평가의 기본 노출 방식으로 쓰지 않는다. baseline URL은 그대로 유지하고, rebuild는 별도 주소에서만 평가한다.
- **rollback 단순성**: rollback은 새 URL 노출 중단 또는 접근 권한 제거만으로 baseline-only 상태를 회복할 수 있어야 한다. DNS/ingress/app entry switch 중 하나를 쓰더라도, baseline URL 교체가 필요 없는 형태여야 한다.
- **권한 경계**: admin / desk / trainer role matrix는 baseline 수준으로 그대로 유지되어야 한다. 특히 `/access`의 trainer unsupported contract는 유지되어야 한다.
- **selectedMember ownership**: 이미 `main`과 rebuild에서 정리한 canonical ownership 경계를 깨지 않는다. route subset evaluation 중에도 stale selected-member는 blocker다.
- **query invalidation**: mutation 후 cross-section stale state가 남으면 route subset evaluation을 중단한다.
- **rollback simplicity**: baseline 유지가 전제이므로, rebuild 노출 중단만으로 baseline-only 상태를 회복할 수 있어야 한다.
- **evidence-first 운영**: 노출 전/중/후 판단을 모두 문서와 screenshot/log evidence로 남긴다.

## System-Wide Impact

- **Interaction graph**: `/members -> /memberships /reservations` handoff, membership mutation 후 member summary refresh, reservation mutation 후 targets/memberships/reservations refresh가 실제 노출 조건에서도 유지돼야 한다.
- **Error propagation**: auth regression, role regression, selected-member corruption, stale summary/target/list는 모두 즉시 rollback trigger가 된다.
- **State lifecycle risks**: 노출 중 auth 전이, role downgrade, selected-member 변경, mutation 후 refresh가 동시에 일어날 때 stale state가 남지 않아야 한다.
- **API surface parity**: `/api/v1/members*`, `/api/v1/reservations*`, `/api/v1/access*`, `/api/v1/auth/*`는 route subset 평가 핵심 surface다.
- **Integration test scenarios**: logged-out direct entry, live login/logout, trainer unsupported `/access`, selected-member handoff, mutation 후 cross-section refresh는 문서와 smoke 양쪽에서 확인돼야 한다.

## Implementation Phases

### Phase 1: Exposure Contract Fixing

Goal:
- route subset evaluation을 어떤 shape로 할지 먼저 고정한다

Tasks:
- `internal-only alternate entry`를 **별도 internal-only URL**로 고정
- baseline URL과 rebuild URL을 각각 무엇으로 둘지 문서에 명시
- alternate entry 노출/차단 owner를 명시
- baseline 기본 진입 경로는 유지한다고 문서로 명시
- route subset 4개만 평가 대상으로 제한
- 역할(implementation owner / reviewer / exposure owner / rollback decision owner) 정의

Success criteria:
- 누가 무엇을 볼 수 있는지 설명 가능하다
- baseline과 rebuild가 어떤 URL/노출 규칙으로 공존하는지 문서로 고정된다
- rollback이 “internal-only URL 차단” 수준으로 설명 가능하다

### Phase 2: Route Subset Safety Checklist

Goal:
- 노출 전 필수 안전 체크를 재확인한다

Tasks:
- auth/session parity evidence 최신 상태 확인
- role matrix evidence 최신 상태 확인
- core workflow parity diff 최신 상태 확인
- blocker log 최신 상태 확인
- migration / rollback baseline과 현재 판단이 일치하는지 확인
- 핵심 evidence를 repo-tracked docs로 mirror했는지 확인

Success criteria:
- 노출 전 체크리스트가 모두 채워져 있다
- high severity blocker가 없다
- machine-local worktree 없이도 review 가능한 evidence chain이 있다

### Phase 3: Internal Route Subset Evaluation

Goal:
- 제한된 내부 경로에서 route subset을 실제로 써보는 평가를 수행한다

Tasks:
- `/members` workflow 확인
- `/memberships` workflow 확인
- `/reservations` workflow 확인
- `/access` workflow 확인
- desktop/mobile screenshot 및 차이점 기록
- known acceptable differences / blockers 기록

Success criteria:
- route subset 4개가 baseline 대비 의미상 동일 또는 허용 가능한 차이 상태다
- unsupported role surface가 명확히 설명된다
- mutation 후 stale state가 남지 않는다

### Phase 4: Rollback and Decision Update

Goal:
- 평가 결과를 운영 판단 문서에 반영한다

Tasks:
- blocker log 업데이트
- migration / rollback note 업데이트
- final candidate checkpoint 업데이트
- route subset cutover decision note 업데이트

Success criteria:
- 최종 판단이 `Proceed`, `Pause`, `Rollback to baseline-only` 중 하나로 명확하다
- full swap 판단으로 섣불리 뛰지 않는다

## Alternative Approaches Considered

### 1. Full swap immediately

Pros:
- 가장 빠르게 새 구조를 제품에 적용 가능

Cons:
- rollback pressure가 너무 큼
- 마지막 운영 통제 장치가 부족함

Rejected because:
- 현재 evidence는 replacement candidate 수준이지 full cutover-ready 수준은 아님

### 2. Continue as reference branch only

Pros:
- 가장 안전함

Cons:
- 실제 교체 가능성을 검증하지 못함

Rejected because:
- 이미 local live parity와 role/workflow evidence가 충분히 쌓여서, 제한적 노출 정도는 판단 가능한 단계에 도달했기 때문

## Acceptance Criteria

### Functional Requirements

- [x] route subset 4개만 평가 대상으로 제한된다
- [x] baseline 기본 진입 경로는 유지된다
- [ ] rebuild는 별도 internal-only URL 기준으로 노출된다
- [x] `/members`, `/memberships`, `/reservations`, `/access` 평가 결과가 문서화된다
- [x] auth/session, role, selected-member, invalidation 차이점이 기록된다
- [x] rollback trigger와 baseline-only fallback 기준이 문서에 반영된다

### Non-Functional Requirements

- [ ] 노출 방식(URL, owner, rollback trigger)이 명확하다
- [x] blocker severity/owner/evidence 경로가 빠짐없이 기록된다
- [x] acceptable difference와 true blocker가 구분된다

### Quality Gates

- [x] route subset evaluation plan note 작성
- [x] updated blocker log
- [x] updated migration / rollback note
- [x] updated final candidate checkpoint
- [x] updated route subset cutover decision note

## Progress Note

현재 상태:

- local alternate-entry rehearsal은 baseline/rebuild 비교와 screenshot evidence까지 완료됨
- durable mirror 문서와 실행 절차/입력 시트/최종 체크리스트도 main repo에 반영됨
- 아직 미완료인 항목은 **실제 internal-only URL과 운영 owner 지정**뿐이다

즉 이 플랜은 문서/로컬 리허설 기준으로는 상당 부분 완료됐지만, 실제 route subset evaluation을 시작하려면 아래 두 값이 더 필요하다.

- rebuild internal-only URL 실제 값
- exposure owner / rollback decision owner 실제 지정

## Success Metrics

- route subset evaluation이 “가능하다”가 아니라 실제로 **어떤 조건에서 가능한지** 설명 가능하다
- full swap을 하지 않아도 운영 판단을 내릴 수 있다
- rebuild가 replacement candidate인지 reference branch인지 다시 헷갈리지 않는다

## Dependencies & Risks

Dependencies:
- rebuild branch `codex/refactor-frontend-rebuild-v1`
- local live API parity evidence
- auth/session parity evidence
- local staging-profile smoke evidence
- migration / rollback baseline

Risks:
- baseline과 rebuild를 동시에 강하게 비교하려 하면 local dev origin 제약 때문에 판단이 흐려질 수 있음
- route subset 평가가 실제로는 full swap 기대를 자극할 수 있음
- owner가 비어 있으면 rollback 판단이 문서상으로만 남을 수 있음
- 별도 internal-only URL이 구현되지 않으면 평가 자체가 문서상 계획으로만 남을 수 있음
- machine-local worktree 증빙에만 의존하면 다른 리뷰어가 같은 판단을 재현하기 어려움

## Sources & References

### Origin
- **Brainstorm document:** `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-replacement-project-brainstorm.md`
  - carried-forward decisions:
    - rebuild는 replacement candidate project로 본다
    - full swap은 immediate target이 아니다
    - 최소 기준은 live API parity, auth/session parity, role parity, core workflow parity, rollback plan이다

### Evidence Durability Note
- 이 플랜은 main repo의 canonical 실행 문서다. 따라서 `.worktrees/...` 경로는 임시 작업 편의 경로일 뿐, 장기 reference의 canonical evidence로 보지 않는다.
- route subset evaluation을 실제로 시작하기 전, 아래 핵심 evidence는 **repo-tracked docs 경로**로 mirror되어야 한다.
- mirror target examples:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`
- mirror 전까지는 `codex/refactor-frontend-rebuild-v1` 브랜치 checkout이 review context의 사실상 기준이지만, 이 플랜의 완료 조건은 machine-local worktree 없이도 evidence chain을 읽을 수 있는 상태다.

### Internal References
- replacement candidate canonical plan:
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-frontend-replacement-candidate-project-plan.md`
- route subset execution procedure:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-execution-procedure.md`
- rebuild route subset evaluation note:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-route-subset-evaluation-plan.md`
- route subset cutover decision:
  - durable mirror: `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`
  - worktree source: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-route-subset-cutover-decision.md`
- migration / rollback baseline:
  - durable mirror: `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-migration-rollback-plan.md`
  - worktree source: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-migration-rollback-plan.md`
- final candidate checkpoint:
  - durable mirror: `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-final-candidate-checkpoint.md`
  - worktree source: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-final-candidate-checkpoint-draft.md`
- blocker log:
  - durable mirror: `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-live-api-blocker-log.md`
  - worktree source: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-blocker-log.md`
