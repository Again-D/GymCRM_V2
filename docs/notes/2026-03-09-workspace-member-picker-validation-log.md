# Workspace Member Picker Validation Log

- Date: 2026-03-09
- Scope: 회원권 업무/예약 관리 워크스페이스 내부 회원 선택 UI 브라우저 검증
- Environment:
  - Backend: Spring Boot `dev` profile (`8080`, prototype no-auth)
  - Frontend: Vite dev server (`127.0.0.1:5173`)
  - DB: Docker PostgreSQL (`5433`)
  - Browser automation: `agent-browser`

## Executed Scenarios

### 1. 회원권 업무 직접 진입 시 탭 내부 회원 선택

- PASS: 사이드바 `회원권 업무` 직접 진입 시 기존 "회원 선택 필요" 플레이스홀더 대신 탭 내부 회원 검색 입력과 단일 선택 리스트가 노출됨
- PASS: 회원 검색 결과에서 회원 선택 후 회원권 구매 패널/선택 회원 요약 패널로 전환됨
- PASS: 기존 회원관리 액션 없이도 회원권 업무 시작 가능

### 2. 회원권 업무에서 회원 변경 시 picker 재진입

- PASS: 선택 회원 상태에서 `회원 변경` 버튼 노출 확인
- PASS: `회원 변경` 클릭 시 동일 탭 안에서 picker UI 재노출 확인
- PASS: 다른 회원 선택 후 업무 패널로 복귀 확인

### 3. 예약 관리에서 회원 변경 시 picker 재진입

- PASS: 예약 관리 탭에서 `회원 변경` 클릭 시 탭 내부 회원 검색 입력과 단일 선택 리스트 노출 확인
- PASS: 예약 생성 패널 대신 picker UI가 우선 표시되어 컨텍스트 전환 흐름이 명확함

### 4. 업무 탭 검색 상태가 회원관리 탭 상태를 오염시키지 않는지 확인

- PASS: 예약 관리 직접 진입 화면에서 검색 입력(`cab91e02`) 후 `회원 관리 열기`로 이동
- PASS: 회원 관리 탭의 `이름 검색`, `연락처 검색` 입력이 모두 빈 상태로 유지됨
- PASS: 업무 탭 전용 검색 입력 상태가 members workspace 전역 검색 입력으로 전파되지 않음

### 5. 입력 중 회원 변경 시 예약 폼 초기화 확인

- PASS: 예약 관리 탭에서 회원 선택 후 예약 메모에 임시 값(`reset-me`) 입력
- PASS: `회원 변경` 후 다른 회원 선택 시 예약 생성 패널로 정상 복귀
- PASS: 새 회원 컨텍스트의 `메모(선택)` 필드가 빈 상태로 초기화됨

## Not Fully Verified Yet

- 모바일 좁은 화면 레이아웃 검증
- 회원권 업무 구매 폼의 각 입력 필드에 대한 초기화 항목별 수동 확인

## Evidence

- Screenshot:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/workspace-member-picker-reservations.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/workspace-member-picker-reservations-picker.png`

## Notes

- 이번 검증은 prototype/no-auth 모드 기준으로 수행했다. 직접 진입 흐름과 탭 내부 선택 UI 검증에는 충분하지만, JWT/RBAC 회귀는 별도 확인이 필요하다.
- `agent-browser` 실행 경로는 프로젝트 로컬 바이너리(`/Users/abc/projects/GymCRM_V2/.tooling/bin/agent-browser`)를 사용했다.
