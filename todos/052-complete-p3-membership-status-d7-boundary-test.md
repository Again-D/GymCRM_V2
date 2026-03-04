---
status: complete
priority: p3
issue_id: "052"
tags: [code-review, backend, tests, quality]
dependencies: []
---

# 회원권 상태 D-7 경계 테스트 누락

## Problem Statement

회원권 운영 상태 규칙에서 `만료임박` 기준은 만료일이 `오늘+7일 이하`입니다. 그러나 통합 테스트가 D+5, D+8은 검증하지만 정확히 D+7 경계를 직접 검증하지 않아 회귀 시 기준값 변경/오타를 놓칠 수 있습니다.

## Findings

- `backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java:64`에서 D+5(`만료임박`)를 검증합니다.
- `backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java:72`에서 D+8(`정상`)을 검증합니다.
- D+7 정확 경계 입력에 대한 단정(assert)은 존재하지 않습니다.

## Proposed Solutions

### Option 1: 기존 테스트에 D+7 케이스 추가 (권장)

**Approach:** 동일 테스트 메서드에 fixture 1건(D+7)을 추가하고 `만료임박` 단정을 추가합니다.

**Pros:**
- 변경 범위가 가장 작음
- 현재 테스트 구조와 일관됨

**Cons:**
- 단일 테스트 메서드가 더 비대해짐

**Effort:** 30-60 min

**Risk:** Low

---

### Option 2: 상태 규칙별 파라미터화 테스트로 분리

**Approach:** 상태 파생 규칙을 별도 테스트 클래스로 분리하고 경계값을 파라미터화합니다.

**Pros:**
- 가독성/유지보수성 향상
- 경계값 추가가 쉬움

**Cons:**
- 리팩터링 비용이 Option 1보다 큼

**Effort:** 2-4 hours

**Risk:** Low

## Recommended Action

기존 통합 테스트에 D+7 만료일 fixture를 추가하고 `membershipOperationalStatus`가 `만료임박`으로 유지되는지 명시적으로 검증한다. 동시에 테스트 내 기준일을 단일 `today` 변수로 통일해 시점 흔들림을 줄인다.

## Technical Details

**Affected files:**
- `backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java:64`
- `backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java:74`

**Related components:**
- Member summary status derivation rules

**Database changes (if any):**
- 없음

## Resources

- **PR:** [#31](https://github.com/Again-D/GymCRM_V2/pull/31)

## Acceptance Criteria

- [ ] D+7 만료일 케이스가 테스트에 추가되어 `만료임박`으로 검증된다.
- [ ] 기존 상태 분류 시나리오(D+5, D+8, 과거일, endDate null)가 모두 유지된다.
- [ ] 테스트가 로컬/CI에서 안정적으로 통과한다.

## Work Log

### 2026-03-04 - Code Review Finding 등록

**By:** Codex

**Actions:**
- 회원권 운영 상태 테스트 커버리지 점검
- D-7 경계값 테스트 누락 확인
- 보완안 정리 후 todo 등록

**Learnings:**
- 경계값 테스트는 규칙 변경 회귀를 가장 먼저 잡는 안전장치 역할을 함

### 2026-03-04 - 구현 완료

**By:** Codex

**Actions:**
- `backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java`에 `today` 기준 변수 추가
- 동일 테스트에 D+7 경계 fixture(`요약만료임박경계`)와 assert 추가
- 기존 D+5/D+8/기타 assert도 `today` 기준으로 정리
- `./gradlew test --tests 'com.gymcrm.member.MemberSummaryApiIntegrationTest'` 실행 및 성공 확인

**Learnings:**
- 경계값 테스트를 명시하면 상태 규칙 수정 시 영향 범위를 빠르게 탐지할 수 있음

## Notes

- 우선순위는 P3이지만, 규칙 회귀 방지 관점에서 빠른 반영 가치가 높습니다.
