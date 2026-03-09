# Workspace Member Picker Validation Log

- Date: 2026-03-09
- Scope: 회원권 업무/예약 관리 워크스페이스 내부 회원 선택 UI 브라우저 검증
- Environment:
  - Backend:
    - Spring Boot `dev` profile (`8080`, prototype no-auth)
    - Spring Boot `dev + jwt` (`8080`) for role-based direct-entry regression
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

### 6. 회원권 업무에서 회원 변경 시 구매 폼 초기화 확인

- PASS: 회원권 업무 탭에서 상품, 결제금액, 회원권 메모, 결제 메모를 입력한 뒤 `회원 변경` 수행
- PASS: 다른 회원 선택 후 상품 선택값, 결제금액, 두 메모 필드가 모두 초기화됨
- PASS: 새 회원 컨텍스트 요약(`회원 ID`, `회원명`, `연락처`, `상태`)이 이전 회원 값 없이 갱신됨

### 7. 직접 진입 검색의 빠른 재조회에서도 마지막 검색 결과 유지

- PASS: 예약 관리 직접 진입 picker에서 검색어를 연속으로 `cab` → `cab91e02`로 갱신
- PASS: 최종 스냅샷에서 마지막 검색어에 대응하는 회원(`#360 요약정상-cab91e02`)만 남음
- PASS: 이전 검색어 기준 중간 결과가 잔류하지 않음

### 8. 회원 전환 직후에도 이전 데이터가 섞여 보이지 않는지 확인

- PASS: 예약 관리에서 회원 `#360` 선택 후 상세 요약 값 확인 (`360`, `요약정상-cab91e02`)
- PASS: 즉시 `회원 변경`으로 회원 `#359` 선택 후 상세 요약 값 재확인 (`359`, `요약만료-fe549087`)
- PASS: 최종 패널에서 이전 회원 요약 값이 남지 않고 새 회원 값으로만 렌더됨

### 9. 모바일 좁은 화면 레이아웃 확인

- PASS: 모바일 뷰포트(`390x844`)에서 예약 관리 직접 진입 picker를 캡처
- PASS: 사이드바/패널/picker가 단일 열로 순차 배치되어 읽기 흐름이 유지됨
- PASS: 버튼, 검색 입력, 회원 리스트가 테마 스타일을 유지한 채 세로 적층됨

### 10. JWT/RBAC 직접 진입 흐름 확인

- PASS: `ROLE_CENTER_ADMIN` (`center-admin / dev-admin-1234!`) 로그인 후 사이드바 `회원권 업무`, `예약 관리` 직접 진입 시 picker UI 노출 확인
- PASS: `ROLE_DESK` (`desk-user / desk-user-1234!`) 로그인 후 동일 직접 진입 시 picker UI 노출 확인
- PASS: 두 역할 모두 회원 미선택 상태에서 직접 진입 흐름이 막히지 않으며 기존 권한 UX와 충돌하지 않음

## Evidence

- Screenshot:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/workspace-member-picker-reservations.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/workspace-member-picker-reservations-picker.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/workspace-member-picker-mobile-reservations.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/workspace-member-picker-mobile-reservations-full.png`

## Notes

- 직접 진입/폼 초기화/상태 오염 검증은 prototype/no-auth 모드에서 수행했고, 역할 기반 직접 진입 회귀는 `dev + jwt` 모드에서 별도 확인했다.
- `agent-browser` 실행 경로는 프로젝트 로컬 바이너리(`/Users/abc/projects/GymCRM_V2/.tooling/bin/agent-browser`)를 사용했다.
