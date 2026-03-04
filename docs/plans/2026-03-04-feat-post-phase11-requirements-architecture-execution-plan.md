---
title: feat: Post-Phase11 Requirements-Architecture Execution Plan
type: feat
status: active
date: 2026-03-04
origin: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md
---

# feat: Post-Phase11 Requirements-Architecture Execution Plan

## Overview

Found brainstorm from 2026-02-23: gym-crm-product. Using as foundation for planning.

Phase11(라커/정산기초/CRM기초/외부연동리드니스) 완료 이후, 요구사항 분석서(`docs/01_요구사항_분석서.md`)와 시스템 아키텍처 설계서(`docs/02_시스템_아키텍처_설계서.md`) 기준으로 남은 Must 항목과 운영 전환 항목을 실행 가능한 단계로 정리한다.

핵심 방향은 기존 결정(도메인 코어 우선 + 외부연동 단계 활성화)을 유지한다 (see brainstorm: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md).

## Problem Statement / Motivation

현재 상태:
- Phase11-D까지의 기초 구현은 완료됨
- 하지만 요구사항 Must 항목에는 아직 미구현/부분구현 영역이 남아 있음
  - ACC Dynamic QR/게이트 실연동
  - SAL 고급 정산(트레이너 급여, 대시보드, 엑셀/PDF 등)
  - CRM 확장 자동화(생일/이벤트/수신거부/템플릿)
  - NFR 보안/컴플라이언스(PII 암호화, 감사로그 강화)

이 상태를 방치하면
- 요구사항 대비 기능 커버리지 정체
- 문서/코드 불일치 재발
- 운영 전환 리스크 증가(실연동/보안/관측성)

## Research Summary

### Local repo findings
- Phase11 로드맵이 `completed`로 종료됨: `docs/plans/2026-03-03-feat-phase11-requirements-architecture-aligned-expansion-roadmap-plan.md`
- 구현 증빙 존재:
  - 11-B: `LockerServiceIntegrationTest`, `SalesSettlementReportServiceIntegrationTest`
  - 11-C: `CrmMessageServiceIntegrationTest`
  - 11-D: `ExternalIntegrationReadinessServiceIntegrationTest`
- institutional learnings:
  - 정책-DB제약-서비스-UI-테스트 정렬 중요 (`docs/solutions/database-issues/*`)
  - 문서 상태 드리프트는 즉시 동기화 필요 (`docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`)

### Requirements/architecture signals
- 요구사항 Must 중심 잔여 후보:
  - ACC: FR-ACC-001~005 (Dynamic QR, 게이트 실인증, 출입 모니터링)
  - SAL: FR-SAL-001~006 (대시보드, 트레이너 정산)
  - CRM: FR-CRM-002~006 (생일/이벤트/템플릿/수신거부)
- 아키텍처 문서에 이미 모듈/인터페이스/역할 모델이 정의되어 있어 구현은 확장형으로 가능

### External research decision
- 이번 계획은 기존 문서/코드 패턴 위의 확장 실행 계획 수립이므로 외부 리서치는 생략한다.
- 단, 실벤더 활성화 직전(Phase13)에는 벤더 최신 가이드 재검증을 별도 작업으로 강제한다.

## SpecFlow Analysis

### Primary user flows to complete
1. 회원 모바일 Dynamic QR 발급 -> 키오스크 스캔 -> 실시간 출입 인증/거부
2. 기간/상품/결제수단 매출 + 트레이너 수업 집계 -> 월 정산서 생성
3. CRM 템플릿 관리 -> 세그먼트 발송 -> 수신거부 정책 준수
4. 외부 연동 장애 -> 재시도/폴백/DLQ -> 운영자 조치

### Edge cases
- QR 재사용/만료/오프라인 게이트 fallback
- 정산 집계 시 환불/취소 시점 불일치
- CRM 대량 발송 시 중복 발송 및 수신거부 누락
- 실연동 전환 시 타임아웃/5xx 급증과 보상 트랜잭션 충돌

### SpecFlow decisions
- 모든 확장 Phase는 "기능 + 통합테스트 + 운영검증로그" 3요건 충족 시 완료
- 권한 확장 시 API/프론트 행렬 동시 갱신을 acceptance criteria로 고정

## Proposed Solution

Phase12~13을 다음 5개 실행 트랙으로 진행한다.

1. ACC 실전형 출입 트랙
- Dynamic QR 발급/검증(회전 토큰, 만료 정책)
- QR 게이트 연동 API 및 거부 사유 표준화
- 출입 현황/비정상 출입 알림 운영 화면

2. SAL 고급 정산 트랙
- 매출 대시보드(오늘/월 누적/신규/만료예정)
- 트레이너 수업 횟수 집계 및 급여 정산
- 정산 리포트 export(엑셀/PDF) 및 마감 흐름

3. CRM 자동화 확장 트랙
- 생일/이벤트/장기미방문 자동 트리거
- 템플릿/예약발송/수신거부 정책
- 발송 이력 검색/재처리 운영 기능

4. External Activation 트랙
- Sandbox -> Staging -> Production 단계 전환 runbook
- 벤더별 circuit breaker/retry 정책 확정
- 장애 drill 및 보상 트랜잭션 운영 리허설

5. Security & Compliance 트랙
- PII 암호화 저장(연락처/생년월일 등)
- 감사로그 보존/조회 기준 강화
- 권한 행렬 확장(`ROLE_MANAGER`, `ROLE_TRAINER`) 및 center scope 강제

## Technical Approach

### Architecture
- 모듈형 모놀리스 유지 (`access`, `settlement`, `crm`, `integration`, `common`)
- 외부연동은 adapter 계약 + feature flag로 단계 활성화
- 메시지/연동 경로는 idempotency key + 처리이력 고정

### Implementation Phases

#### Phase 12-A: ACC Dynamic QR + Gate Integration Foundation (1~2주)
- Deliverables:
  - Dynamic QR 토큰 정책/검증 서비스
  - 게이트 검증 API + 실패 코드 맵
  - 통합 테스트(만료/재사용/오프라인)
- Success criteria:
  - FR-ACC-001/002/003 커버 + 004/005 구현 준비 산출물(모니터링 이벤트/알림 규격) 확보
- Quality gates:
  - 재사용 방지/만료 검증 통과
  - 게이트 타임아웃 장애 주입 테스트

#### Phase 12-B: SAL Advanced Settlement (1~2주)
- Deliverables:
  - 매출 대시보드 + 트레이너 정산 집계
  - 정산서 export(PDF/엑셀 최소 1종)
  - 정산 검증 로그/운영 체크리스트
- Success criteria:
  - FR-SAL-001~006 커버
- Quality gates:
  - 월말 경계/환불 반영 통합 테스트

#### Phase 12-C: CRM Extended Automation (1~2주)
- Deliverables:
  - 생일/이벤트/세그먼트 발송
  - 템플릿/수신거부/예약발송
  - 대량발송 재시도/DLQ 운영 지표
- Success criteria:
  - FR-CRM-002~006 커버
- Quality gates:
  - 수신거부 정책 위반 0건
  - 중복발송 방지 통합 테스트

#### Phase 12-D: ACC Monitoring & Alert Completion (1주)
- Deliverables:
  - 출입 현황 모니터링 뷰/집계 API(FR-ACC-004)
  - 비정상 출입 탐지 규칙 + 관리자 알림 채널(FR-ACC-005)
  - ACC 운영 알림 임계치/온콜 대응 체크리스트
- Success criteria:
  - FR-ACC-004/005 커버
- Quality gates:
  - 정상/비정상 출입 이벤트 샘플 검증
  - 오탐/미탐 기준치 합의 및 스테이징 리허설 통과

#### Phase 13-A: External Activation Rollout (1주)
- Deliverables:
  - 벤더 실키 연동 전환(센터 단위 feature flag)
  - 장애 drill + rollback runbook
- Success criteria:
  - staging rehearshal 완료
- Quality gates:
  - timeout/5xx 주입 시 보상/폴백 경로 확인

#### Phase 13-B: Security/Role Expansion (1~2주)
- Deliverables:
  - PII 암호화 저장 적용
  - 감사로그 조회/보존 정책 강화
  - `ROLE_MANAGER`/`ROLE_TRAINER` 권한 매트릭스 반영(API/프론트)
  - PII 전환 runbook(prepare/backfill/cutover/rollback) + 키 관리 운영 기준
- Success criteria:
  - NFR-010/011/015 핵심 항목 충족
- Quality gates:
  - 권한 우회 회귀 테스트
  - center scope 누락 0건
  - 암호화 전환 리허설(샘플센터) 통과

##### Phase 13-B Migration & Key Management Plan
- Scope(대상 컬럼): `member_phone`, `member_birth_date` 우선 적용 후 추가 PII 확장
- Prepare:
  - 신규 암호화 컬럼/키 식별자(`key_version`) 추가, 애플리케이션 dual-write 준비
  - KMS 키 권한 분리(암호화/복호화 역할 분리) 및 접근 감사 로깅 활성화
- Backfill:
  - 배치로 평문 -> 암호문 이관(센터 단위 throttling), 실패 레코드 DLQ 적재
  - 검증 쿼리로 누락/불일치 0건 확인 후 다음 배치 진행
- Cutover:
  - 읽기 경로를 encrypted-first + plaintext fallback으로 전환(dual-read window 1주)
  - 안정화 후 plaintext read 차단, 쓰기는 encrypted-only 전환
- Rollback:
  - 장애 임계치(복호화 실패율, API 오류율) 초과 시 feature flag로 즉시 plaintext read 재활성화
  - backfill 중단 + 영향 범위 센터 격리 + 키 버전 고정
- Key rotation:
  - 분기 1회 키 로테이션(신규 write는 최신 키 버전, 기존 데이터는 점진 재암호화)
  - 키 폐기 전 재암호화 완료율 100% 및 샘플 복호화 검증 통과 필수
- Deployment validation:
  - 쿼리: 암호화 미적용 건수/복호화 실패 건수/센터별 backfill 진행률
  - 쿼리: 감사로그 보존 정책 검증(보존기간 >= 365일), 월별 파티션/TTL 적용 상태, 만료 예정 파티션 점검
  - 로그/알림: decrypt error, key access deny, audit log 누락 이벤트 실시간 알림
  - 로그/알림: 감사로그 적재 실패율, 보존 정책 배치 실패 이벤트

## System-Wide Impact

- **Interaction graph**: User/Desk action -> API -> DB/Queue -> Worker -> External adapter -> Monitoring/Alert
- **Error propagation**: adapter exception -> domain outcome -> retry/DLQ -> operator action
- **State lifecycle risks**: 결제/출입/메시지 partial success의 보상 처리 필요
- **API surface parity**: RBAC 확장 시 API 권한과 프론트 노출 규칙 동시 갱신 필요
- **Integration test scenarios**:
  - QR 만료/재사용/중복 스캔
  - 정산 월말 경계 + 환불 동시 발생
  - CRM 발송 실패 후 재시도/DLQ
  - 실연동 장애 시 보상/폴백

### Rollback Thresholds & Owners

| Domain | Trigger Metric | Threshold | Validation Window | Primary Owner |
|---|---|---|---|---|
| ACC | 게이트 인증 실패율 | 5분 이동평균 > 2.0% | 15분 | Backend On-call |
| ACC | 게이트 timeout 비율 | 5분 이동평균 > 1.0% | 15분 | Integration On-call |
| SAL | 정산 재집계 불일치율 | 월 정산 샘플 1,000건 기준 > 0.1% | 배포 당일 +1일 | Settlement Owner |
| CRM | DLQ 누적 건수 | 누적 > 500건 또는 10분 증가율 > 50건/분 | 30분 | CRM Messaging Owner |
| CRM | 수신거부 위반 발송 | 단일 건이라도 발생 | 즉시 | CRM Messaging Owner |
| Security | 복호화 실패율 | 5분 이동평균 > 0.1% | 30분 | Security On-call |
| Security | 감사로그 적재 누락 | 민감 이벤트 누락 1건 이상 | 즉시 | Platform/Security Owner |

운영 판단 규칙:
- 임계치 초과가 validation window 동안 지속되면 해당 트랙 feature flag를 즉시 rollback한다.
- rollback 판단/실행/해제는 PR의 Post-Deploy Monitoring & Validation 섹션에 동일 임계치/오너로 기록한다.

## Acceptance Criteria

- [ ] ACC Must(001~005) 기능이 통합 테스트와 함께 구현된다.
- [ ] SAL Must(001~006) 중 대시보드/정산 핵심 흐름이 운영 검증 가능 상태가 된다.
- [ ] CRM Must(002~006) 자동화/정책(수신거부 포함)이 반영된다.
- [ ] 외부 연동 활성화 runbook과 장애 drill 기록이 남는다.
- [ ] PII 암호화 + 감사로그 + 확장 RBAC가 코드/문서에 동기화된다.
- [ ] 각 Phase 완료 시 계획/체크리스트/검증로그가 같은 PR에서 동기화된다.
- [ ] ACC Must 매핑이 `12-A(001~003) + 12-D(004~005)`로 문서화되어 완료 판정에 사용된다.
- [ ] PII 암호화 전환(dual-write/read, backfill, cutover, rollback, key rotation) 검증 기준이 운영 체크리스트로 남는다.
- [ ] ACC/SAL/CRM/Security별 rollback 임계치(수치), 검증 윈도우, 1차 오너가 문서화되어 Go/No-Go 판단 기준으로 사용된다.
- [ ] NFR-015(감사로그 1년 보존) 검증 항목(보존기간/파티션 또는 TTL/적재누락)이 배포 검증 체크리스트에 포함된다.

## Success Metrics

- FR Must 커버리지: Phase11 종료 대비 +20%p 이상
- 신규 확장 도메인 5xx (staging, 7d): < 0.5%
- 외부 연동 장애 drill MTTR: 30분 이내
- 수신거부 위반 발송 건수: 0

## Dependencies & Risks

Dependencies:
- 벤더 계약/샌드박스 계정 준비
- 보안 키관리 및 운영 관측 인프라
- 역할 정책 합의(매니저/트레이너 권한 경계)

Risks:
- 실연동 일정 지연
- 보안 요구 반영 시 데이터 마이그레이션 복잡도 증가
- 문서-코드 상태 드리프트 재발

Mitigation:
- feature flag + 센터별 순차 활성화
- 사전 migration rehearsal + rollback script
- Phase 종료 게이트에 문서 동기화 필수화

## Sources & References

### Origin
- **Origin brainstorm:** `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`

### Internal References
- `docs/01_요구사항_분석서.md`
- `docs/02_시스템_아키텍처_설계서.md`
- `docs/plans/2026-03-03-feat-phase11-requirements-architecture-aligned-expansion-roadmap-plan.md`
- `docs/notes/phase11-integration-test-coverage-2026-03-04.md`
- `docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`
- `docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
- `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`
