---
status: complete
priority: p2
issue_id: "103"
tags: [code-review, frontend, quality, localization, members]
dependencies: []
---

# Problem Statement

`MemberListSection`의 "운영 상태" 컬럼이 이미 한국어 상태값을 다시 영어 코드로 변환해 표시하고 있습니다. 현재 UI는 한국어 콘솔로 정리돼 있는데 이 테이블만 `NORMAL`, `HOLDING`, `EXPIRING` 같은 코드형 문구를 보여 줘서 일관성이 깨집니다.

# Findings

- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx` 에서 `statusMap` 은 `"정상" -> "NORMAL"` 같은 역매핑을 정의합니다.
- 같은 파일의 테이블 렌더링은 `statusMap[member.membershipOperationalStatus] || member.membershipOperationalStatus` 를 출력합니다.
- `MemberSummary.membershipOperationalStatus` 타입은 이미 한국어 값(`"정상" | "홀딩중" | "만료임박" | "만료" | "없음"`)을 사용합니다.
- 즉 현재 렌더링은 API/타입이 가진 operator-facing 라벨을 코드형 영문 텍스트로 퇴행시키고 있습니다.

# Proposed Solutions

## Option 1: 역매핑을 제거하고 원래 한국어 상태값을 그대로 렌더링

### Pros
- 가장 단순하고 현재 제품 방향과 맞습니다.
- 타입 정의와 UI 출력이 일치합니다.

### Cons
- 영문 코드가 필요한 다른 용도가 있다면 별도 분리해야 합니다.

### Effort
Small

### Risk
Low

## Option 2: 화면 표시용 별도 label map을 한국어 기준으로 재정의

### Pros
- 추후 copy 변경 시 중앙에서 관리할 수 있습니다.

### Cons
- 현재 문제에 비해 구조가 조금 더 큽니다.

### Effort
Small

### Risk
Low

# Recommended Action

`membershipOperationalStatus`는 이미 operator-facing 한국어 값이므로 역매핑을 제거하고 원래 값을 그대로 렌더링한다. 회귀 방지용 컴포넌트 테스트를 추가해 영문 코드 노출이 다시 생기지 않도록 고정한다.

# Technical Details

- Affected file:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx`
- Related type:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts`

# Acceptance Criteria

- [x] members list의 "운영 상태" 컬럼이 한국어 상태값으로 유지된다.
- [x] `membershipOperationalStatus` 타입과 실제 UI 출력이 일치한다.
- [x] 같은 종류의 역변환 map이 불필요하면 제거된다.

# Work Log

### 2026-03-19 - Review Finding Created

**By:** Codex

**Actions:**
- `MemberListSection.tsx` 의 상태 badge 렌더링 경로를 확인했습니다.
- 이미 한국어 타입을 가진 `membershipOperationalStatus`가 영문 코드로 다시 변환돼 출력되는 것을 확인했습니다.

**Learnings:**
- 이 파일은 리팩터링 이전에 사용자 노출 copy 회귀를 먼저 바로잡아야 합니다.

### 2026-03-19 - Korean Status Rendering Restored

**By:** Codex

**Actions:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx` 에서 영문 역변환 `statusMap` 을 제거하고 `membershipOperationalStatus` 를 그대로 렌더링하도록 수정했습니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.test.tsx` 를 추가해 `홀딩중`이 그대로 노출되고 `HOLDING` 이 보이지 않는지 고정했습니다.

**Learnings:**
- 타입이 이미 operator-facing label을 갖고 있다면, 화면에서 다시 code-like string으로 변환하지 않는 편이 안전합니다.

# Resources

- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx`
