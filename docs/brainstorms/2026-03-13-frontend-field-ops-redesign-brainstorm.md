---
date: 2026-03-13
topic: frontend-field-ops-redesign
---

# Frontend Field Ops Redesign Brainstorm

## What We're Building
현재 rebuild 프론트엔드를 기존 UI 복원 대신, 더 빠르고 선명한 현장 운영툴 톤으로 재디자인한다. 목표는 "데스크 운영의 정돈감"과 "현장 보드의 즉시성"을 섞은 운영 콘솔 경험을 만드는 것이다. 화면은 더 또렷한 대비, 더 높은 정보 가독성, 더 짧은 액션 동선을 가져야 하며, 기본 스타일처럼 보이는 인상을 벗어나 제품 고유의 시각 언어를 가져야 한다.

상호작용 방식은 주요 입력/처리를 모달 중심으로 재정렬한다. 기본 페이지는 조회, 상태 확인, 컨텍스트 파악에 집중하고, 생성/수정/업무 처리 액션은 집중형 모달 surface에서 수행한다. 1차 범위는 전체 프론트 동시 개편이 아니라 `DashboardLayout`, `Login`, `Members`, `Memberships`, `Reservations`를 기준 화면으로 잡고, light/dark를 함께 설계한다. 이후 2차에서는 나머지 전체 화면으로 같은 톤과 원칙을 확장하며, 최종적으로는 프론트 전체가 일관된 field-ops console로 작동해야 한다.

## Why This Approach
기존 UI를 부분 복원하는 방식은 빠를 수 있지만, 현재 rebuild 구조와 새 요구사항(modal 중심, dark mode, 더 강한 제품 톤)을 동시에 만족시키기 어렵다. 반대로 완전 재디자인은 방향이 흔들리기 쉬우므로, 대표 화면 몇 개를 기준 샘플로 잡아 새 시각 언어를 먼저 고정하는 것이 가장 현실적이다.

또한 이 제품은 일반적인 느슨한 SaaS 화면보다 현장 업무 속도와 상태 판독성이 중요하다. 따라서 여백이 넓고 부드러운 UI보다, 선명한 대비와 명확한 상태 배지, 빠른 검색-선택-처리 흐름이 더 잘 맞는다. 모달 중심 상호작용도 추가 요구사항과 부합하며, 회원권/예약처럼 집중 입력이 필요한 업무와 궁합이 좋다.

## Approaches Considered
### Approach A: 기존 UI 복원 중심
기존 레이아웃과 상호작용을 최대한 재현하면서 색상과 모듈 구조만 현 코드베이스에 맞춘다.

장점:
- 과거 기대치와 가장 빠르게 맞출 수 있다.
- 결정해야 할 시각적 변수 수가 적다.

단점:
- 현재 rebuild 구조와 새 요구사항에 맞춘 재해석 여지가 작다.
- "기본 스타일" 인상이나 정보 밀도 문제를 근본적으로 개선하기 어렵다.

### Approach B: 완전 신톤 + 대표 화면 우선 적용
새 시각 언어를 정의하고, shell/login/핵심 workspace에 먼저 적용한 뒤 나머지로 확장한다.

장점:
- 제품 인상을 명확히 새로 만들 수 있다.
- modal, dark mode, state hierarchy를 한 번에 일관되게 설계할 수 있다.
- 범위를 통제하면서도 결과물 기준을 만들 수 있다.

단점:
- 초기에 디자인 결정이 더 많이 필요하다.
- 대표 화면 완성 전까지는 일부 화면 간 톤 차이가 생길 수 있다.

### Approach C: 디자인 시스템만 먼저 만들고 페이지는 나중에 적용
토큰, 버튼, 카드, 상태색, 테마 규칙만 먼저 정의하고 실제 화면 개편은 뒤로 미룬다.

장점:
- 구조적으로는 가장 깔끔하다.
- 장기 유지보수 기반을 먼저 확보할 수 있다.

단점:
- 사용자 입장에서 체감 개선이 늦다.
- 실제 화면에서 검증되지 않은 시스템이 추상적으로 남을 수 있다.

## Recommended Direction
Approach B를 선택한다. 이유는 사용자가 체감하는 개선을 빠르게 만들면서도, 이후 전체 프론트에 확장 가능한 기준 화면과 시각 언어를 동시에 확보할 수 있기 때문이다. YAGNI 관점에서도 전 화면 동시 개편이나 추상적 시스템 선행보다, 대표 화면 우선 적용이 더 적절하다.

## Key Decisions
- 디자인 방향: 기존 UI 복원이 아니라 완전히 새로운 톤으로 재디자인한다.
- 제품 인상: "빠르고 선명한 현장 운영툴"로 정의한다.
- 세부 분위기: 데스크 운영의 정돈감과 현장 보드의 즉시성을 중간 지점에서 결합한다.
- 상호작용 원칙: 주요 입력/처리는 모달 중심으로 설계한다.
- 1차 적용 범위: `DashboardLayout`, `Login`, `Members`, `Memberships`, `Reservations`.
- 2차 적용 범위: 나머지 전체 화면을 동일한 시각 언어와 interaction rules로 확장한다.
- 테마 범위: 1차부터 light/dark를 함께 설계한다.
- 정보 구조 원칙: 기본 페이지는 조회/스캔 중심, 집중 작업은 모달에서 수행한다.
- 시각 우선순위: 장식보다 상태, 숫자, 다음 액션의 빠른 인지에 집중한다.
- 최우선 성공 기준: 시각 완성도보다 현장 업무 처리 속도와 가독성을 우선한다.
- 반응형 우선순위: 데스크톱 우선이지만, 태블릿도 적극 대응하는 운영 환경을 목표로 한다.

## Design Characteristics To Preserve
- 사이드바 기반 workspace 구조와 login-first 진입 흐름은 유지한다.
- 회원 선택 후 업무 화면으로 이어지는 현재 workspace handoff 구조는 유지한다.
- 기존 shared primitive와 page-level module.css 방향은 살리되, 시각 언어와 interaction polish를 다시 설계한다.

## Desired UX Characteristics
- 멀리서도 읽히는 대비와 선명한 상태 표현
- 넓기만 한 여백 대신, 운영 업무에 맞는 적당한 정보 밀도
- 검색 → 선택 → 처리 흐름이 짧고 즉각적으로 이어지는 구조
- 모달 안에서는 작업 목적, 상태, 확인 액션이 한눈에 보이는 집중형 레이아웃
- dark mode에서도 감성형이 아닌 고대비 운영 콘솔 인상 유지
- 데스크톱과 태블릿에서 동일한 업무 흐름이 유지되되, 태블릿에서도 액션 밀도와 조작성이 크게 무너지지 않는 구조

## Rollout Vision
### Phase 1: Representative Surfaces
`DashboardLayout`, `Login`, `Members`, `Memberships`, `Reservations`를 새 톤의 기준 화면으로 만든다. 이 단계의 목적은 제품 인상, 정보 밀도, modal language, light/dark 대비, navigation rhythm을 고정하는 것이다. 이후 화면 확장 시 반복해서 참조할 수 있는 visual contract를 이 단계에서 확보한다.

### Phase 2: Full Frontend Expansion
1차에서 고정된 시각 언어와 모달 원칙을 나머지 전체 화면에 확장한다. `Access`, `CRM`, `Lockers`, `Settlements`, `Products`, 보조 상태 화면과 empty/error/loading surface까지 모두 같은 제품 톤으로 정리한다. 목표는 "대표 화면만 예쁜 상태"가 아니라, 운영자가 화면을 옮겨 다녀도 같은 시스템 안에 있다는 감각을 유지하는 것이다.

### Final Target State
최종 상태의 프론트엔드는 단일한 운영 콘솔처럼 보여야 한다. 어느 페이지에서든 상태 위계, 액션 우선순위, modal 처리 흐름, 테마 전환, 반응형 대응이 같은 문법으로 동작해야 한다. 사용자는 디자인을 감상하는 대신 더 빠르게 스캔하고, 더 적은 클릭과 더 적은 망설임으로 업무를 끝낼 수 있어야 한다.

## Constraints / Guardrails
- 1차에서는 핵심 representative surfaces를 먼저 완성하고, 나머지 페이지는 후속 확장으로 다룬다.
- 기능 로직, API ownership, role gating 계약을 깨지 않는다.
- modal 요구사항이 있는 업무는 drawer/panel로 임의 변경하지 않는다.
- light/dark 모두 first-class citizen으로 설계하되, 구조는 동일하고 표현만 바뀌어야 한다.
- 디자인 polish가 다시 전역 CSS로 흘러가며 ownership이 흐려지지 않도록 주의한다.

## Success Criteria
- `DashboardLayout`과 `Login`만 봐도 제품 인상이 "기본 스타일"에서 "운영 콘솔"로 바뀌었다고 느낄 수 있다.
- `Members`, `Memberships`, `Reservations`가 동일한 시각 언어와 밀도를 공유한다.
- 주요 생성/수정/처리 액션이 모달 중심으로 일관되게 제공된다.
- light/dark 모두에서 대비, 상태색, 포커스, 가독성이 유지된다.
- 이후 `Access`, `CRM`, `Lockers`, `Settlements`로 확장 가능한 기준 패턴이 정리된다.
- 2차 확장 후 나머지 전체 화면도 같은 visual contract와 modal language를 공유한다.
- 데스크톱과 태블릿에서 핵심 업무 흐름이 유지되고, 태블릿에서도 조작이 답답하지 않다.
- 최종적으로는 시각 polish 자체보다 업무 처리 속도, 상태 판독성, 액션 명확성이 개선된다.

## Open Questions
- 없음 (현재 브레인스토밍 범위 기준)

## Resolved Questions
- 재디자인 방향: 완전 새 톤으로 간다.
- 제품 인상: 빠르고 선명한 현장 운영툴.
- 시각 성격: 데스크 운영의 정돈감 + 현장 보드의 즉시성.
- 상호작용 surface: 추가 요구사항에 맞춰 모달 중심.
- 1차 범위: shell + login + `Members`, `Memberships`, `Reservations`.
- 2차 범위: 나머지 전체 화면으로 확장.
- 테마 전략: 1차부터 light/dark 동시 설계.
- 최우선 성공 기준: 시각 완성도보다 현장 업무 처리 속도와 가독성.
- 환경 우선순위: 데스크톱 우선, 태블릿 적극 대응.

## Next Steps
→ `/prompts:workflows-plan` 에서 이 브레인스토밍 문서를 바탕으로 1차/2차/최종 목표를 연결한 구현 계획, modal 적용 범위, light/dark 토큰 전략, 반응형 검증 순서, phase gate를 구체화한다.
