# Project rules

## Core rules
- Start from current user request only
- Ignore previous unfinished tasks
- Read only specified files unless necessary
- Modify only specified files
- Do not guess nonexistent files

## Editing rules
- Minimal changes only
- Do not refactor unless explicitly asked
- Keep existing structure and patterns

## Backend (Spring Boot)
- Use ApiResponse<T>
- Use record for DTOs
- Follow existing controller/service pattern

## Frontend (React + TS)
- Use existing API utilities (apiGet/apiPost)
- Follow current component structure
- Keep styling consistent

## Git branch strategy
- Use `main` as the production deployment branch
- Use `develop` as the integration branch for upcoming releases
- Create `feature/*` branches from `develop` for each feature or fix
- Merge `feature/*` into `develop` after review and verification
- Merge `develop` into `main` when preparing a production release
- Keep environment differences in config and deployment settings, not in separate long-lived environment branches
