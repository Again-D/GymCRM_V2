# Release Decision Record Template (SLO Gate)

Date:
Reviewer:
Release candidate:
Environment: staging
Window: rolling 7 days

## 1) SLO Snapshot

- p95 latency:
- 5xx rate:
- availability:
- sample count:

## 2) Group-level status

| Group | p95 < 250ms | 5xx < 0.5% | availability >= 99.7% | sample >= 200 |
|---|---|---|---|---|
| member_domain |  |  |  |  |
| product_domain |  |  |  |  |
| membership_domain |  |  |  |  |
| reservation_domain |  |  |  |  |
| access_domain |  |  |  |  |

## 3) Telemetry Health

- Actuator endpoint reachable:
- Scrape freshness OK:
- Dashboard query freshness OK:

## 4) Traceability Spot Check

- Trace sample 1:
- Trace sample 2:
- Trace sample 3:

## 5) Decision

- Decision: GO / NO-GO / HOLD
- Rationale:
- If NO-GO/HOLD, immediate action:
- Owner and ETA:

## 6) Evidence Links

- Dashboard:
- Logs:
- Validation note:
