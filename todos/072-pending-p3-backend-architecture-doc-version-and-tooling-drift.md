---
status: pending
priority: p3
issue_id: "072"
tags: [code-review, architecture, backend, documentation]
dependencies: []
---

# Problem Statement

Backend 기술스택 문서의 일부 버전과 도구 설명이 현재 코드베이스와 부분적으로 어긋난다. 문서는 Spring Boot 3.2.x, Spring Security 6.2.x, SpringDoc OpenAPI 2.3.x를 기준으로 적혀 있지만, 실제 Gradle/POM은 Spring Boot 3.4.2를 사용하고 OpenAPI 관련 의존성이나 어노테이션이 없다.

# Findings

- [build.gradle](/Users/abc/projects/GymCRM_V2/backend/build.gradle#L3)는 Spring Boot `3.4.2`를 사용한다.
- 문서의 Backend 항목은 Spring Boot `3.2.x`, Spring Security `6.2.x`, SpringDoc OpenAPI `2.3.x`를 명시한다.
- 코드베이스에서 `springdoc`, `@Operation`, `@Tag` 사용 흔적을 찾지 못했다.
- `backend/pom.xml`도 함께 존재해 빌드 도구 기준이 Gradle 단일인지 보조 메타데이터인지 설명이 부족하다.

# Proposed Solutions

## Option A
문서 버전/도구 설명을 현재 구현 기준으로 갱신하고, OpenAPI 미도입 상태를 반영한다.

Pros:
- 기술 문서 신뢰도가 높아진다.
- 온보딩 시 실제 실행/배포 기준이 정확해진다.

Cons:
- 향후 OpenAPI 도입 시 다시 업데이트가 필요하다.

Effort: Small
Risk: Low

## Option B
현재 문서를 유지하되, 목표 스택과 현재 스택을 분리한 표를 추가한다.

Pros:
- 현재/목표 상태를 동시에 관리할 수 있다.
- 장기 계획이 있는 경우 설명력이 좋다.

Cons:
- 문서가 길어지고 관리 부담이 늘어난다.

Effort: Small
Risk: Low

# Recommended Action


# Acceptance Criteria

- [ ] Backend 기술스택의 버전 표기가 현재 빌드 파일과 일치한다.
- [ ] OpenAPI 문서화 도구가 미도입이면 문서에서 제거되거나 계획 상태로 표시된다.
- [ ] Gradle/POM 동시 존재의 의미가 문서나 저장소 규칙에서 설명된다.

# Work Log

### 2026-03-09 - Architecture Review

**By:** Codex

**Actions:**
- [build.gradle](/Users/abc/projects/GymCRM_V2/backend/build.gradle#L1)와 [pom.xml](/Users/abc/projects/GymCRM_V2/backend/pom.xml#L1)을 확인했다.
- `springdoc`, `@Operation`, `@Tag` 검색으로 OpenAPI 도입 여부를 검증했다.

**Learnings:**
- 일부 기술스택 표기는 실제 구현보다 오래된 기준을 유지하고 있다.

# Resources

- [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_시스템_아키텍처_설계서.md)
- [pom.xml](/Users/abc/projects/GymCRM_V2/backend/pom.xml)
