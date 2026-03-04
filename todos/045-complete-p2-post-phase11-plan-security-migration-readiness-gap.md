---
status: complete
priority: p2
issue_id: "045"
tags: [code-review, planning, security, migration]
dependencies: []
---

# Add security migration rollout details for PII encryption plan

## Problem Statement

계획은 `PII 암호화 저장`을 목표로 제시하지만, 마이그레이션/백필/롤백/키관리(회전 포함) 실행 절차가 없다.
보안 기능은 설계만으로는 충분하지 않아 배포 실패나 데이터 접근 장애 리스크를 줄이는 운영 절차가 계획 단계에서 필요하다.

## Findings

- 계획 문서에 PII 암호화 목표는 있음:
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md:99-103, 154-160`
- 하지만 아래 항목 부재:
  - 컬럼별 대상/암호화 방식 전환 절차
  - dual-read/write 기간 정책
  - 백필 검증 쿼리 및 rollback 기준
  - 키 로테이션/권한 분리 운영안

## Proposed Solutions

### Option 1: Security & Compliance phase에 "Migration & Key Plan" 하위 섹션 추가

**Approach:**
- Phase 13-B에 단계별 전환안(prepare/backfill/cutover/cleanup) 추가
- pre/post 검증 체크리스트와 rollback trigger 명시

**Pros:**
- 실행 가능성/배포 안전성 향상
- 리뷰/운영 팀 공통 기준 확보

**Cons:**
- 문서량 증가

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: 별도 보안 전환 계획 문서로 분리

**Approach:**
- `docs/plans/`에 security-migration 전용 plan 생성
- 본문에서는 해당 plan 링크만 유지

**Pros:**
- 책임 분리 명확
- 보안팀 협업 용이

**Cons:**
- 문서 간 동기화 필요

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

Option 1 채택: 동일 계획 문서의 Phase 13-B에 `Migration & Key Management Plan`을 추가해 dual-write/read, backfill, cutover, rollback, key rotation, 배포 검증 기준을 통합 문서화한다.

## Technical Details

**Affected files:**
- `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- (optional) 신규 security migration plan 문서

## Resources

- Requirement NFR: `docs/01_요구사항_분석서.md:321,325`
- Architecture security: `docs/02_시스템_아키텍처_설계서.md:1085-1092`

## Acceptance Criteria

- [x] PII 암호화 전환의 단계별 절차(백필/컷오버/롤백)가 문서화된다.
- [x] 키 관리/회전 및 권한 분리 운영 기준이 문서화된다.
- [x] 배포 검증(쿼리/로그/알림) 기준이 포함된다.

## Work Log

### 2026-03-04 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed Security & Compliance phase details in post-Phase11 plan
- Cross-checked NFR/architecture security sections for operational completeness

**Learnings:**
- 보안 요구사항은 기능 요구보다 운영 이행 절차가 더 중요하며, 계획 단계에서 선반영해야 실패 비용이 낮다.

## Notes

- Protected artifact 정책 준수: `docs/plans/*` 삭제/제외 제안 없음.

### 2026-03-04 - Execution Complete

**By:** Codex

**Actions:**
- Extended Phase 13-B deliverables to include PII migration runbook and key operations
- Added detailed migration stages (prepare/backfill/cutover/rollback) with rollout guardrails
- Added key rotation and deployment validation requirements (query/log/alert signals)

**Learnings:**
- 보안 기능 계획은 구현 항목만으로는 불충분하며, 전환 실패를 막는 운영 절차와 검증 신호가 동등하게 필요하다.
