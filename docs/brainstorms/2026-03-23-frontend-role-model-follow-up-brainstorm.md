---
date: 2026-03-23
topic: frontend-role-model-follow-up
---

# Frontend Role Model Follow-up

## What We're Building

백엔드 role storage cutover 이후, 프론트는 여전히 `authUser.role` 단일 문자열 계약에 크게 의존하고 있다. follow-up 작업의 목적은 이 프론트 계약을 `primaryRole + roles[]` 구조로 확장하고, route guard, 페이지 권한 분기, member-context 스코프, mock/test 계약을 새 모델에 맞게 정렬하는 것이다.

이번 범위는 프론트가 다중 역할을 소비할 수 있도록 만드는 작업이다. 계정 관리 화면에서 `user_roles`를 직접 편집하는 UX까지 한 번에 포함하지는 않는다. 그 영역은 권한 모델 소비자 전환이 아니라 권한 편집 기능 확장에 가깝기 때문에 별도 후속 작업으로 분리한다.

## Why This Approach

검토한 핵심 선택지는 세 가지였다.

### Approach A: `roles[]`만 노출하고 기존 단일 역할 계약 제거

권한 집합만 남기고 `primaryRole` 없이 전부 role-set 기반으로 판단하는 방식이다.

**Pros:**
- 개념적으로 가장 단순하다.
- 프론트가 단일 역할 환상을 빨리 벗어난다.

**Cons:**
- 기존 UI와 mock/test 전제를 한 번에 많이 깨뜨린다.
- 표시용 대표 권한, 기본 landing, 단순 분기 호환 지점이 모두 재설계 대상이 된다.

**Best when:** 기존 단일 역할 계약을 과감히 버릴 준비가 되어 있을 때

### Approach B: `primaryRole + roles[]`를 함께 도입

대표 권한은 유지하되, 실제 인가와 노출 판단은 `roles[]`로 전환하는 방식이다.

**Pros:**
- 기존 단순 분기와 UI 표기 계약을 완전히 깨지 않는다.
- route/page/member-context를 role-set 기반으로 점진 전환할 수 있다.
- mock/test 마이그레이션도 단계적으로 진행하기 쉽다.

**Cons:**
- 한동안 `primaryRole`과 `roles[]`가 공존해 계약이 약간 복잡해진다.
- 어떤 판단이 `primaryRole`용이고 어떤 판단이 `roles[]`용인지 명확히 정리해야 한다.

**Best when:** 점진 전환이 필요하고 현재 프론트 의존 지점이 넓게 퍼져 있을 때

### Approach C: 당분간 `authUser.role` 유지, 보조 필드만 추가

기존 단일 역할 계약을 계속 중심에 두고, `roles[]`는 사실상 참고 정보만 추가하는 방식이다.

**Pros:**
- 초기 변경량이 가장 작다.
- 빠르게 필드만 늘릴 수 있다.

**Cons:**
- 후속 전환이 계속 미뤄질 가능성이 크다.
- route/page/member-context가 계속 단일 역할 전제에 묶인다.

**Best when:** 이번 범위를 매우 작게 제한해야 할 때

추천 및 사용자 선택은 Approach B였다.

## Key Decisions

- 프론트 auth 계약은 `primaryRole + roles[]`로 확장한다.
  - 이유: 기존 UI와 테스트 계약을 완전히 깨지 않으면서 role-set 기반 전환을 시작할 수 있다.

- 실제 인가와 메뉴 노출은 `roles[]` 교집합 OR 규칙으로 판단한다.
  - 이유: 프론트에서 역할 서열을 억지로 정의하지 않고도 가장 단순하고 직관적인 규칙을 유지할 수 있다.

- `primaryRole`은 표시/정렬/기본 UX 용도에 한정한다.
  - 이유: 접근 제어를 대표 권한 하나에 묶으면 실제 권한 집합과 다른 결과가 날 수 있다.

- 관리자 계정 관리 UI의 `user_roles` 편집 UX는 이번 범위에서 분리한다.
  - 이유: 그것은 권한 모델 소비자 전환이 아니라 별도의 권한 편집 기능 확장이다.

- 구현은 단계적 전환으로 나눈다.
  - 이유: auth payload/state, route guard, page capability, member-context, test parity를 한 번에 바꾸는 것보다 리스크를 통제하기 쉽다.

## Resolved Questions

- 프론트가 `role_id`를 직접 다뤄야 하는가?
  - 결정: 아니다. 프론트는 DB 식별자가 아니라 의미 기반 권한 코드 집합을 소비해야 하므로 `roles[]`를 쓴다.

- 프론트 계약은 `roles[]`만 둘지, `primaryRole`도 유지할지?
  - 결정: `primaryRole + roles[]`를 함께 둔다.

- 인가/노출 판단은 role 서열 기반인가, role-set 기반인가?
  - 결정: `roles[]` 교집합 OR 규칙으로 판단한다.

- 관리자 계정 관리 UX를 이번 범위에 포함할지?
  - 결정: 포함하지 않는다. 별도 후속 작업으로 분리한다.

- 전환은 한 번에 할지, 단계적으로 할지?
  - 결정: 단계적 전환으로 진행한다.

## Proposed Follow-up Stages

1. auth payload/state를 `primaryRole + roles[]`로 확장
2. route/sidebar/App guard를 `roles[]` 기반으로 전환
3. page capability gate와 member-context를 `roles[]` 기반으로 전환
4. mock/live parity와 프론트 테스트를 새 계약 기준으로 정리

## Scope Boundaries

- 이번 follow-up은 프론트가 다중 역할 정보를 소비하는 구조로 바꾸는 작업이다.
- 계정 관리 화면의 role 편집 UX는 포함하지 않는다.
- 백엔드 저장 구조나 JWT 저장 방식 자체를 다시 바꾸는 작업은 아니다.
- role-set 도입 후에도 제품 정책상 다중 역할 조합의 세부 우선순위 체계는 프론트에 두지 않는다.

## Next Steps

- 다음 단계는 `/prompts:workflows-plan`으로 이 브레인스토밍을 구현 계획으로 전개한다.
- 계획 단계에서는 auth contract, route/sidebar semantics, page/member-context 영향 범위, 테스트 마이그레이션 순서를 구체화한다.
