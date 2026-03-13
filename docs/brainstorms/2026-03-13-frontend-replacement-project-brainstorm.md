---
date: 2026-03-13
topic: frontend-replacement-project
---

# Frontend Replacement Project

## What We're Building
현재 `main`의 SPA 중심 프런트를 계속 점진 리팩토링할지, 아니면 별도 재구축 브랜치를 **실제 대체 후보 프로젝트**로 승격할지 판단한다.

이번 브레인스토밍의 초점은 “새 구조가 더 예쁘냐”가 아니라, 다음 두 가지를 함께 만족할 수 있느냐이다.

- 사용 중인 운영 프런트를 무리하게 흔들지 않는다.
- 페이지 기반 라우팅과 page-first 구조를 더 이해하기 쉬운 형태로 학습하고 발전시킨다.

즉 이 논의는 단순 구조 취향이 아니라, **학습 효율 + 운영 리스크 + 장기 유지보수성** 사이에서 어떤 프로젝트 형태가 가장 현실적인지 정하는 작업이다.

## Why This Approach
현재 `main` 프런트는 이미 shell routing, selected-member ownership, explicit invalidation, memberships mutation ownership 같은 구조 개선을 받아들이고 있다. 즉 “완전히 손도 못 대는 상태”는 아니다.

반면 별도 rebuild worktree/branch는 이미 shell, members, memberships, reservations, access, lockers, products, crm, settlements까지 넓게 프로토타입 검증을 끝냈다. 그래서 이제 질문은 “재구축을 할 수 있나?”가 아니라, **그 실험을 실제 대체 프로젝트로 승격할 가치가 있나?**에 가깝다.

## Approaches

### Approach A: `main` 중심 점진 리팩토링 유지
지금처럼 rebuild에서 좋은 패턴만 `main`으로 역수입하고, 실제 제품 프런트는 현재 구조에서 계속 개선한다. 학습은 개별 harvest PR을 통해 쪼개서 진행한다.

**Pros**
- 운영 리스크가 가장 낮다.
- 이미 효과가 검증된 방식이다.
- 매번 작은 PR로 리뷰와 검증이 가능하다.

**Cons**
- page-first 구조를 한 번에 체득하기는 어렵다.
- 현재 `App.tsx`와 기존 SPA 조합을 계속 읽어야 한다.
- “새 구조 전체를 내 것으로 만드는 경험”은 제한적이다.

**Best when**
- 안정성이 최우선일 때
- 기능 개발을 멈출 수 없을 때

### Approach B: 별도 재구축 브랜치를 **교체 후보 프로젝트**로 승격
현재 rebuild branch를 단순 실험이 아니라, 점진적으로 **기존 프런트를 대체할 수 있는 후보**로 키운다. 다만 즉시 cutover하지 않고, live API parity, auth parity, migration, rollback 기준을 갖춘 뒤에만 전환 여부를 판단한다.

**Pros**
- page-first / route-first 구조를 실제 제품 규모에서 학습할 수 있다.
- 현재 `main`을 직접 흔들지 않고도 더 이해하기 쉬운 구조를 밀어볼 수 있다.
- 잘 되면 장기적으로는 더 설명하기 쉬운 프런트가 된다.

**Cons**
- 두 프런트를 병행 관리하는 비용이 크다.
- parity와 cutover 기준을 엄격히 관리하지 않으면 side project가 되기 쉽다.
- 학습 프로젝트처럼 시작해도 결국 운영 마이그레이션 책임이 따라온다.

**Best when**
- 학습 가치와 구조 개선 가치가 모두 크다고 볼 때
- 별도 브랜치/워크트리에서 시간을 투자할 수 있을 때
- “지금 바로 교체”가 아니라 “교체 가능성 검증”으로 접근할 때

### Approach C: 재구축 브랜치를 빠르게 제품 교체 프로젝트로 전환
rebuild branch를 더 밀어서 짧은 기간 안에 기존 프런트를 교체 대상으로 삼고, cutover를 목표로 달린다.

**Pros**
- 구조 전환 속도가 빠르다.
- 새 구조를 실제 제품으로 빨리 밀 수 있다.

**Cons**
- 가장 위험하다.
- live parity, auth parity, rollout/rollback 준비가 부족하면 큰 회귀로 이어질 수 있다.
- 학습 난이도도 오히려 올라간다. 구조를 배우면서 동시에 운영 전환까지 감당해야 하기 때문이다.

**Best when**
- 팀 차원에서 명시적으로 교체 프로젝트를 승인했고
- staging/rollout/rollback까지 별도 시간과 리소스를 확보했을 때

## Recommendation
추천은 **Approach B: 별도 재구축 브랜치를 교체 후보 프로젝트로 승격하되, immediate cutover는 하지 않는 방식**이다.

이 방향이 좋은 이유는 명확하다.

- 당신이 어렵다고 느끼는 지점은 실제로 `main`의 SPA coordinator 구조가 복잡하기 때문이고, 그 감각은 타당하다.
- 이미 rebuild branch는 “학습 장난감” 수준을 넘어서 구조 실험으로는 충분한 성과를 냈다.
- 그렇다고 지금 바로 교체하는 건 아직 이르다. 지금 필요한 건 **교체 가능성을 높여 가는 프로젝트**이지, 즉시 전환이 아니다.

즉, rebuild를 계속 키우는 건 가능하지만, 앞으로는 성격을 분명히 해야 한다.

- 단순 prototype이 아님
- 하지만 아직 cutover-ready도 아님
- 그래서 **replacement candidate project**로 취급하는 것이 가장 현실적이다

## What “Replacement Candidate Project” Means
이 표현은 “바로 갈아끼운다”는 뜻이 아니다. 다음 네 가지가 갖춰질 때까지는 후보 프로젝트로 남는다는 뜻이다.

1. live backend contract parity
2. auth/session parity
3. rollout and rollback plan
4. staging/browser/device validation 기준

즉 rebuild는 계속 전진하되, 매 단계가 “더 예쁘다”가 아니라 “cutover blocker를 하나 줄였다”로 측정되어야 한다.

## Key Decisions
- 현재 `main`이 어렵게 느껴지는 건 개인 문제라기보다 실제 coordinator 복잡도 문제다.
- rebuild를 더 키우는 건 가능하다.
- 다만 “학습용 실험”이 아니라 “교체 후보 프로젝트”로 성격을 바꾸고 가야 한다.
- 지금 시점에서 최적안은 `main`을 유지하면서 rebuild를 replacement candidate로 성장시키는 것이다.
- immediate cutover는 아직 아니다.

## Resolved Questions
- 재구축을 계속 키워볼 가치가 있는가: 예
- 지금 바로 교체 프로젝트로 가도 되는가: 아니오, 단 즉시 교체가 아니라 후보 프로젝트로는 가능
- 현재 가장 균형 잡힌 선택은 무엇인가: replacement candidate project로 승격

## Resolved Questions
- cutover-ready 최소 기준은 `live API parity`, `auth/session parity`, `rollback plan`을 기본으로 둔다.
- 추가 기준으로 `role parity`, `core workflow parity`, `staging smoke coverage`를 포함한다.
- `core workflow parity`의 최소 범위는 `회원관리 + 회원권 업무 + 예약 관리 + 출입 관리`로 둔다.

## Open Questions
- rebuild 쪽 다음 우선순위를 `live API parity`, `auth/session parity`, `migration 설계` 중 무엇으로 둘지

## Next Steps
- `/Users/abc/.codex/skills/workflows-plan/SKILL.md`로 replacement candidate project 기준 플랜을 만든다.
- 그 플랜은 “더 구현한다”가 아니라, **cutover blocker를 무엇부터 줄일지**를 중심으로 짜는 게 맞다.
