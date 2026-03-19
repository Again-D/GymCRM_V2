---
status: complete
priority: p2
issue_id: "099"
tags: [code-review, frontend, quality, localization, browser-smoke]
dependencies: []
---

# Problem Statement

한국어화 작업 이후에도 예약/출입 화면에 사용자 노출 영어 문자열이 일부 남아 있습니다. 브라우저 스모크에서는 화면 진입과 모달 동작은 정상적이었지만, 업무 액션 버튼과 테이블 헤더에 영어 copy가 섞여 있어 한국어 운영 콘솔 일관성이 깨집니다.

# Findings

- 브라우저 스모크에서 `/reservations` 워크벤치 모달에 `CheckIn`, `Done`, `Void` 버튼이 그대로 노출됩니다.
- 코드 위치:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx:419`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx:427`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx:435`
- 브라우저/코드 확인 결과 `/access` 현재 입장 테이블 헤더도 `Member`로 남아 있습니다.
- 코드 위치:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx:262`

# Proposed Solutions

## Option 1: 잔여 영어 copy를 직접 한국어로 치환

### Pros
- 가장 빠르고 위험이 낮습니다.
- 현재 한국어 콘솔 방향과 즉시 일치합니다.

### Cons
- 다른 잔여 영어 copy가 또 숨어 있으면 추가 점검이 필요합니다.

### Effort
Small

### Risk
Low

## Option 2: 예약/출입 페이지의 visible copy를 한 번 더 전수 점검하며 정리

### Pros
- 같은 계열의 누락을 한 번에 줄일 수 있습니다.
- 브라우저 스모크와 코드 검색 결과를 함께 닫을 수 있습니다.

### Cons
- Option 1보다 범위가 조금 넓습니다.

### Effort
Medium

### Risk
Low

## Option 3: 페이지별 copy constant 또는 localization layer를 도입

### Pros
- 장기적으로는 가장 체계적입니다.

### Cons
- 현재 문제 대비 과한 구조 변경입니다.

### Effort
Large

### Risk
Medium

# Recommended Action

잔여 영어 copy를 직접 한국어로 치환하고, 테스트/빌드 및 브라우저 스모크로 실제 operator-facing 화면에서 영어 노출이 제거됐는지 확인합니다.

# Technical Details

- Affected files:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx`
- Browser smoke evidence:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/review-reservations-modal-smoke-20260319.png`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/review-memberships-create-modal-20260319.png`

# Acceptance Criteria

- [x] 예약 워크벤치 모달의 영어 액션 버튼이 한국어로 치환된다.
- [x] 출입 화면 현재 입장 테이블 헤더가 한국어로 치환된다.
- [x] `npm test`와 `npm run build`가 계속 통과한다.
- [x] affected 화면 브라우저 스모크에서 영어 copy가 더 이상 보이지 않는다.

# Work Log

### 2026-03-19 - Browser Smoke Finding Created

**By:** Codex

**Actions:**
- `VITE_REBUILD_MOCK_DATA=1 npm run dev -- --host 127.0.0.1 --port 4173` 로 로컬 서버를 띄웠습니다.
- `agent-browser`로 `/dashboard?authMode=jwt&authSession=admin`, `/memberships`, `/reservations`를 순회하고 모달을 열어 확인했습니다.
- 예약 모달에서 `CheckIn`, `Done`, `Void`가 남아 있는 것과 출입 화면 코드에 `Member` 헤더가 남아 있는 것을 확인해 review finding으로 기록했습니다.

**Learnings:**
- 테스트 green 상태만으로는 copy 누락을 모두 잡지 못하므로, localization 작업 뒤에는 브라우저 스모크가 유효합니다.

### 2026-03-19 - Korean Copy Completed

**By:** Codex

**Actions:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx` 에서 워크벤치 액션 버튼 `CheckIn`, `Done`, `Void`를 `체크인`, `완료`, `취소`로 변경했습니다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx` 에서 현재 입장 테이블 헤더 `Member`를 `회원`으로 변경했습니다.
- `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` 와 `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` 를 재실행해 green 상태를 확인했습니다.
- `agent-browser`로 `/reservations?authMode=jwt&authSession=admin` 워크벤치 모달을 다시 열어 버튼이 `체크인`, `완료`, `취소`로 노출되는 것을 확인했습니다.

**Learnings:**
- 브라우저 스모크는 테스트에서 놓친 visible copy 회귀를 잡는 데 계속 유효합니다.

# Resources

- Browser smoke session: `agent-browser --session gymcrm`
- Browser smoke artifacts:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/review-access-smoke-20260319.png`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/review-reservations-after-localization-20260319.png`
- Verification commands:
  - `cd /Users/abc/projects/GymCRM_V2/frontend && npm test`
  - `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build`
