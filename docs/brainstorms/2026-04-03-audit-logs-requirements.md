---
date: 2026-04-03
topic: audit-logs
---

# 시스템 전체 통합 감사 대시보드 (Global Audit Explorer)

## Problem Frame
운영자가 시스템 내에서 발생하는 민감한 변경 사항(회원권 홀딩, 계정 상태 변경, 환불, C/S 이력 등)을 한 곳에서 원클릭으로 통합 추적하고 모니터링할 수 있는 화면이 없습니다. 직관적인 조회 화면을 신설하여, 시스템 운영의 투명성을 높이고 이슈 발생 시 빠른 대응 기반을 마련합니다.

## Requirements

**조회 및 필터 기능**
- R1. 관리자(Super Admin, Center Admin)용 내비게이션 사이드바 메뉴에 "감사 로그"를 추가한다.
- R2. `eventType` (이벤트 유형) 단위로 리스트를 필터링할 수 있는 Select(혹은 Dropdown) 기능을 제공한다.
- R3. 백엔드 `AuditLogController`의 제약 조건(Pattern)을 업데이트하여, 회원권 홀딩 등 최신 커스텀 이벤트를 정상적으로 응답한다.

**데이터 표시 및 UI**
- R4. Table 형태로 데이터 목록(이벤트 발생 일시, 구분(EventType), 수행자, 리소스 식별자 등)을 표시한다.
- R5. 개별 로그의 세부 내용(`attributesJson`)은 "상세 보기" 버튼을 눌렀을 때 모달을 띄워 JSON(또는 포맷팅된 형태)으로 확인 가능하게 한다.

## Success Criteria
- 운영 관리자가 "운영 관리" 뎁스의 메뉴에서 회원권 홀딩(MEMBERSHIP_HOLD/RESUME) 및 권한 변경 등 시스템 레벨의 이력을 성공적으로 조회할 수 있다.

## Scope Boundaries
- 개인화된 이력 메뉴가 아니라 시스템 전역 통합 뷰로 국한함.
- `AuditRetentionJobRun`(보존 주기 배치) 관련 모니터링 대시보드는 이번 스코프에서 제외함.

## Key Decisions
- 시스템 전체 모니터링 UI 도입: 특정 회원 상세나 상품 정보 내부가 아닌 독립된 글로벌 메뉴 구조 채택 (Ideation 아이디어 A 참조).

## Outstanding Questions

### Resolve Before Planning
- [Affects R2][User decision] 감사로그 화면 리스트 조회에 대한 기본 필터 상태를 어떻게 설정해야 할까요?
