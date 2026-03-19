---
status: complete
priority: p2
issue_id: "101"
tags: [code-review, frontend, quality, members]
dependencies: []
---

# Problem Statement

`SelectedMemberSummaryCard`가 "회원권 상태"를 보여준다고 되어 있지만 실제로는 `memberStatus`를 기반으로 `활성/비활성`만 계산해 표시하고 있습니다. 회원 자체 활성 상태와 회원권 운영 상태는 다른 개념이라, 현재 UI는 운영자가 잘못된 정보를 보게 만듭니다.

# Findings

- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx` 는 `statusLabel`을 `selectedMember?.memberStatus === "ACTIVE" ? "활성" : "비활성"` 로 계산합니다.
- 같은 컴포넌트의 상세 영역 라벨은 `회원권 상태`인데, 실제 값으로는 위 `statusLabel`을 출력합니다.
- `MemberDetail` 타입(`/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts`)에는 `membershipOperationalStatus`가 없어서 현재 카드가 실제 회원권 운영 상태를 표현할 데이터 자체를 받지 못하고 있습니다.

# Proposed Solutions

## Option 1: 라벨을 `회원 상태`로 바꾸고 현재 데이터 구조를 유지

### Pros
- 가장 작은 수정으로 UI의 의미 오류를 해소합니다.

### Cons
- summary card에서 회원권 운영 상태를 보여주지는 못합니다.

### Effort
Small

### Risk
Low

## Option 2: `MemberDetail` 또는 summary source에 `membershipOperationalStatus`를 포함시켜 실제 회원권 상태를 표시

### Pros
- 카드가 members list와 같은 운영 문맥을 유지합니다.

### Cons
- API/타입/selected member loading 경로까지 확인이 필요합니다.

### Effort
Medium

### Risk
Medium

## Option 3: 카드에서 `회원 상태`와 `회원권 상태`를 분리 표시

### Pros
- 가장 정보 손실이 적습니다.

### Cons
- Option 2의 데이터 보강이 선행되지 않으면 구현할 수 없습니다.

### Effort
Medium

### Risk
Medium

# Recommended Action

현재 `SelectedMemberSummaryCard` 가 실제로 가진 데이터 의미에 맞춰 `회원 상태`를 표시하도록 라벨과 변수를 정리하고, 회귀 방지 테스트를 추가한다.

# Technical Details

- Affected file:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`
- Related type:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts`

# Acceptance Criteria

- [x] summary card에서 표시하는 상태 라벨과 실제 데이터 소스 의미가 일치한다.
- [x] `회원 상태`와 `회원권 상태`가 혼동되지 않는다.
- [x] members list와 selected member summary가 같은 용어 체계를 사용한다.

# Work Log

### 2026-03-19 - Review Finding Created

**By:** Codex

**Actions:**
- `SelectedMemberSummaryCard`와 `MemberDetail` 타입을 검토했습니다.
- 카드가 `memberStatus`를 `회원권 상태`라는 라벨 아래에 노출하고 있음을 확인했습니다.

**Learnings:**
- 현재 컴포넌트는 단순 리팩터링보다 먼저 용어/데이터 정합성 수정이 필요합니다.

### 2026-03-19 - Status Source Aligned

**By:** Codex

**Actions:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx` 에서 `statusLabel` 을 `memberStatusLabel` 로 정리하고, 상세 라벨을 `회원권 상태`에서 `회원 상태`로 변경했습니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.test.tsx` 를 추가해 상태 라벨이 올바른 의미로 노출되는지 고정했습니다.

**Learnings:**
- 현재 selected member summary는 회원권 상태 데이터가 없으므로, 문구를 데이터 의미에 맞추는 쪽이 우선입니다.

# Resources

- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`
