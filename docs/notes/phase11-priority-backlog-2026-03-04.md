# Phase11 Priority Backlog (Next 2 Sprints)

Date: 2026-03-04  
Source: `docs/notes/phase11-fr-traceability-baseline-2026-03-04.md`

## Goal

- Sprint 11-1: LKR/SAL 기초 도메인 도입 + 기존 핵심 흐름 회귀 안전성 확보
- Sprint 11-2: CRM baseline + RSV/ACC 미완 필수항목 보강

## Sprint 11-1 (Foundation)

### P1

1. LKR 도메인 스키마/엔티티/API 기초
- Target FR: `FR-LKR-001`, `FR-LKR-002`, `FR-LKR-003`
- Deliverables:
  - locker/assignment/refund 최소 테이블
  - 조회/배정/반납 API
  - 프론트 최소 작업 화면
- Done when:
  - 라커 배정-반납 E2E 통합 테스트 통과

2. SAL 기초 집계 API
- Target FR: `FR-SAL-001`, `FR-SAL-002`, `FR-SAL-003`, `FR-SAL-004`
- Deliverables:
  - 기간/상품/결제수단 집계 쿼리
  - 환불/취소 반영 순매출 계산
  - CSV/엑셀 export 초안
- Done when:
  - 월간 집계 결과가 샘플 데이터 검증 쿼리와 일치

### P2

3. Phase11 observability 패널 확장
- 신규 LKR/SAL API를 SLO 대시보드/체크리스트에 포함

4. FR 추적 매트릭스 자동 갱신 스크립트(선택)
- PR 메타데이터에서 FR ID 누락 탐지

## Sprint 11-2 (Operational Expansion)

### P1

1. CRM messaging baseline
- Target FR: `FR-CRM-001`, `FR-CRM-004`, `FR-CRM-005`
- Deliverables:
  - 만료 임박 이벤트 생성 + 큐 적재
  - 템플릿 관리 최소 API
  - 발송 이력 조회 API/화면
- Done when:
  - 큐 실패 -> DLQ -> 재처리(runbook) 검증 완료

2. RSV/ACC 필수 미완 보강
- Target FR: `FR-RSV-006`, `FR-RSV-009`, `FR-ACC-005`
- Deliverables:
  - 대기 자동 전환
  - 예약 알림 발송 트리거
  - 비정상 출입 알림 트리거

### P2

3. 스케줄 등록 API 보강
- Target FR: `FR-RSV-001`, `FR-RSV-002`

4. 권한 확장 매트릭스 반영
- `ROLE_CENTER_MANAGER`, `ROLE_TRAINER` 도입 준비

## Dependency Graph

- LKR foundation -> CRM 만료/연장 메시지 시나리오
- SAL 집계 foundation -> 운영 대시보드 및 경영 리포트
- 큐/이벤트 기반(CRM, RSV 알림, ACC 알림) 공통화 -> DLQ/runbook 단일화

## Risks and Mitigation

- Risk: 범위 과다(라커+정산+CRM 동시 추진)
  - Mitigation: Sprint 11-1은 LKR/SAL의 "기초 CRUD+집계"만 고정
- Risk: 이벤트 처리 중복/누락
  - Mitigation: idempotency key + outbox + DLQ redrive 절차 선적용
- Risk: 문서/코드 진행률 불일치
  - Mitigation: PR 마다 FR ID/증빙 링크 의무화

## Exit Criteria

- Sprint 11-1 종료 시:
  - LKR 최소 흐름 운영 시연 가능
  - SAL 기본 리포트 수치 검증 가능
- Sprint 11-2 종료 시:
  - CRM baseline 발송/이력/실패복구 경로 확인
  - RSV/ACC 필수 미완 항목 최소 2건 이상 Complete 전환
