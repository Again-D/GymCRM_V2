# Gym CRM Prototype Release Notes

- Date: 2026-02-24
- Release Type: Internal Prototype Milestone
- Status: **Completed**

## Summary

Gym CRM 관리자 포털 핵심 데스크 업무 프로토타입이 완료되었습니다.

이번 프로토타입은 아래 흐름을 실제 동작 수준으로 검증하는 데 목적이 있습니다.

- 회원 관리
- 상품 관리
- 회원권 구매
- 회원권 홀딩 / 해제
- 회원권 환불

## Delivered Scope

### Admin Portal (Web)

- 회원 등록 / 목록 / 상세 / 수정
- 상품 등록 / 목록 / 상세 / 수정 / 상태 변경
- 회원 상세에서 회원권 구매/홀딩/해제/환불 처리
- 세션 내 생성 회원권/결제 이력 표시

### Backend / Data

- Spring Boot + PostgreSQL + Flyway 기반 API
- 회원/상품/회원권/결제/홀딩/환불 테이블 및 이력 관리
- 수기 결제 기록 생성 (PG 미연동)
- 프로토타입용 no-auth 모드 (`dev/staging`만 허용, `prod` 차단)

## Key Business Rules (Prototype)

- 환불 정책: `기준금액 - 사용분 - 10% 위약금` (음수는 0원 처리)
- 홀딩 상태 회원권은 환불 불가 (먼저 해제 필요)
- 재환불 불가
- 활성 홀딩 중복 생성 방지 (DB 제약 + 서비스 보호)

## Validation Status

- 통합 시나리오 완료:
  - 회원 등록 → 상품 등록 → 구매 → 홀딩 → 해제 → 환불
- 수동 테스트 체크리스트: `PASS 17 / FAIL 0`
- 자동 테스트:
  - backend `./gradlew test` 통과
  - frontend `npm run build` 통과
- Flyway 마이그레이션:
  - `V5`까지 적용 확인

## Known Prototype Constraints

- 운영용 인증/인가(JWT/RBAC) 미구현
- 외부 연동 미구현 (PG / QR 게이트 / 알림톡)
- 회원 앱, 예약, 출입, 라커, 정산, CRM 미포함
- 단일 센터/단일 역할(`ADMIN`) 중심 프로토타입

## Recommended Next Phase

1. JWT + Refresh Token + RBAC 최소 도입
2. 공통 API 응답 표준 정렬 (`traceId`, 에러 구조)
3. 예약/출입/횟수 차감 로직 확장

## References (Detailed)

- Final handoff summary:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-final-handoff-summary.md`
- Completion readiness decision:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-completion-readiness-decision.md`
- Scope deviations / constraints:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-scope-deviations.md`
- Integrated validation log:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`
