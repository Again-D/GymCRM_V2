---
status: pending
priority: p2
issue_id: "070"
tags: [code-review, architecture, backend, documentation]
dependencies: []
---

# Problem Statement

`docs/02_시스템_아키텍처_설계서.md`의 Backend 기술스택은 ORM을 `Spring Data JPA + QueryDSL`로 정의하지만, 현재 백엔드는 JPA/QueryDSL이 아니라 `spring-boot-starter-jdbc`와 `JdbcClient` 중심으로 구현되어 있다. 이 상태를 유지하면 설계 문서가 실제 데이터 접근 패턴을 잘못 안내해 후속 구현과 리뷰 기준이 흔들린다.

# Findings

- 아키텍처 문서는 Backend ORM을 `Spring Data JPA + QueryDSL`로 명시한다.
- 실제 백엔드 의존성은 `spring-boot-starter-jdbc`만 포함하고 `spring-boot-starter-data-jpa`, QueryDSL 의존성이 없다.
- 대표 저장소 구현인 [MemberRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java#L3)는 `JdbcClient`와 수동 SQL로 동작한다.

# Proposed Solutions

## Option A
문서를 현재 구현 기준으로 수정해 ORM 항목을 `Spring JDBC (JdbcClient)`로 교체한다.

Pros:
- 현재 코드와 즉시 일치한다.
- 후속 개발자에게 실제 패턴을 정확히 전달한다.

Cons:
- 장기적으로 JPA 전환 계획이 있다면 문서를 다시 수정해야 한다.

Effort: Small
Risk: Low

## Option B
코드를 문서 기준으로 맞추기 위해 JPA/QueryDSL 전환 계획을 수립하고, 문서에는 "목표 아키텍처"라고 명시한다.

Pros:
- 문서를 미래 상태 기준으로 유지할 수 있다.
- 장기적 기술 방향을 명확히 드러낼 수 있다.

Cons:
- 현재 구현과 목표 상태가 분리되어 운영 혼선을 남긴다.
- 전환 비용이 크다.

Effort: Large
Risk: Medium

# Recommended Action


# Acceptance Criteria

- [ ] Backend 기술스택 문서의 ORM 항목이 현재 구현 또는 명시적 목표 상태와 일치한다.
- [ ] 저장소 계층 설명에서 `JdbcClient` 기반 SQL 접근 패턴 여부가 분명하게 드러난다.
- [ ] 후속 리뷰 시 JPA/QueryDSL 존재를 전제로 한 잘못된 판단이 발생하지 않는다.

# Work Log

### 2026-03-09 - Architecture Review

**By:** Codex

**Actions:**
- `docs/02_시스템_아키텍처_설계서.md`의 Backend 기술스택 항목을 검토했다.
- [build.gradle](/Users/abc/projects/GymCRM_V2/backend/build.gradle#L21), [MemberRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java#L3)를 대조해 실제 저장소 패턴을 확인했다.

**Learnings:**
- 현재 백엔드의 canonical 데이터 접근 방식은 JPA가 아니라 JDBC/JdbcClient다.

# Resources

- [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_시스템_아키텍처_설계서.md)
- [build.gradle](/Users/abc/projects/GymCRM_V2/backend/build.gradle)
