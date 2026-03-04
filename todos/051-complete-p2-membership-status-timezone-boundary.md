---
status: complete
priority: p2
issue_id: "051"
tags: [code-review, backend, quality, timezone]
dependencies: []
---

# 회원권 상태 계산의 시간대 경계 리스크

## Problem Statement

회원 목록 요약 API가 회원권 운영 상태(`정상/만료임박/만료`)를 SQL의 `CURRENT_DATE` 기준으로 계산하고 있습니다. DB 세션 시간대와 운영 기준 시간대(KST)가 다르면 자정 전후에 상태가 하루 빠르거나 늦게 계산될 수 있습니다.

## Findings

- `backend/src/main/java/com/gymcrm/member/MemberRepository.java:153`에서 `rm.end_date < CURRENT_DATE`로 만료를 판정합니다.
- `backend/src/main/java/com/gymcrm/member/MemberRepository.java:154`에서 `rm.end_date <= (CURRENT_DATE + 7)`로 만료임박을 판정합니다.
- 해당 로직은 DB 시간대에 종속되며, 애플리케이션 레벨의 명시적 기준 시간대 보정이 없습니다.
- 현재 통합 테스트는 시간대가 다른 실행 환경에서의 경계 오차를 검증하지 않습니다.

## Proposed Solutions

### Option 1: SQL에서 기준 시간대를 명시

**Approach:** `CURRENT_DATE` 대신 `timezone('Asia/Seoul', now())::date` 같은 고정 기준을 사용합니다.

**Pros:**
- 쿼리 단에서 즉시 문제를 줄일 수 있음
- API/서비스 계층 변경이 작음

**Cons:**
- DB 벤더/함수 의존성이 커짐
- 시간대 정책이 SQL 문자열에 박혀 재사용성이 낮음

**Effort:** 1-2 hours

**Risk:** Medium

---

### Option 2: 서비스 계층에서 기준 날짜 주입 (권장)

**Approach:** `Clock`/`ZoneId`를 서비스에 주입해 기준 날짜를 계산하고, repository 쿼리에 파라미터로 전달합니다.

**Pros:**
- 시간대 정책이 코드에서 명시적으로 관리됨
- 테스트에서 날짜/시간 시나리오를 안정적으로 재현 가능

**Cons:**
- Repository 시그니처/쿼리 수정 필요
- 관련 테스트 보강 필요

**Effort:** 3-5 hours

**Risk:** Low

---

### Option 3: DB 세션 시간대 강제

**Approach:** 커넥션 풀 또는 세션 초기화 시 timezone을 KST로 고정합니다.

**Pros:**
- 쿼리 수정 없이 전역 정합성 확보 가능

**Cons:**
- 인프라/운영 의존성이 높고 누락 시 재발 가능
- 다중 시간대 요구가 생기면 대응이 어려움

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

회원권 상태 파생 기준일을 DB `CURRENT_DATE`에서 서비스 계층 기준일 파라미터로 전환한다. 기준 시간대는 `Asia/Seoul`로 명시하고 repository에 `referenceDate`를 전달하여 SQL 비교식이 환경 시간대에 영향을 받지 않도록 고정한다.

## Technical Details

**Affected files:**
- `backend/src/main/java/com/gymcrm/member/MemberRepository.java:150`
- `backend/src/main/java/com/gymcrm/member/MemberRepository.java:154`

**Related components:**
- Member list summary API (`GET /api/v1/members`)

**Database changes (if any):**
- Migration 필요 없음

## Resources

- **PR:** [#31](https://github.com/Again-D/GymCRM_V2/pull/31)

## Acceptance Criteria

- [ ] 회원권 상태 계산 기준 날짜가 명시적 시간대 정책을 따른다.
- [ ] 시간대 경계(자정 전후) 시나리오에서 상태 오분류가 재현되지 않는다.
- [ ] 관련 테스트가 CI 환경에서 안정적으로 통과한다.

## Work Log

### 2026-03-04 - Code Review Finding 등록

**By:** Codex

**Actions:**
- PR #31의 회원권 상태 계산 SQL 검토
- `CURRENT_DATE` 의존 로직의 시간대 경계 리스크 확인
- 해결 옵션 3가지를 정리해 todo 등록

**Learnings:**
- 운영 상태 파생 로직은 시간대 정책을 코드 레벨에서 명시해야 테스트/운영 정합성이 높아짐

### 2026-03-04 - 구현 완료

**By:** Codex

**Actions:**
- `backend/src/main/java/com/gymcrm/member/MemberService.java`에 `BUSINESS_ZONE(Asia/Seoul)` 추가
- `backend/src/main/java/com/gymcrm/member/MemberService.java`에서 `businessDate`를 계산해 repository에 전달
- `backend/src/main/java/com/gymcrm/member/MemberRepository.java` 시그니처에 `referenceDate` 추가
- `backend/src/main/java/com/gymcrm/member/MemberRepository.java` SQL 비교식을 `CURRENT_DATE`에서 `:referenceDate` 기반으로 교체
- `./gradlew test --tests 'com.gymcrm.member.MemberSummaryApiIntegrationTest'` 실행 및 성공 확인

**Learnings:**
- 날짜 경계 로직은 SQL 내 시스템 함수 의존보다 명시적 파라미터 전달 방식이 회귀 방지에 유리함

## Notes

- 본 이슈는 기능 오동작 가능성을 낮추기 위한 안정성/정합성 개선 항목입니다.
