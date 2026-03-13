---
date: 2026-03-12
topic: frontend-rebuild-comparison
---

# Frontend Rebuild Comparison

## What We're Building
현재 `/Users/abc/projects/GymCRM_V2/frontend` 구조를 유지하면서 계속 개선할지, 아니면 별도 트랙으로 프런트엔드를 재구축할지 비교한다.

이번 브레인스토밍의 목적은 "재구축이 필요한가"를 감정이 아니라 비용, 리스크, 운영 가치 기준으로 판단하는 것이다. 구현 세부보다 재구축의 범위, 기대 이득, 전제 조건을 정리하는 데 집중한다.

## Why This Approach
현재 프런트는 이미 단순한 초기 상태가 아니다. 최근 몇 주 동안 shell-only routing, workspace state ownership 분리, query hook 분리, trainer-scoped reservation, client-side pagination까지 정리되면서 `/Users/abc/projects/GymCRM_V2/frontend/src/app`, `/Users/abc/projects/GymCRM_V2/frontend/src/features`, `/Users/abc/projects/GymCRM_V2/frontend/src/shared` 구조 위에 운영 규칙이 누적돼 있다.

따라서 지금 "폴더 구조를 다시 맞추자"는 제안은 단순 정리 작업이 아니라, 사실상 프런트엔드 아키텍처를 다시 고르는 문제다. 이 문제는 `현재 구조 유지`, `점진 리팩토링`, `별도 재구축` 세 가지로 비교하는 것이 맞다.

## Approaches

### Approach A: 현재 구조 유지 + 문서 최신화
현재 `app / features / shared / components` 구조를 유지하고, 기준 문서를 실제 코드에 맞게 갱신한다. 새 기능은 이 구조 위에서 계속 추가한다.

**Pros**
- 가장 리스크가 낮다.
- 최근 정리한 routing/state/query 자산을 그대로 살릴 수 있다.
- 기능 개발 흐름을 거의 끊지 않는다.
- 현재 운영 콘솔 성격과 feature 중심 구조가 잘 맞는다.

**Cons**
- `App.tsx` 조합 책임이 여전히 크다.
- 구조가 완전히 깔끔해지는 것은 아니다.
- 새 팀원이 처음 보면 진입 난도가 조금 있다.

**Best when**
- 기능 추가를 계속 이어가야 할 때.
- 구조보다 연속성과 안정성이 더 중요할 때.

### Approach B: 현재 구조 유지 + 점진적 재정리
전체를 다시 만들지는 않고, 현재 구조 안에서 일관성을 더 높인다. 예를 들어 `components` 안의 도메인성 코드 이동, `pages` 역할 축소, `App.tsx` 추가 분리, route/query ownership 문서화 같은 작업을 단계적으로 진행한다.

**Pros**
- 재구축보다 비용이 낮다.
- 실제로 문제가 되는 부분만 손댈 수 있다.
- 최근에 만든 feature와 테스트를 대부분 유지할 수 있다.
- 구조 기준을 서서히 강화할 수 있다.

**Cons**
- 구조적 부채가 완전히 사라지지는 않는다.
- 중간 상태가 오래 지속될 수 있다.
- 재구축만큼 큰 미적 정돈감은 없다.

**Best when**
- 현재 구조를 버릴 정도는 아니지만, 앞으로 몇 달간은 꾸준히 다듬어야 할 때.
- 운영 기능 개발과 구조 정리를 병행해야 할 때.

### Approach C: 별도 브랜치/트랙에서 프런트 재구축
현재 프런트를 그대로 유지한 채, 별도 브랜치 또는 새 앱 셸에서 구조를 다시 설계한다. 라우팅, 페이지 구성, state/query layer, 폴더 기준을 새로 정하고 화면을 단계적으로 옮긴다.

**Pros**
- 아키텍처를 처음부터 다시 고를 수 있다.
- route-first, page-first, query-layer-first 같은 더 엄격한 구조를 적용할 수 있다.
- 문서와 코드 구조를 강하게 맞추기 좋다.
- 장기적으로는 더 단순한 설명 구조를 만들 수 있다.

**Cons**
- 비용이 매우 크다.
- 기능 추가 속도가 떨어질 수 있다.
- 기존 feature parity를 맞추는 데 시간이 많이 든다.
- 병행 기간 동안 두 구조를 동시에 이해해야 한다.
- 재구축이 끝나기 전에 요구사항이 바뀌면 손실이 커진다.

**Best when**
- 현재 구조가 기능 추가를 실질적으로 막고 있을 때.
- 팀이 일정 기간 기능 속도를 희생하고 구조 개편에 집중할 수 있을 때.
- 새 구조에 대한 명확한 설계 원칙과 migration 계획이 있을 때.

## Comparison

### 비용
- A: 가장 낮음
- B: 중간
- C: 가장 높음

### 회귀 리스크
- A: 가장 낮음
- B: 중간
- C: 높음

### 기능 개발 지속성
- A: 가장 좋음
- B: 좋음
- C: 가장 나쁨

### 장기 구조 정돈감
- A: 낮음
- B: 중간
- C: 가장 높음

### 현재 프로젝트와의 적합성
- A: 높음
- B: 가장 높음
- C: 지금 당장은 낮음

## Recommendation
추천은 **Approach B: 현재 구조 유지 + 점진적 재정리**다.

이유는 현재 구조가 실패한 구조가 아니라, 이미 살아 있는 운영 규칙을 많이 담고 있는 구조이기 때문이다. `/Users/abc/projects/GymCRM_V2/frontend/src/features` 아래 도메인 중심 구성은 GymCRM 같은 운영 콘솔에 잘 맞는다. 문제는 구조 방향 자체보다 `App.tsx` 조합 책임`, 일부 폴더 역할 문서화 부족`, `pages/components/shared` 경계의 불완전함에 더 가깝다.

즉 지금은 문서 기준에 맞추기 위해 코드를 다시 짜는 것보다, 현재 구조를 기준으로 문서를 업데이트하고 필요한 부분만 더 분리하는 것이 훨씬 현실적이다.

## When a Rebuild Becomes Justified
다음 조건이 쌓이면 별도 재구축을 진지하게 검토할 수 있다.

- 새 기능을 추가할 때마다 `App.tsx`나 상위 coordinator를 크게 다시 건드려야 한다.
- routing/state/query ownership이 점진 리팩토링으로는 더 이상 정리되지 않는다.
- feature 팀원이 현재 구조를 반복적으로 잘못 사용해 생산성 문제가 커진다.
- page-level URL, detail route, filter query sync, shared query layer를 한 번에 재정의해야 하는 요구가 생긴다.
- 디자인 시스템과 app shell을 함께 갈아엎는 프로젝트가 예정돼 있다.

이 조건이 없으면 재구축은 구조 개선보다 비용이 더 큰 선택일 가능성이 높다.

## What a Rebuild Would Actually Mean
재구축은 폴더 이동 정도가 아니다. 실제로는 다음을 다시 정해야 한다.

- route model: shell-only vs full routing
- page model: page-first vs feature-first
- state model: app coordinator 유지 여부
- query model: hook layer / cache / invalidation 기준
- layout model: app shell, auth gate, dashboard surface
- migration strategy: 어떤 화면부터 옮길지
- parity strategy: 기존 기능과 어떤 시점에 교체할지

즉 `folder_structure.md`에 맞춘다는 말은, 사실상 "새 프런트 아키텍처를 별도 프로젝트로 정의한다"는 뜻에 더 가깝다.

## Key Decisions
- 현재 구조를 그대로 버릴 이유는 아직 부족하다.
- 지금 시점의 최적안은 `현재 구조 유지 + 점진적 재정리`다.
- `folder_structure.md`에 코드를 억지로 맞추기보다, 문서를 현재 구조와 목표에 맞게 갱신하는 편이 낫다.
- 재구축은 가능하지만, 그건 작은 정리가 아니라 별도 프로젝트다.
- 재구축을 하려면 route/state/query/layout 기준을 새로 정의한 migration plan이 먼저 필요하다.

## Resolved Questions
- 지금 당장 프런트를 다시 짜야 하는가: 아니오.
- 재구축 자체가 잘못된 생각인가: 아니오.
- 현재 가장 현실적인 방향은 무엇인가: 점진적 재정리.

## Open Questions
- `docs/folder_structure.md`를 현재 구조 기준으로 업데이트할지, 재구축 초안 문서로 남겨둘지.
- 점진적 재정리의 다음 우선순위를 `App.tsx` 추가 분리`, `member-context route 확장`, `shared query layer 강화` 중 무엇으로 둘지.

## Next Steps
- 문서 기준을 정리하려면 `/Users/abc/.codex/skills/workflows-plan/SKILL.md`로 작은 구조 정리 플랜을 만들 수 있다.
- 정말 재구축까지 검토하려면 별도 브랜치/트랙을 전제로 더 구체적인 migration brainstorm을 만들 수 있다.
