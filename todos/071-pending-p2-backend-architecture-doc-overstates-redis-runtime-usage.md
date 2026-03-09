---
status: pending
priority: p2
issue_id: "071"
tags: [code-review, architecture, backend, documentation, security]
dependencies: []
---

# Problem Statement

아키텍처 문서는 Redis를 세션 저장소, Refresh Token 저장소, 블랙리스트, 분산 락의 현재 운영 구성처럼 서술하지만, 실제 프로젝트는 Redis 의존성이 없고 인증 상태는 PostgreSQL `auth_refresh_tokens` 테이블을 canonical 저장소로 사용한다. 이 불일치는 운영 준비도와 인프라 우선순위 판단을 왜곡한다.

# Findings

- 문서는 Redis를 세션 저장소와 JWT/Refresh Token 저장소로 반복적으로 명시한다.
- 실제 설정 파일에는 Redis 연결 설정이 없고, 의존성에도 Redis/Lettuce/Redisson이 없다.
- [AuthRefreshTokenRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java#L19)는 `auth_refresh_tokens` 테이블을 직접 읽고 쓴다.
- [application.yml](/Users/abc/projects/GymCRM_V2/backend/src/main/resources/application.yml#L6)에는 PostgreSQL/Flyway/JWT 설정만 존재한다.

# Proposed Solutions

## Option A
문서를 현재 단계 기준으로 수정해 Redis를 "후속 도입 후보"로 내리고, 현재 canonical 저장소가 PostgreSQL임을 명시한다.

Pros:
- 현재 구현과 운영 현실이 맞춰진다.
- 인프라 도입 우선순위 혼선을 줄인다.

Cons:
- 미래 목표 아키텍처 표현은 약해진다.

Effort: Small
Risk: Low

## Option B
문서를 유지하고 Redis 도입을 실제 구현으로 앞당긴다.

Pros:
- 문서와 구현의 형식적 정합성이 생긴다.
- 토큰/락/캐시 요구를 한 번에 흡수할 수 있다.

Cons:
- 현재 단계 범위를 불필요하게 확장할 수 있다.
- 운영 복잡도와 배포 리스크가 증가한다.

Effort: Large
Risk: Medium

# Recommended Action


# Acceptance Criteria

- [ ] 아키텍처 문서에서 Redis의 현재 사용 여부와 후속 도입 경계가 구분된다.
- [ ] 인증 저장소 설명이 PostgreSQL `auth_refresh_tokens` 기반 구현과 일치한다.
- [ ] 세션/블랙리스트/분산 락 설명이 "현재 구현"인지 "향후 계획"인지 문서상에서 구분된다.

# Work Log

### 2026-03-09 - Architecture Review

**By:** Codex

**Actions:**
- 문서 내 Redis 관련 Backend/보안/컨테이너 설명을 검토했다.
- [build.gradle](/Users/abc/projects/GymCRM_V2/backend/build.gradle#L21), [application.yml](/Users/abc/projects/GymCRM_V2/backend/src/main/resources/application.yml#L1), [AuthRefreshTokenRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java#L19)를 대조했다.

**Learnings:**
- 현재 프로젝트의 인증 상태 저장은 Redis가 아니라 PostgreSQL이다.

# Resources

- [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_시스템_아키텍처_설계서.md)
- [AuthRefreshTokenRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java)
