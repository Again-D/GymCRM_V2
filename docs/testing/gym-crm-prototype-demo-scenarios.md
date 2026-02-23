# Gym CRM Prototype Demo Scenarios

- Date: 2026-02-23
- Scope: Phase 1 ~ Phase 3 prototype (관리자 포털 only, no-auth, 외부 연동 없음)
- Audience: 내부 데모 / QA / 계획 검증

## Demo Goal

- 핵심 데스크 업무 프로토타입이 실제로 동작함을 보여준다.
- 회원/상품 CRUD와 회원권 구매/홀딩/해제/환불 플로우를 한 화면에서 검증한다.
- 프로토타입 제약(no-auth, 외부연동 없음)을 명확히 설명한다.

## Environment Setup (Required)

### 1. Dev DB (Docker)

```bash
cd /Users/abc/projects/GymCRM_V2
docker compose up -d postgres
```

Expected:
- `gymcrm-postgres` 컨테이너 `healthy`
- `localhost:5433` 포트 노출

### 2. Backend (dev profile)

```bash
cd /Users/abc/projects/GymCRM_V2/backend
SPRING_PROFILES_ACTIVE=dev \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev \
DB_USERNAME=gymcrm \
DB_PASSWORD=gymcrm \
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local \
./gradlew bootRun --no-daemon
```

Expected:
- Spring Boot startup 성공
- Flyway `Schema ... is up to date` 또는 신규 마이그레이션 적용 로그
- `http://127.0.0.1:8080/api/v1/health` 응답 가능

### 3. Frontend

```bash
cd /Users/abc/projects/GymCRM_V2/frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Expected:
- Vite ready
- `http://127.0.0.1:5173` 접속 가능

## Prototype Constraints (Demo Script에 반드시 언급)

- 인증/인가:
  - `dev/staging`에서만 no-auth 허용
  - `prod`에서는 no-auth 강제 차단
- 외부 연동:
  - PG / QR게이트 / 알림톡 미연동 (수기 처리 가정)
- 회원 채널:
  - 관리자 포털만 제공 (회원 모바일 웹 없음)
- 식별자:
  - 프로토타입은 숫자 PK 중심

## Shared Test Data Naming Rule (Recommended)

데모 중 중복 충돌을 피하기 위해 suffix를 붙인다.

- 예시 suffix: `HHMMSS` (`date +%H%M%S`)
- 회원명 예시: `P4데모회원-224835`
- 연락처 예시: `010-9224-8350`
- 상품명 예시: `P4데모기간제-224835`

## Scenario A (3~5 min): 발표용 핵심 데모

목표:
- 짧은 시간에 “실제 업무 플로우가 이어진다”를 보여준다.

### A-1. 회원 등록 (빠른 확인)

입력값:
- 회원명: `P4데모회원-<suffix>`
- 연락처: `010-9<suffix 앞 3자리>-<suffix 뒤 4자리>`
- 상태: `ACTIVE` (기본값)

기대결과:
- 상단 목록에 신규 회원 row 추가
- 우측 상세 패널에 신규 회원 상세 자동 표시
- 성공 메시지 표시

### A-2. 상품 등록 (기간제 + 홀딩 허용)

탭 이동:
- `상품 관리`

입력값:
- 상품명: `P4데모기간제-<suffix>`
- 카테고리: `MEMBERSHIP`
- 유형: `DURATION`
- 가격: `120000`
- 유효일수: `30`
- 홀딩 허용: 체크(기본값)
- 최대 홀딩일: `30`
- 최대 홀딩횟수: `1`
- 상태: `ACTIVE`

기대결과:
- 상품 목록에 신규 상품 row 추가
- 상품 상세 패널 동기화
- 성공 메시지 표시

### A-3. 회원권 구매

탭 이동:
- `회원 관리`
- 방금 생성한 회원 선택

입력값:
- 상품 선택: `P4데모기간제-<suffix>`
- 시작일: 기본값(오늘)
- 결제수단: `CASH` (기본값)

기대결과:
- 구매 계산 미리보기 표시
- `회원권 구매 확정` 성공
- `회원권 목록 (이번 세션 생성분)`에 row 추가
- `결제 이력 (이번 세션 생성분)`에 `PURCHASE` row 추가

### A-4. 환불 미리보기 + 환불 확정 (데모 임팩트)

회원권 row 액션에서:
- `환불 미리보기` 클릭
- 금액 분해(기준금액/사용분/위약금/환불액) 확인 후 `환불 확정`

기대결과:
- 회원권 상태 `REFUNDED`
- `환불 불가 상태입니다...` 메시지 표시
- 결제 이력에 `REFUND` row 즉시 추가

발표 포인트:
- “구매/환불 결제 이력이 즉시 반영됨”
- “환불 정책 계산값이 UI에서 미리보기/확정으로 일관되게 보임”

## Scenario B (10 min): 상세 검증 데모

목표:
- 회원/상품 CRUD + 구매/홀딩/해제/환불 전체를 검증한다.

### B-0. 사전 준비

- 브라우저에서 `http://127.0.0.1:5173` 접속
- 새 suffix 생성 (`date +%H%M%S`)
- 아래 이름 규칙 사용
  - 회원: `P4상세회원-<suffix>`
  - 상품: `P4상세기간제-<suffix>`

### B-1. 회원 CRUD

1. 회원 등록
   - 입력: 회원명/연락처
   - 기대: 목록 추가 + 상세 동기화
2. 회원 수정
   - 회원명에 `-수정` suffix 추가
   - 기대: 목록/상세 동기화, 성공 메시지
3. 예외 케이스(선택)
   - 동일 연락처로 신규 등록 시도
   - 기대: `409 CONFLICT` 기반 오류 메시지 표시

### B-2. 상품 CRUD

1. 상품 등록 (`DURATION`, 홀딩 허용)
2. 상품 수정
   - 가격 또는 설명 변경
   - 기대: 목록/상세 동기화
3. 상태 토글 (선택)
   - `ACTIVE -> INACTIVE -> ACTIVE`
   - 기대: 상태 반영 및 성공 메시지

### B-3. 회원권 구매

1. 회원 상세에서 방금 만든 상품 선택
2. 구매 계산 미리보기 확인
   - `시작일`, `만료일`, `청구금액`
3. 구매 확정

기대결과:
- 회원권 row 생성 (`ACTIVE`)
- 결제 이력 `PURCHASE` row 생성

### B-4. 홀딩

입력값:
- 홀딩 시작일: 오늘
- 홀딩 종료일: 오늘 (1일 홀딩)

동작:
- `홀딩` 클릭

기대결과:
- 상태 `ACTIVE -> HOLDING`
- 액션 UI가 `홀딩 해제` 모드로 전환
- 안내 메시지: `회원권 홀딩이 완료되었습니다.`

### B-5. 해제

입력값:
- 해제일: 오늘

동작:
- `홀딩 해제` 클릭

기대결과:
- 상태 `HOLDING -> ACTIVE`
- 만료일 +1일 증가 (예: `2026-03-24 -> 2026-03-25`)
- 안내 메시지: `회원권 홀딩 해제가 완료되었습니다.`

### B-6. 환불 미리보기/확정

1. `환불 미리보기` 클릭
2. 계산값 확인:
   - 기준금액
   - 사용분
   - 위약금(10%)
   - 환불액
3. `환불 확정` 클릭

기대결과:
- 상태 `REFUNDED`
- 액션 영역에 환불 불가 메시지 표시
- 결제 이력에 `REFUND` row 추가
- `PURCHASE`/`REFUND` 두 row가 동일 회원권 ID에 연결

### B-7. 화면 기반 정합성 확인 (빠른 확인)

회원 상세 기준 체크:
- 회원권 row 상태/만료일/메시지 확인
- 결제 이력 row 2건 (`PURCHASE`, `REFUND`) 확인

### B-8. SQL 정합성 확인 (선택, 기술 데모용)

```bash
docker exec gymcrm-postgres psql -U gymcrm -d gymcrm_dev -c \
"SELECT payment_id, membership_id, payment_type, payment_status, amount \
 FROM payments WHERE member_id=<member_id> ORDER BY payment_id DESC LIMIT 5;"
```

기대결과:
- `PURCHASE`, `REFUND` 둘 다 존재
- 환불 금액이 UI 표시값과 일치

## Demo Troubleshooting (Common)

### 1. 구매 버튼이 비활성화됨

확인:
- 상품 선택이 되었는지
- 백엔드(`:8080`)가 실행 중인지
- 프론트 콘솔/네트워크 오류 존재 여부

### 2. CORS 오류 발생

확인:
- 백엔드가 `dev` 또는 `staging` 프로필로 실행 중인지
- 프론트 주소가 `127.0.0.1:5173`인지

### 3. DB 연결 실패

확인:
- `docker compose up -d postgres`
- `docker ps`에서 `gymcrm-postgres` 상태 `healthy`

### 4. no-auth 차단으로 기동 실패

원인:
- `prod` 프로필 + no-auth 활성화 조합

조치:
- 데모는 반드시 `SPRING_PROFILES_ACTIVE=dev`

## Demo Wrap-up Script (30 sec)

- “프로토타입 범위 내 핵심 데스크 업무(회원/상품/회원권 구매·홀딩·환불)가 관리자 포털에서 동작함을 확인했습니다.”
- “외부 연동/회원앱/권한 세분화는 제외했지만, 데이터 모델/상태전이/트랜잭션은 다음 단계 확장이 가능하도록 구성했습니다.”

