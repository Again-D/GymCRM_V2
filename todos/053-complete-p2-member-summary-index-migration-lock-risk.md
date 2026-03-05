---
status: complete
priority: p2
issue_id: "053"
tags: [code-review, database, migration, performance, operations]
dependencies: []
---

# 회원 요약 인덱스 마이그레이션의 배포 락 리스크

## Problem Statement

PR #35에서 `member_memberships` 기존 대용량 테이블에 인덱스를 추가하는 마이그레이션을 도입했다. 현재 방식은 일반 `CREATE INDEX`이므로 실행 중 쓰기 트랜잭션 대기/지연이 발생할 수 있고, 운영 트래픽 시간대에 배포 시 API 응답 지연으로 이어질 수 있다.

## Findings

- `backend/src/main/resources/db/migration/V13__add_member_summary_lookup_index.sql:1`
  - `CREATE INDEX IF NOT EXISTS ...`를 기존 테이블에 직접 수행한다.
- `CONCURRENTLY` 옵션이 없어 인덱스 생성 중 테이블 쓰기 경합 가능성이 있다.
- PR 본문에 모니터링 항목은 있으나, 락 발생 시점/중단 기준을 수치로 고정한 Go/No-Go 체크리스트는 부족하다.
- 본 변경은 데이터 변환(backfill)은 없지만, 운영 성능/가용성 관점에서 배포 절차 리스크가 존재한다.

## Proposed Solutions

### Option 1: 유지 + 비혼잡 시간대 배포

**Approach:** 현재 SQL을 유지하고 트래픽이 낮은 시간대에 마이그레이션을 실행한다.

**Pros:**
- 구현 변경이 없다.
- 배포 준비가 빠르다.

**Cons:**
- 락/대기 리스크가 구조적으로 남는다.
- 데이터가 커질수록 재배포 난이도가 올라간다.

**Effort:** Small

**Risk:** Medium

---

### Option 2: `CREATE INDEX CONCURRENTLY`로 전환 (권장)

**Approach:** 인덱스 생성을 concurrent 방식으로 분리하고, Flyway 트랜잭션 처리 제약을 고려해 별도 비트랜잭션 마이그레이션 전략을 적용한다.

**Pros:**
- 쓰기 경합 리스크를 크게 줄일 수 있다.
- 운영 중 온라인 인덱스 빌드에 더 안전하다.

**Cons:**
- 마이그레이션 운영 절차가 약간 복잡해진다.
- Flyway 설정/실행 방식 확인이 필요하다.

**Effort:** Medium

**Risk:** Low

---

### Option 3: 사전 수동 인덱스 생성 + 앱 마이그레이션 분리

**Approach:** 운영 DB에서 DBA/운영 스크립트로 인덱스를 먼저 생성한 뒤, 앱 마이그레이션은 상태 동기화 수준으로 단순화한다.

**Pros:**
- 배포 창에서의 위험 제어가 쉽다.
- 롤백/재시도 절차를 명확히 설계 가능하다.

**Cons:**
- 운영 절차 의존성이 증가한다.
- 환경 간 일관성 관리가 필요하다.

**Effort:** Medium

**Risk:** Low

## Recommended Action

이미 머지된 `V13` 마이그레이션은 Flyway checksum/불변성 원칙을 고려해 수정하지 않고, 운영 배포 절차에서 사전 `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...` 실행 및 Go/No-Go 체크리스트를 적용한다.

## Technical Details

**Affected files:**
- `backend/src/main/resources/db/migration/V13__add_member_summary_lookup_index.sql:1`
- `backend/src/main/java/com/gymcrm/member/MemberRepository.java:119`

**Related components:**
- 회원 목록 요약 API (`GET /api/v1/members`)
- Flyway migration execution path

**Database changes (if any):**
- 기존 `member_memberships` 테이블에 신규 보조 인덱스 추가

## Resources

- **PR:** [#35](https://github.com/Again-D/GymCRM_V2/pull/35)
- **Relevant learning:** `docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md`
- **Deployment checklist:** `docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md`

## Acceptance Criteria

- [x] 운영 배포 절차에서 인덱스 생성 방식(`CONCURRENTLY` 또는 동등한 무중단 전략)이 확정된다.
- [x] 배포 Go/No-Go 체크리스트에 락/지연 감지 쿼리와 중단 기준이 문서화된다.
- [x] 배포 후 `/api/v1/members` p95와 DB wait 이벤트 검증 절차가 문서화된다.

## Work Log

### 2026-03-05 - Review Finding 등록

**By:** Codex

**Actions:**
- PR #35 마이그레이션 SQL 및 요약 조회 경로 검토
- 운영 락/배포 안전성 관점에서 리스크 식별
- 대응 옵션/수용 기준 포함해 todo 등록

**Learnings:**
- 데이터 변경이 없는 인덱스 마이그레이션도 테이블 규모에 따라 운영 영향이 클 수 있어 배포 절차 설계가 핵심이다.

### 2026-03-05 - Fix 구현 완료

**By:** Codex

**Actions:**
- `V13` 직접 수정 시 Flyway checksum 충돌이 발생함을 테스트로 확인
- 마이그레이션 불변성 원칙에 맞춰 `V13` 수정을 되돌림
- 운영 배포 통제 문서 작성:
  - `docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md`
- 멤버 API 관련 테스트 재실행으로 변경 회귀 없음 확인

**Learnings:**
- 이미 적용된 버전 마이그레이션은 수정보다 배포 절차/운영 가드로 리스크를 통제하는 방식이 안전하다.

## Notes

- Rails `schema.rb` 기반 drift 검사는 본 저장소(Flyway SQL migration 구조)에서는 직접 적용되지 않음.
