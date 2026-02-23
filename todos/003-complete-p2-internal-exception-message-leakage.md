---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, backend, security, api]
dependencies: []
---

# Stop returning raw exception messages in API error responses

## Problem Statement

글로벌 예외 처리기가 예외 메시지(`ex.getMessage()`)를 그대로 API 응답 `error.detail`에 포함한다. 예상치 못한 예외의 내부 메시지는 SQL, 스택 문맥, 인프라 정보 등을 노출할 수 있어 보안/운영 관점에서 위험하다.

## Findings

- `GlobalExceptionHandler.handleUnexpected`가 모든 `Exception`에 대해 `ex.getMessage()`를 클라이언트로 반환한다.
- `handleConstraintViolation`도 내부 구현/검증 메시지를 그대로 노출한다.
- 현재는 프로토타입이지만, 공통 예외 처리 골격이 이후 도메인 API에 그대로 재사용될 가능성이 높다.

## Proposed Solutions

### Option 1: 클라이언트용 메시지와 서버 로그를 분리 (권장)

**Approach:** 클라이언트 응답에는 표준화된 안전 메시지/코드만 반환하고, 상세 예외는 서버 로그에만 기록한다. 필요하면 traceId를 추가한다.

**Pros:**
- 정보 노출 위험 감소
- 아키텍처 설계서의 traceId 기반 에러 표준으로 확장하기 쉬움

**Cons:**
- 초기 디버깅 편의성 감소 (로그 확인 필요)

**Effort:** 30-90분

**Risk:** Low

---

### Option 2: 프로파일별로만 상세 에러 노출

**Approach:** `dev`에서는 상세 메시지 허용, `staging/prod`에서는 숨김.

**Pros:**
- 개발 편의 유지
- 운영 안전성 확보

**Cons:**
- 조건 분기 추가로 복잡도 증가
- 잘못된 프로필 설정 시 다시 노출 가능

**Effort:** 1-2시간

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/error/GlobalExceptionHandler.java:45`

**Related components:**
- API error response envelope
- 향후 traceId/observability 표준화

## Resources

- `/Users/abc/projects/GymCRM_V2/docs/02_시스템_아키텍처_설계서.md`

## Acceptance Criteria

- [x] `Exception` 처리 응답에서 raw exception message가 노출되지 않음
- [x] 상세 예외는 서버 로그로 기록됨 (또는 로깅 TODO 명시)
- [x] Validation/Business 에러와 Internal 에러 노출 정책이 구분됨
- [x] 기존 에러 응답 포맷과 호환성 확인

## Work Log

### 2026-02-23 - Code Review Finding Created

**By:** Codex

**Actions:**
- 글로벌 예외 핸들러의 각 `@ExceptionHandler` 응답 바디 검토
- 노출 메시지 정책을 운영/보안 관점에서 평가
- 개선 옵션(표준 메시지 vs 프로파일 분기) 정리

**Learnings:**
- 프로토타입에서도 공통 예외 핸들러는 빠르게 확산되므로 초기에 정책을 잡는 편이 안전하다.

### 2026-02-23 - Resolved with Safe 500 Message + Logging

**By:** Codex

**Actions:**
- `GlobalExceptionHandler`에 로거 추가
- 500 응답의 `error.detail`을 고정 안전 메시지로 변경
- `GlobalExceptionHandlerTest`로 raw message 비노출 검증

**Learnings:**
- 운영 노출 정책은 공통 예외 핸들러 레벨에서 먼저 고정하는 편이 재작업이 적다.

## Notes

- 추후 `traceId` 도입 시 함께 정리하면 중복 수정이 줄어든다.
