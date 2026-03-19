---
status: complete
priority: p2
issue_id: "098"
tags: [code-review, frontend, quality, testing, localization]
dependencies: []
---

# Problem Statement

최근 프론트엔드 한국어화 변경으로 사용자 노출 문구와 접근성 라벨이 바뀌었지만, 관련 테스트 계약이 함께 갱신되지 않아 현재 `frontend` 테스트 스위트가 red 상태입니다. 이 상태가 유지되면 이후 실제 회귀와 단순 문구 변경에 의한 실패를 구분하기 어려워지고, 브랜치 품질 신호가 무너집니다.

# Findings

- `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` 실행 결과 31개 파일 중 4개 테스트 파일, 7개 테스트가 실패했습니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.test.tsx`
  - 권한 제한 안내문과 placeholder가 실제 구현의 한국어 문구와 어긋난 테스트가 남아 있습니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.test.tsx`
  - 권한 제한 문구 expectation이 실제 구현의 문구와 다릅니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.test.tsx`
  - 권한 제한 안내문 expectation이 실제 구현과 다릅니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.test.tsx`
  - 닫기 버튼 접근성 이름 expectation이 실제 구현의 한국어 라벨과 다릅니다.

# Proposed Solutions

## Option 1: 테스트 expectation을 현재 한국어 UI 계약에 맞춰 일괄 갱신

### Pros
- 가장 빠르게 CI를 green으로 복구할 수 있습니다.
- 실제 사용자 노출 문구와 테스트 계약이 다시 일치합니다.

### Cons
- 문구가 다시 바뀌면 동일한 종류의 수정이 반복됩니다.

### Effort
Small

### Risk
Low

## Option 2: 일부 assertion을 role/semantic query 중심으로 재작성

### Pros
- 단순 문구 수정에 덜 취약한 테스트로 바꿀 수 있습니다.
- 접근성 계약을 함께 검증할 수 있습니다.

### Cons
- 테스트 리라이트 범위가 Option 1보다 넓습니다.
- 화면별로 어떤 문구를 여전히 고정해야 하는지 판단이 필요합니다.

### Effort
Medium

### Risk
Low

## Option 3: localization key 또는 shared copy constant를 도입해 테스트와 화면이 동일 소스를 참조하게 정리

### Pros
- 장기적으로 가장 일관된 계약을 만들 수 있습니다.

### Cons
- 현재 문제에 비해 과한 구조 변경일 수 있습니다.
- 단기 복구보다 비용이 큽니다.

### Effort
Large

### Risk
Medium

# Recommended Action

테스트 expectation을 현재 한국어 UI 계약과 접근성 라벨에 맞춰 갱신하고, 문구에 과도하게 결합된 assertion은 일부 더 안정적인 요소로 전환합니다.

# Technical Details

- Affected test files:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.test.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.test.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.test.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.test.tsx`
- Verification command:
  - `cd /Users/abc/projects/GymCRM_V2/frontend && npm test`

# Acceptance Criteria

- [x] `npm test`가 green 상태로 복구된다.
- [x] 한국어화된 실제 UI 문구와 테스트 expectation이 일치한다.
- [x] 접근성 라벨 관련 테스트는 구현 계약과 동일한 언어를 사용한다.
- [x] 문구 변경에 과도하게 취약한 assertion은 필요한 범위에서 semantic query로 정리된다.

# Work Log

### 2026-03-19 - Review Finding Created

**By:** Codex

**Actions:**
- 현재 워크트리 기준으로 `frontend` 테스트 스위트를 실행했습니다.
- 한국어 UI 변경 이후 stale expectation 때문에 7개 테스트가 실패하는 것을 확인했습니다.
- 관련 파일과 대표적인 mismatch 지점을 확인해 코드리뷰 finding으로 문서화했습니다.

**Learnings:**
- 이번 브랜치의 주된 품질 문제는 런타임 회귀보다 localization 이후 테스트 계약이 따라오지 못한 점입니다.

### 2026-03-19 - Localization Test Contract Restored

**By:** Codex

**Actions:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.test.tsx`에서 권한 제한 문구, placeholder expectation, 무의미한 빈 컨텍스트 문구 assertion을 현재 UI 계약에 맞게 조정했습니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.test.tsx`와 `/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.test.tsx`의 권한 제한 안내문 expectation을 실제 구현 문구로 맞췄습니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.test.tsx`에서 닫기 버튼 접근성 이름 expectation을 `모달 닫기`로 갱신했습니다.
- `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` 와 `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` 를 실행해 green 상태를 확인했습니다.

**Learnings:**
- 한국어화 작업 이후에는 copy 변경과 테스트 계약 갱신을 같은 변경 단위로 묶어야 테스트 신호가 유지됩니다.

# Resources

- Review context: current branch on `/Users/abc/projects/GymCRM_V2`
- Verification output: `cd /Users/abc/projects/GymCRM_V2/frontend && npm test`
