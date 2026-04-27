# Staging Super-Admin 계정 부트스트랩 런북

이 문서는 staging 환경에서 시스템 운영 및 설정을 위해 `staging-super-admin` 계정을 안전하게 생성하는 절차를 정리합니다. 이 작업은 Flyway 마이그레이션이 아닌 운영자에 의한 1회성 SQL 실행으로 처리합니다.

## 0) 원칙 및 주의사항

- **전용 계정 사용**: 기존 `center-admin` 계정의 권한을 변경하거나 개인 계정을 사용하는 대신, 전용 `staging-super-admin` 계정을 생성하여 사용합니다.
- **login_id 기반 식별**: 계정 식별 및 로그인은 `login_id`를 기준으로 수행합니다.
- **직접 SQL 실행**: 운영자가 DB에 직접 접속하여 트랜잭션 단위로 실행합니다.
- **보안**: 비밀번호는 반드시 BCrypt로 해싱된 값을 사용합니다.
- **현행화**: 이 계정은 staging 환경 전용이며, 운영 환경(production)에서는 별도의 접근 제어 정책을 따릅니다.

## 1) 사전 확인 (Pre-check)

SQL 실행 전 현재 상태를 확인합니다. 특히 `ROLE_SUPER_ADMIN` 권한을 가진 사용자가 이미 존재하는지 점검합니다.

```sql
-- 1. ROLE_SUPER_ADMIN 권한 보유자 확인 (중복 생성 방지)
SELECT u.user_id, u.login_id, u.user_name, u.user_status, r.role_code
FROM users u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
WHERE r.role_code = 'ROLE_SUPER_ADMIN'
  AND u.is_deleted = FALSE;

-- 2. 상속받을 center-admin 정보 확인 (is_deleted = FALSE 체크 포함)
-- login_id가 'center-admin'인 계정을 확인합니다.
SELECT user_id, center_id, login_id, user_name, user_status 
FROM users 
WHERE login_id = 'center-admin' 
  AND user_status = 'ACTIVE'
  AND is_deleted = FALSE;

-- 3. ROLE_SUPER_ADMIN 역할 존재 여부 확인
SELECT role_id, role_code FROM roles WHERE role_code = 'ROLE_SUPER_ADMIN';
```

## 2) BCrypt 해시 생성 예시

비밀번호는 반드시 BCrypt로 해싱되어야 합니다. 아래는 `staging-super-password-2026!`을 비밀번호로 사용할 경우의 예시 해시값입니다.

- **비밀번호**: `staging-super-password-2026!`
- **해시값**: `$2a$10$wE9qS9qS9qS9qS9qS9qS9uX8X8X8X8X8X8X8X8X8X8X8X8X8X8X8` (예시)

## 3) 계정 생성 및 권한 부여 (DO Block Transaction)

`center-admin`의 정보를 참고하여 `center_id`를 상속받고, `ROLE_SUPER_ADMIN` 역할을 부여합니다. `DO $$` 블록 내에서 명시적인 가드 로직을 포함하여 실행합니다.

```sql
DO $$
DECLARE
    v_center_id BIGINT;
    v_creator_id BIGINT;
    v_role_id BIGINT;
    v_new_user_id BIGINT;
    v_login_id VARCHAR := 'super-admin';
    v_password_hash VARCHAR := '$2b$12$K9GApAEHPw54wyxs2dSVC.I5uEZtfVzPJN3Ihl.Gz.Mtg9SBkdhfS'; -- 생성한 BCrypt Hash
BEGIN
    -- 1. 상속받을 기준 계정(center-admin) 정보 조회
    SELECT center_id, user_id INTO v_center_id, v_creator_id
    FROM users 
    WHERE login_id = 'center-admin' 
      AND user_status = 'ACTIVE' 
      AND is_deleted = FALSE 
    LIMIT 1;

    IF v_center_id IS NULL THEN
        RAISE EXCEPTION 'Base account (center-admin) not found or inactive';
    END IF;

    -- 2. 역할 ID 조회
    SELECT role_id INTO v_role_id FROM roles WHERE role_code = 'ROLE_SUPER_ADMIN';
    
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'ROLE_SUPER_ADMIN not found in roles table';
    END IF;

    -- 3. 중복 계정 체크
    IF EXISTS (SELECT 1 FROM users WHERE login_id = v_login_id AND is_deleted = FALSE) THEN
        RAISE NOTICE 'Account % already exists. Skipping creation.', v_login_id;
        RETURN;
    END IF;

    -- 4. staging-super-admin 사용자 생성
    INSERT INTO users (
        center_id, 
        login_id,
        user_name, 
        password_hash, 
        user_status,
        password_change_required,
        is_deleted,
        created_at, 
        created_by, 
        updated_at, 
        updated_by
    ) VALUES (
        v_center_id,
        v_login_id,
        'Staging Super Admin',
        v_password_hash,
        'ACTIVE',
        TRUE,
        FALSE,
        CURRENT_TIMESTAMP,
        v_creator_id,
        CURRENT_TIMESTAMP,
        v_creator_id
    ) RETURNING user_id INTO v_new_user_id;

    -- 5. ROLE_SUPER_ADMIN 역할 매핑
    INSERT INTO user_roles (
        user_id, 
        role_id, 
        created_at, 
        created_by
    ) VALUES (
        v_new_user_id,
        v_role_id,
        CURRENT_TIMESTAMP,
        v_creator_id
    );

    RAISE NOTICE 'Successfully created staging-super-admin with user_id %', v_new_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE;
END $$;
```

## 4) 검증 (Verification)

생성된 계정과 권한을 최종 확인합니다.

```sql
SELECT 
    u.user_id, 
    u.login_id,
    u.user_name, 
    u.user_status,
    u.password_change_required,
    r.role_code 
FROM users u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
WHERE u.login_id = 'staging-super-admin'
  AND u.is_deleted = FALSE;
```

## 5) 접속 가이드 (PostgreSQL & DBeaver)

시스템 관리를 위한 데이터베이스 접속 방법입니다. 보안을 위해 staging 환경의 Postgres는 외부로 노출되지 않으며, 아래의 안전한 경로를 통해서만 접속해야 합니다.

### 5.1) 로컬 개발 환경 (Docker Compose)
로컬에서 `docker compose up`으로 기동된 환경에 접속할 때 사용합니다.
- **Host**: `localhost`
- **Port**: `5433` (Docker Compose `postgres` 서비스 포트 포워딩 기준)
- **Database**: `gymcrm_dev`
- **User**: `gymcrm`
- **Password**: `gymcrm`

### 5.2) Staging 환경 (Self-hosted Docker)
staging 환경의 Postgres는 기본적으로 호스트에 직접 노출되지 않습니다 (`internal-only`). 아래 두 가지 단계 중 하나를 선택하여 접근 경로를 확보합니다.

#### 단계 A: Staging 호스트에서 임시 포트 포워딩 (socat)
staging 서버의 쉘에서 아래 명령을 실행하여 컨테이너 전용 네트워크(`gymcrm-staging_default`) 내부의 postgres:5432를 호스트의 15433 포트로 임시 노출합니다.
```bash
# staging 호스트에서 실행
docker run --rm -d \
  --name pg-forward \
  --network gymcrm-staging_default \
  -p 15433:5432 \
  alpine/socat \
  tcp-listen:5432,fork,reuseaddr tcp-connect:postgres:5432
```
*작업 종료 후 `docker stop pg-forward`로 반드시 제거하십시오.*

#### 단계 B: 운영자 PC에서 SSH 터널링 (선택 사항)
DBeaver의 SSH 터널링 기능을 사용하지 않고 수동으로 터널을 열 경우 아래 명령을 사용합니다.
```bash
# 운영자 로컬 PC에서 실행
ssh -L 15433:127.0.0.1:15433 [staging-user]@[staging-host]
```

### 5.3) DBeaver UI 설정 상세
staging 환경 접속은 아래 두 방식 중 하나로 구성합니다.

#### 방식 1: 터미널에서 `ssh -L`을 먼저 여는 방식
이 방식은 운영자가 SSH 터널을 수동으로 띄우고, DBeaver는 일반 PostgreSQL 클라이언트처럼 붙는 방법입니다.

사전 조건:
1. staging 호스트에서 `pg-forward` 컨테이너가 실행 중이어야 합니다.
2. 운영자 PC에서 아래 명령으로 SSH 터널을 열어 둡니다.

```bash
ssh -L 15433:127.0.0.1:15433 [staging-user]@[staging-host]
```

이 경우 DBeaver 설정은 다음과 같습니다.

##### General 탭
- **Host**: `127.0.0.1`
- **Port**: `15433`
- **Database**: `gymcrm_staging` (기본값, `STAGING_POSTGRES_DB`가 다르면 해당 값 사용)
- **Username**: `gymcrm` (기본값, `STAGING_POSTGRES_USER`가 다르면 해당 값 사용)
- **Password**: `STAGING_SELFHOSTED_POSTGRES_PASSWORD` 또는 운영 비밀 저장소 값

##### SSH 탭
- **Use SSH Tunnel**: 체크하지 않음

#### 방식 2: DBeaver가 직접 SSH 터널을 여는 방식
이 방식은 별도 `ssh -L` 명령 없이, DBeaver의 SSH 기능으로 staging 호스트에 먼저 접속한 뒤 DB로 붙는 방법입니다.

사전 조건:
1. staging 호스트에서 `pg-forward` 컨테이너가 실행 중이어야 합니다.
2. 운영자 PC에서 staging 호스트로 SSH 접속이 가능해야 합니다.

##### General 탭
- **Host**: `127.0.0.1`
- **Port**: `15433`
- **Database**: `gymcrm_staging` (기본값, `STAGING_POSTGRES_DB`가 다르면 해당 값 사용)
- **Username**: `gymcrm` (기본값, `STAGING_POSTGRES_USER`가 다르면 해당 값 사용)
- **Password**: `STAGING_SELFHOSTED_POSTGRES_PASSWORD` 또는 운영 비밀 저장소 값

##### SSH 탭
- **Use SSH Tunnel**: 체크
- **Host/IP**: `[staging-host-address]`
- **Port**: `22` (또는 운영 중인 SSH 포트)
- **User Name**: `[staging-ssh-user]`
- **Authentication Method**: `Public Key` 권장, 필요 시 `Password`
- **Private Key**: 키 인증 사용 시 운영자가 가진 개인키 경로 지정
- **Passphrase**: 개인키에 passphrase가 있으면 입력

이 경우 General 탭의 `127.0.0.1:15433`은 **운영자 PC가 아니라 staging 호스트 기준** 주소를 의미합니다. 즉, DBeaver가 SSH로 staging 호스트에 먼저 접속한 뒤, 그 호스트 안에서 `pg-forward`가 열어 둔 `127.0.0.1:15433`으로 붙습니다.

#### 참고
- staging 비밀번호는 repo에 저장하지 않습니다. 비밀번호는 반드시 사전에 확보해야 합니다.
- `pg-forward` 컨테이너를 종료하면 DBeaver 접속도 함께 끊깁니다.
- 작업 종료 후에는 `docker stop pg-forward`로 임시 포워딩을 반드시 정리합니다.

## 6) 비활성화 및 접근 차단 (Disable / Revoke)

보안 사고 방지 또는 작업 종료 후 접근 권한을 제거해야 하는 경우, 계정 삭제 대신 리프레시 토큰 무효화와 계정 비활성화를 수행합니다.

```sql
BEGIN;

-- 1. 리프레시 토큰 무효화 (기존 세션 강제 종료)
-- auth_refresh_tokens 테이블의 revoked_at을 설정하여 모든 토큰을 무효화합니다.
UPDATE auth_refresh_tokens 
SET revoked_at = CURRENT_TIMESTAMP,
    revoke_reason = 'SUPER_ADMIN_REVOKED_BY_OPS'
WHERE user_id = (SELECT user_id FROM users WHERE login_id = 'staging-super-admin' AND is_deleted = FALSE);

-- 2. 계정 비활성화 및 접근 차단
UPDATE users 
SET user_status = 'INACTIVE',
    access_revoked_after = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = (SELECT user_id FROM users WHERE login_id = 'center-admin' AND is_deleted = FALSE LIMIT 1)
WHERE login_id = 'staging-super-admin'
  AND is_deleted = FALSE;

COMMIT;
```
