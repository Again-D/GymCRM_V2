# P2 - Phase11-C CRM Messaging Baseline

## Scope
- 이벤트 기반 메시지 트리거(만료 임박)
- 큐 적재/재시도/결과 기록 구조
- 운영자 확인용 발송 이력 최소 UI

## Checklist
- [x] `crm_message_events` 테이블 + dedupe/index 마이그레이션 추가
- [x] CRM 메시지 API (`trigger/process/history`) 및 서비스/리포지토리 추가
- [x] 재시도 후 DEAD 전이(최대 시도) 로직 구현
- [x] 통합 테스트 추가 (`CrmMessageServiceIntegrationTest`)
- [x] 프론트 `CRM 메시지` 탭 + 이력/트리거/큐처리 패널 연결
- [x] 백엔드/프론트 빌드 검증

## Notes
- DLQ 유사 상태를 `DEAD`로 관리하고, dedupe key로 중복 발송을 방지한다.
