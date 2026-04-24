# Self-hosted Staging Runbook (Windows + Docker + Nginx + Certbot)

이 문서는 **집 Windows PC 1대**에서 `staging`을 Docker Compose로 상시 구동하고, GitHub Actions(self-hosted runner)로 `develop` 변경을 자동 반영하는 절차를 정리한다.

## 0) Scope / 보안 전제

- 공개 진입점은 `nginx` 하나만 유지한다.
- `backend`, `postgres`, `redis`는 Compose 내부 네트워크 전용으로 둔다.
- TLS는 **Certbot HTTP-01 webroot** 방식으로 발급/갱신한다.
- 비밀정보(DB 비밀번호 등)는 **repo에 커밋하지 않는다**. GitHub Environment secrets/vars로 주입한다.

## 1) 구성 개요

- Reverse proxy: `nginx` (단일 진입점)
  - `80/tcp` → ACME challenge + HTTP bootstrap
  - `443/tcp` → frontend 정적 자산 + `/api/*` backend proxy
- backend: Spring Boot (`PORT=8080`)
- postgres / redis: compose 내부 네트워크 전용
- certbot: `certbot/certbot` 컨테이너 + named volume (`/etc/letsencrypt`, `/var/www/certbot`)

관련 파일:
- `compose.selfhosted-staging.yaml`
- `deploy/selfhosted/nginx/nginx.conf`
- `deploy/selfhosted/nginx/nginx.bootstrap.conf`
- `deploy/selfhosted/nginx/docker-entrypoint.sh`
- `.github/workflows/deploy-staging-selfhosted.yml`
- `docs/observability/tools/validate_selfhosted_staging_certbot_preflight.ps1`
- `docs/observability/tools/validate_selfhosted_staging_https.ps1`

기본 포트:
- HTTP(nginx): `80` (host) → `80` (container)
- HTTPS(nginx): `443` (host) → `443` (container)

## 2) Windows PC 준비 (1회)

### 2.1 Docker Desktop

- Docker Desktop 설치 + WSL2 기반 권장
- `docker compose version` 이 동작해야 한다.

### 2.2 GitHub Self-hosted runner

- Repo Settings → Actions → Runners → New self-hosted runner (Windows)
- runner labels에 다음을 포함:
  - `windows`
  - `gymcrm-staging`

> workflow `deploy-staging-selfhosted.yml`은 `runs-on: [self-hosted, windows, gymcrm-staging]` 로 제한한다.

### 2.3 네트워크 / DNS 준비

- `STAGING_HOSTNAME` (예: `ajw0831.iptime.org`) 이 Windows 호스트의 **공인 IP**로 공개 DNS 해석되어야 한다.
- 라우터/공유기에서 `80/tcp`, `443/tcp` 를 Windows 호스트로 포워딩해야 한다.
- Windows 방화벽에서 `80/tcp`, `443/tcp` 인바운드를 허용해야 한다.

> HTTP-01 challenge 특성상 **Let’s Encrypt가 80/tcp로 직접 접근 가능해야 한다.**

### 2.4 GitHub Environment 구성

GitHub repo에 Environment `staging-selfhosted` 를 만들고 다음을 설정한다.

**Secrets**
- `STAGING_SELFHOSTED_POSTGRES_PASSWORD`: staging DB password

**Variables**
- `STAGING_SELFHOSTED_HOSTNAME` (**필수**): canonical DDNS 호스트명. 예: `ajw0831.iptime.org`
- `STAGING_SELFHOSTED_CERTBOT_EMAIL` (**필수**): Let’s Encrypt 연락 이메일. 예: `ops@example.com`
- `STAGING_SELFHOSTED_ALLOWED_ORIGINS` (optional): CORS 허용 origin 목록 (쉼표 구분)
  - 예: `https://ajw0831.iptime.org`

## 3) 수동 첫 기동 / 재발급 절차

### 3.1 환경변수 준비

PowerShell 또는 CMD에서 아래 값을 준비한다.

```bash
set STAGING_POSTGRES_PASSWORD=...  REM PowerShell이면 $env:STAGING_POSTGRES_PASSWORD="..."
set STAGING_HOSTNAME=ajw0831.iptime.org
set STAGING_CERTBOT_EMAIL=ops@example.com
```

만약 runner/PC에 `COMPOSE_FILE` 같은 전역 환경변수가 세팅되어 있으면, 의도치 않게 다른 compose 파일이 합쳐질 수 있다. 그 경우 아래처럼 환경변수를 제거한 뒤 실행한다.

```bash
set COMPOSE_FILE=
set COMPOSE_PROJECT_NAME=
```

### 3.2 Certbot preflight

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\observability\tools\validate_selfhosted_staging_certbot_preflight.ps1
```

이 단계는 다음을 확인한다.
- Docker CLI / `docker compose` 가 Windows runner에서 실행 가능한지
- 로컬 DNS에서 `<STAGING_HOSTNAME>` 이 해석되는지
- hostname / certbot email 입력값이 올바른지
- `docker compose -f compose.selfhosted-staging.yaml config` 가 정상 렌더링되는지

### 3.3 Bootstrap stack 기동

```bash
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml up -d --build --remove-orphans
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml ps
```

인증서가 아직 없으면 nginx는 **HTTP bootstrap mode** 로 시작한다.
- `/.well-known/acme-challenge/` 는 바로 서비스된다.
- 앱 자체는 일시적으로 `http://<STAGING_HOSTNAME>` 로만 응답한다.

> **운영 판단:** 이 상태는 **초기 발급/복구용 임시 상태**일 뿐이며, staging `GO` 상태가 아니다. 최초 cutover 중 HTTP-only 로 머물면 외부 QA는 진행하지 말고 `HOLD` 로 처리한다.

### 3.4 최초 인증서 발급 / 필요 시 재실행

```bash
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml run --rm certbot ^
  certonly --webroot -w /var/www/certbot ^
  --agree-tos --no-eff-email --non-interactive --keep-until-expiring ^
  --email %STAGING_CERTBOT_EMAIL% -d %STAGING_HOSTNAME%
```

발급/갱신이 끝나면 nginx를 다시 올려 HTTPS 설정을 읽게 한다.

```bash
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml up -d --force-recreate nginx certbot
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml ps
```

만약 `certbot certonly` 가 실패하면 아래처럼 대응한다.

- staging 상태는 즉시 `HOLD` 로 둔다. (`https://<STAGING_HOSTNAME>` 가 성공하기 전까지 QA 진행 금지)
- 공개 DNS / `80/tcp` 포트포워딩 / Windows 방화벽을 먼저 점검한다.
- `docker logs gymcrm-staging-nginx`, `docker logs gymcrm-staging-certbot` 로 ACME challenge 경로를 확인한다.
- 문제를 수정한 뒤 `certbot certonly --webroot ...` 를 다시 실행한다.
- 필요 시 HTTP bootstrap 노출 자체를 중단하려면 `docker compose ... stop nginx` 로 임시 차단한다.

### 3.5 Smoke check

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\observability\tools\validate_selfhosted_staging_https.ps1
```

또는 수동으로 아래를 확인한다.
- `https://<STAGING_HOSTNAME>/`
- `https://<STAGING_HOSTNAME>/api/v1/health`

JWT 기본 관리자(빈 DB 최초 기동 시 자동 생성):
- loginId: `center-admin`
- initial password: `dev-admin-1234!`

## 4) 자동 배포 (GitHub Actions)

- `develop` 브랜치에 push → `deploy-staging-selfhosted` workflow가 실행된다.
- Windows runner에서 다음 순서로 진행한다.
  1. Certbot preflight (`validate_selfhosted_staging_certbot_preflight.ps1`)
  2. `docker compose up -d --build --remove-orphans postgres redis backend nginx certbot`
  3. `docker compose run --rm certbot certonly --webroot ...`
  4. `docker compose up -d --force-recreate nginx certbot`
  5. HTTPS smoke test (`validate_selfhosted_staging_https.ps1`)

> workflow deploy step은 각 compose/certbot 명령이 실패하면 즉시 중단된다. `certonly` 실패를 `ps` 출력이 가리는 상태로 넘기지 않는다.

실패 시 확인:
- Actions 로그에서 실패 단계 확인
- runner에서 `docker compose ... ps` / `docker logs ...` 로 원인 파악

## 5) Mac / 외부 QA

공개 HTTPS 모델에서는 **CA 수동 설치나 hosts override가 필요 없다.**

검증 역할 구분:
- `docs/observability/tools/validate_selfhosted_staging_https.ps1`
  - **[AUTOMATED / WORKFLOW GATE]** Windows runner canonical-host smoke 검증
- `docs/observability/tools/validate_mac_trust_selfhosted_staging.sh`
  - **[MANUAL / QA PRE-CHECK]** Mac 공인 DNS / 공개 HTTPS / SAN 검증

Mac에서 실행:

```bash
bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh
bash docs/observability/tools/validate_mac_trust_selfhosted_staging.sh --final-go
```

최종 GO 기준:
- `ajw0831.iptime.org` 가 공개 DNS로 해석될 것
- stale hosts override (`127.0.0.1`, `10.170.47.3`) 가 없을 것
- `https://ajw0831.iptime.org/api/v1/health` 가 plain curl 로 성공할 것
- live certificate SAN 에 `ajw0831.iptime.org` 가 포함될 것

## 6) 운영 / 갱신 메모

- `certbot` 서비스는 Compose 내부에서 `certbot renew --webroot -w /var/www/certbot` 를 주기적으로 실행한다.
- renew 성공 시 shared webroot volume에 reload 신호를 남기고, nginx entrypoint가 이를 감지해 HTTPS 모드 전환 또는 `nginx -s reload` 를 수행한다.
- 수동 갱신 dry-run:

```bash
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml run --rm certbot renew --dry-run --webroot -w /var/www/certbot
```

- nginx는 인증서 파일 존재 여부를 컨테이너 시작 시점에 판단하고, 이후 renew 신호를 감지하면 자동으로 reload 한다. 수동으로 바로 반영하고 싶으면 아래처럼 재기동한다.

```bash
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml up -d --force-recreate nginx certbot
```

## 7) 장애 시 확인 순서

1. 공개 DNS가 `STAGING_HOSTNAME` 을 올바른 공인 IP로 돌려주는지 확인
2. `80/tcp`, `443/tcp` 포트포워딩 / Windows 방화벽 확인
3. `docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml ps`
4. `docker logs gymcrm-staging-nginx`
5. `docker logs gymcrm-staging-certbot`
6. `powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\observability\tools\validate_selfhosted_staging_https.ps1`

필요 시 재기동:

```bash
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml up -d --build --remove-orphans
```
