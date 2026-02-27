# Dashboard Sample Validation Procedure (Raw Metrics vs Dashboard)

Date: 2026-02-27
Status: active

## 1) Purpose

대시보드에서 보이는 SLO 수치와 raw Prometheus metric 계산 결과가 일치하는지 샘플 검증한다.

## 2) Inputs

- Prometheus scrape endpoint (example): `http://localhost:8087/actuator/prometheus`
- Target URI regex (default): `^/api/v1/`
- Validation script:
  - `/Users/abc/projects/GymCRM_V2/docs/observability/tools/validate_sli_sample.sh`

## 3) Steps

1. 앱을 대상 환경(`staging`)으로 실행한다.
2. 핵심 API 호출을 최소 2~3개 수행해 샘플 트래픽을 만든다.
3. 아래 스크립트로 raw metric 기반 계산값을 얻는다.
4. 동일 시각 대시보드 패널 값(p95, 5xx rate, availability)을 기록한다.
5. 허용 오차 범위 내 일치 여부를 판단한다.

## 4) Script Run

```bash
cd /Users/abc/projects/GymCRM_V2
./docs/observability/tools/validate_sli_sample.sh \
  http://localhost:8087/actuator/prometheus \
  '^/api/v1/(members|products|reservations|access|auth/login)'
```

Output fields:
- total requests
- 5xx requests
- 5xx rate
- availability
- estimated p95 upper bound (from histogram bucket)
- gate check status for v1 thresholds

## 5) Comparison Rule

Dashboard vs raw values must satisfy:

- 5xx rate absolute diff <= 0.10%p
- availability absolute diff <= 0.10%p
- p95: dashboard value <= raw estimated p95 upper bound (bucket boundary) + 50ms

If mismatch exceeds tolerance:
- verify dashboard query filter (uri exclusions, env label)
- verify scrape freshness delay
- verify endpoint grouping label mapping

## 6) Evidence Template

Copy this block into validation log:

```markdown
### Dashboard sample validation
- Time window:
- Environment:
- URI regex:
- Raw 5xx rate:
- Dashboard 5xx rate:
- Raw availability:
- Dashboard availability:
- Raw estimated p95 upper bound:
- Dashboard p95:
- Result: PASS / FAIL
- Notes:
```

## 7) Current Limitation

이 절차는 "샘플 검증"을 위한 기준이며, 공식 Go/No-Go는 여전히 `staging` 7일 rolling 기준으로만 판정한다.
