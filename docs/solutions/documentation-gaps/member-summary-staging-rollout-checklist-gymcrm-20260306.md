---
module: Gym CRM Member
date: 2026-03-06
problem_type: documentation_gap
component: documentation
symptoms:
  - "Plan implementation is complete in code/tests, but staging/manual validation steps remain open"
  - "Post-deploy monitoring ownership and exact run steps are not centralized"
root_cause: missing_workflow_step
resolution_type: process_update
severity: medium
tags: [member-summary, staging-smoke, post-deploy-monitoring, runbook]
---

# Member Summary Staging Rollout Checklist

## Scope
- Target feature: member list membership summary columns
- Target API: `GET /api/v1/members`
- Target UI: 회원관리 탭 목록(회원권 상태/만료일/PT 잔여)

## Staging Manual Smoke

### 1) 회원 목록 렌더/검색
- [ ] 회원관리 탭 진입 시 목록이 정상 로드된다.
- [ ] 이름 검색/연락처 검색이 정상 동작한다.
- [ ] 검색 초기화 후 기본 목록으로 복귀한다.

### 2) 상태/표기 규칙
- [ ] `membershipOperationalStatus`가 `정상/만료임박/만료/없음`으로 올바르게 표시된다.
- [ ] `membershipExpiryDate`가 null일 때 `-`로 표시된다.
- [ ] `remainingPtCount`가 null 또는 0일 때 `-`로 표시된다.

### 3) 액션 회귀
- [ ] 회원 선택(행 클릭/아이콘) 동작이 정상이다.
- [ ] 회원 수정 진입/종료가 정상이다.
- [ ] 회원권 업무/예약 관리 진입이 정상이다.

## Post-Deploy Monitoring (24h)

### 1) 로그
- [ ] `/api/v1/members` error 로그 확인
- [ ] Flyway/migration 실행 로그 확인

### 2) 메트릭
- [ ] `/api/v1/members` error rate
- [ ] `/api/v1/members` p95 latency

### 3) 운영 피드백
- [ ] 오분류(상태/만료일/PT 잔여) 제보 여부 수집

## Go/No-Go Conditions
- Go:
  - 수동 스모크 체크리스트 100% 통과
  - 초기 1시간 에러율/지연 이상 징후 없음
- No-Go:
  - 상태 오분류 재현
  - p95 급증 또는 반복 오류 발생

## Escalation
- Owner: 백엔드 + 프론트 담당자
- Incident trigger:
  - 5분 이상 에러율 상승 지속
  - 오분류 재현 2건 이상
