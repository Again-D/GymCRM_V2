# GymCRM_V2 Agent Guidelines

This document provides essential information for AI agents operating in the GymCRM_V2 repository.

## 1. Build, Lint, and Test Commands

### Backend (Java/Spring Boot)
- **Base Directory:** `backend/`
- **Build:** `./gradlew build`
- **Compile Only:** `./gradlew compileJava`
- **Run (Dev Mode):** `SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun`
- **Test All:** `./gradlew test`
- **Test Single Class:** `./gradlew test --tests "com.gymcrm.member.MemberControllerTest"`
- **Test Single Method:** `./gradlew test --tests "com.gymcrm.member.MemberControllerTest.createMemberSuccess"`
- **Clean:** `./gradlew clean`
- **Note:** Canonical build tool is Gradle. Maven (`pom.xml`) exists but is secondary.

### Frontend (React/TypeScript/Vite)
- **Base Directory:** `frontend/`
- **Install:** `npm install`
- **Build:** `npm run build`
- **Run (Dev Mode):** `npm run dev`
- **Test All:** `npm run test`
- **Test Single File:** `npx vitest run src/pages/Login.test.tsx`
- **Lint/Check:** `npx @biomejs/biome check .`
- **Lint Fix:** `npx @biomejs/biome check --write .`

---

## 2. Code Style & Architecture

### General Guidelines
- **Tenant Naming:** Always use `center` for tenant-related terms (e.g., `centerId`).
- **Identifiers:** Use `Long` (number) for resource IDs.
- **Planning:** Always provide a concise plan before making non-trivial changes.
- **Scope:** Do not mix backend and frontend changes in a single large commit/PR unless necessary.
- **Drafting:** Keep implementation plans in `docs/plans/` and technical notes in `docs/notes/`.

### Backend (Java 21)
- **Architecture:** Layered by feature (e.g., `member`, `reservation`, `auth`).
  - `Controller`: Thin, handles request/response mapping and `@PreAuthorize`.
  - `Service`: Contains core business logic.
  - `Repository`: Interface for data access (e.g., `MemberRepository`).
  - `JpaRepository`: Spring Data JPA implementation (e.g., `MemberJpaRepository`).
  - `QueryRepository`: QueryDSL-based complex/search queries (e.g., `MemberQueryRepository`).
  - `Entity`: JPA entities (use `Entity` suffix, e.g., `MemberEntity`).
- **DTOs:** Use Java `record` for all DTOs (Requests/Responses).
- **API Response:** Wrap all responses in `com.gymcrm.common.api.ApiResponse`.
- **Error Handling:** 
  - Use `com.gymcrm.common.error.ApiException` and `ErrorCode`.
  - Global error handling is in `GlobalExceptionHandler`.
- **Security:** Use `@PreAuthorize(AccessPolicies.XXX)` for endpoint protection.
- **Audit:** Use `AuditLogService` when reading or modifying PII (Personally Identifiable Information).
- **Validation:** Use Jakarta Validation annotations (`@Valid`, `@NotBlank`, etc.) in Controller records.
- **API Versioning:** All endpoints should start with `/api/v1/`.

### Frontend (React + TypeScript)
- **Styling:** Use CSS Modules (`.module.css`). Avoid global styles unless necessary.
- **Components:** Functional components with hooks.
- **API Layer:** 
  - Located in `frontend/src/api/`.
  - Use `apiGet`, `apiPost`, `apiPatch` from `client.ts`.
  - All API calls must return `ApiEnvelope<T>` (defined in `client.ts`).
  - Types must strictly align with backend `record` structures.
- **State Management:** 
  - Use React hooks (useState, useMemo, etc.) for local state.
  - Use Context API for global state (e.g., `MemberContext` in `member-context/`).
- **Testing:** Use Vitest and React Testing Library. 
  - Mock API calls using `frontend/src/api/mockData.ts` for prototyping or disconnected testing.
- **Icons:** Use standard Lucide-react or similar if already present.
- **Code Quality:** Biome is the standard for linting and formatting.

---

## 3. Project Configuration & Standards

### Rule Files
- **Cursor/Copilot:** No specific `.cursorrules` or `.cursor/rules` found. Adhere to this `AGENTS.md`.
- **Review Context:** See `compound-engineering.local.md` for designated review agents and focus areas.
  - Designated reviewers: `kieran-typescript-reviewer`, `code-simplicity-reviewer`, `security-sentinel`, `performance-oracle`, `architecture-strategist`.

### Environment Variables (Backend)
- `SPRING_PROFILES_ACTIVE=dev`: Required for local development.
- `APP_SECURITY_MODE=jwt`: Enable JWT authentication (defaults to no-auth in dev).
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`: Database connection settings (e.g., `jdbc:postgresql://localhost:5433/gymcrm_dev`).
- `APP_REDIS_ENABLED=true`: Enable Redis features.
- Redis Feature Flags: `APP_REDIS_QR_TOKEN_STORE_ENABLED`, `APP_REDIS_RESERVATION_LOCK_ENABLED`, etc.

### Key Directories
- `docs/plans/`: Implementation plans (Keep these files).
- `docs/notes/`: Technical notes and canonical rules.
- `backend/src/main/resources/db/migration/`: Flyway migrations.
- `frontend/src/shared/`: Shared utilities, types, and UI components.

---

## 4. Operational Best Practices
- **Minimal Diffs:** Aim for the smallest change that achieves the goal.
- **Verification:** Always run relevant tests before concluding a task.
- **Conventions:** Follow existing naming and structural patterns (e.g., `MemberController` -> `MemberService` -> `MemberRepository`).
- **Typing:** Strict TypeScript typing in the frontend; avoid `any`.
- **Async:** Handle async operations with proper loading and error states.
- **Database:** Do not modify schema directly; always use Flyway migrations.
- **Tracing:** All API responses include a `traceId` for debugging.
- **Purity:** Aim for RESTful API design.
