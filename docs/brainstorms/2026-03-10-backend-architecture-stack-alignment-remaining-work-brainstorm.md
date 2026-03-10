# Backend Architecture Stack Alignment Remaining Work Brainstorm

Date: 2026-03-10
Source: `docs/plans/2026-03-09-refactor-backend-architecture-stack-alignment-plan.md`

## What We Are Evaluating

기존 architecture stack alignment plan에서 지금 시점에 추가로 진행할 가치가 있는 작업이 무엇인지 재분류한다.

핵심 전제:
- `JPA + QueryDSL + SpringDoc/OpenAPI` 트랙은 별도 실행 플랜과 실제 구현/머지로 상당 부분 이미 진행되었다.
- 따라서 이 문서에서 새로 볼 항목은 “아직 남아 있는 것”과 “문서를 어떻게 정리할 것인가”다.

## Current Read of the Plan

이 계획 문서는 작성 시점에는 유효했지만, 현재 기준으로는 일부가 이미 완료되었고 일부는 범위가 바뀌었다.

이미 사실상 진행된 축:
- Gradle canonical build 유지
- JPA/QueryDSL 도입 및 다수 핵심 저장소 전환
- OpenAPI dev-only 노출 및 보안 문서화
- parity/integration/smoke test 기반 검증
- heavy query/native SQL 예외 기준 정리

현재도 남아 있는 축:
- Redis 런타임 도입
- 아키텍처 문서(`docs/02_시스템_아키텍처_설계서.md`)를 어디까지 현실 반영할지 결정
- 최종적으로 이 오래된 plan 문서를 `active`로 둘지, 분리/종결할지 정리

## Recommended View

추가로 진행할 만한 일은 있다. 다만 “이 plan을 그대로 계속 구현”하는 방식보다는 아래 3개 트랙으로 잘라서 보는 편이 맞다.

### 1. Redis Runtime Adoption

가장 명확하게 남아 있는 실제 구현 트랙이다.

후속 후보:
- `QrTokenStore`를 Redis 기반으로 전환
- 예약 락을 Redis/Redisson 기반으로 도입
- auth denylist 또는 refresh token 전략을 PostgreSQL canonical을 유지한 채 보조 저장소로 확장
- 장애 fallback, timeout, drill, 운영 알림 기준 문서화

이 트랙은 아직 미완료고, 현재 코드베이스와 아키텍처 문서 사이의 가장 큰 차이이기도 하다.

### 2. Architecture Document Closure Strategy

이건 구현보다 의사결정 트랙이다.

선택지는 두 가지다.
- 문서를 현재 구현에 더 가깝게 현실화한다.
- 문서는 목표 아키텍처를 유지하되, “현재 구현 상태 / 의도적 예외 / 후속 전환 항목”을 명시한다.

현재 흐름상 두 번째가 더 안전하다. 이유는 Redis 미도입 상태와 native SQL 예외가 아직 남아 있기 때문이다.

### 3. Plan Lifecycle Cleanup

이 문서 자체를 계속 active로 두는 것은 좋지 않다.

이유:
- 이미 완료된 JPA/QueryDSL/OpenAPI 트랙과 아직 남은 Redis 트랙이 한 문서에 섞여 있다.
- 앞으로 보면 실행 문서라기보다 historical umbrella plan에 가깝다.

따라서 후속으로는:
- 이 문서를 `superseded` 또는 `completed with follow-ups` 성격으로 정리하고
- Redis 전용 플랜과 문서 정렬 플랜을 분리하는 것이 맞다.

## Concrete Options

### Option A. Redis만 다음 구현 대상으로 잡는다

추천안.

장점:
- 현재 실제 gap에 직접 대응한다.
- 구현 가치가 가장 높다.
- 기존 JPA/OpenAPI 작업과 충돌이 적다.

단점:
- 운영 fallback, 장애 정책까지 같이 설계해야 한다.

### Option B. 아키텍처 문서 정렬부터 끝낸다

장점:
- 문서-코드 드리프트를 먼저 줄인다.
- 이후 리뷰 기준이 깔끔해진다.

단점:
- 실제 런타임 gap(Redis)은 그대로 남는다.
- 문서가 다시 빨리 stale해질 수 있다.

### Option C. 이 plan을 정리하고 후속 plan 둘로 쪼갠다

장점:
- 현재 상태를 가장 정확히 반영한다.
- 실행 우선순위가 선명해진다.

단점:
- 당장 기능이 늘어나지는 않는다.

## Recommendation

추천은 `Option C -> Option A` 순서다.

즉,
1. 이 오래된 umbrella plan을 현재 상태 기준으로 정리하고
2. Redis runtime adoption을 다음 실제 구현 트랙으로 잡는 것이 가장 합리적이다.

이유:
- 지금 문서는 실제 완료/미완료가 섞여 있어 바로 실행 문서로 쓰기 불편하다.
- 반면 Redis는 아직 남은 가장 큰 구조 차이이자 실제 구현 가치가 있는 트랙이다.

## Key Decisions

- 추가로 진행할 사항은 있다.
- 우선순위가 높은 미완료 축은 `Redis runtime adoption`이다.
- 아키텍처 문서는 “현재 구현 + 의도적 예외 + 후속 전환 항목” 방식으로 닫는 쪽이 안전하다.
- 기존 plan은 그대로 확장하기보다 재분류/분리하는 편이 맞다.

## Open Questions

- 아키텍처 문서를 목표 상태 문서로 유지할지, 현재 상태 문서로 더 현실화할지 최종 기준을 정할 필요가 있다.
- Redis는 `QR token -> reservation lock -> auth denylist` 순서를 그대로 유지할지 다시 확인이 필요하다.
