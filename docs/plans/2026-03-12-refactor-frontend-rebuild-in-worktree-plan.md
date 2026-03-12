---
title: refactor: rebuild frontend in isolated branch and worktree against documented structure
type: refactor
status: active
date: 2026-03-12
origin: docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md
---

# refactor: rebuild frontend in isolated branch and worktree against documented structure

## Enhancement Summary

**Deepened on:** 2026-03-12  
**Sections enhanced:** worktree isolation, routing/state ownership, migration phases, parity verification, performance guardrails

### Key Improvements
1. 별도 worktree 운영 규칙을 `git-worktree` skill 기준으로 더 구체화해, 메인 워크트리와 실험 브랜치의 책임을 분리했다.
2. shell-only routing에서 검증된 auth/bootstrap/fallback 계약을 재구축 플랜의 parity gate로 끌어와, 라우팅 회귀 기준을 명확히 했다.
3. `folder_structure.md`를 literal copy하지 않고, 운영 콘솔 복잡도에 맞는 `page-first + explicit support modules` 보정 규칙을 더 분명히 적었다.
4. 검색·쿼리·reset 관련 과거 회귀를 다시 만들지 않도록 debounce/cache/dedupe와 stale-response guard 재적용 규칙을 추가했다.
5. 재구축을 `prototype-first`로 진행해, 구조 적합성을 먼저 빠르게 검증한 뒤 feature parity를 붙이는 단계적 전략을 명시했다.

### New Considerations Discovered
- worktree 생성은 raw `git worktree add`가 아니라 manager script를 써야 `.env`와 ignore 규칙이 같이 유지된다.
- shell-only routing에서 이미 확인한 `authBootstrapping`/redirect/fallback 계약을 새 구조에서도 먼저 복제하지 않으면, 재구축 초기에 가장 눈에 띄는 UX 회귀가 생길 수 있다.
- 현재 운영 앱은 page-first로 재구성하더라도 `memberships`, `reservations`, `access`를 단일 page file에 밀어 넣으면 오히려 복잡도가 다시 커진다.
- 처음부터 parity를 다 맞추려 들면 구조 실험이 느려지고, 실패했을 때 손실이 커진다. prototype-first checkpoint가 필요하다.
- prototype checkpoint는 baseline과 side-by-side 비교 모델이 있어야 주관적 판단을 줄일 수 있다.
- rebuilt app의 `selectedMember` canonical owner를 먼저 고정하지 않으면, prototype 단계부터 coordinator drift가 다시 생길 수 있다.

## Overview
재구축 작업을 현재 `main` 흐름과 분리하기 위해 **별도 `codex/` 브랜치와 별도 git worktree**에서 프런트엔드를 다시 구성한다. 목표는 `/Users/abc/projects/GymCRM_V2/docs/folder_structure.md`의 `src` 구조를 기준으로 새로운 프런트 골격을 만들고, 기존 운영 기능을 단계적으로 parity 검증하며 옮기는 것이다.

이번 작업은 작은 구조 정리가 아니라 **프런트엔드 재구축 프로젝트**로 취급한다. 따라서 기존 `/Users/abc/projects/GymCRM_V2/frontend`는 `main`에서 계속 기능 개발이 가능해야 하고, 재구축 브랜치는 장기간 병행 검증을 전제로 한다.

This plan intentionally chooses the higher-cost path from the brainstorm for dedicated evaluation and implementation isolation (see brainstorm: `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md`).

### Research Insights

**Why isolation matters**
- `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md`의 결론처럼, 이 작업은 작은 정리가 아니라 재구축 프로젝트다.
- 따라서 `main`과 같은 워크트리에서 진행하면 기능 개발과 실험 구조가 뒤섞여 parity 판단이 어려워진다.

**Operational constraint learned from existing frontend work**
- `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`에서 이미 확인했듯, 이 앱의 프런트 변경은 단순 스타일 조정이 아니라 정보구조와 auth 흐름까지 같이 움직인다.
- 즉 rebuild는 file move보다 app shell 재정의에 가깝고, baseline validation 없이 시작하면 회귀 원인 추적이 어려워진다.

## Problem Statement
현재 프런트는 최근 리팩토링으로 `app / features / shared` 구조가 강화됐지만, 다음 문제가 남아 있다.

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`가 여전히 상위 coordinator 역할을 크게 가진다.
- 현재 구조와 `/Users/abc/projects/GymCRM_V2/docs/folder_structure.md` 문서 기준이 일치하지 않는다.
- 향후 route/state/query/layout 기준을 더 강하게 통일하려면, 점진 리팩토링만으로는 설명 구조가 계속 복잡해질 수 있다.

동시에 재구축은 높은 비용과 parity 리스크를 가진다. 따라서 이번 계획의 핵심은 “새 구조로 바로 갈아탄다”가 아니라, **격리된 worktree에서 재구축을 진행하고, 검증 가능한 단계까지 끌어올린 뒤에만 병합 여부를 판단**하는 것이다.

### Research Insights

**What specifically makes this risky**
- 현재 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`는 auth bootstrap, selected member orchestration, section routing, workspace reset contract를 동시에 가진다.
- recent fixes around stale-response, reset invalidation, and trainer-scoped reservation prove that behavior lives across file boundaries, not just inside one component.

**Implication for rebuild planning**
- 이 프로젝트의 성공 기준은 “새 구조가 더 예쁘다”가 아니라, 기존 교차 레이어 계약을 새 구조에서 설명 가능하게 재구성하는 것이다.
- 따라서 rebuild plan은 파일 구조보다 parity matrix와 validation log를 더 중요하게 다뤄야 한다.

## Proposed Solution
별도 worktree에서 재구축용 브랜치를 만들고, 문서 구조에 맞는 새 프런트 레이아웃을 만든다. 단, 첫 단계 목표는 기존 기능을 곧바로 모두 옮기는 것이 아니라 **새 구조에서 운영 콘솔 셸과 핵심 vertical slice의 프로토타입을 빠르게 만드는 것**이다.

핵심 원칙:
- `main` 브랜치의 기존 앱은 유지한다.
- 재구축은 별도 worktree에서만 진행한다.
- 새 구조는 `/Users/abc/projects/GymCRM_V2/docs/folder_structure.md`를 출발점으로 삼되, 현재 운영 앱의 요구를 반영해 필요한 보정을 허용한다.
- 기존 feature를 한 번에 모두 옮기지 않고, **shell prototype → members prototype → memberships/reservations prototype → parity hardening → remaining sections** 순서로 단계 이관한다.
- 병합 기준은 “구조가 더 예쁘다”가 아니라 **feature parity + auth parity + validation parity**다.
- prototype은 rebuild worktree 안에서 **baseline app과 나란히 비교 가능한 형태**로 운영한다.
- rebuilt prototype의 member-context는 **members domain support module/store가 canonical owner**를 가진다. app shell은 route + providers만 소유한다.

### Research Insights

**Why prototype-first is safer**
- rebuild 초기에 가장 먼저 확인해야 하는 것은 “이 구조가 실제로 설명 가능하고 확장 가능한가”이지, “기존 기능 100%를 얼마나 빨리 복제했는가”가 아니다.
- shell, members, memberships/reservations 정도만 먼저 새 구조에 얹어보면 page-first 구조가 실제 GymCRM 운영 흐름에 맞는지 빠르게 판단할 수 있다.
- 이 접근은 실패 비용도 줄인다. 구조가 안 맞으면 early checkpoint에서 중단하고 교훈만 환원할 수 있다.

**Why side-by-side matters**
- prototype 단계에서는 기능이 일부 비어 있어도 baseline과 비교할 수 있어야 한다.
- 따라서 rebuild worktree 안에서는 기존 `frontend/` baseline을 유지하고, 새 프로토타입은 별도 entry/app(`frontend-rebuild/` 또는 동등한 별도 dev entry)로 띄워 비교하는 전략을 기본으로 한다.
- route prefix를 임시로 늘리는 방식보다, 별도 entry/app이 baseline route contract를 오염시키지 않아 더 안전하다.

## Technical Approach

### Architecture
재구축 브랜치에서 새 프런트 기준을 다음처럼 정의한다.

- `src/api`
  - HTTP client, auth/token handling, service wrappers
- `src/components`
  - feature-neutral UI와 layout 조각만 유지
- `src/pages`
  - route entry pages와 page-local composition
- `src/pages/members`, `src/pages/products` 등
  - route-owned page modules
- `src/App.tsx`
  - app shell과 top-level routing 최소 조합만 담당
- `src/main.tsx`
  - bootstrap/router/provider 초기화

단, 다음은 문서 구조를 그대로 복붙하지 않고 보정한다.
- route metadata는 여전히 별도 module로 분리 가능
- shared utilities/hooks가 필요하면 `src/shared` 또는 `src/lib` 계층을 추가할 수 있음
- current feature complexity가 높은 memberships/reservations/access는 page 안에 모든 것을 쑤셔 넣지 않고 page + submodule 구조를 허용함

즉, 재구축은 문서 구조를 “목표 골격”으로 삼되, 실제 운영 앱에 맞게 **page-first with explicit support modules**로 설계한다.

### Research Insights

**Structure choice**
- `folder_structure.md`의 `pages + components + api` 구조는 route-first 설명에는 유리하지만, 현재 GymCRM처럼 domain workflow가 강한 앱에는 그대로 적용하면 page file이 다시 coordinator가 될 위험이 있다.
- 따라서 Vercel React best practices 관점에서도 `bundle-conditional`, `rerender-dependencies`, `client-swr-dedup` 규칙을 유지하려면 page는 route entry와 composition에 집중하고, page support module/hook/query 계층을 의도적으로 남겨야 한다.

**Recommended folder rule**
- `pages/*`: route entry + section composition
- `components/*`: feature-neutral presentation only
- `api/*`: client + typed service wrappers
- `pages/*/hooks` or `pages/*/modules`: page-owned query/state helpers
- `App.tsx`: app shell, providers, top-level route composition only

**Selected member ownership rule**
- rebuilt prototype에서는 `selectedMemberId/selectedMember`의 canonical owner를 app shell에 두지 않는다.
- `members` 도메인 support module/store가 canonical source를 가진다.
- `/memberships`와 `/reservations`는 이 source를 읽고 변경 요청만 보낸다.
- app shell은 route, auth provider, top-level layout만 담당한다.
- `memberId` query param routing은 이번 rebuild prototype의 source of truth로 쓰지 않고, 필요하면 후속 확장으로 분리한다.

### Separate Branch / Worktree Contract
- 브랜치명 예시: `codex/refactor-frontend-rebuild-v1`
- worktree 위치 예시: `/Users/abc/projects/GymCRM_V2-worktrees/frontend-rebuild-v1`
- 기존 `/Users/abc/projects/GymCRM_V2` 메인 워크트리는 계속 `main` 용도로 유지
- 재구축 브랜치에서만 dependency, routing, page structure, shared client abstraction을 크게 바꾼다
- main의 기능 변경이 계속 들어오면 주기적으로 merge/rebase 전략을 정하고 드리프트를 통제한다

### Research Insights

**Worktree execution rule**
- `git-worktree` skill 기준으로 raw `git worktree add` 대신 manager script를 사용해야 `.env` 복사와 `.worktrees` ignore 관리가 같이 된다.
- 추천 운영 순서:
  1. `main` clean sync
  2. manager script로 rebuild branch/worktree 생성
  3. rebuild worktree에서만 dependency and structure changes 허용
  4. main 변경 흡수 cadence를 주 1회 또는 큰 merge 후로 고정

**Branch hygiene**
- experimental rebuild branch는 feature merge branch와 다르게 작은 기능 단위가 아니라 phase checkpoint 단위로 커밋/PR을 끊는 편이 낫다.
- goal은 “항상 mergeable”이 아니라 “항상 reviewable and parity-measurable” 상태 유지다.

**Comparison model**
- rebuild worktree에서는 baseline app과 rebuilt prototype을 동시에 실행 가능해야 한다.
- 권장 예시:
  - baseline: existing `/Users/abc/projects/GymCRM_V2/frontend`
  - prototype: `frontend-rebuild/` 또는 동등한 별도 entry directory
- `Go/No-Go 1` 판단은 screenshot/log만이 아니라, 같은 환경에서 두 앱을 나란히 비교한 결과를 포함해야 한다.

### Parity Rules
다음은 재구축에서 반드시 유지해야 한다.
- JWT/prototype dual-mode auth behavior
- shell-only routing contract and route fallback behavior
- selected member workflows for memberships/reservations
- trainer-scoped reservation restrictions
- hold/resume/refund state integrity assumptions
- member summary status semantics including `홀딩중`
- recent pagination behavior where already introduced

### Migration Strategy
재구축은 “replace all at once”가 아니라 **prototype-first -> parity-hardening -> breadth expansion** 순서로 본다.

#### Phase 0: Isolation Setup
- 별도 `codex/` 브랜치 생성
- git worktree 생성
- 재구축 worktree에서만 dependency 변경 허용
- 기존 frontend baseline을 validation snapshot으로 기록
- rebuild worktree 안에서 baseline app과 prototype app의 실행 구조를 먼저 정한다

**Research Insights**
- baseline snapshot에는 최소한 build, core route tests, shell routing browser log, members/memberships/reservations screenshots가 포함되어야 한다.
- 이 phase에서 바로 feature coding으로 들어가지 말고 “현재 앱이 무엇을 보장하는지”를 artifacts로 고정해야 이후 parity 논쟁이 줄어든다.
- 이 phase에서 `baseline app`과 `prototype app`의 실행 포트, env, entry path를 문서로 고정한다.

#### Phase 1: New Shell Prototype
- 새 폴더 구조 skeleton 생성
- router, auth gate, app shell, sidebar, dashboard route entry를 새 구조로 옮김
- 기존 shell-only route contract와 같은 URL surface 유지
- build/test/browser smoke 기준선 확보
- visual/interaction 수준의 운영 콘솔 prototype 완성

**Research Insights**
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-11-shell-routing-validation-log.md`를 baseline contract로 본다.
- 우선 복제해야 하는 동작:
  - JWT unauth protected route -> `/login`
- prototype direct entry allowed
- unknown path -> `/dashboard` fallback
- auth bootstrapping 동안 redirect 대신 bootstrap screen 유지
- 이 phase에서는 new shell이 돌아가더라도 section internals는 placeholder 허용. 대신 route contract는 완전히 맞아야 한다.
- 이 phase의 목표는 기존 shell을 “대체”하는 것이 아니라, 새 구조에서 page-first shell이 실제로 읽히고 다뤄지는지 보는 것이다.
- baseline shell과 rebuilt shell을 같은 체크리스트로 side-by-side 비교한다.

#### Phase 2: Members Prototype Slice
- `/members`를 새 page 구조로 이관
- member list, filters, summary status badge, pagination 포함
- selected member loading contract를 `members domain support module/store canonical ownership` 기준으로 정의
- 기존 member summary API semantics 유지
- row actions와 selected member 흐름은 prototype 수준에서 먼저 연결

**Research Insights**
- members slice는 summary semantics가 복잡하다. `홀딩중`, `만료임박`, `없음`의 계산과 post-filter behavior를 그대로 유지해야 한다.
- recent fixes showed that summary semantics and UI refresh timing diverge easily, so rebuild version도 list refresh + cache invalidation contract를 같이 가져가야 한다.
- 이 phase 완료 기준은 “member list renders”가 아니라:
  - filters work
  - summary status vocabulary matches backend
  - row actions still open the correct workflows
  - pagination resets correctly on filter changes
- prototype 단계에서는 member edit/create까지 전부 닫는 것보다, list + filters + route handoff가 자연스럽게 읽히는지가 더 중요하다.
- 이 phase에서 canonical owner module API를 먼저 고정한다.
  - 예: `selectMember(memberId)`, `clearSelectedMember()`, `selectedMember`, `selectedMemberId`
  - memberships/reservations는 이 API만 통해 member context를 소비한다.

#### Phase 3: Memberships / Reservations Prototype Slice
- 가장 복잡한 member-context flows를 새 구조로 이관
- `/memberships`, `/reservations`
- workspace picker/fallback, trainer-scoped rules, reservable membership policy 유지
- query param `memberId` 확장 검토는 parity 이후 후속으로 분리

**Research Insights**
- 이 phase가 rebuild viability의 핵심 checkpoint다. 여기서 막히면 rebuild를 계속할 근거가 약해진다.
- preserve:
  - picker fallback UX
  - trainer reservation target scope
  - expired membership exclusion
  - hold/resume/refund constraints
  - selected member reset behavior on full reload vs section navigation
- workspace member search는 `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`를 따라 debounce/cache/dedupe를 재적용해야 한다.
- prototype 단계에서는 모든 edge action보다 먼저:
  - member picker/list fallback
  - selected member handoff
  - reservation target list visibility
  - basic action surface placement
  를 새 구조에서 설명 가능하게 만드는 것이 우선이다.
- invalid or missing member-context는 비어 있는 화면이 아니라 picker/list fallback으로 정리한다.
- memberships/reservations는 member-context owner를 직접 만들지 않고 members-domain source를 소비한다.

#### Phase 4: Prototype Checkpoint / Go-NoGo 1
- Phase 1~3 결과를 기준으로 구조 적합성 점검
- 판단 항목:
  - page-first 구조가 실제 콘솔 UX를 더 단순하게 만드는가
  - `App.tsx` 책임이 체감 가능하게 줄었는가
  - members -> memberships/reservations 흐름이 기존보다 설명하기 쉬워졌는가
- auth and shell routing parity가 안정적인가
- 이 checkpoint에서 go이면 breadth 확장, no-go이면 rebuild branch를 실험 종료로 전환

**Research Insights**
- 이 checkpoint가 없으면 rebuild는 “끝까지 가야만 평가 가능한 프로젝트”가 되어 비용이 과도해진다.
- prototype-first 전략에서는 여기서 한 번 반드시 멈춰 구조 적합성을 평가해야 한다.
- 이 checkpoint 산출물은 다음을 모두 포함해야 한다:
  - baseline vs prototype side-by-side screenshots
  - same-flow validation notes
  - selectedMember ownership diagram or short data-flow note
  - unresolved ownership/UX gaps list

#### Phase 5: Parity Hardening for Core Flows
- memberships/reservations의 edge action parity 강화
- stale-response/reset invalidation/query cache parity 확보
- members slice의 편집/상세/요약 갱신 contracts 강화
- core test coverage를 현재 앱 수준으로 끌어올림

**Research Insights**
- prototype이 설명 가능하다고 해서 곧바로 운영 parity가 되는 것은 아니다.
- 이 phase는 “보여줄 수 있는 구조”를 “믿고 쓸 수 있는 구조”로 바꾸는 단계다.

#### Phase 6: Access / Lockers / Products
- access entry/exit/search/pagination
- locker slot assignment
- product list/state editing
- shared list/detail interaction 모델 정리

**Research Insights**
- access/locker는 stale response와 reset parity 회귀가 많았던 영역이라 query ownership을 먼저 정하고 page composition을 올리는 순서가 안전하다.
- products는 page-first 구조에 가장 잘 맞는 후보이므로, 여기서 새 구조의 설명 가능성을 입증하는 것이 좋다.

#### Phase 7: CRM / Settlements / Cleanup
- remaining sections 이관
- old structure 대비 feature matrix 검증
- dead code candidate 식별
- migration report 작성

**Research Insights**
- CRM/settlements는 user-facing complexity보다 query and report composition이 중요하다.
- 마지막 phase로 두는 것이 맞고, 여기까지 오면 새 구조가 운영 콘솔의 breadth를 감당하는지 판단할 수 있다.

#### Phase 8: Go / No-Go Decision
- 새 구조를 기본 프런트로 채택할지 판단
- 판단 기준:
  - 기능 parity
  - auth parity
  - responsive validation
  - acceptable bundle/build/runtime behavior
  - team maintainability benefit demonstrable

**Research Insights**
- decision meeting 전에 feature matrix, unresolved gaps, measured wins(`App.tsx` size reduction, route ownership clarity, test parity count)를 같이 제시해야 한다.
- no-go여도 실패가 아니다. parity log와 migration notes는 현재 구조의 점진 리팩토링 backlog로 환원 가치가 있다.

## Alternative Approaches Considered

### Alternative 1: Keep current structure and only update docs
Rejected for this plan because the explicit goal is to evaluate a true rebuild path in isolation, not merely document the present state (see brainstorm: `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md`).

### Alternative 2: Incremental refactor on `main`
Rejected for this plan because route/state/query/layout changes of this size would interfere with ongoing feature delivery and make parity bugs harder to isolate.

### Alternative 3: Full rewrite in-place without worktree isolation
Rejected because it combines the highest risk with the least rollback control.

## System-Wide Impact

### Interaction Graph
- auth bootstrap influences every protected route and dashboard/sidebar surface
- selected member workflows currently fan out into memberships, reservations, and parts of member detail loading
- reservation changes trigger membership visibility, reservation target lists, and trainer authorization behavior
- rebuild must preserve these interaction chains, even if files move

### Error & Failure Propagation
- auth failures currently route to login/auth gate or protected UI reset
- member load failure currently falls back to picker/list in some workspaces
- reservation and membership mutations have domain-specific validation messages that should not regress into generic page errors
- rebuild must preserve low-level API errors while preventing page-level blank states

### State Lifecycle Risks
- selected member reset can silently discard workspace-local form state
- stale query responses have previously caused post-reset repopulation bugs
- search UIs have already required debounce/cache/dedupe rules to avoid churn
- rebuild must re-apply stale-response guards, reset invalidation, and cache invalidation discipline from the current app

### API Surface Parity
Equivalent functionality exists across:
- shell routes
- dashboard quick actions
- sidebar navigation
- member management row actions
- workspace direct-entry pickers
- trainer-scoped reservation/member reads

All must remain aligned. Rebuild cannot update one surface while leaving the others behind.

### Integration Test Scenarios
- JWT unauthenticated direct entry to protected routes
- prototype no-auth direct entry and refresh
- member selection from members -> memberships/reservations
- trainer account viewing only assigned reservation targets
- hold/resume followed by member summary status refresh
- pagination interaction with filters/search in rebuilt pages

## Acceptance Criteria

### Functional Requirements
- [x] 별도 `codex/` 브랜치와 git worktree에서 재구축을 시작한다.
- [x] 새 구조는 `/Users/abc/projects/GymCRM_V2/docs/folder_structure.md`를 기준으로 하되, 현재 운영 앱에 필요한 보정 규칙을 명시한다.
- [x] 새 앱 셸은 기존 shell route URL surface를 그대로 유지한다.
- [x] JWT/prototype auth gate와 route fallback behavior가 parity를 유지한다.
- [x] 최소한 `/dashboard`, `/members`, `/memberships`, `/reservations`가 새 구조에서 **prototype 수준으로 먼저 동작한다**.
- [x] prototype checkpoint에서 구조 적합성을 평가하는 go/no-go 1 게이트가 있다.
- [x] prototype checkpoint는 baseline과 side-by-side 비교 가능한 실행 전략을 사용한다.
- [x] rebuilt prototype의 `selectedMember` canonical owner가 `members` domain support module/store로 명시된다.
- [x] go 판단 이전 prototype 단계에서 기존 member-context 흐름의 핵심 handoff가 새 구조에서 재현된다.
- [ ] go 판단 이후 trainer reservation 제한이 새 구조에서 parity 수준으로 재현된다.
- [ ] 기존 요약 상태 semantics(`홀딩중` 포함)와 핵심 업무 정책이 parity hardening 단계에서 유지된다.

### Non-Functional Requirements
- [x] 재구축 worktree는 `main` 기능 흐름을 막지 않는다.
- [x] parity validation 로그를 각 단계별로 남긴다.
- [ ] 새 구조의 설명 문서가 실제 디렉터리와 맞는다.
- [x] route/state/query ownership이 현재보다 더 명확해진다.
- [x] prototype 단계와 parity 단계의 성공 기준이 문서상 분리돼 있다.

### Quality Gates
- [x] `frontend-rebuild && npm run build`
- [x] 라우팅 테스트 parity
- [x] JWT/prototype 브라우저 스모크
- [x] members/memberships/reservations prototype vertical slice smoke
- [x] prototype checkpoint 기록
- [x] prototype checkpoint에 baseline vs prototype side-by-side evidence 포함
- [x] selectedMember ownership data-flow가 문서와 코드 모두에서 일치
- [ ] core parity hardening 이후 members/memberships/reservations full smoke
- [ ] responsive check on mobile viewport
- [x] feature matrix gap review before merge decision
- [x] baseline shell routing validation log와 같은 fallback/auth bootstrap contract 유지
- [x] prototype member-context search surfaces에 debounce/cache/dedupe 재적용
- [x] stale-response/reset invalidation regression tests 일부를 prototype reservations query까지 복제
- [x] trainer-scoped member/target read parity를 prototype members/reservations query에 재적용

## Success Metrics
- 재구축 worktree에서 최소 4개 핵심 섹션(`dashboard`, `members`, `memberships`, `reservations`)이 prototype 상태로 먼저 동작
- prototype checkpoint에서 구조 적합성에 대한 명시적 go/no-go 판단이 기록됨
- go 이후 핵심 4개 섹션이 parity 상태로 동작
- shell-only route contract 회귀 없음
- auth bootstrap / redirect / refresh behavior 회귀 없음
- team-facing folder structure explanation cost 감소
- `App.tsx` top-level orchestration size와 responsibility가 measurable하게 감소

## Dependencies & Prerequisites
- git worktree 사용 가능해야 함
- 현재 frontend 테스트/빌드가 메인 브랜치에서 안정적이어야 함
- `/Users/abc/projects/GymCRM_V2/docs/folder_structure.md`를 목표 구조의 기준 문서로 사용하되, 필요한 보정 허용
- 기존 routing/state/query validation 문서 참조 가능해야 함

## Risk Analysis & Mitigation
- **High risk: parity drift with main**
  - Mitigation: vertical slice마다 parity matrix 유지, main merge cadence 고정
- **High risk: rebuild stalls halfway**
  - Mitigation: dashboard/members/memberships/reservations prototype까지를 first checkpoint로 정의
- **High risk: old bug classes reintroduced**
  - Mitigation: stale-response, auth redirect, hold summary, trainer scope 관련 regression tests를 초기부터 복제
- **Medium risk: folder doc is too generic**
  - Mitigation: 문서 구조를 literal copy하지 않고 repo-specific adjustments를 먼저 기록
- **Medium risk: duplicated effort with current app**
  - Mitigation: merge gate를 엄격히 두고, parity가 입증되지 않으면 experiment branch로 종료 가능하게 둠
- **Medium risk: prototype feels good but parity work explodes later**
  - Mitigation: prototype checkpoint와 parity hardening phase를 분리하고, go/no-go 1에서 숨은 비용을 다시 평가

## Resource Requirements
- 별도 worktree 유지 시간
- 중간 parity 검증을 위한 브라우저/테스트 시간
- main 변경을 주기적으로 흡수할 여력
- feature freeze가 없더라도, rebuild branch owner가 drift를 관리해야 함

## Future Considerations
- rebuild가 성공하면 이후에 detail/query routing 확장을 새 구조 기준으로 재검토할 수 있다
- rebuild가 실패하거나 비용이 과하면, 얻은 교훈을 현재 구조의 점진 리팩토링 기준으로 환원할 수 있다
- 따라서 이번 프로젝트는 “무조건 갈아탄다”가 아니라 “갈아탈 가치가 있는지 검증한다”는 의미도 가진다

## Documentation Plan
- rebuild 진행 로그: `docs/notes/`
- parity matrix 또는 migration status: `docs/notes/` 또는 `docs/plans/` 내 체크리스트
- `docs/folder_structure.md`는 rebuild branch에서 실제 구조에 맞게 갱신
- merge 결정 시 solution 또는 retrospective 문서 작성

### Research Insights

**Recommended living docs**
- `docs/notes/<date>-frontend-rebuild-parity-matrix.md`
- `docs/notes/<date>-frontend-rebuild-validation-log.md`
- `docs/notes/<date>-frontend-rebuild-open-gaps.md`
- `docs/notes/<date>-frontend-rebuild-prototype-checkpoint.md`

이 세 문서를 분리하면 “무엇이 됐는지 / 어떻게 검증했는지 / 아직 뭐가 안 됐는지”가 섞이지 않는다.

## Sources & References

### Origin
- **Brainstorm document:** `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md`
  - Carried-forward decisions:
    - rebuild는 작은 정리가 아니라 별도 프로젝트로 다뤄야 함
    - worktree/branch isolation이 필요함
    - parity와 migration strategy가 먼저 정의돼야 함

### Internal References
- Target structure reference: `/Users/abc/projects/GymCRM_V2/docs/folder_structure.md`
- Current routing plan: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-11-feat-shell-only-react-router-adoption-plan.md`
- Current routing brainstorm: `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-11-react-router-adoption-comparison-brainstorm.md`
- Current frontend baseline files:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipsSection.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx`

### Institutional Learnings
- `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
  - shell/IA 변경은 style tweak가 아니라 정보구조 변경으로 다뤄야 함
- `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
  - search/query lifecycle는 rebuild 시에도 debounce/cache/dedupe 규칙을 재적용해야 함

### Related Work
- Current shell routing implementation merged in PR #72
- Pagination implementation merged in PR #71
