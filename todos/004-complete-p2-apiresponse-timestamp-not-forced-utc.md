---
status: complete
priority: p2
issue_id: "004"
tags: [code-review, backend, api, quality, time]
dependencies: []
---

# Normalize API response timestamps to UTC explicitly

## Problem Statement

`ApiResponse`의 `timestamp`가 `OffsetDateTime.now()`로 생성되어 서버 로컬 타임존 오프셋을 포함할 수 있다. 문서/규칙에서 UTC 저장·표시 기준을 지향하는데, 현재 응답 타임스탬프는 서버 환경에 따라 `+09:00` 등으로 달라질 수 있어 일관성이 깨진다.

## Findings

- `ApiResponse.success()` / `error()`에서 `OffsetDateTime.now()`를 사용한다.
- `application.yml`에 `spring.jackson.time-zone: UTC`가 있지만, `OffsetDateTime` 생성 시점 오프셋 자체를 UTC로 보장하는 것은 아니다.
- 실제 로컬 실행 로그 기준 서버가 KST(+09:00) 환경이어서 응답 timestamp도 로컬 오프셋으로 생성될 가능성이 높다.

## Proposed Solutions

### Option 1: `OffsetDateTime.now(ZoneOffset.UTC)`로 강제 (권장)

**Approach:** 응답 생성 시점을 UTC 오프셋으로 고정한다.

**Pros:**
- 구현 간단
- 현재 DTO 구조 유지
- 문서화된 UTC 기준과 정렬

**Cons:**
- 추후 traceId/에러 표준 리팩터링 시 다시 수정 가능성

**Effort:** 10-20분

**Risk:** Low

---

### Option 2: `Instant`로 타입 변경

**Approach:** 응답 timestamp 타입을 `Instant`로 바꿔 타임존 표현 문제를 제거한다.

**Pros:**
- 표현이 명확하고 표준적
- 타임존 혼동 감소

**Cons:**
- 응답 스키마 변경 영향
- 프론트 파서/문서 업데이트 필요

**Effort:** 30-60분

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/api/ApiResponse.java:12`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/application.yml:4`

**Related components:**
- API response serialization
- Prototype canonical UTC policy

## Resources

- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-canonical-rules.md`

## Acceptance Criteria

- [x] API 응답 `timestamp`가 UTC 기준으로 직렬화됨
- [x] 성공/실패 응답 모두 동일한 시간 정책 적용
- [x] 샘플 응답 또는 테스트로 UTC 형식 확인

## Work Log

### 2026-02-23 - Code Review Finding Created

**By:** Codex

**Actions:**
- `ApiResponse` timestamp 생성 로직 검토
- `application.yml` Jackson timezone 설정과 상호작용 분석
- UTC 정책 불일치 가능성 문서화

**Learnings:**
- 직렬화 timezone 설정만으로는 생성 시점 오프셋 일관성을 보장하지 못할 수 있다.

### 2026-02-23 - Resolved with Explicit UTC Timestamp Generation

**By:** Codex

**Actions:**
- `ApiResponse.success/error`에서 `OffsetDateTime.now(ZoneOffset.UTC)` 사용
- `ApiResponseTest`로 성공/실패 응답 timestamp offset이 UTC인지 검증
- 실제 `/api/v1/health` 응답에서 `Z` 타임스탬프 확인

**Learnings:**
- 생성 시점 UTC 고정 + 테스트 추가가 가장 단순하고 안정적이다.

## Notes

- 변경 난이도가 낮아 다른 공통 API 리팩터링 전에 선반영하기 좋다.
