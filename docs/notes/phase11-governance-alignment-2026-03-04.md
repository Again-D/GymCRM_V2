# Phase 11 Governance Alignment (Architecture / RBAC / Document Ops)

작성일: 2026-03-04
범위: Phase 11-A ~ 11-D 결과를 운영 가능한 기준으로 정렬

## 1) 아키텍처 원칙 정렬 근거

| Domain | 구현 결과 | 아키텍처 원칙 정렬 |
|---|---|---|
| Locker (11-B) | 슬롯/배정/반납 API + DB 제약 + 통합 테스트 | 무결성 제약을 DB에 고정해 도메인 규칙을 애플리케이션 로직 밖에서도 강제 (SRP + 안정성 우선) |
| Settlement (11-B) | SAL 기본 리포트(기간/상품/결제수단/순매출) | 조회 책임 분리 및 필터 검증으로 리포트 경계 명확화 (SRP/ISP) |
| CRM (11-C) | dedupe key + retry/dead 전이 + 이력 API | idempotency 키 기반 중복 방지, 실패 상태 가시화 (OCP: 발송 채널 교체 가능) |
| External Readiness (11-D) | PG/알림톡/SMS/QR 어댑터 계약 + sandbox 주입 테스트 | 인터페이스 우선 설계로 벤더 교체/활성화 분리 (DIP/OCP), 실패 경로 표준화 |

결론:
- Phase 11 구현은 "도메인 로직", "외부 연동 경계", "운영 관측"을 분리하여 확장 시 기존 코드 수정 범위를 최소화하는 방향으로 정렬됨.

## 2) 역할/권한 확장 전략 (ADMIN -> 다중 역할)

현재 기준:
- 운영 역할: `ROLE_CENTER_ADMIN`, `ROLE_DESK`
- 정책 원칙: RBAC(권한) + center scope(테넌트 경계) 동시 적용

확장 목표 역할:
- `ROLE_CENTER_MANAGER`: 운영 관리(정산/리포트/승인)
- `ROLE_TRAINER`: 수업/예약 제한적 접근

공통 기준 (API/프론트 동시 적용):
1. 백엔드 권한이 source of truth
- API는 `@PreAuthorize` 기반 역할 허용 목록을 우선 정의
- 프론트는 동일 매트릭스에 따라 버튼/탭 가시성만 제어하고, 최종 차단은 API `403`으로 보장

2. 권한 확장 단위는 "기능 묶음" 기준
- membership, reservation, access, locker, settlement, crm 단위로 role matrix 관리

3. 확장 시 필수 검증
- RBAC 통합 테스트(허용/거부)
- 프론트 UX 노출 규칙(숨김/비활성)과 API 결과 일치 확인

4. 금지 규칙
- role만 통과하고 center scope 검증을 생략하는 접근 금지

## 3) 문서 상태 동기화 운영 규칙

대상 문서 묶음:
- Plan: `docs/plans/*.md`
- TODO: `todos/*.md`
- Validation log: `docs/notes/*validation-log*.md`
- Ops checklist / release decision: `docs/observability/*.md`

운영 규칙:
1. 체크박스 단일 소스
- 완료 상태는 plan/todo를 같은 PR에서 함께 갱신

2. 상태 전이 규칙
- `in-progress` TODO -> `complete` TODO 파일명 전환
- plan의 동일 항목 `[ ] -> [x]` 동기 반영

3. 근거 연결 규칙
- 각 완료 항목은 최소 1개 근거 파일(테스트 로그/검증 로그/체크리스트) 링크를 남김

4. 릴리스 전 검증
- PR 본문에 `Post-Deploy Monitoring & Validation` 섹션 필수
- 운영 영향이 없더라도 "없음" 사유 명시

## 4) 즉시 적용 판정

- 아키텍처 원칙 정렬: 충족
- 역할/권한 확장 전략 문서화: 충족
- 문서 상태 동기화 규칙 운영 기준: 충족
- CRM idempotency + 중복 방지 규칙 문서/코드 반영: 충족
- DLQ 모니터링 지표 체크리스트 반영: 충족
