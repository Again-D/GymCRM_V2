---
date: 2026-03-11
topic: react-router-adoption-comparison
---

# React Router Adoption Comparison

## What We're Building
현재 `/Users/abc/projects/GymCRM_V2/frontend`가 `App.tsx` 중심의 상태 기반 탭 전환 구조를 유지할지, 아니면 `React Router`를 도입해 URL 기반 섹션 전환으로 옮길지 비교한다.

이번 브레인스토밍의 목적은 라우터를 "지금 바로 넣을지"를 결정하는 것이다. 구현 방법 자체보다, 어떤 범위까지 URL을 가지게 하는 것이 이 프로젝트의 현재 상태와 운영 UX에 맞는지 판단하는 데 집중한다.

## Why This Approach
현재 구조는 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`의 `activeNavSection`, `selectedMemberId`, 각 workspace state가 한 파일에 강하게 연결된 콘솔형 앱이다. 이 상태에서 라우터를 전면 도입하면 URL은 생기지만, 상태 ownership이 아직 충분히 분리되지 않아 오히려 화면/상태 불일치가 늘어날 수 있다.

반대로 라우터를 전혀 도입하지 않으면 deep link, refresh 복원, 북마크, 진입 상태 공유가 계속 약하다. 따라서 `미도입`, `shell-only 도입`, `전면 도입` 세 가지를 비교하고, 현재 시점의 적정선을 고르는 방식이 맞다.

## Approaches

### Approach A: 지금은 도입하지 않음
현재처럼 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`의 `activeNavSection`과 선택 상태로 화면을 전환한다. URL은 도입하지 않고, 현재 dashboard shell 구조를 유지한다.

**Pros**
- 가장 작은 변경이다.
- 현재 `selectedMember`, workspace reset, auth bootstrap과 충돌이 없다.
- 새 회귀를 만들 가능성이 가장 낮다.

**Cons**
- 새로고침 시 현재 섹션 복원이 안 된다.
- 북마크/공유 가능한 운영 화면 진입점이 없다.
- 섹션 전환이 계속 `App.tsx` 내부 상태에 묶여 확장성이 낮다.

**Best when**
- 당분간 내부 운영 콘솔로만 쓰고, deep link 요구가 거의 없을 때.
- state ownership 분리 작업이 아직 더 필요한 단계일 때.

### Approach B: shell-only 라우팅 도입
`/login`, `/dashboard`, `/members`, `/memberships`, `/reservations`, `/access`, `/lockers`, `/products`, `/crm`, `/settlements` 정도만 URL로 도입한다. `selectedMemberId` 같은 세부 업무 상태는 여전히 로컬 상태로 둔다.

**Pros**
- 새로고침/북마크/직접 진입이 가능해진다.
- 현재 `SidebarNav`와 `DashboardSection`의 섹션 개념을 URL에 자연스럽게 매핑할 수 있다.
- 전면 도입보다 회귀 범위가 작다.

**Cons**
- URL은 있는데 회원 선택 같은 세부 컨텍스트는 복원되지 않는다.
- `App.tsx` 조합 책임은 여전히 크다.
- 라우터 도입 이점의 절반만 얻는다.

**Best when**
- URL 기반 섹션 진입이 필요하지만, member-context까지 URL로 밀어 넣을 준비는 아직 안 됐을 때.
- 현재 구조를 크게 흔들지 않고 점진적으로 옮기고 싶을 때.

### Approach C: 전면 라우팅 도입
섹션뿐 아니라 `memberId`, 선택 상태, 상세 패널 진입까지 URL에 반영한다. 예: `/members/123`, `/reservations?memberId=123`, `/memberships?memberId=123`.

**Pros**
- deep link, refresh 복원, 공유 가능성이 가장 좋다.
- 화면 상태와 URL이 일치한다.
- 장기적으로 가장 웹다운 정보 구조가 된다.

**Cons**
- 현재 구조에서는 비용이 크다.
- `selectedMember`, workspace query, reset 정책, auth gate를 다시 설계해야 한다.
- half-migrated 상태가 되면 오히려 버그가 늘어난다.

**Best when**
- 섹션과 member-context를 URL로 관리해야 하는 운영 요구가 이미 강할 때.
- 먼저 state ownership과 loader/reset 경계를 더 분리한 이후.

## Recommendation
추천은 **Approach B: shell-only 라우팅 도입**이다.

지금 프로젝트는 이미 `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx`에 route preview 개념이 있고, 사이드바도 사실상 섹션 단위 navigation이다. 따라서 섹션 URL을 도입하는 것은 자연스럽다. 반면 `selectedMember`와 각 workspace-local state는 아직 `App.tsx` 조합층에 많이 남아 있어, 지금 바로 전면 라우팅까지 가면 비용이 과하다.

즉 현재 최적점은:
- 라우터를 아예 안 넣지는 않음
- 하지만 `memberId`까지 URL화하는 전면 라우팅도 하지 않음
- 먼저 섹션 수준 URL만 도입해서 refresh/deep-link 가치를 얻음

## Reasons Not To Adopt Yet
지금 당장 `React Router`를 도입하지 않는 편이 나은 이유도 분명하다.

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에 auth bootstrap, selected member, 각 workspace query/state/reset이 아직 많이 남아 있다.
- 현재 앱은 콘텐츠 사이트보다 "운영 콘솔 탭 앱"에 가깝다. URL보다 내부 상태 전환이 중심이다.
- 라우터를 섣불리 넣으면 URL은 `/reservations`인데 실제로는 `selectedMember`가 없어서 내부 진입 흐름과 어긋나는 문제가 생긴다.
- 최근에 state ownership, loader stale-response, reset parity를 반복해서 정리한 상태라서, 바로 라우팅까지 얹으면 회귀 범위가 커진다.

따라서 지금 결정은 다음처럼 읽는 게 맞다.
- "React Router가 필요 없다"가 아니라,
- "전면 도입은 아직 이르고, 도입한다면 섹션 URL부터 작게 시작해야 한다".

## Key Decisions
- 라우터 비교 기준은 `미도입`, `shell-only`, `전면 도입` 세 가지로 본다.
- 현재 시점의 추천안은 `shell-only 라우팅`이다.
- `selectedMemberId`와 상세 패널 상태는 이번 범위에서 URL로 올리지 않는다.
- 전면 라우팅은 후속 state ownership 분리 이후 다시 검토한다.
- 라우터를 안 넣는 선택도 단기적으로는 타당하지만, refresh/deep-link 요구가 생기면 유지 비용이 커진다.

## Resolved Questions
- React Router를 지금 바로 전면 도입할지 여부: 아니오.
- React Router 도입 가치는 있는지 여부: 예.
- 현재 적정 범위: 섹션 단위 URL 반영까지만.

## Next Steps
→ `/Users/abc/.codex/skills/workflows-plan/SKILL.md` 로 작은 도입 플랜을 만들 수 있다.
→ 플랜을 만든다면 `shell-only routing`만 범위에 넣고, member-context URL화는 제외한다.
