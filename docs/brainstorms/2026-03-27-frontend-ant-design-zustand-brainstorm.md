---
date: 2026-03-27
topic: frontend-ant-design-zustand
---

# Frontend Ant Design + Zustand 전면 도입

## What We're Building
기존 프론트엔드의 커스텀 UI/CSS 중심 구성을 Ant Design 5.x 기반으로 전면 전환한다. 이 전환은 단순 컴포넌트 치환이 아니라, 프론트엔드의 공통 셸, 테마, 공통 UI, 화면 작성 기준을 Ant Design 중심으로 재정의하는 것을 의미한다.

상태 관리는 역할별로 분리한다. 앱 전역 상태와 UI 상태는 Zustand를 사용하고, 서버 상태는 문서 기준에 맞춰 TanStack Query 5.x를 유지한다. 목표는 아키텍처 문서와 실제 구현 간의 불일치를 해소하고, 이후 화면 개발의 일관성과 생산성을 높이는 것이다.

## Why This Approach
검토한 방향 중 기준안은 "셸 우선 재구축 후 내부 페이지 교체"다. 현재 저장소는 Ant Design과 Zustand가 실제로 도입되지 않았고, 공통 레이아웃과 테마 로직은 이미 별도 계층으로 존재한다. 따라서 공통 프레임을 먼저 새 기준으로 고정한 뒤 페이지를 순차적으로 교체하는 편이 가장 현실적이다.

이 방식은 사실상 재작성보다 리스크가 낮고, 단순 점진 치환보다 기준 기술을 더 빨리 통일할 수 있다. 또한 전면 도입 목표에 맞게 `Modal`, `EmptyState`, `SkeletonLoader` 같은 공통 UI도 Ant Design 컴포넌트로 대체해 이중 UI 체계를 남기지 않는다.

## Key Decisions
- `Ant Design 5.x 전면 도입`: 기존 커스텀 UI 체계를 유지한 채 일부만 섞지 않고, 프론트엔드의 표준 UI 라이브러리를 Ant Design으로 통일한다.
- `전환 전략은 셸 우선 재구축`: `App`, 레이아웃, 내비게이션, 테마, 공통 상태 저장소를 먼저 새 기준으로 정비한 뒤 개별 페이지를 순차 전환한다.
- `공통 UI도 Ant Design으로 교체`: 커스텀 `Modal`, `EmptyState`, `SkeletonLoader` 등도 가능한 한 Ant Design 대응 컴포넌트로 대체한다.
- `상태 책임 분리 유지`: 앱 상태와 UI 상태는 Zustand가 담당하고, 서버 데이터 캐싱/조회/동기화는 TanStack Query 5.x가 담당한다.
- `브랜드 토큰 기반 테마 적용`: Ant Design 기본 구조와 상호작용은 유지하되, 색상/반경/타이포/다크 테마는 GymCRM의 기존 톤을 반영한 토큰 커스터마이징으로 맞춘다.
- `CSS 오버라이드 최소화`: 개별 컴포넌트마다 강한 스타일 덮어쓰기를 하기보다 Design Token 중심으로 시각 일관성을 맞춘다.

## Resolved Questions
- `도입 범위`: Ant Design은 신규 화면만이 아니라 기존 화면 포함 전면 도입으로 진행한다.
- `상태 관리 범위`: Zustand는 앱 상태 전용으로 사용하고, 서버 상태는 TanStack Query 5.x를 유지한다.
- `공통 UI 처리`: 기존 공통 UI도 유지하지 않고 Ant Design 컴포넌트로 최대한 대체한다.
- `비주얼 방향`: Ant Design 기본 스타일을 그대로 쓰지 않고, 브랜드 맞춤형 토큰 커스터마이징을 적용한다.

## Open Questions
- 없음. 현재 단계에서 방향성 결정에 필요한 핵심 질문은 해소되었다.

## Next Steps
다음 단계에서는 구현 계획 문서로 넘어가 전환 순서, 공통 인프라 정비 범위, 페이지 마이그레이션 우선순위, 검증 전략을 구체화한다.
