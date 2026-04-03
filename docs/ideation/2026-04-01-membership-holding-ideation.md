---
date: 2026-04-01
topic: membership-holding
focus: 회원권 홀딩 기능 설계
---

# Ideation: 회원권 홀딩 한도 시각화 및 자동 해제 설계

## Codebase Context
- **백엔드 (Backend)**: `MembershipHoldService` 내에 홀딩 일수(`maxHoldDays`), 횟수(`maxHoldCount`) 제한을 체크하는 핵심 로직이 존재함. 단, 홀딩 종료일이 도과했을 때 자동으로 해제(`ACTIVE`)를 수행하는 스케줄러(Batch) 처리는 부재.
- **프론트엔드 (Frontend)**: 상품(Product) 생성 시 홀딩 정책을 입력하지만, 회원권(Membership) 화면의 조회 응답 데이터 형식(`PurchasedMembership` 등)이나 뷰 컴포넌트는 해당 정책의 잔여 일수/횟수를 안내하는 기능이 없음.

## Ranked Ideas

### 1. 아이디어 1: 프론트엔드 중심의 홀딩 한도 시각화 및 제어 (Holding Limit UI/UX)  *(Selected)*
**Description:** 프론트엔드에서 회원권 데이터(`holdDaysUsed`, `holdCountUsed`)와 상품 캐시를 조인하여 (혹은 백엔드 DTO에 병합 노출하여), 모달 로딩 단계에서부터 **잔여 홀딩 횟수**와 **잔여 일수**를 시각적으로 보여줍니다. 폼의 최대 종료일 선택 가능 범위를 상품 `maxHoldDays` 기준으로 동적 제한(Disable)하며 한도 소진 시 "홀딩 불가능" 메시지로 차단합니다.
**Rationale:** UI 레벨에서 직관성을 높여 잘못된 일수 입력을 방지하고 400 에러를 줄여 고객센터 업무를 대폭 완화.
**Downsides:** 로컬 프론트엔드 스키마와 DTO 응답 필드가 다소 복잡해짐.
**Confidence:** 100%
**Complexity:** Low
**Status:** Explored

### 2. 아이디어 3: 지정일 자정 자동 홀딩 해제 처리 (Auto-Resume Batch) *(Selected)*
**Description:** Spring의 `@Scheduled` 어노테이션이나 별도 Batch Job을 사용하여 매일 새벽(예: KST 자정), 현재 상태가 `HOLDING`이고 오늘이 `holdEndDate` 이후인 이력을 찾아 `ACTIVE`로 일괄 자동 변경. 이 과정에서 `calculateActualHoldDays()` 비즈니스 로직을 호출하여 정당하게 연장된 만기일(`endDate`) 계산 과정을 동일하게 태웁니다.
**Rationale:** 사람(운영자)이 매번 수동으로 헬스장 락커/수업을 쓰게 해주려고 "재개" 버튼을 누르는 데스크 업무 병목(비효율)을 근본적으로 제거. (요구사항 집중 해결)
**Downsides:** 정산이나 상태 갱신이 트랜잭션 도중 끊기면 배치 에러 대처 필요.
**Confidence:** 95%
**Complexity:** Medium
**Status:** Explored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | 아이디어 2: 예약 홀딩(Scheduled Hold) 중간 상태 신설 | 미래 홀딩을 위한 Status(`PENDING_HOLD`) 추가 시 결제/정산 등 모든 기존 쿼리에 영향을 줘 개발 비용이 너무 큼 (Over-engineering). |
| 2 | 아이디어 4: 홀딩 내역 이력(History) UI 제공 | 당장 핵심 요구사항보단 부가기능의 성격이 강해 현재 "설계"보다 나중에 "기능 개선"으로 빼기로 결정함. |

## Session Log
- 2026-04-01: Initial ideation — 4 generated, 2 survived (1, 3 combined and selected by user).
