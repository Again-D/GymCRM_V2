# P2 - Phase11-D External Integration Readiness

## Scope
- PG/알림톡/QR 어댑터 계약 인터페이스 고정
- sandbox/stub 기반 실패 주입 통합 테스트
- 운영 활성화 체크리스트 문서화

## Checklist
- [x] 외부 어댑터 계약 인터페이스(PG/알림톡/SMS/QR) 추가
- [x] Sandbox 스텁 구현(타임아웃/5xx/오프라인 주입)
- [x] `ExternalIntegrationReadinessServiceIntegrationTest` 추가
- [x] 운영 활성화 체크리스트 문서(`docs/observability`) 추가
- [x] Phase11 계획 문서 진행 체크 업데이트
- [x] 백엔드 테스트 검증

## Notes
- 실패 경로는 `simulateFailure` 속성으로 주입하며, QR 실패 시 결제 보상 취소 경로를 검증한다.
