# AGENTS.md

## Stack
- Backend: Spring Boot
- Frontend: React + TypeScript

## Working style
- Always plan before editing
- Never modify backend and frontend in one large step
- Prefer minimal diffs
- Preserve existing folder/package structure
- Do not refactor broadly unless explicitly requested

## Backend rules
- Keep controllers thin
- Put business logic in services
- Reuse existing DTO and exception handling patterns
- Add or update tests when behavior changes

## Frontend rules
- Keep API types aligned with backend DTOs
- Preserve existing UI structure
- Handle loading, error, and success states explicitly
- Avoid broad component rewrites

## Validation
- Run backend tests after backend edits
- Run frontend tests/build after frontend edits
- Stop and summarize if a change requires architectural redesign