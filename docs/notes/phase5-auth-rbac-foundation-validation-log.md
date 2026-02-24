# Phase 5-1 Security Foundation Validation Log

- Date: 2026-02-24
- Scope: Phase 5-1 (Security Foundation / Backend)

## Implemented (This Turn)

- Spring Security starter + JWT library dependencies added
- `app.security.mode` (`prototype|jwt`) configuration introduced
- Security foundation config added (`SecurityFilterChain`, stateless, method security, password encoder)
- `CurrentUserProvider` strategy split:
  - `PrototypeCurrentUserProvider` (prototype mode)
  - `SecurityContextCurrentUserProvider` (jwt mode)
- `PrototypeModeGuard` updated to apply only in `prototype` mode
- `HealthController` updated to expose `securityMode` and safely handle unauthenticated `currentUserId`
- Flyway `V6` added:
  - `users`
  - `auth_refresh_tokens`
- Dev/staging JWT mode admin seeder added (`center-admin`)

## Automated Test Verification

Command:

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon
```

Result:
- ✅ PASS (backend full test suite)

Notes:
- `Phase1SampleControllerWebMvcTest` updated for new `SecurityModeSettings` dependency and security filter slice behavior
- `@MockBean` deprecation warnings remain (non-blocking)

## Runtime Verification

### A) `dev + jwt` mode boot

Command (executed):

```bash
SPRING_PROFILES_ACTIVE=dev \
APP_SECURITY_MODE=jwt \
PORT=8082 \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev \
DB_USERNAME=gymcrm \
DB_PASSWORD=gymcrm \
./gradlew bootRun --no-daemon
```

Observed:
- ✅ Spring Boot startup complete on `8082`
- ✅ Flyway validated/applied through `V6`
- ✅ `DevAdminUserSeeder` seeded `center-admin` (`ROLE_CENTER_ADMIN`)

DB verification:

```sql
select version, success from flyway_schema_history where version='6';
select user_id, center_id, login_id, role_code, user_status
from users
where login_id='center-admin' and is_deleted=false;
```

Result:
- ✅ `V6` exists, `success=true`
- ✅ seeded user row exists (`ROLE_CENTER_ADMIN`, `ACTIVE`)

### B) `dev + prototype` mode boot

Command (executed):

```bash
SPRING_PROFILES_ACTIVE=dev \
APP_SECURITY_MODE=prototype \
PORT=8081 \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev \
DB_USERNAME=gymcrm \
DB_PASSWORD=gymcrm \
./gradlew bootRun --no-daemon
```

Observed:
- ✅ Spring Boot startup complete on `8081`
- ✅ Flyway validates `V6` with schema up-to-date

## Known Follow-ups (Phase 5-2+)

- JWT auth filter/provider wiring not yet implemented (jwt mode protected APIs are not usable yet)
- auth APIs (`/api/v1/auth/*`) not yet implemented
- Spring Boot generated development password log still appears (default `UserDetailsService` auto-config); will be replaced/removed when custom auth stack is wired
- `traceId` response/log alignment is planned for Phase 5-5
