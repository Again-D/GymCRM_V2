# Prototype Scope Deviations (vs Full Product Design)

- Date: 2026-02-24
- Purpose: 프로토타입 구현 결과와 상위 설계 문서(요구사항/아키텍처/API/DB) 간 범위 차이를 명시해 혼선을 방지한다.
- Applies to: 현재 구현된 관리자 포털 프로토타입 (Phase 1 ~ Phase 4 준비 단계)

## 1) 한 줄 요약

현재 구현은 “전체 Gym CRM 제품”이 아니라, **관리자 포털 중심의 핵심 데스크 업무 프로토타입**이다.

- 포함: 회원/상품 CRUD, 회원권 구매/홀딩/해제/환불
- 제외: 회원 앱, 예약/출입/라커/정산/CRM, 외부 연동, JWT/RBAC

## 2) 프로토타입 범위 (확정)

### 포함 (현재 구현 범위)

- 관리자 포털 UI (단일 앱)
- 회원 관리
  - 등록 / 조회 / 상세 / 수정
- 상품 관리
  - 등록 / 조회 / 상세 / 수정 / 상태 토글
- 회원권 구매
  - 기간제/횟수제 계산
  - 결제 이력 생성 (수기 결제 기록)
- 회원권 홀딩/해제
  - 상태 전이
  - 만료일 재산정
  - 홀딩 이력 기록
- 회원권 환불
  - 미리보기/확정
  - 환불 이력 + 환불 결제 기록
  - 재환불 차단

### 제외 (프로토타입 범위 밖)

- 회원용 모바일 웹/앱
- 예약 모듈 (PT/GX)
- 출입/QR 게이트 연동
- 라커 관리
- 매출 리포트 / 트레이너 정산
- CRM 메시지 기능
- 외부 연동 (PG / 알림톡 / QR 게이트)
- JWT 로그인 / Refresh Token / RBAC 권한체계
- 멀티 센터 운영 UI/권한
- 표시용 비즈니스 ID (`MBR-...`, `PRD-...` 등)

## 3) 미구현 범위 상세 (요구 항목 명시)

다음 항목은 의도적으로 미구현 상태다.

- 예약(PT/GX)
- 출입
- 라커
- 정산
- CRM

이 항목들은 체크리스트 backlog와 후속 Phase 대상으로 관리한다.

## 4) 인증/보안: no-auth 프로토타입 모드 제한

프로토타입은 인증/인가를 축소한 no-auth 모드를 사용한다.

- 허용 환경: `dev`, `staging`
- 차단 환경: `prod`
- `prod`에서 no-auth 활성화 시 앱 기동 실패 (가드)

의미:
- 데모/개발 속도를 위해 인증 구현을 생략했지만,
- 운영 배포 오남용을 막기 위한 최소 안전장치는 유지한다.

## 5) 외부 연동 미포함 + 확장 포인트

### 현재 상태

- 실제 외부 연동 없음
  - PG 결제
  - QR 게이트
  - 알림톡

현재 구현은 “내부 업무 플로우 + 데이터 모델 + 상태 전이” 검증에 집중한다.

### 향후 확장 포인트 (의도)

- 결제: `payments` 중심으로 외부 PG 트랜잭션 식별자/상태 필드 확장
- 출입: 회원권 유효성/상태 판정 로직 재사용 + 게이트 이벤트 기록 추가
- 알림: 구매/홀딩/해제/환불 이벤트 후 async 알림 발송 훅 추가

## 6) 프로토타입 표준 (식별자/테넌트 명칭)

상위 문서 불일치 방지를 위해 프로토타입 표준을 고정한다.

- 테넌트 명칭: `center`
- API/프론트 필드명: `centerId`
- 리소스 식별자: 숫자 PK (`Long`)
- 비즈니스 표시 ID: 미포함 (`MBR-...` 등은 후속 단계)

예시:

- 회원 API path: `/api/v1/members/{memberId}` (`memberId`는 숫자)
- 상품 API response: `productId`, `centerId` 숫자값

## 7) 역할/권한 모델 차이 (설계서 대비)

설계서 장기 방향:
- `ROLE_SUPER_ADMIN`, `ROLE_CENTER_ADMIN`, `ROLE_CENTER_MANAGER`, `ROLE_TRAINER`, `ROLE_DESK`

프로토타입 현재 구현:
- 런타임 권한 분기 없음 (no-auth)
- 개념상 `ADMIN 단일 역할` 가정으로 화면/업무 플로우 검증

이 차이는 의도된 축소이며, 권한 매트릭스는 후속 단계에서 복원/세분화한다.

## 8) 환불 정책 차이 (프로토타입 고정 정책)

프로토타입은 복잡한 정책 대신 단순 고정 정책을 사용한다.

- 환불액 = `기준금액 - 사용분 - 위약금`
- 위약금 = `기준금액의 10%`
- 음수 환불액 방지: `max(0, refundAmount)`

목적:
- UI/계산/트랜잭션/이력 기록 검증
- 정책 복잡도는 후속 단계로 이연

## 9) 문서 혼선 방지 체크 (운영 규칙)

문서/대화/데모에서 아래 표현을 사용한다.

- “제품 완성” 대신 “프로토타입”
- “관리자 포털 핵심 데스크 업무 프로토타입”
- “외부 연동/인증은 제외”

금지에 가까운 표현(오해 유발):

- “전체 Gym CRM 구현 완료”
- “운영 배포 가능”
- “권한/보안 완료”

## 10) 관련 문서 (Source of Truth)

- 브레인스토밍 결정사항:
  - `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`
- 프로토타입 구현 계획:
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-plan.md`
- 프로토타입 실행 체크리스트:
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`
- 프로토타입 표준 규칙:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-canonical-rules.md`

## 11) Conclusion

현재 구현은 설계 문서의 “전체 목표” 중 일부를 고품질로 검증한 프로토타입이다.

- 범위 축소는 의도적이며 문서화됨
- 핵심 상태 전이/정합성/업무 플로우는 실동작 검증 완료
- 미구현 영역은 후속 Phase backlog로 관리
