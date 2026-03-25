---
date: 2026-03-25
topic: agents-md-rewrite
---

# AGENTS.md Rewrite Brainstorm

## What We're Building
`AGENTS.md`를 단순 참고 문서가 아니라, 이 저장소에서 에이전트가 바로 따를 수 있는 짧고 강한 운영 규칙 문서로 재작성한다.

문서는 두 가지 역할을 동시에 가져야 한다. 첫째, 에이전트가 작업 전에 읽고 바로 실행 가능한 제약과 기본 원칙을 빠르게 이해할 수 있어야 한다. 둘째, 프로젝트의 공식 브랜치 전략과 백엔드 패키지 구조를 오해 없이 고정해야 한다. 이번 재작성은 특히 `main / develop / feature/*` 브랜치 전략과 백엔드의 `feature-first + common 예외 구조`를 명시적으로 드러내는 데 초점을 둔다.

프론트엔드는 이번 재작성의 중심이 아니다. 프론트엔드 규칙은 현재 수준의 간결한 가이드를 유지하고, 백엔드 규칙을 더 강하게 구조화하는 방향으로 간다.

## Why This Approach
검토한 현재 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)는 빌드/테스트 명령, 아키텍처, 운영 규칙을 넓게 담고 있지만, 에이전트 실행 규칙과 프로젝트 구조 규칙이 한 문서 안에서 다소 평평하게 섞여 있다. 이 상태에서는 어떤 규칙이 절대 규칙이고 어떤 내용이 참고 수준인지 빠르게 구분하기 어렵다.

따라서 새 문서는 “Harness Engineering에 맞는 운영 규칙 문서”처럼 재구성한다. 핵심 불변 규칙은 `must`로 강하게, 나머지는 `default` 또는 `preferred`로 둔다. 특히 브랜치 전략과 패키지 구조는 공식 표준으로 못 박고, `common` 모듈과 feature 모듈이 서로 다른 구조 규칙을 가진다는 점을 예시 트리로 함께 설명한다. 이렇게 하면 에이전트가 새 기능을 추가하거나 파일을 이동할 때 구조를 임의 해석할 여지가 줄어든다.

## Key Decisions
- 문서 성격은 `프로젝트 개발 가이드`가 아니라 `에이전트가 즉시 따라야 하는 프로젝트 운영 규칙`으로 둔다.
- 문서 강도는 `핵심만 must, 나머지는 권장`으로 간다.
  - 브랜치 전략, 백엔드 구조, API 응답 규약, 검증 기준은 강한 규칙으로 둔다.
  - 프론트엔드 세부 스타일과 일반적 협업 팁은 짧은 기본 원칙 수준으로 유지한다.
- Git 전략은 공식 표준으로 `main / develop / feature/*`를 명시한다.
  - `main`: production deployment branch
  - `develop`: integration branch
  - `feature/*`: 모든 기능/수정 작업 브랜치
- 백엔드는 `feature-first`를 기본 원칙으로 한다.
  - 각 feature 내부에서 `controller / service / repository / entity / dto` 등으로 나눈다.
  - 공통 인프라/보안/예외/응답/유틸은 `common` 모듈에 둔다.
- `common`은 예외가 아니라 공식 구조로 정의한다.
  - `config`, `security`, `auth`, `exception`, `response`, `entity`, `util`, `annotation`, `event`, `external` 등을 허용한다.
  - 사용자가 제시한 `common` 디렉터리 트리를 문서에 예시로 포함한다.
- 문서에는 구조 예시를 두 종류 모두 포함한다.
  - `common` 모듈 예시 트리
  - 일반 feature 모듈 예시 트리
- 프론트엔드는 이번 재작성에서 얇게 유지한다.
  - 기존의 React + TypeScript, CSS Modules, API utilities 사용 원칙만 유지한다.
  - 백엔드처럼 상세 디렉터리 정책까지 강하게 확정하지는 않는다.
- 문서 섹션은 “빠르게 읽히는 규칙 우선” 순서로 재배치한다.
  - Purpose
  - Non-Negotiable Rules
  - Git Branch Strategy
  - Backend Package Structure
  - Common Module Structure
  - Feature Module Structure
  - API / DTO / Testing Rules
  - Frontend Defaults
  - Operational Checklist

## Resolved Questions
- `AGENTS.md`는 어떤 성격으로 쓸 것인가?
  - 에이전트가 바로 따를 수 있는 짧고 강한 프로젝트 운영 규칙 문서
- Harness Engineering 스타일에 맞추려면 어느 정도 강도로 쓸 것인가?
  - 핵심만 `must`, 나머지는 권장
- 브랜치 전략을 공식 표준으로 고정할 것인가?
  - 예. `main / develop / feature/*`
- 백엔드 구조 원칙은 무엇인가?
  - 기본은 `feature-first`, 공통 책임은 `common`
- `common` 구조를 문서에 어디까지 반영할 것인가?
  - 사용자 제시 트리를 예시로 직접 포함
- 구조 예시는 어느 수준까지 넣을 것인가?
  - `common` 예시 + 일반 feature 예시 모두 포함
- 프론트엔드 구조는 얼마나 강하게 다룰 것인가?
  - 이번 재작성에서는 얇게 유지

## Open Questions
- 없음

## Next Steps
`/prompts:workflows-plan` 단계에서 다음 작업을 정의한다.

- 현재 `AGENTS.md`를 어떤 섹션 구조로 재편할지 확정
- 기존 내용 중 유지/삭제/압축 대상 분류
- 새 `Git Branch Strategy` 섹션 초안 작성
- 새 `Backend Package Structure` 섹션과 예시 트리 작성
- 프론트엔드/운영 규칙을 짧게 정리해 최종 문서로 통합
