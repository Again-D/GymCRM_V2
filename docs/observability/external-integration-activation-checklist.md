# External Integration Activation Checklist (PG / AlimTalk / QR)

## 목적
- 실연동 전환 전 계약 테스트와 실패 경로 대응 준비를 표준화한다.
- 외부 장애(타임아웃/5xx/오프라인)에서 fallback/보상 트랜잭션 동작을 확인한다.

## 1. 사전 준비
- [ ] 센터별 벤더 자격증명(테스트/운영 키) 분리 확인
- [ ] 콜백/웹훅 허용 IP 및 TLS 정책 검증
- [ ] 타임아웃/재시도 기본값 확인 (권장: connect 2s, read 5s, 최대 3회)
- [ ] `traceId` 기반 로그 상관관계 확인

### 1-1. 센터 단위 활성화 정책 설정(API)
- [ ] 현재 정책 조회: `GET /api/v1/integrations/external/activation-policy`
- [ ] 단계 전환 반영: `PUT /api/v1/integrations/external/activation-policy`
  - `SANDBOX` -> `STAGING` -> `PRODUCTION`
  - 단계 전환 시 `paymentEnabled/messagingEnabled/qrEnabled`를 센터 운영 정책과 동기화
- [ ] 정책 변경 후 `last_drill_outcome`/`last_drill_at` 확인(최근 drill 기준)

## 2. 계약 테스트 (Sandbox)
- [ ] PG 승인 성공/실패(타임아웃, 5xx) 테스트 통과
- [ ] 알림톡 실패 시 SMS fallback 테스트 통과
- [ ] QR 게이트 검증 실패 시 결제 보상 취소 테스트 통과
- [ ] 보상 취소 실패 시 운영 경보 시그널 생성 확인

## 3. 관측/알림 편입
- [ ] `http_server_requests_seconds_*` 에서 `/api/v1/(lockers|settlements|crm.*)` 5xx 비율 추적
- [ ] 큐 기반 메시지 운용 시 DLQ 지표 수집
  - `ApproximateNumberOfMessagesVisible`
  - `ApproximateAgeOfOldestMessage`
- [ ] 외부 연동 장애 알림 룰 연결 (PG/메시지/QR 별도)

## 4. 장애 대응 기준
- [ ] PG 승인 실패율 급증(5분 평균 > 5%) 시 실결제 전환 중단
- [ ] QR 게이트 장애 지속(10분 이상) 시 수동 체크인 모드 전환
- [ ] 보상 취소 실패 발생 시 즉시 온콜 에스컬레이션 및 수동 정산 큐 등록

## 5. Go/No-Go
- [ ] 최근 7일 스테이징 5xx 비율 < 0.5%
- [ ] 계약 테스트 전 항목 통과
- [ ] 롤백 절차 리허설 완료
- [ ] 오너 지정: Product / Backend On-call / Desk 운영 리드

## 실행 기록 템플릿
- 실행일시:
- 실행환경:
- 실행자:
- 결과 요약:
- 실패/조치 내역:
- 최종 판단(Go/No-Go):

### Sandbox Drill API 실행 예시
```bash
curl -X POST "$API_BASE/api/v1/integrations/external/sandbox-drill" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "paymentApproveFailureMode": "NONE",
    "alimtalkFailureMode": "TIMEOUT",
    "smsFailureMode": "NONE",
    "qrFailureMode": "NONE",
    "paymentCancelFailureMode": "NONE"
  }'
```
