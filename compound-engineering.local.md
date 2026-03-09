---
review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle, architecture-strategist]
plan_review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer]
---

# Review Context

- Frontend work is mostly React + TypeScript under `/frontend/src`.
- Prioritize state ownership boundaries, reset behavior, race conditions, and regressions in workspace-local flows.
- Do not flag files under `docs/plans/` or `docs/solutions/` for cleanup or deletion.
