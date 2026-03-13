---
title: refactor: frontend replacement candidate project
type: refactor
status: active
date: 2026-03-13
origin: docs/brainstorms/2026-03-13-frontend-replacement-project-brainstorm.md
supersedes: docs/plans/2026-03-13-refactor-frontend-rebuild-stage-remaining-work-plan.md
---

# refactor: frontend replacement candidate project

## Enhancement Summary

**Deepened on:** 2026-03-13  
**Sections enhanced:** replacement criteria, live parity order, risk gates, implementation phases

### Key Improvements
1. replacement candidate를 판단하는 기준을 단순 개념이 아니라 `live API`, `auth/session`, `role`, `local staging-profile smoke`, `rollback` gate로 더 명확히 고정했다.
2. rebuild readiness / parity-hardening 메모를 끌어와, 지금 branch가 어디까지 증명했고 무엇이 아직 mock/preset에 머물러 있는지 분리했다.
3. 각 phase에 “무엇을 만든다”뿐 아니라 “무엇을 blocker로 기록해야 하는가”를 추가해, 구현이 길어질수록 다시 prototype 감각으로 흐르지 않게 했다.
4. cutover 판단 전 반드시 남겨야 할 문서 산출물과 go/no-go 기준을 구체화했다.

### New Considerations Discovered
- 현재 rebuild의 strongest proof는 구조/ownership/invalidations이지, live backend confidence는 아니다.
- `live API parity`를 먼저 하지 않으면 이후 `auth/session parity`와 `migration 설계`가 실제보다 낙관적으로 보일 위험이 크다.
- `main`과 rebuild를 병행 유지하는 비용이 커질수록, blocker 목록과 branch recommendation이 계속 최신이어야 한다.

## Supersession Note

This plan supersedes the branch-role guidance in:
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-frontend-rebuild-stage-remaining-work-plan.md`

That earlier document was correct for the previous stage, when the rebuild branch was being treated primarily as a long-lived reference experiment. This plan replaces that recommendation and reclassifies the rebuild as a **replacement candidate project**. From this point on, the active question is no longer “should we keep the rebuild as reference only?” but “which cutover blockers must be removed before it can be evaluated as a real replacement candidate?”

The older plan remains useful as historical context for how the rebuild reached this stage, but this document is now the canonical planning surface for the branch’s next role.

## Overview

`/Users/abc/projects/GymCRM_V2/frontend`의 현재 SPA 기반 운영 프런트를 당장 교체하지는 않되, 별도 rebuild 트랙을 **replacement candidate project**로 승격한다.

이번 플랜의 목적은 새 프런트를 “더 구현해본다”가 아니라, **실제 교체를 막는 blocker를 우선순위대로 줄이는 것**이다. 이미 rebuild branch는 구조 실험으로 충분한 성과를 냈고, 이제는 cutover 가능성을 판단할 수 있는 수준까지 끌어올릴지 여부가 핵심이다.

이 플랜은 브레인스토밍의 결론을 그대로 따른다.

- rebuild는 계속 키워볼 가치가 있다.
- 하지만 immediate cutover는 아니다.
- 따라서 rebuild는 `prototype`이 아니라 **replacement candidate**로 관리한다.
- 성공 기준은 “구조가 더 마음에 든다”가 아니라 `live API parity`, `auth/session parity`, `rollback plan`을 포함한 cutover 기준 충족이다.

(see brainstorm: `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-replacement-project-brainstorm.md`)

### Research Insights

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-readiness-checkpoint.md`의 결론은 “아키텍처 실험으로는 성공했지만 replacement candidate로는 아직 부족”이었다.
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-parity-hardening.md`는 breadth 자체보다 cross-slice ownership과 invalidation discipline이 rebuild의 핵심 자산임을 보여준다.
- 따라서 다음 단계는 새 slice를 더 늘리는 것이 아니라, mock confidence를 live confidence로 바꾸는 작업이어야 한다.

## Problem Statement / Motivation

현재 `main` 프런트는 점진적으로 개선되고 있지만, 여전히 SPA coordinator 성격이 강하고 page-first 라우팅을 기준으로 이해하기에는 진입 장벽이 있다. 사용자 관점에서는 큰 문제 없이 동작하지만, 구현자 관점에서는 다음 부담이 남아 있다.

- 상위 조합부를 읽지 않고서는 페이지 동작을 추적하기 어려운 부분이 있음
- route/page 중심 학습 경험보다 section/state 중심 이해가 먼저 요구됨
- 새 구조를 직접 체험하며 발전시키기보다, 기존 구조를 이해한 뒤 부분 수정해야 하는 비중이 큼

반면 rebuild branch는 shell, members, memberships, reservations, access, lockers, products, crm, settlements까지 넓은 구조 실험을 마쳤고, pattern harvest도 이미 일부 `main`으로 들어왔다. 따라서 이제 rebuild를 단순 실험이 아니라, **교체 가능성을 검증하는 후보 프로젝트**로 다루는 것이 현실적이다.

### Research Insights

- rebuild branch는 breadth coverage는 충분하지만, readiness note 기준으로는 여전히 `runtime confidence is still prototype-heavy` 상태다.
- 즉 지금의 가장 큰 gap은 “새 구조를 더 설명하는 것”이 아니라 “실제 backend/session과 붙였을 때도 같은 설명이 유지되는가”다.
- 이 gap을 줄이지 않으면 migration/rollback 설계도 현실보다 과하게 낙관적으로 작성될 수 있다.

## Proposed Solution

rebuild branch를 계속 유지하되, 다음 단계의 목표를 breadth expansion이 아니라 **cutover blocker reduction**으로 바꾼다.

핵심 전략:
- `main`은 계속 운영 프런트로 유지
- rebuild는 별도 branch/worktree에서 계속 전진
- 다음 작업은 “무슨 화면을 더 붙일까”보다 “무엇이 cutover를 막고 있나”를 기준으로 선정
- live API parity와 auth/session parity를 mock/runtime preset 수준에서 real contract 수준으로 끌어올림
- cutover-ready minimum criteria를 만족하기 전까지는 draft/reference 상태 유지

브레인스토밍에서 합의된 최소 기준:
- `live API parity`
- `auth/session parity`
- `rollback plan`
- `role parity`
- `core workflow parity`
- `local staging-profile smoke coverage`
- `internal cutover rehearsal note`

브레인스토밍에서 합의된 `core workflow parity` 최소 범위:
- `회원관리`
- `회원권 업무`
- `예약 관리`
- `출입 관리`

우선순위:
1. `live API parity`
2. `auth/session parity`
3. `migration 설계`

(see brainstorm: `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-replacement-project-brainstorm.md`)

### Research Insights

- Vercel React best practices 관점에서도, 현재 rebuild의 강점은 `client-side data fetching`과 `rerender-dependencies`를 explicit contract로 다루기 시작했다는 점이다.
- 다만 replacement candidate 단계에서는 성능 미세 최적화보다 `stale-response`, `query invalidation`, `auth bootstrap` 같은 correctness gate가 우선이다.
- 따라서 이 플랜의 우선순위는 성능 개선보다 parity correctness를 먼저 닫도록 유지하는 것이 맞다.

## Technical Approach

### Replacement Candidate Definition

replacement candidate로 간주하려면 rebuild branch가 아래를 만족해야 한다.

- mock/preset이 아니라 실제 backend contract로도 주요 흐름이 동작한다
- auth/session bootstrap과 role restriction이 live API 기준으로 재현된다
- 최소 core workflow 4개가 기존 프런트와 같은 수준으로 local staging-profile 환경에서 smoke된다
- cutover 전환 절차와 rollback 절차가 문서화된다

즉 rebuild는 앞으로부터 다음 두 상태 중 하나로만 본다.

1. `not yet cutover-ready`
2. `candidate ready for controlled cutover evaluation`

중간 상태를 “대충 거의 됨”으로 두지 않는다.

**Operational gate interpretation**
- `not yet cutover-ready`: 구조적으로는 유망하지만, live/local-staging-profile evidence가 부족해 교체 판단을 해서는 안 되는 상태
- `candidate ready for controlled cutover evaluation`: local staging-profile 검증과 rollback rehearsal을 바탕으로 제한된 노출 평가를 시작할 수 있는 상태

### Research Insights

- readiness checkpoint에서 이미 확인했듯, 현재 rebuild는 “successful architecture experiment”이지 “replacement frontend”는 아니다.
- 이 문구를 바꾸려면 최소한 mock/preset을 넘어서는 live API와 auth/session evidence가 먼저 필요하다.

### Scope Boundary

이 플랜은 새 slice를 무한히 더 붙이는 계획이 아니다.

포함:
- rebuild의 live API 연결
- auth/session real parity
- role-based validation
- core workflow local staging-profile validation
- cutover/rollback 설계

제외:
- backend contract 자체 변경
- main 프런트 즉시 교체
- design system 전체 교체
- 새로운 major feature 확장

### Current Assets To Reuse

rebuild에서 이미 확보한 자산:
- shell/page-first route skeleton
- selectedMember canonical ownership
- explicit invalidation contract
- page-owned query/mutation 분리 패턴
- trainer-scoped reservation parity
- access / lockers / products / crm / settlements slice prototype

main에서 이미 harvest된 자산:
- selectedMember ownership 일부
- explicit query invalidation contract
- memberships mutation ownership 일부

이 플랜은 위 자산을 버리지 않고, real parity 검증 단계로 올리는 방식으로 진행한다.

### Research Insights

- 이미 `main`에 일부 harvest된 selected-member ownership / invalidation contract는 rebuild 전체 cutover를 기다리지 않고도 가치가 있다는 점을 증명했다.
- 따라서 replacement candidate 작업에서도 “전체 전환만이 유일한 성공”으로 보지 말고, proven pattern harvest가 계속 병행되는 구조를 유지하는 편이 리스크가 낮다.

## System-Wide Impact

- **Interaction graph**: rebuild의 section routes가 live backend와 연결되면 auth bootstrap, selected-member fetch, query invalidation, mutation feedback 흐름이 모두 실제 API latency/error를 타게 된다.
- **Error propagation**: 지금까지 mock/preset에서 가려졌던 401/403/404/validation error 흐름이 드러난다. 특히 auth/session bootstrap과 trainer role boundary가 핵심이다.
- **State lifecycle risks**: live API parity 단계에서는 optimistic local patch보다 explicit re-read and invalidation이 더 중요해진다. partial success 시 stale local state가 남지 않도록 계속 보수적으로 간다.
- **API surface parity**: `/api/v1/members`, `/api/v1/members/{id}`, `/api/v1/members/{id}/memberships`, `/api/v1/reservations*`, `/api/v1/access*`, `/api/v1/auth/*`는 cutover 핵심 surface다.
- **Integration test scenarios**: role switch, auth bootstrap, invalid member context, stale response, membership mutation 후 cross-section refresh, reservation completion 후 downstream count refresh는 반드시 cross-layer로 봐야 한다.

## Implementation Phases

### Phase 1: Live API Parity

Goal:
- rebuild가 mock 중심이 아니라 실제 backend contract 기준으로도 돌아가게 만든다

Tasks:
- rebuild의 API client를 live backend mode 기준으로 정리
- runtime auth preset과 실제 auth API 연결 방식을 분리
- members / memberships / reservations / access의 live API smoke 경로 확보
- mock-only 경로와 live 경로의 지원 범위를 문서화
- live mode에서 필요한 env/config를 worktree/branch 기준으로 정리

Success criteria:
- rebuild에서 live backend를 연결해도 최소 core workflow 4개가 동작한다
- mock mode와 live mode의 경계가 문서로 명확하다
- live mode에서 block 되는 contract gap이 목록화된다

**Implementation details to lock early**
- baseline과 rebuild가 같은 backend를 보되, 환경 변수/포트/세션 쿠키 기준을 문서로 고정한다
- live mode blocker는 “나중에 고친다”가 아니라 severity와 owner가 있는 checklist로 관리한다
- 이 단계에서는 모든 endpoint를 다 붙이기보다 core workflow 4개를 막는 계약 차이를 먼저 식별한다

**Primary evidence expected**
- live members flow note
- live memberships flow note
- live reservations flow note
- live access flow note

### Research Insights

- rebuild의 가장 강한 증거는 구조/ownership/invalidation discipline이고, 가장 약한 증거는 live backend confidence였다. 그래서 이 phase는 “붙는다”가 아니라 “실제 API에 붙어도 구조 설명이 유지된다”를 증명해야 한다.
- `live API parity`는 성공 케이스보다 failure surface를 먼저 구조적으로 드러내야 한다. 최소한 `401/403`, `404 invalid member context`, validation error, rapid switching 이후 stale response는 별도 blocker로 기록해야 한다.
- 이 단계에서는 성능 미세 최적화보다 correctness가 우선이다. 즉 cache/invalidation, request ownership, stale guard가 실제 latency와 error 조건에서도 유지되는지가 핵심이다.

**Required blocker log fields**
- endpoint / route
- baseline behavior
- rebuild behavior
- severity
- owner
- workaround 존재 여부

**Do not advance to Phase 2 unless**
- core workflow 4개 모두에서 live mode 진입 자체가 가능하고
- mock-only behavior와 live-supported behavior가 문서로 구분돼 있으며
- blocker 목록이 재현 가능한 evidence 형태로 유지된다

### Phase 2: Auth / Session Parity

Goal:
- rebuild가 auth/session 동작을 prototype runtime preset이 아니라 실제 앱 수준으로 설명 가능하게 만든다

Tasks:
- login / logout / refresh / protected route bootstrap을 live auth 흐름으로 재검증
- admin / desk / trainer role 전환과 제한을 live mode로 확인
- auth bootstrap flicker / redirect / selected-member clear 경계 재검증
- runtime preset은 개발용 보조 수단으로만 위치를 재정의

Success criteria:
- JWT auth에서 login/logout/refresh/protected route 동작이 baseline과 동등하게 설명된다
- role parity가 실제 backend 응답 기준으로 확인된다
- auth state 변경 시 stale selected-member / stale section state가 남지 않는다

**Implementation details to lock early**
- runtime preset은 계속 유지하되, 개발 보조 모드임을 UI/문서로 분명히 구분한다
- live auth 검증에서는 preset을 parity evidence로 쓰지 않는다
- role parity는 최소 `ROLE_CENTER_ADMIN`, `ROLE_DESK`, `ROLE_TRAINER` 3개를 baseline과 같은 체크리스트로 비교한다

### Research Insights

- shell routing work에서 이미 확인한 중요한 계약은 auth bootstrap 동안 잘못된 section flash가 없어야 한다는 점이다. replacement candidate 단계에서도 이 first-paint/bootstrap contract는 유지돼야 한다.
- runtime preset은 구조 설명에는 유용했지만 replacement evidence로는 충분하지 않다. 이 phase에서는 preset을 parity 증거에서 분리하고, live session만으로 판단해야 한다.
- auth/session parity는 로그인 성공 여부만이 아니라, auth 전이 중 stale selected-member / stale section state가 남지 않는지도 포함해야 의미가 있다.

**Parity checklist**
- unauth direct entry to protected route
- login success redirect
- logout clears protected state
- refresh token / bootstrap path
- role downgrade / role-specific restriction
- no flash of protected content during bootstrap

**Do not advance to Phase 3 unless**
- admin / desk / trainer 3 role이 live auth session 기준으로 모두 검증되고
- auth transition 뒤 stale selected-member / stale section state가 남지 않으며
- bootstrap flicker/redirect behavior가 baseline과 실질적으로 같은 수준으로 설명 가능하다

### Phase 3: Core Workflow Parity

Goal:
- 최소 운영 핵심 흐름 4개를 cutover 판단 가능한 수준으로 맞춘다

Workflow scope:
- 회원관리
- 회원권 업무
- 예약 관리
- 출입 관리

Tasks:
- 각 workflow의 happy path와 주요 failure path를 baseline 기준으로 다시 정리
- rebuild와 baseline의 behavior diff를 기록
- cross-section refresh / invalidation / selected-member handoff 검증
- trainer role에서 제한되는 흐름을 다시 확인

Success criteria:
- core workflow parity 체크리스트가 모두 채워진다
- baseline과 rebuild 간 behavior diff가 허용 가능한 수준으로 정리된다
- “구조는 좋아 보이지만 실제 운영 흐름은 다름” 상태를 벗어난다

**Recommended parity checklist axes**
- happy path
- auth failure / role restriction
- invalid member context
- cross-section refresh after mutation
- full reload after in-progress workflow
- mobile viewport usability

### Research Insights

- rebuild에서 가장 가치 있었던 구조 차이는 `selectedMember` canonical ownership과 explicit invalidation이었다. 따라서 core workflow parity는 화면 유사성보다 mutation 후 다른 섹션에 stale data가 남지 않는지까지 봐야 한다.
- baseline과 rebuild가 둘 다 “돌아간다”는 것만으로는 충분하지 않다. 운영에 영향을 주는 difference는 별도 diff log로 남겨 migration 판단 재료로 써야 한다.
- `회원관리`, `회원권 업무`, `예약 관리`, `출입 관리`는 모두 role과 selected-member handoff가 얽혀 있으므로, parity evidence는 화면 단위보다 흐름 단위가 더 중요하다.

**Required artifacts per workflow**
- desktop smoke screenshot(s)
- mobile smoke screenshot(s)
- short flow note
- known differences list

**Exit condition**
- 4개 workflow 모두에 대해 `baseline과 의미상 동일 / 차이가 있지만 허용 가능 / blocker`가 구분돼 있어야 하고
- blocker가 migration/rollback 단계로 넘길 수 있을 정도로 명확히 문서화돼 있어야 한다

### Phase 4: Local Staging-Profile Smoke Coverage

Goal:
- 로컬 mock/live 검증을 넘어 `staging`에 최대한 가까운 local staging-profile 기준 cutover confidence를 확보한다

Tasks:
- local staging-profile 환경에서 core workflow 4개 smoke 시나리오 작성
- desktop/mobile viewport smoke 기준 정의
- role-based smoke(admin/desk/trainer) 수행
- 실패 시 blocker 문서화
- internal cutover rehearsal에 필요한 전제 조건을 같이 정리

Success criteria:
- local staging-profile smoke evidence가 문서로 남는다
- desktop/mobile/role 조합에서 큰 blocker가 식별된다
- cutover 논의를 local staging-profile evidence 기반으로 할 수 있다

**Minimum local smoke matrix**
- desktop + admin
- desktop + desk
- desktop + trainer
- mobile + admin

이 단계에서는 coverage를 넓히기보다, 최소 matrix라도 반복 가능하고 문서화된 시나리오로 만드는 것이 중요하다.

### Research Insights

- 실제 staging 환경이 없다면, replacement candidate 단계의 필수 증거는 `local staging-profile smoke + internal cutover rehearsal` 조합으로 재정의해야 한다.
- local staging-profile smoke는 프로필/보안/세션/role 계약을 최대한 운영과 가깝게 재현하는 용도이고, internal cutover rehearsal은 실제 노출 없이 절차와 rollback 판단을 검증하는 용도다.
- 이 조합은 실제 staging을 완전히 대체하지는 못하지만, 현재 팀 환경에서 cutover blocker를 가장 현실적으로 줄일 수 있는 기준이다.

### Phase 5: Migration / Rollback Plan

Goal:
- “좋아 보이는 새 프런트”가 아니라 “전환 가능한 후보”가 되도록 운영 계획을 갖춘다

Tasks:
- cutover strategy 결정
  - full swap
  - section-by-section
  - feature flag
- rollback trigger와 절차 정의
- cutover 전후 확인 항목 정의
- rebuild branch의 future role 최종 정리

Success criteria:
- rollback plan이 문서화된다
- cutover blocker와 go/no-go 조건이 명확하다
- replacement candidate가 실제 전환 후보로 평가 가능한 상태가 된다
- internal cutover rehearsal 조건과 중단 기준이 명시된다

**Migration decision gate**
- full swap은 기본값으로 두지 않는다
- 기본 추천은 `feature flag` 또는 `section-by-section` 중 하나를 baseline으로 검토
- rollback은 “문서에 적혀 있다”가 아니라, 누가 어떤 기준으로 언제 되돌리는지까지 포함해야 한다

### Research Insights

- migration 설계는 구현 마지막에 형식적으로 붙이는 문서가 아니라, 앞선 4개 phase에서 발견된 blocker를 운영 의사결정으로 번역하는 작업이다.
- replacement candidate가 실제 후보가 되려면 rollout보다 rollback이 더 명확해야 한다. 이는 새 프런트를 불신해서가 아니라 교체 프로젝트의 운영 기준 때문이다.
- 이 단계에서 중요한 질문은 “어떻게 바꾸는가”보다 “어떤 조건에서 즉시 중단하는가”다.

**Minimum migration design contents**
- cutover unit
  - 전체 전환 / route subset / internal-only exposure 중 하나 고정
- rollback trigger
  - auth regression
  - role restriction regression
  - core workflow blocker
  - unexpected local staging-profile or rehearsal-only error
- rollback steps
- owner / decision-maker
- retry 전에 필요한 evidence

## Go / No-Go Decision

이 플랜의 마지막 산출물은 “지금 당장 교체한다”가 아니라, rebuild를 **평가 가능한 replacement candidate** 상태로 만드는 것이다.

가능한 결론은 세 가지다.

1. `Proceed to controlled cutover evaluation`
- 최소 기준 6개가 충족되고, blocker가 운영적으로 관리 가능할 때

2. `Remain replacement candidate, continue blocker reduction`
- 구조는 충분하지만 live/local-staging-profile evidence가 아직 부족할 때

3. `Step back to reference branch posture`
- 구조 실험으로는 유효하지만, 현재 팀 상황에서 교체 비용/리스크가 과할 때

### Research Insights

- rebuild는 이미 architecture experiment로는 성공했다. 따라서 최종 판단은 “좋은 구조인가”가 아니라 “지금 팀이 교체 프로젝트를 감당할 수 있는가”도 포함해야 한다.
- go/no-go는 기술 품질만이 아니라 운영 가능성, 검증 비용, 학습 비용까지 포함하는 의사결정이어야 한다.

## Alternative Approaches Considered

### Approach A: 계속 pattern harvest만 한다

Pros:
- 가장 안전하다
- main 리스크가 낮다

Cons:
- rebuild를 계속 reference branch로만 두게 된다
- page-first 구조를 실제 제품 후보로 검증하는 데는 한계가 있다

Rejected because:
- 사용자가 page-based routing을 실제로 다루기 쉬운 구조를 더 원하고 있고, rebuild는 이미 그 가능성을 보여준 상태다.

### Approach B: rebuild를 바로 cutover 프로젝트로 전환한다

Pros:
- 전환 속도가 빠르다

Cons:
- 지금은 live/local-staging-profile/migration 증거가 부족하다
- 운영 리스크가 크다

Rejected because:
- 브레인스토밍에서 immediate cutover는 시기상조라고 정리됐다.

## Acceptance Criteria

### Functional Requirements

- [x] rebuild가 live API mode에서 core workflow 4개를 지원한다
- [x] rebuild가 live auth/session 흐름에서 baseline과 동등한 route/bootstrap behavior를 보인다
- [x] admin / desk / trainer role parity가 실제 backend 기준으로 확인된다
- [x] local staging-profile 환경에서 core workflow 4개 smoke evidence가 확보된다
- [x] migration strategy와 rollback plan이 문서화된다
- [x] internal cutover rehearsal note가 작성된다

### Non-Functional Requirements

- [x] rebuild는 live mode에서도 build/test가 안정적으로 유지된다
- [x] mock mode와 live mode의 경계가 문서로 명확하다
- [x] cutover blocker 목록이 계속 최신 상태다

### Quality Gates

- [x] live API parity note 작성
- [x] auth/session parity note 작성
- [x] local staging-profile smoke note 작성
- [x] migration/rollback note 작성
- [x] final candidate checkpoint 작성
- [x] internal cutover rehearsal note 작성

## Final Output Checklist

- [x] live API blocker log
- [x] live auth/session parity note
- [x] role parity matrix
- [x] core workflow parity diff log
- [x] local staging-profile smoke evidence set
- [x] migration / rollback document
- [x] final go/no-go recommendation
- [x] internal cutover rehearsal note

## Current Go / No-Go Recommendation

Current decision:

`Proceed to controlled route subset evaluation`

Interpretation:
- rebuild remains a replacement candidate
- full swap is still not recommended
- the next safe step is limited route-subset evaluation for the minimum core workflow scope

## Success Metrics

- rebuild branch를 두고 “좋아 보이는 prototype”이 아니라 “교체 후보”라고 말할 수 있다
- cutover 여부를 감으로 판단하지 않고 명시된 criteria로 판단할 수 있다
- `main`과 rebuild를 병행 유지하는 비용이 어떤 대가를 위해 쓰이는지 설명 가능하다

## Dependencies & Risks

Dependencies:
- rebuild branch/worktree 유지
- live backend environment
- role별 테스트 계정
- local staging-profile backend 실행 가능성

Risks:
- live API parity에서 예상보다 많은 contract gap이 드러날 수 있음
- local staging-profile smoke를 시작하면 mock 기반 confidence가 크게 낮아질 수 있음
- migration plan 없이 parity만 높여도 실제 cutover는 못 할 수 있음
- branch가 계속 커지면 reviewability가 다시 떨어질 수 있음
- 실제 staging이 없어서 infra/cookie/proxy 차이를 완전히 닫지 못할 수 있음

## Recommended Execution Order

1. live API parity로 mock confidence를 real confidence로 바꾼다
2. auth/session parity와 role parity를 live backend 기준으로 다시 검증한다
3. core workflow parity diff를 문서화한다
4. local staging-profile smoke matrix를 확보한다
5. internal cutover rehearsal note를 작성한다
6. 마지막에 migration / rollback plan을 확정한다

Why this order:
- live contract를 먼저 모르면 이후 auth/migration 설계가 왜곡된다
- auth/session을 먼저 닫아야 role parity와 workflow parity가 실제 의미를 갖는다
- local staging-profile evidence와 internal rehearsal 없이 rollback plan을 써도 현실성이 떨어진다

## Sources & References

### Origin
- **Brainstorm document:** `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-replacement-project-brainstorm.md`
  - carried-forward decisions:
    - rebuild는 replacement candidate project로 본다
    - immediate cutover는 하지 않는다
    - 우선순위는 live API parity -> auth/session parity -> migration 설계

### Internal References
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-frontend-rebuild-stage-remaining-work-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-foundation.md`
- draft PR `#73`

### Related Work
- PR `#74`
- rebuild branch `codex/refactor-frontend-rebuild-v1`
