# Core API SLO Alert Policy (v1)

Date: 2026-02-27
Status: active

## 1) Objective

SLO 위반을 조기에 감지하되, 저트래픽 환경의 노이즈를 줄이는 경고/치명 기준을 정의한다.

## 2) Signal Inputs

- `http.server.requests` latency histogram
- `http.server.requests` total count
- `http.server.requests` 5xx count
- telemetry pipeline health (scrape freshness)

## 3) Severity Rules

### Warning

Trigger if any:
- 1h p95 >= 250ms
- 1h 5xx rate >= 0.5%
- telemetry scrape delay warning

### Critical

Trigger if any:
- 6h continuous p95 >= 250ms
- 6h continuous 5xx rate >= 0.5%
- 1h availability < 99.7% (with min sample)
- telemetry ingestion outage

## 4) Low-Traffic Guard

- If 7d total_count < 200, mark as `warning-only`.
- Critical escalation requires sample threshold satisfied.

## 5) Action Playbook

### Warning action

- Open investigation note in `docs/notes/`
- Confirm whether issue is route-specific or group-wide
- Attach 3 representative `traceId` samples

### Critical action

- Freeze release candidate (No-Go/Hold)
- Roll back latest change or disable relevant feature path
- Assign incident owner and ETA
- Publish decision in release record template

## 6) Runbook linkage

Primary runbook:
- `/Users/abc/projects/GymCRM_V2/docs/observability/staging-go-no-go-checklist.md`

Decision artifact:
- `/Users/abc/projects/GymCRM_V2/docs/observability/release-decision-record-template.md`

## 7) Ownership

- Alert policy owner: Backend/Platform
- Release gate approver: release owner
